// wrappers.js

/**
 * Sends an OTP code to the user
 * @param {string} requestId - The request ID to attach to the OTP code
 * @param {ReturnType<typeof import("better-auth/plugins").emailOTP>} otpPlugin - The OTP plugin
 * @param {import("better-auth").GenericEndpointContext} ctx - The endpoint context
 * @returns {Promise<string>} - The promise of the OTP code
 */
export const getOTP = (requestId, otpPlugin, ctx) => {
  const otpEndpoint = otpPlugin.endpoints.sendVerificationOTP;
  if (!otpEndpoint) {
    throw new Error("OTP plugin endpoint not found");
  }

  return new Promise((resolve, reject) => {
    const otpCtx = {
      ...ctx,
      context: {
        ...ctx.context,
        adapter: {
          ...ctx.context.adapter,
          create:
            /** @satisfies {typeof ctx.context.adapter.create} */
            async (data) => {
              try {
                if (data.model == "verification") {
                  data.data.metadata.requestId = requestId;
                  resolve(data.data.value);
                }
                return ctx.context.adapter.create(data);
              } catch (error) {
                reject(error);
              }
            },
        },
      },
    };

    otpEndpoint(otpCtx);
  });
};

/**
 * Sends a magic link to the user
 * @param {string} requestId - The request ID to attach to the magic link
 * @param {ReturnType<typeof import("better-auth/plugins").magicLink>} magicLinkPlugin - The magic link plugin
 * @param {import("better-auth").GenericEndpointContext} ctx - The endpoint context
 * @param {string} email - The user's email address
 * @returns {Promise<{ magicLink: string, magicLinkToken: string }>} - The promise of the magic link and token
 */
export const getMagicLink = (requestId, magicLinkPlugin, ctx, email) => {
  const magicLinkEndpoint = magicLinkPlugin.endpoints.signInMagicLink;
  if (!magicLinkEndpoint) {
    throw new Error("Magic link plugin endpoint not found");
  }

  return new Promise((resolve, reject) => {
    const magicLinkCtx = {
      ...ctx,
      headers: /** @type {NonNullable<typeof ctx.headers>} */ (ctx.headers),
      context: {
        ...ctx.context,
        adapter: {
          ...ctx.context.adapter,
          create:
            /** @satisfies {typeof ctx.context.adapter.create} */
            async (data) => {
              try {
                if (data.model == "magic-link") {
                  data.data.metadata.requestId = requestId;

                  const magicLinkToken = data.data.token;
                  const magicLink = `${
                    ctx.context.baseURL
                  }/api/auth/magic-link/verify?token=${magicLinkToken}&email=${encodeURIComponent(
                    email
                  )}`;
                  resolve({ magicLink, magicLinkToken });
                }
                return ctx.context.adapter.create(data);
              } catch (error) {
                reject(error);
              }
            },
        },
      },
    };

    magicLinkEndpoint(magicLinkCtx);
  });
};
