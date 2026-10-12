import { redirect } from "next/navigation";

/**
 * Analytics was merged into Reports (Dashboard + Analytics). Keep the old URL
 * working by sending visitors straight to the Revenue & Team tab.
 */
export default function AnalyticsRedirectPage() {
  redirect("/dashboard?tab=revenue");
}