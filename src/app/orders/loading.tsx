import { Surface } from "@/components/ui/Surface";

export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-screen-xl space-y-6 animate-pulse" aria-label="Loading orders">
      <div className="h-24"><Surface variant="page" className="w-full" /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[420px]"><Surface variant="table" className="w-full" /></div>
        <div className="h-64"><Surface variant="page" className="w-full" /></div>
      </div>
    </div>
  );
}
