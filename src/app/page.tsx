import { redirect } from "next/navigation";
import { getRoleHomePath } from "@/lib/auth/roleHome";
import { requireWorkspaceContext } from "@/lib/dal/workspace";

export default async function Home() {
  const context = await requireWorkspaceContext();
  redirect(getRoleHomePath(context.role));
}
