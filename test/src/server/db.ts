import Database from "better-sqlite3";

export const db = new Database("./test.db");

export default db;
