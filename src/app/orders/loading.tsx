export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-screen-xl space-y-6 animate-pulse" aria-label="Loading orders">
      <div className="h-24 rounded-2xl border border-zinc-800/80 bg-zinc-900/40" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[420px] rounded-2xl border border-zinc-800/80 bg-zinc-900/40" />
        <div className="h-64 rounded-2xl border border-zinc-800/80 bg-zinc-900/40" />
      </div>
    </div>
  );
}
