export const conjoinedEmailClientPlugin = () =>
  /** @satisfies {import("better-auth").BetterAuthClientPlugin} */
  ({
    id: "conjoined-email",
    $InferServerPlugin:
      /** @type {ReturnType<typeof import("./index.js").conjoinedEmailPlugin>} */
      ({}),
  });

export default conjoinedEmailClientPlugin;
