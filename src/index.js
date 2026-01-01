import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { emailOTP, magicLink } from "better-auth/plugins";
import { authCaptureStorage } from "./store.js";
import { multiEmailFnName, multiEmailEndpoint } from "./shared.js";

/**
 * @typedef {Object} MultiEmailPayload
 * @property {string} email
 * @property {string} otp
 * @property {string} magicLink
 * @property {string} magicLinkToken
 *
 * @typedef {Object} Options
 * @property {(data: MultiEmailPayload, ctx: import("better-auth").GenericEndpointContext) => void | Promise<void>} sendAuthenticationEmail
 * @property {number} [otpLength=6] Length of the OTP code
 * @property {number | { magicLink: number; emailOTP: number }} [expiresIn=600] Expiration time in seconds (default: 10 minutes)
 * @property {boolean} [allowSimultaneousUse=false] Allow simultaneous use of both OTP and Magic Link auth methods from the same email
 *
 *              (users can use both methods from the same email instead of either OTP or Magic Link and being denied when trying the other method)
 */

/**
 * Wraps around the official better-auth emailOTP and magicLink plugins to
 * join both auth methods into a single email.
 *
 * This plugin fully replaces both `emailOTP` and `magicLink` and so they
 * should not be included in your better-auth plugin list (server or client)
 *
 * @param {Options} options
 */
export const conjoinedEmailPlugin = (options) => {
  const {
    sendAuthenticationEmail,
    otpLength = 6,
    expiresIn = 600,
    allowSimultaneousUse = false,
  } = options;

  // Senders
  /** @type {Parameters<typeof magicLink>[0]['sendMagicLink']} */
  const smartSendMagicLink = async ({ token, url }) => {
    const store = authCaptureStorage.getStore();
    store?.resolveMagicLink?.({ token, url });
  };
  /** @type {Parameters<typeof emailOTP>[0]['sendVerificationOTP']} */
  const smartSendVerificationOTP = async ({ otp }) => {
    const store = authCaptureStorage.getStore();
    store?.resolveOTP?.(otp);
  };

  const magicLinkPlugin = magicLink({
    sendMagicLink: smartSendMagicLink,
    expiresIn: typeof expiresIn == "object" ? expiresIn.magicLink : expiresIn,
  });

  const otpPlugin = emailOTP({
    sendVerificationOTP: smartSendVerificationOTP,
    expiresIn: typeof expiresIn == "object" ? expiresIn.emailOTP : expiresIn,
    otpLength,
  });

  return (
    /** @satisfies {import("better-auth").BetterAuthPlugin} */
    ({
      id: "conjoined-email",
      init: (ctx) => {
        if (
          "init" in magicLinkPlugin &&
          typeof magicLinkPlugin.init == "function"
        ) {
          magicLinkPlugin.init?.(ctx);
        }
        otpPlugin.init?.(ctx);
      },
      endpoints: {
        ...magicLinkPlugin.endpoints,
        ...otpPlugin.endpoints,
        [multiEmailFnName]: createAuthEndpoint(
          multiEmailEndpoint,
          {
            method: "POST",
            requireHeaders: true,
            body: magicLinkPlugin.endpoints.signInMagicLink.options.body,
            metadata: {
              openapi: {
                operationId: multiEmailFnName,
                description: "Sign in with magic link or OTP",
                responses: {
                  200: {
                    description: "Success",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            status: {
                              type: "boolean",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          async (ctx) =>
            authCaptureStorage.run(
              /** @type {import("./store.js").CaptureStorage} */ ({}),
              async () => {
                const store = authCaptureStorage.getStore();
                if (!store) {
                  return ctx.json({ success: false, error: "Store not found" });
                }

                // Watchers
                const magicLinkPromise = new Promise(
                  (/** @type {typeof store.resolveMagicLink} */ res) => {
                    store.resolveMagicLink = res;
                  }
                );
                const otpPromise = new Promise(
                  (/** @type {typeof store.resolveOTP} */ res) => {
                    store.resolveOTP = res;
                  }
                );

                const otpCtx = {
                  ...ctx,
                  body: {
                    ...ctx.body,
                    type: /** @type {const} */ ("sign-in"),
                  },
                };

                await Promise.all([
                  magicLinkPlugin.endpoints.signInMagicLink(ctx),
                  otpPlugin.endpoints.sendVerificationOTP(otpCtx),
                ]);

                const { token: magicLinkToken, url: magicLink } =
                  await magicLinkPromise;
                const otp = await otpPromise;

                await ctx.context.runInBackgroundOrAwait(
                  sendAuthenticationEmail(
                    { email: ctx.body.email, otp, magicLink, magicLinkToken },
                    ctx
                  )
                );

                return ctx.json({
                  success: true,
                  message: "Authentication email sent",
                });
              }
            )
        ),
      },
      hooks: {
        before: [
          {
            matcher: (ctx) =>
              ctx.path == otpPlugin.endpoints.signInEmailOTP.path ||
              ctx.path == magicLinkPlugin.endpoints.magicLinkVerify.path,
            handler: createAuthMiddleware(async (ctx) => {
              const adapter = ctx.context.adapter;
              let email = ctx.body?.email;

              // If no email (Magic Link), find it via token
              if (!email && ctx.query?.token) {
                const verification = await adapter.findOne({
                  model: "verification",
                  where: [{ field: "identifier", value: ctx.query.token }],
                });
                if (verification) {
                  email = JSON.parse(verification.value).email;
                }
              }

              if (email) {
                /** @type {any} */ (ctx).conjoinedEmail = email;
              }

              return { context: ctx };
            }),
          },
        ],
        after: [
          ...otpPlugin.hooks.after,
          allowSimultaneousUse
            ? undefined
            : /** @satisfies {NonNullable<NonNullable<import("better-auth").BetterAuthPlugin['hooks']>['after']>[number]} */
              ({
                matcher: (ctx) =>
                  // Match both OTP and magic link verification endpoints
                  ctx.path == otpPlugin.endpoints.signInEmailOTP.path ||
                  ctx.path == magicLinkPlugin.endpoints.magicLinkVerify.path,

                handler: createAuthMiddleware(async (ctx) => {
                  /** @type {string} */
                  const email = /** @type {any} */ (ctx).conjoinedEmail;

                  try {
                    /** @type {import("better-auth").Verification[]} */
                    const verifications = await ctx.context.adapter.findMany({
                      model: "verification",
                      where: [
                        // email otp
                        {
                          field: "identifier",
                          value: `sign-in-otp-${email}`,
                          connector: "OR",
                        },
                        // magic link
                        {
                          field: "value",
                          value: JSON.stringify({ email }),
                          connector: "OR",
                        },
                      ],
                    });

                    // Find any records that do not have a close relative (1s) based on createdAt times
                    const zombies = verifications.filter(
                      (v1, i, a) =>
                        a.every(
                          (v2) =>
                            Math.abs(
                              v1.createdAt.getTime() - v2.createdAt.getTime()
                            ) > 1000
                        ) ||
                        // is the last item in the array (and so has no sibling)
                        i == verifications.length - 1
                    );

                    if (zombies.length > 0) {
                      await ctx.context.adapter.deleteMany({
                        model: "verification",
                        where: zombies.map((v) => ({
                          field: "id",
                          value: v.id,
                        })),
                      });
                    } else {
                      throw new Error("No sibling verification found");
                    }
                  } catch (err) {
                    console.error(
                      "Conjoined Email Plugin: Failed to clean up sibling verification",
                      err
                    );
                  }

                  return ctx;
                }),
              }),
        ].filter((h) => !!h),
      },
      rateLimit: [...magicLinkPlugin.rateLimit, ...otpPlugin.rateLimit],
      $ERROR_CODES: {
        ...otpPlugin.$ERROR_CODES,
      },
    })
  );
};

export default conjoinedEmailPlugin;
