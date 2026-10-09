import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalFileStorage } from "@/server/storage";

describe("armazenamento local", () => {
  it("grava, lê e apaga", async () => {
    const s = new LocalFileStorage(await mkdtemp(path.join(tmpdir(), "conecta-")));
    await s.put("docs/p1/a.pdf", new Uint8Array([1, 2, 3]));
    expect([...(await s.get("docs/p1/a.pdf"))]).toEqual([1, 2, 3]);
    await expect(s.put("docs/p1/a.pdf", new Uint8Array([4]))).rejects.toThrow();
    await s.delete("docs/p1/a.pdf");
    await expect(s.get("docs/p1/a.pdf")).rejects.toThrow();
  });

  it("recusa chaves que saem da pasta", async () => {
    const s = new LocalFileStorage(await mkdtemp(path.join(tmpdir(), "conecta-")));
    for (const key of ["../x", "docs/../../x", "/etc/passwd", "Docs/A"]) {
      await expect(s.put(key, new Uint8Array([1]))).rejects.toThrow("Chave de armazenamento inválida.");
    }
  });
});
