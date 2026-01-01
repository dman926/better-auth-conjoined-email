import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const db = new Database(":memory:");

db.pragma("journal_mode = WAL");

db.exec(readFileSync(join(__dirname, "scaffold.sql"), "utf-8"));

export default db;
