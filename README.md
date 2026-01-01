# better-auth-conjoined-email

[![Test](https://github.com/dman926/better-auth-conjoined-email/actions/workflows/test.yml/badge.svg)](https://github.com/dman926/better-auth-conjoined-email/actions/workflows/test.yml)
[![NPM Version](https://img.shields.io/npm/v/%40dman926%2Fbetter-auth-conjoined-email)](https://www.npmjs.com/package/@dman926/better-auth-conjoined-email)

Send a conjoined authentication email using multiple authentication methods at once.

## Why

There isn't a clean way to have both the better-auth [magicLink](https://www.better-auth.com/docs/plugins/magic-link) and [emailOTP](https://www.better-auth.com/docs/plugins/email-otp) plugins defined in your auth config and have both fire at the same time, sending a single email with both authentication options, so I made this plugin.

## Install

```
npm i @dman926/better-auth-conjoined-email
```

```
yarn add @dman926/better-auth-conjoined-email
```

```
pnpm add @dman926/better-auth-conjoined-email
```

## Usage

Add to the server better-auth configuration:

```ts
// src/server/auth.ts
import { betterAuth } from "better-auth";
import { conjoinedEmailPlugin } from "@dman926/better-auth-conjoined-email";

export const auth = betterAuth({
  // ...
  plugins: [
    conjoinedEmailPlugin({
      sendAuthenticationEmail: ({ email, otp, magicLink, magicLinkToken }) => {
        // Send the email containing both OTP and magic link
      },
    }),
    // magicLink and emailOTP plugins are contained in conjoinedEmailPlugin
    // and do not need to be added
  ],
});
```

And add to the client better-auth configuration:

```ts
// src/client/auth.ts
import { createAuthClient } from "better-auth/svelte";
import { conjoinedEmailClientPlugin } from "@dman926/better-auth-conjoined-email/client";

export const authClient = createAuthClient({
  plugins: [
    conjoinedEmailClientPlugin(),
    // magicLinkClient and emailOTPClient are contained in conjoinedEmailClientPlugin
    // and do not need to be added
  ],
});
```

And use it in the app:

```ts
// src/routes/some-page.tsx
import { useCallback, useState } from "react"
import { authClient } from "src/client/auth";

export function SignIn() {
  const [email, setEmail] = useState('');

  const handleSignIn = useCallback((ev) => {
    ev.preventDefault();

    // Send the email containing an OTP code and a magic link
    authClient.sendMagicLinkAndOTP({ email });
    // auth.api.sendMagicLinkAndOTP is available on the server auth
  }, [email]);

  return (
    <input
      type="email"
      placeholder="Email"
      value={email}
      onInput={(ev) => { setEmail(ev.target.value) }}
    />
    <button onClick={handleSignIn}>Sign In</button>
  );
}
```

## Options

| Option                  | Description                                                                                                                                                                         | Default               |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| sendAuthenticationEmail | Handler to send the authentication email. `email`, `otp`, `magicLink`, and `magicLinkToken` are provided as the first parameter.                                                    | \*                    |
| otpLength               | The length of the OTP code                                                                                                                                                          | 6                     |
| expiresIn               | The time in seconds the magic link and OTP code are valid for. Can also be provided as an object<br />(`{ magicLink: number; emailOTP: number }`)<br />to describe each expire time | 600<br />(10 minutes) |
| allowSimultaneousUse    | When `true`, users can authenticate through both methods, where-as normally when one method is used, the other is invalidated                                                       | false                 |
