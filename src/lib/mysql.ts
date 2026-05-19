import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getDatabaseUrl() {
  return process.env.MYSQL_URL ?? process.env.DATABASE_URL ?? process.env.MYSQL_PUBLIC_URL;
}

export function getMysqlPool() {
  const uri = getDatabaseUrl();

  if (!uri) {
    throw new Error("MYSQL_URL, DATABASE_URL, or MYSQL_PUBLIC_URL is required");
  }

  if (!pool) {
    pool = mysql.createPool({
      uri,
      connectionLimit: 5,
      charset: "utf8mb4",
      enableKeepAlive: true,
    });
  }

  return pool;
}
