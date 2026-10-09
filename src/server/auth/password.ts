import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Hash de senha com scrypt (nativo do Node, sem dependência externa).
// Formato: scrypt$N$r$p$salt$hash, para permitir aumentar o custo no futuro.

const N = 2 ** 15;
const r = 8;
const p = 1;
const KEY_LEN = 64;

function scrypt(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, KEY_LEN, { ...opts, maxmem: 128 * opts.N! * opts.r! * 2 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, { N, r, p });
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, rr, pp, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scrypt(password, Buffer.from(saltB64, "base64url"), {
    N: Number(n),
    r: Number(rr),
    p: Number(pp),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar contas.
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
