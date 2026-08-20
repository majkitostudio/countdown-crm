import { LoaderCircle } from "lucide-react";

export default function OrdersLoading() {
  return (
    <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-zinc-500">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      Loading Order Pipeline...
    </div>
  );
}
