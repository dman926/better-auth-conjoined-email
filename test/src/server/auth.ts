import { betterAuth } from "better-auth";
import db from "./db.js";

export const auth = betterAuth({
  database: db
});