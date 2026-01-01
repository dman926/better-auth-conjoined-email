import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const [layoutHalf1, layoutHalf2] = readFileSync(
  join(__dirname, "layout.html"),
  "utf-8"
).split("{{content}}");

export const layout = async (content: string | Promise<string>) =>
  [layoutHalf1, await content, layoutHalf2].join("");

export const styles = readFileSync(join(__dirname, "styles.css"), "utf-8");
const libBase = join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "@dman926",
  "better-auth-conjoined-email",
  "src"
);
export const clientJS = readFileSync(join(libBase, "index.client.js"), "utf-8");
export const sharedJS = readFileSync(join(libBase, "shared.js"), "utf-8");

export const otpPage = readFileSync(
  join(__dirname, "auth", "otp.html"),
  "utf-8"
);

export const routes = {
  // Requires auth
  "/": readFileSync(join(__dirname, "index.html"), "utf-8"),
  "/auth": readFileSync(join(__dirname, "auth", "index.html"), "utf-8"),
};
