import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, register } from '../src/webauthn';
import { base64UrlEncode } from '../src/base64url';

// Mock credential helpers
function createMockAssertionCredential() {
  return {
    id: 'test-credential-id',
    rawId: new Uint8Array([1, 2, 3, 4]).buffer,
    type: 'public-key',
    response: {
      authenticatorData: new Uint8Array([10, 20, 30]).buffer,
      clientDataJSON: new Uint8Array([40, 50, 60]).buffer,
      signature: new Uint8Array([70, 80, 90]).buffer,
      userHandle: new Uint8Array([100, 110]).buffer,
    },
    getClientExtensionResults: () => ({}),
  };
}

function createMockAttestationCredential() {
  return {
    id: 'new-credential-id',
    rawId: new Uint8Array([5, 6, 7, 8]).buffer,
    type: 'public-key',
    response: {
      attestationObject: new Uint8Array([11, 22, 33]).buffer,
      clientDataJSON: new Uint8Array([44, 55, 66]).buffer,
      getTransports: () => ['internal'],
    },
    getClientExtensionResults: () => ({}),
  };
}

function createMockServerAuthOptions() {
  return {
    challenge: base64UrlEncode(new Uint8Array([1, 2, 3]).buffer),
    rpId: 'example.com',
    userVerification: 'preferred',
    timeout: 60000,
    allowCredentials: [
      {
        id: base64UrlEncode(new Uint8Array([9, 8, 7]).buffer),
        type: 'public-key',
        transports: ['internal'],
      },
    ],
  };
}

function createMockServerRegOptions() {
  return {
    challenge: base64UrlEncode(new Uint8Array([1, 2, 3]).buffer),
    rp: { id: 'example.com', name: 'Example' },
    user: {
      id: base64UrlEncode(new Uint8Array([4, 5, 6]).buffer),
      name: 'admin@example.com',
      displayName: 'Admin',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: { residentKey: 'preferred' },
    timeout: 60000,
    attestation: 'none',
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('authenticate', () => {
  it('should return redirect_url on success', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerAuthOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ redirect_url: 'https://example.com/callback?code=abc' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue(createMockAssertionCredential()) },
      writable: true,
      configurable: true,
    });

    const result = await authenticate({
      optionsUrl: '/auth/options',
      verifyUrl: '/auth/verify',
      csrfToken: 'csrf-123',
    });

    expect(result.redirect_url).toBe('https://example.com/callback?code=abc');
  });

  it('should throw on options fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    await expect(
      authenticate({ optionsUrl: '/auth/options', verifyUrl: '/auth/verify' }),
    ).rejects.toThrow('Failed to get authentication options: 400');
  });

  it('should throw on verify fetch failure', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerAuthOptions()),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue(createMockAssertionCredential()) },
      writable: true,
      configurable: true,
    });

    await expect(
      authenticate({ optionsUrl: '/auth/options', verifyUrl: '/auth/verify', csrfToken: 'token' }),
    ).rejects.toThrow('Authentication verification failed: 500');
  });

  it('should send CSRF token when provided', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerAuthOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ redirect_url: 'https://example.com/callback' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue(createMockAssertionCredential()) },
      writable: true,
      configurable: true,
    });

    await authenticate({
      optionsUrl: '/auth/options',
      verifyUrl: '/auth/verify',
      csrfToken: 'my-csrf-token',
    });

    const optionsCallHeaders = mockFetch.mock.calls[0][1].headers;
    expect(optionsCallHeaders['X-CSRF-TOKEN']).toBe('my-csrf-token');

    const verifyCallHeaders = mockFetch.mock.calls[1][1].headers;
    expect(verifyCallHeaders['X-CSRF-TOKEN']).toBe('my-csrf-token');
  });

  it('should not send CSRF token when not provided', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerAuthOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ redirect_url: 'https://example.com/callback' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue(createMockAssertionCredential()) },
      writable: true,
      configurable: true,
    });

    await authenticate({ optionsUrl: '/auth/options', verifyUrl: '/auth/verify' });

    const optionsCallHeaders = mockFetch.mock.calls[0][1].headers;
    expect(optionsCallHeaders['X-CSRF-TOKEN']).toBeUndefined();
  });

  it('should send correct assertion data structure to verify endpoint', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerAuthOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ redirect_url: 'https://example.com/callback' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue(createMockAssertionCredential()) },
      writable: true,
      configurable: true,
    });

    await authenticate({ optionsUrl: '/auth/options', verifyUrl: '/auth/verify' });

    const verifyBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(verifyBody.response).toBeDefined();
    expect(verifyBody.response.id).toBe('test-credential-id');
    expect(verifyBody.response.rawId).toBeDefined();
    expect(verifyBody.response.response.authenticatorData).toBeDefined();
    expect(verifyBody.response.response.clientDataJSON).toBeDefined();
    expect(verifyBody.response.response.signature).toBeDefined();
    expect(verifyBody.response.response.userHandle).toBeDefined();
    expect(verifyBody.response.type).toBe('public-key');
    expect(verifyBody.response.clientExtensionResults).toEqual({});
  });
});

describe('register', () => {
  it('should return success on registration', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerRegOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, credential_id: 'cred-123' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { create: vi.fn().mockResolvedValue(createMockAttestationCredential()) },
      writable: true,
      configurable: true,
    });

    const result = await register({
      optionsUrl: '/reg/options',
      verifyUrl: '/reg/verify',
      b2bSubject: 'user-uuid',
      csrfToken: 'csrf-456',
    });

    expect(result.success).toBe(true);
    expect(result.credential_id).toBe('cred-123');
  });

  it('should throw on options fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(
      register({
        optionsUrl: '/reg/options',
        verifyUrl: '/reg/verify',
        b2bSubject: 'user-uuid',
      }),
    ).rejects.toThrow('Failed to get registration options: 403');
  });

  it('should throw on verify fetch failure', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerRegOptions()),
      })
      .mockResolvedValueOnce({ ok: false, status: 422 });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { create: vi.fn().mockResolvedValue(createMockAttestationCredential()) },
      writable: true,
      configurable: true,
    });

    await expect(
      register({
        optionsUrl: '/reg/options',
        verifyUrl: '/reg/verify',
        b2bSubject: 'user-uuid',
        csrfToken: 'token',
      }),
    ).rejects.toThrow('Registration verification failed: 422');
  });

  it('should send b2b_subject in options request', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerRegOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, credential_id: 'cred-123' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { create: vi.fn().mockResolvedValue(createMockAttestationCredential()) },
      writable: true,
      configurable: true,
    });

    await register({
      optionsUrl: '/reg/options',
      verifyUrl: '/reg/verify',
      b2bSubject: 'test-subject-uuid',
    });

    const optionsBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(optionsBody.b2b_subject).toBe('test-subject-uuid');
  });

  it('should include device_name when provided', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerRegOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, credential_id: 'cred-123' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { create: vi.fn().mockResolvedValue(createMockAttestationCredential()) },
      writable: true,
      configurable: true,
    });

    await register({
      optionsUrl: '/reg/options',
      verifyUrl: '/reg/verify',
      b2bSubject: 'user-uuid',
      deviceName: 'MacBook Pro',
    });

    const optionsBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(optionsBody.device_name).toBe('MacBook Pro');

    const verifyBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(verifyBody.device_name).toBe('MacBook Pro');
  });

  it('should send correct credential data structure to verify endpoint', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockServerRegOptions()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, credential_id: 'cred-123' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    Object.defineProperty(navigator, 'credentials', {
      value: { create: vi.fn().mockResolvedValue(createMockAttestationCredential()) },
      writable: true,
      configurable: true,
    });

    await register({
      optionsUrl: '/reg/options',
      verifyUrl: '/reg/verify',
      b2bSubject: 'user-uuid',
    });

    const verifyBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(verifyBody.response).toBeDefined();
    expect(verifyBody.response.id).toBe('new-credential-id');
    expect(verifyBody.response.rawId).toBeDefined();
    expect(verifyBody.response.response.attestationObject).toBeDefined();
    expect(verifyBody.response.response.clientDataJSON).toBeDefined();
    expect(verifyBody.response.response.transports).toEqual(['internal']);
    expect(verifyBody.response.type).toBe('public-key');
  });
});
