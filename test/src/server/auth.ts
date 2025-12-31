import { betterAuth } from "better-auth";
import db from "./db.js";

import { conjoinedEmailPlugin } from "@dman926/better-auth-conjoined-email";

export const auth = betterAuth({
  database: db,
  plugins: [
    conjoinedEmailPlugin({
      sendAuthenticationEmail: async ({ email, otp, magicLink }) => {
        console.log("AUTH EMAIL SEND", { email, otp, magicLink });
      },
    }),
  ],
});
