import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Armazenamento privado de arquivos (documentos de verificação).
// Hoje existe só o driver local. Em produção será usado um bucket privado
// (Supabase Storage), que depende de conta e credenciais ainda não configuradas.
export interface FileStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/._-]{0,200}$/;

export class LocalFileStorage implements FileStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    if (!KEY_PATTERN.test(key) || key.includes("..")) throw new Error("Chave de armazenamento inválida.");
    return path.join(this.root, key);
  }

  async put(key: string, bytes: Uint8Array) {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
  }

  get(key: string) {
    return readFile(this.resolve(key));
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

let instance: FileStorage | undefined;

export function getStorage(): FileStorage {
  if (instance) return instance;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") throw new Error(`Driver de armazenamento não suportado: ${driver}`);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION !== "true") {
    throw new Error("Armazenamento local não pode ser usado em produção. Configure um bucket privado.");
  }
  instance = new LocalFileStorage(path.resolve(process.env.STORAGE_LOCAL_DIR ?? ".storage/private"));
  return instance;
}
