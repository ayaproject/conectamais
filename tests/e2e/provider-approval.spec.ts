import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://conecta:conecta_dev@localhost:5432/conecta_e2e_test";

async function signUp(page: Page, name: string, email: string, asProvider: boolean) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  if (asProvider) await page.getByLabel(/Quero oferecer meus serviços/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(asProvider ? /\/prestador$/ : /\/conta$/);
}

test("prestador se cadastra, envia para análise e é aprovado pelo admin", async ({ browser }, info) => {
  const run = `${info.project.name}-${Date.now()}`;
  const providerEmail = `prestador-${run}@teste.local`;
  const adminEmail = `admin-${run}@teste.local`;

  // Prestador
  const provider = await (await browser.newContext()).newPage();
  await signUp(provider, "Maria", providerEmail, true);
  await expect(provider.getByRole("heading", { name: "Área do prestador" })).toBeVisible();
  await expect(provider.getByText("Rascunho", { exact: true })).toBeVisible();

  // Enviar incompleto é recusado
  await provider.getByRole("button", { name: "Enviar para análise" }).click();
  await expect(provider.getByRole("alert").filter({ hasText: "Complete o perfil" })).toBeVisible();

  await provider.getByLabel("Nome completo ou razão social").fill("Maria da Silva");
  await provider.getByLabel("Nome profissional ou nome fantasia").fill(`Maria Pinturas ${run}`);
  await provider.getByLabel("Descrição dos seus serviços").fill("Pintura residencial interna e externa com acabamento.");
  await provider.getByLabel("Cidade").fill("Imbituba");
  await provider.getByLabel("UF").fill("SC");
  await provider.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(provider.getByRole("status")).toContainText("Perfil salvo");
  await provider.getByRole("button", { name: "Enviar para análise" }).click();
  await expect(provider.getByText("Em análise", { exact: true }).first()).toBeVisible();

  // Cliente comum não acessa a administração
  const client = await (await browser.newContext()).newPage();
  await signUp(client, "Admin", adminEmail, false);
  await client.goto("/admin/prestadores");
  await expect(client).toHaveURL(/\/conta$/);

  // Concede permissão pelo script oficial e entra como admin
  execSync(`npx tsx scripts/grant-admin.ts ${adminEmail} APPROVE_PROVIDERS`, { env: { ...process.env, DATABASE_URL: E2E_DB } });
  await client.goto("/admin/prestadores");
  await client.getByRole("link", { name: `Maria Pinturas ${run}` }).click();
  await client.getByRole("button", { name: "Aprovar" }).click();
  await expect(client.getByRole("status")).toContainText("Decisão registrada");
  await client.getByRole("link", { name: "Aprovado", exact: true }).click();
  await client.getByRole("link", { name: `Maria Pinturas ${run}` }).click();
  await expect(client.getByText(/Em análise → Aprovado por Admin/)).toBeVisible();

  // Prestador vê a aprovação
  await provider.reload();
  await expect(provider.getByText("Aprovado", { exact: true }).first()).toBeVisible();
});
