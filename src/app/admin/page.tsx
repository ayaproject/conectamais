import { redirect } from "next/navigation";
import { requirePrincipal } from "@/server/auth/session";
import { adminAreasFor } from "@/domain/admin-areas";

export default async function Page() {
  const areas = adminAreasFor(await requirePrincipal());
  redirect(areas[0]?.href ?? "/conta");
}
