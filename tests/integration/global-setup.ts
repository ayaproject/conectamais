import { execSync } from "node:child_process";

// Aplica as migrações versionadas no banco de teste. Cada teste limpa as tabelas (helpers.resetDb).
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://conecta:conecta_dev@localhost:5432/conecta_test";
  if (!/test/.test(url)) throw new Error("TEST_DATABASE_URL precisa apontar para um banco de teste.");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
