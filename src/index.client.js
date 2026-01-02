import { emailOTPClient } from "better-auth/client/plugins";

/**
 * @typedef {import("better-auth").BetterAuthClientPlugin} BetterAuthClientPlugin
 *
 * @typedef {ReturnType<typeof import("./index.js").conjoinedEmailPlugin>} ConjoinedEmailPlugin
 * @typedef {Omit<ReturnType<typeof import("better-auth/plugins").magicLink>, "id">} MagicLinkPlugin
 * @typedef {Omit<ReturnType<typeof import("better-auth/plugins").emailOTP>, "id">} EmailOTPPlugin
 */

export const conjoinedEmailClient = () => {
  const otpPlugin = emailOTPClient();

  return (
    /** @satisfies {BetterAuthClientPlugin} */
    ({
      id: "conjoined-email",
      $InferServerPlugin:
        /** @type {ConjoinedEmailPlugin & MagicLinkPlugin & EmailOTPPlugin} */
        ({}),

      atomListeners: [...otpPlugin.atomListeners],
    })
  );
};

export default conjoinedEmailClient;
