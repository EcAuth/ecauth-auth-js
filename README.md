# @ecauth/auth-js

EcAuth client-side authentication library (WebAuthn, PKCE).

## Installation

```bash
npm install @ecauth/auth-js
```

## Usage

### ESM

```javascript
import { webauthn } from '@ecauth/auth-js';

// Authenticate with passkey
const result = await webauthn.authenticate({
  optionsUrl: '/v1/b2b/passkey/authenticate/options',
  verifyUrl: '/v1/b2b/passkey/authenticate/verify',
  csrfToken: 'your-csrf-token',
});

// Register a passkey
const regResult = await webauthn.register({
  optionsUrl: '/v1/b2b/passkey/register/options',
  verifyUrl: '/v1/b2b/passkey/register/verify',
  b2bSubject: 'user-uuid',
  csrfToken: 'your-csrf-token',
});
```

### UMD (script tag)

```html
<script src="ecauth-auth.umd.js"></script>
<script>
  EcAuth.webauthn.authenticate({
    optionsUrl: '/v1/b2b/passkey/authenticate/options',
    verifyUrl: '/v1/b2b/passkey/authenticate/verify',
    csrfToken: 'your-csrf-token',
  });
</script>
```

## License

LGPL-2.1-or-later
