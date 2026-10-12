import { redirect } from "next/navigation";

/**
 * Product scripts were merged into the Products & Scripts surface (merge A).
 * The old URL still works by forwarding administrators to the Scripts tab.
 */
export default function ProductScriptsRedirectPage() {
  redirect("/products?tab=scripts");
}
