import { betterAuth } from "better-auth";
import db from "./db.js";
import { sendEmail } from "../inbox.js";

import { conjoinedEmailPlugin } from "@dman926/better-auth-conjoined-email";

export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: db,
  plugins: [
    conjoinedEmailPlugin({
      sendAuthenticationEmail: async (payload) => {
        sendEmail(payload);
      },
    }),
  ],
});
