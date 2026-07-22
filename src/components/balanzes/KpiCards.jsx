// src/components/balanzes/KpiCards.jsx
// 🚀 Tarjetas KPI de Balances (extraídas de BalancesPage)
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* Card individual — etiqueta tenue, número grande y claro */
export function KpiCard({ title, value, variant = "blue" }) {
  const variants = {
    green: "from-emerald-500/15 to-emerald-500/[0.04] border-emerald-500/30",
    red: "from-rose-500/15 to-rose-500/[0.04] border-rose-500/30",
    blue: "from-sky-500/15 to-sky-500/[0.04] border-sky-500/30",
    amber: "from-amber-500/15 to-amber-500/[0.04] border-amber-500/30",
  };
  return (
    <div className={`bg-gradient-to-br ${variants[variant]} border px-4 py-3 rounded-2xl shadow-sm min-w-0 flex flex-col justify-center`}>
      <h3 className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-400 truncate" title={title}>
        {title}
      </h3>
      <p className="text-lg sm:text-2xl font-black mt-1 tracking-tight text-zinc-50 truncate">
        ${fmtMoney(value)}
      </p>
    </div>
  );
}

/* Fila de KPIs (Admin) — 2 bloques: Ingresos / Egresos y resultado */
export function KpiRowGroup({ title, metrics, suffix, highlight }) {
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${highlight ? "border-sky-500/40 bg-sky-500/[0.04]" : "border-zinc-800 bg-zinc-950/40"}`}>
      {/* Encabezado de la sucursal: el (Día/Mes) se muestra UNA sola vez acá */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${highlight ? "border-sky-500/30" : "border-zinc-800/80"}`}>
        <span className="text-base shrink-0">{highlight ? "🌍" : "🏢"}</span>
        <h2 className={`text-sm font-bold tracking-wide truncate ${highlight ? "text-sky-300" : "text-zinc-200"}`}>
          {title}
        </h2>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
          {suffix}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Bloque 1: Ingresos */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-2">Ingresos</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard title="Total" value={metrics.tIn} variant="green" />
            <KpiCard title="Efectivo" value={metrics.tInEfe} variant="green" />
            <KpiCard title="Transferencia" value={metrics.tInTransf} variant="green" />
          </div>
        </div>

        {/* Bloque 2: Egresos y resultado */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Egresos y resultado</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard title="Egresos" value={metrics.tEg} variant="red" />
            <KpiCard title="Neto" value={metrics.tBal} variant="blue" />
            <KpiCard title="Caja Chica" value={metrics.tCajaChica} variant="amber" />
          </div>
        </div>
      </div>
    </div>
  );
}