// src/components/renovaciones/RenovacionesToolbar.jsx
//
// UNIFICADO: reemplaza RenovacionesTabs + RenovacionesFiltersBar + ProgresoDelDia.
// Expone un solo componente <RenovacionesToolbar/> que arma:
//   - Buscador + selector de sucursal (solo admin)   [ex RenovacionesFiltersBar]
//   - Tabs: Renovar hoy / En 3 días / Vencidas        [ex RenovacionesTabs]
//   - Resumen en línea + progreso del día             [ex ProgresoDelDia]
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  HiSearch, HiX, HiOfficeBuilding,
  HiClock, HiClipboardCheck, HiExclamationCircle,
} from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");
const DEBOUNCE_MS = 250;

/* ══════════ Buscador + sucursal (ex FiltersBar) ══════════ */
function FiltersBar({
  loading, search, setSearch, oficina, setOficina,
  oficinasOptions = [], isWebAdmin, totalCount = 0,
}) {
  const [localSearch, setLocalSearch] = useState(search || "");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (search === "" && localSearch !== "") setLocalSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const commitSearch = useCallback(
    (value) => {
      setSearch((value ?? "").trim());
      setIsTyping(false);
    },
    [setSearch]
  );

  const onSearchChange = useCallback(
    (val) => {
      setLocalSearch(val);
      setIsTyping(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commitSearch(val), DEBOUNCE_MS);
    },
    [commitSearch]
  );

  const clearSearch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalSearch("");
    commitSearch("");
  }, [commitSearch]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const searchHint = useMemo(() => {
    const trimmed = (localSearch || "").trim();
    if (!trimmed) return null;
    if (isTyping) return { text: "Escribiendo…", color: "text-white/40" };
    if (loading) return { text: `Buscando "${trimmed}"…`, color: "text-sky-300" };
    if (totalCount === 0) return { text: `Sin resultados para "${trimmed}"`, color: "text-amber-300" };
    return {
      text: `${totalCount} resultado${totalCount === 1 ? "" : "s"} para "${trimmed}"`,
      color: "text-emerald-300",
    };
  }, [isTyping, loading, localSearch, totalCount]);

  return (
    <div className="space-y-2.5">
      {/* Buscador */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {isTyping ? <Spinner /> : <HiSearch className="text-white/40" />}
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (timerRef.current) clearTimeout(timerRef.current);
              commitSearch(localSearch);
            }
            if (e.key === "Escape" && localSearch) clearSearch();
          }}
          placeholder="Buscar por asegurado, patente, póliza, compañía…"
          aria-label="Buscar renovaciones"
          className="w-full bg-white/[0.04] border border-white/10 text-white text-sm rounded-xl pl-10 pr-20 py-2.5 outline-none focus:border-sky-400/40 focus:bg-white/[0.06] transition-colors"
        />
        {localSearch && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-3 flex items-center gap-1 text-xs text-white/50 hover:text-white"
            title="Limpiar (Esc)"
            aria-label="Limpiar búsqueda"
          >
            <HiX />
          </button>
        )}
      </div>

      {searchHint && (
        <div className={`text-[10px] font-medium ml-1 -mt-1 ${searchHint.color} flex items-center gap-1`}>
          {searchHint.text}
        </div>
      )}

      {/* Sucursal (solo admin) */}
      {isWebAdmin && (
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <HiOfficeBuilding className="text-white/40" />
          </div>
          <select
            value={String(oficina || "")}
            onChange={(e) => setOficina(String(e.target.value || ""))}
            disabled={loading}
            aria-label="Filtrar por sucursal"
            className="w-full bg-white/[0.04] border border-white/10 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-sky-400/40 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer disabled:opacity-50"
          >
            <option value="" className="bg-slate-900 text-white">Todas las sucursales</option>
            {(Array.isArray(oficinasOptions) ? oficinasOptions : []).map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-sky-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/* ══════════ Tabs (ex RenovacionesTabs) ══════════ */
const TABS = [
  { id: "renovar_hoy", label: "Renovar hoy", icon: HiClock,            desc: "Pólizas que vencen hoy",                    tone: "amber" },
  { id: "en_3_dias",   label: "En 3 días",   icon: HiClipboardCheck,   desc: "Vencen dentro de los próximos 3 días",      tone: "sky" },
  { id: "vencidas",    label: "Vencidas",    icon: HiExclamationCircle, desc: "Se te pasó renovarlas",                    tone: "rose" },
];

function tabToneActive(tone) {
  switch (tone) {
    case "amber": return "border-amber-400/50 bg-amber-500/15 text-amber-100";
    case "sky":   return "border-sky-400/50 bg-sky-500/15 text-sky-100";
    case "rose":  return "border-rose-400/50 bg-rose-500/15 text-rose-100";
    default:      return "border-white/30 bg-white/10 text-white";
  }
}

function Tabs({ activeTab = "renovar_hoy", onChange, counts = {} }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        const count = Number(counts?.[t.id] || 0);
        return (
          <button
            key={t.id}
            type="button"
            title={t.desc}
            onClick={() => onChange?.(t.id)}
            aria-pressed={active}
            className={cx(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
              active ? tabToneActive(t.tone) : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white/80"
            )}
          >
            <Icon className="text-base" />
            <span>{t.label}</span>
            <span className={cx(
              "rounded-full px-1.5 py-0 text-[11px] font-black min-w-[22px] text-center tabular-nums",
              active ? "bg-black/25" : "bg-black/20"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════ Resumen en línea + progreso (ex ProgresoDelDia) ══════════ */
function ResumenInline({ tab, kpis }) {
  const N = ({ children, tone = "white" }) => {
    const map = { white: "text-white", amber: "text-amber-300", rose: "text-rose-300" };
    return <span className={cx("font-bold tabular-nums", map[tone])}>{children}</span>;
  };

  if (tab === "vencidas") {
    return (
      <span className="text-xs text-white/55">
        <N tone="rose">{kpis.total}</N> sin renovar · <N tone="amber">{kpis.masDe30}</N> hace 30+ días
      </span>
    );
  }
  const label = tab === "renovar_hoy" ? "para renovar hoy" : "para los próximos 3 días";
  return (
    <span className="text-xs text-white/55">
      <N>{kpis.total}</N> {label}
    </span>
  );
}

function ProgresoDelDia({ hechasHoy = 0, pendientesTotales = 0 }) {
  const meta = Math.max(1, pendientesTotales + hechasHoy);
  const pct = Math.min(100, Math.round((hechasHoy / meta) * 100));
  const completo = pendientesTotales === 0 && hechasHoy > 0;

  return (
    <div className="flex items-center gap-2 text-xs text-white/50 whitespace-nowrap">
      <span>
        Hoy gestionaste <span className="font-bold text-white/80 tabular-nums">{hechasHoy}</span>
      </span>
      <span className="relative inline-block h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
        <span
          className={completo ? "absolute inset-y-0 left-0 rounded-full bg-amber-400" : "absolute inset-y-0 left-0 rounded-full bg-emerald-400"}
          style={{ width: `${pct}%` }}
        />
      </span>
      {completo && <span className="text-amber-300 font-semibold">¡Listo!</span>}
    </div>
  );
}

/* ══════════ Toolbar (público) ══════════ */
export default function RenovacionesToolbar({
  // filtros
  loading, search, setSearch, oficina, setOficina, oficinasOptions, isWebAdmin, totalCount,
  // tabs
  tab, onTabChange, tabCounts,
  // resumen + progreso
  kpis, hechasHoy, pendientesTotales,
}) {
  return (
    <div className="mt-4 space-y-3">
      <FiltersBar
        loading={loading}
        search={search}
        setSearch={setSearch}
        oficina={oficina}
        setOficina={setOficina}
        oficinasOptions={oficinasOptions}
        isWebAdmin={isWebAdmin}
        totalCount={totalCount}
      />

      <Tabs activeTab={tab} onChange={onTabChange} counts={tabCounts} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ResumenInline tab={tab} kpis={kpis} />
        <ProgresoDelDia hechasHoy={hechasHoy} pendientesTotales={pendientesTotales} />
      </div>
    </div>
  );
}