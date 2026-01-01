# better-auth-conjoined-email

Send a conjoined authentication email using multiple authentication methods at once.

## Why

There isn't a clean way to have both the better-auth [magicLink](https://www.better-auth.com/docs/plugins/magic-link) and [emailOTP](https://www.better-auth.com/docs/plugins/email-otp) plugins defined in your auth config and have both fire at the same time, sending a single email with both authentication options, so I made this plugin.

## Install (Not published yet until I can test it)

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
    // Do not include magicLink or emailOTP
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
    // Do not include magicLinkClient or emailOTPClient
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
    // auth.api.sendMagicLinkAndOTP is available on the server auth client
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
| sendAuthenticationEmail | Handler to send the authentication email. `email`, `otp`, `magicLink`, and `magicLinkToken` are provided as the first parameter.                                                                            | \*                    |
| otpLength               | The length of the OTP code                                                                                                                                                          | 6                     |
| expiresIn               | The time in seconds the magic link and OTP code are valid for. Can also be provided as an object<br />(`{ magicLink: number; emailOTP: number }`)<br />to describe each expire time | 600<br />(10 minutes) |
| allowSimultaneousUse    | When `true`, users can authenticate through both methods, where-as normally when one method is used, the other is invalidated                                                       | false                 |
