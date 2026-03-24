import { base64UrlEncode, base64UrlDecode } from './base64url';

export interface AuthenticateOptions {
  optionsUrl: string;
  verifyUrl: string;
  csrfToken?: string;
  headers?: Record<string, string>;
}

export interface RegisterOptions {
  optionsUrl: string;
  verifyUrl: string;
  b2bSubject: string;
  csrfToken?: string;
  headers?: Record<string, string>;
  deviceName?: string;
}

export interface AuthenticateResult {
  redirect_url: string;
}

export interface RegisterResult {
  success: boolean;
  credential_id: string;
}

function buildHeaders(csrfToken?: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return { ...headers, ...extra };
}

/**
 * パスキー認証を実行する。
 */
export async function authenticate(options: AuthenticateOptions): Promise<AuthenticateResult> {
  const headers = buildHeaders(options.csrfToken, options.headers);

  // 1. 認証オプション取得
  const optionsResponse = await fetch(options.optionsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!optionsResponse.ok) {
    throw new Error(`Failed to get authentication options: ${optionsResponse.status}`);
  }
  const serverOptions = await optionsResponse.json();

  // 2. WebAuthn API 用にデータ変換
  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlDecode(serverOptions.challenge),
    rpId: serverOptions.rpId,
    userVerification: serverOptions.userVerification || 'preferred',
    timeout: serverOptions.timeout || 60000,
  };

  if (serverOptions.allowCredentials?.length > 0) {
    publicKeyOptions.allowCredentials = serverOptions.allowCredentials.map(
      (cred: { id: string; type: PublicKeyCredentialType; transports?: AuthenticatorTransport[] }) => ({
        id: base64UrlDecode(cred.id),
        type: cred.type,
        transports: cred.transports || [],
      }),
    );
  }

  // 3. ブラウザ認証ダイアログ表示
  const assertion = (await navigator.credentials.get({ publicKey: publicKeyOptions })) as PublicKeyCredential;
  const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

  // 4. 認証結果をサーバーに送信
  const assertionData: Record<string, unknown> = {
    response: {
      id: assertion.id,
      rawId: base64UrlEncode(assertion.rawId),
      response: {
        authenticatorData: base64UrlEncode(assertionResponse.authenticatorData),
        clientDataJSON: base64UrlEncode(assertionResponse.clientDataJSON),
        signature: base64UrlEncode(assertionResponse.signature),
        ...(assertionResponse.userHandle && {
          userHandle: base64UrlEncode(assertionResponse.userHandle),
        }),
      },
      type: assertion.type,
      clientExtensionResults: assertion.getClientExtensionResults(),
    },
  };

  const verifyResponse = await fetch(options.verifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(assertionData),
  });
  if (!verifyResponse.ok) {
    throw new Error(`Authentication verification failed: ${verifyResponse.status}`);
  }
  return verifyResponse.json();
}

/**
 * パスキー登録を実行する。
 */
export async function register(options: RegisterOptions): Promise<RegisterResult> {
  const headers = buildHeaders(options.csrfToken, options.headers);

  // 1. 登録オプション取得
  const requestBody: Record<string, string> = { b2b_subject: options.b2bSubject };
  if (options.deviceName) {
    requestBody.device_name = options.deviceName;
  }

  const optionsResponse = await fetch(options.optionsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });
  if (!optionsResponse.ok) {
    throw new Error(`Failed to get registration options: ${optionsResponse.status}`);
  }
  const serverOptions = await optionsResponse.json();

  // 2. WebAuthn API 用にデータ変換
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlDecode(serverOptions.challenge),
    rp: { id: serverOptions.rp.id, name: serverOptions.rp.name },
    user: {
      id: base64UrlDecode(serverOptions.user.id),
      name: serverOptions.user.name,
      displayName: serverOptions.user.displayName,
    },
    pubKeyCredParams: serverOptions.pubKeyCredParams,
    authenticatorSelection: serverOptions.authenticatorSelection || {},
    timeout: serverOptions.timeout || 60000,
    attestation: serverOptions.attestation || 'none',
  };

  if (serverOptions.excludeCredentials?.length > 0) {
    publicKeyOptions.excludeCredentials = serverOptions.excludeCredentials.map(
      (cred: { id: string; type: PublicKeyCredentialType; transports?: AuthenticatorTransport[] }) => ({
        id: base64UrlDecode(cred.id),
        type: cred.type,
        transports: cred.transports || [],
      }),
    );
  }

  // 3. ブラウザ登録ダイアログ表示
  const credential = (await navigator.credentials.create({ publicKey: publicKeyOptions })) as PublicKeyCredential;
  const credentialResponse = credential.response as AuthenticatorAttestationResponse;

  // 4. 登録結果をサーバーに送信
  const transports = credentialResponse.getTransports ? credentialResponse.getTransports() : [];

  const credentialData: Record<string, unknown> = {
    response: {
      id: credential.id,
      rawId: base64UrlEncode(credential.rawId),
      response: {
        attestationObject: base64UrlEncode(credentialResponse.attestationObject),
        clientDataJSON: base64UrlEncode(credentialResponse.clientDataJSON),
        transports,
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
    },
  };

  if (options.deviceName) {
    credentialData.device_name = options.deviceName;
  }

  const verifyResponse = await fetch(options.verifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(credentialData),
  });
  if (!verifyResponse.ok) {
    throw new Error(`Registration verification failed: ${verifyResponse.status}`);
  }
  return verifyResponse.json();
}
