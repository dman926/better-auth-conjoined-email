// index.js
import { createAuthEndpoint } from "better-auth/api";
import { generateRandomString } from "better-auth/crypto";
import { emailOTP, magicLink } from "better-auth/plugins";
import { z } from "zod";
import { getOTP, getMagicLink } from "./wrappers.js";

/**
 * @typedef {Object} Options
 * @property {(data: {
 *  email: string,
 *  otp: string;
 *  magicLink: string;
 *  magicLinkToken: string;
 * }, ctx: import("better-auth").GenericEndpointContext) => void | Promise<void>} sendAuthenticationEmail
 * @property {number} [otpLength=6] - Length of the OTP code
 * @property {number} [expiresIn=600] - Expiration time in seconds (default: 10 minutes)
 */

export const conjoinedEmailPlugin = (
  /** @type {Options} */
  options
) => {
  const { sendAuthenticationEmail, otpLength = 6, expiresIn = 600 } = options;

  const magicLinkPlugin = magicLink({
    sendMagicLink: async () => {},
    expiresIn,
  });

  const otpPlugin = emailOTP({
    sendVerificationOTP: async () => {},
    expiresIn,
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
        TodoNameMe: createAuthEndpoint(
          "/sign-in/multi-email",
          {
            method: "POST",
            body: z.object({
              email: z.email(),
            }),
            requireHeaders: true,
          },
          async (ctx) => {
            const { email } = ctx.body;

            const requestId = generateRandomString(32);

            const [otp, { magicLink, magicLinkToken }] = await Promise.all([
              getOTP(requestId, otpPlugin, ctx),
              getMagicLink(requestId, magicLinkPlugin, ctx, email),
            ]);

            await sendAuthenticationEmail(
              { email, otp, magicLink, magicLinkToken },
              ctx
            );

            return ctx.json({
              success: true,
              message: "Authentication email sent",
            });
          }
        ),
      },
      hooks: {
        after: [
          ...otpPlugin.hooks.after,
          {
            // Match both OTP and magic link verification endpoints
            matcher: (ctx) =>
              ctx.path == otpPlugin.endpoints.verifyEmailOTP.path ||
              ctx.path == magicLinkPlugin.endpoints.magicLinkVerify.path,

            handler: async (ctx) => {
              // Extract email from the request
              // For OTP: comes from body
              // For magic link: comes from query params
              const email =
                (ctx.body && typeof ctx.body === "object" && "email" in ctx.body
                  ? /** @type {Record<string, string>} */ (ctx.body).email
                  : null) ||
                (ctx.query &&
                typeof ctx.query === "object" &&
                "email" in ctx.query
                  ? ctx.query.email
                  : null);

              if (!email || typeof email !== "string") {
                return ctx;
              }

              const adapter =
                /** @type {{ context: { adapter: import("better-auth/types").DBAdapter } }} */ (
                  ctx
                ).context.adapter;

              try {
                // Get all verification records for this email
                // Check both "verification" model (for OTP) and "magicLink" model
                const [verifications, magicLinks] = await Promise.all([
                  adapter
                    .findMany({
                      model: "verification",
                      where: [{ field: "identifier", value: email }],
                    })
                    .catch(() => []),
                  adapter
                    .findMany({
                      model: "magicLink",
                      where: [{ field: "email", value: email }],
                    })
                    .catch(() => []),
                ]);

                // Find the requestId from the used verification
                let usedRequestId = null;

                // Check what was used - OTP code or magic link token
                const usedCode =
                  ctx.body && typeof ctx.body === "object" && "code" in ctx.body
                    ? /** @type {Record<string, string>} */ (ctx.body).code
                    : null;
                const usedToken =
                  ctx.query &&
                  typeof ctx.query === "object" &&
                  "token" in ctx.query
                    ? ctx.query.token
                    : null;

                // Find requestId from OTP verifications
                if (usedCode) {
                  for (const verification of verifications) {
                    if (
                      verification.value === usedCode &&
                      verification.metadata?.requestId
                    ) {
                      usedRequestId = verification.metadata.requestId;
                      break;
                    }
                  }
                }

                // Find requestId from magic link verifications
                if (!usedRequestId && usedToken) {
                  for (const magicLink of magicLinks) {
                    if (
                      magicLink.token === usedToken &&
                      magicLink.metadata?.requestId
                    ) {
                      usedRequestId = magicLink.metadata.requestId;
                      break;
                    }
                  }
                }

                // Delete all verifications and magic links with the same requestId
                if (usedRequestId) {
                  const deletePromises = [];

                  // Delete OTP verifications
                  for (const verification of verifications) {
                    if (verification.metadata?.requestId === usedRequestId) {
                      deletePromises.push(
                        adapter
                          .delete({
                            model: "verification",
                            where: [{ field: "id", value: verification.id }],
                          })
                          .catch(() => {}) // Ignore individual delete errors
                      );
                    }
                  }

                  // Delete magic links
                  for (const magicLink of magicLinks) {
                    if (magicLink.metadata?.requestId === usedRequestId) {
                      deletePromises.push(
                        adapter
                          .delete({
                            model: "magicLink",
                            where: [{ field: "id", value: magicLink.id }],
                          })
                          .catch(() => {}) // Ignore individual delete errors
                      );
                    }
                  }

                  await Promise.all(deletePromises);
                }
              } catch (error) {
                console.error("Error cleaning up verification records:", error);
              }

              return ctx;
            },
          },
        ],
      },
      rateLimit: [...magicLinkPlugin.rateLimit, ...otpPlugin.rateLimit],
    })
  );
};

export default conjoinedEmailPlugin;
