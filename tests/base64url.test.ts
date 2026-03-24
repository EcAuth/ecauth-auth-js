import { describe, it, expect } from 'vitest';
import { base64UrlEncode, base64UrlDecode } from '../src/base64url';

describe('base64UrlEncode', () => {
  it('should encode a known byte sequence', () => {
    const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
    expect(base64UrlEncode(buffer)).toBe('SGVsbG8');
  });

  it('should use URL-safe characters (no +, /, =)', () => {
    // Bytes that produce +, / in standard base64
    const buffer = new Uint8Array([0xfb, 0xef, 0xbe]).buffer;
    const encoded = base64UrlEncode(buffer);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('should handle empty buffer', () => {
    const buffer = new ArrayBuffer(0);
    expect(base64UrlEncode(buffer)).toBe('');
  });

  it('should strip padding', () => {
    // Single byte produces 2 base64 chars + 2 padding
    const buffer = new Uint8Array([65]).buffer; // "A"
    const encoded = base64UrlEncode(buffer);
    expect(encoded).toBe('QQ');
    expect(encoded).not.toContain('=');
  });
});

describe('base64UrlDecode', () => {
  it('should decode a known Base64URL string', () => {
    const decoded = base64UrlDecode('SGVsbG8');
    const bytes = new Uint8Array(decoded);
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it('should handle strings with URL-safe characters', () => {
    // "-" and "_" should be converted back to "+" and "/"
    const buffer = new Uint8Array([0xfb, 0xef, 0xbe]).buffer;
    const encoded = base64UrlEncode(buffer);
    const decoded = base64UrlDecode(encoded);
    expect(new Uint8Array(decoded)).toEqual(new Uint8Array([0xfb, 0xef, 0xbe]));
  });

  it('should handle strings without padding', () => {
    // "QQ" is "A" without padding
    const decoded = base64UrlDecode('QQ');
    expect(new Uint8Array(decoded)).toEqual(new Uint8Array([65]));
  });

  it('should handle empty string', () => {
    const decoded = base64UrlDecode('');
    expect(decoded.byteLength).toBe(0);
  });
});

describe('round-trip', () => {
  it('should round-trip encode/decode correctly', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 255]);
    const encoded = base64UrlEncode(original.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(new Uint8Array(decoded)).toEqual(original);
  });

  it('should round-trip a 32-byte challenge', () => {
    const challenge = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      challenge[i] = i * 8;
    }
    const encoded = base64UrlEncode(challenge.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(new Uint8Array(decoded)).toEqual(challenge);
  });
});
