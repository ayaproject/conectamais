import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function audit(
  tx: Tx,
  entry: { actorId: string | null; action: string; entityType: string; entityId: string; details?: Prisma.InputJsonValue },
) {
  await tx.auditLog.create({ data: entry });
}
