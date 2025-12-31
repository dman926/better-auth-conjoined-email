import { emailOTPClient } from "better-auth/client/plugins";
import { multiEmailFnName, multiEmailEndpoint } from "./shared.js";

/**
 * @typedef {import("better-auth").BetterAuthClientPlugin} BetterAuthClientPlugin
 *
 * @typedef {ReturnType<typeof import("./index.js").conjoinedEmailPlugin>} ConjoinedEmailPlugin
 * @typedef {Omit<ReturnType<typeof import("better-auth/plugins").magicLink>, "id">} MagicLinkPlugin
 * @typedef {Omit<ReturnType<typeof import("better-auth/plugins").emailOTP>, "id">} EmailOTPPlugin
 */

export const conjoinedEmailClientPlugin = () => {
  const otpPlugin = emailOTPClient();

  return (
    /** @satisfies {BetterAuthClientPlugin} */
    ({
      id: "conjoined-email",
      $InferServerPlugin:
        /** @type {ConjoinedEmailPlugin & MagicLinkPlugin & EmailOTPPlugin} */
        ({}),

      atomListeners: {
        ...otpPlugin.atomListeners,
      },

      getActions: ($fetch) => ({
        [multiEmailFnName]: async (
          /** @type {{ email: string }} */ data,
          /** @type {import("@better-fetch/fetch").BetterFetchOption} */ options
        ) => {
          return $fetch(multiEmailEndpoint, {
            method: "POST",
            body: data,
            ...options,
          });
        },
      }),
    })
  );
};

export default conjoinedEmailClientPlugin;
