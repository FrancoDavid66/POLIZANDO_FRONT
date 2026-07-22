// src/components/polizas/PolizaFilter.jsx
import React, { useMemo, useState, useEffect } from "react";
import { HiSearch } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";

/** Estados (chips) para modo "cuotas" */
const ESTADOS_CUOTAS = [
  { key: "todos", label: "TODAS" },
  { key: "al_dia", label: "AL DÍA" },
  { key: "por_vencer", label: "POR VENCER" },
  { key: "vence_hoy", label: "VENCE HOY" },
  { key: "vencida_7", label: "VENCIDA (7 días)" },
  { key: "vencida_30", label: "VENCIDA (30 días)" },
  { key: "vencidas", label: "VENCIDAS" },
];

/** Estados (chips) para modo "polizas" */
const ESTADOS_POLIZAS = [
  { key: "todos", label: "TODAS" },
  { key: "activa", label: "ACTIVAS" },
  { key: "vencida", label: "VENCIDAS" },
  { key: "cancelada", label: "CANCELADAS" },
  { key: "finalizada", label: "FINALIZADAS" },
  { key: "en_verificacion", label: "EN VERIFICACIÓN" },
];

/** Estados FINANCIEROS (mora) */
const ESTADOS_FINANCIEROS = [
  { key: "todos", label: "TODAS" },
  { key: "al_dia", label: "AL DÍA" },
  { key: "mora_1_30", label: "1–30" },
  { key: "mora_31_60", label: "31–60" },
  { key: "mora_61_90", label: "61–90" },
  { key: "mora_90_mas", label: "90+" },
];

const DOT_CUOTAS = {
  todos: "bg-brand-100/30 dark:bg-brand-200/30", al_dia: "bg-brand-primary", por_vencer: "bg-brand-secondary",
  vence_hoy: "bg-red-500", vencida_7: "bg-red-500", vencida_30: "bg-red-600", vencidas: "bg-red-600",
};
const DOT_POLIZAS = {
  todos: "bg-brand-100/30 dark:bg-brand-200/30", activa: "bg-brand-primary", vencida: "bg-red-600",
  cancelada: "bg-brand-100/30 dark:bg-brand-200/30", finalizada: "bg-brand-100/30 dark:bg-brand-200/30", en_verificacion: "bg-brand-secondary",
};
const DOT_FINANCIERO = {
  todos: "bg-brand-100/30 dark:bg-brand-200/30", al_dia: "bg-brand-primary", mora_1_30: "bg-brand-secondary",
  mora_31_60: "bg-red-500", mora_61_90: "bg-red-500", mora_90_mas: "bg-red-600",
};

const LEGACY_COMPANIAS = [
  "Agrosalta", "ATM", "Equidad", "Federacion Patronal", "La Equidad", "NRE", "Providencia",
];

const chipBase = "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition";
const chipActive = "border-brand-primary/80 bg-brand-primary text-white shadow-lg shadow-brand-primary/30";
const chipIdle = "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/70 dark:text-brand-200/70 hover:bg-brand-100/10 dark:hover:bg-brand-200/10";
const countBadge = (active) =>
  `ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-[10px] ${active ? "border-white/25 bg-white/20 text-white" : "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/8 dark:bg-brand-200/8 text-brand-100/60 dark:text-brand-200/60"}`;

export default function PolizaFilter({
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  onClearSearchApplied,
  searchApplied = "",
  estadoActual = "todos",
  onEstadoChange,
  estadoFinancieroActual = "todos",
  onEstadoFinancieroChange,
  pageSize = 10,
  onPageSizeChange,
  totalFiltradas,
  modoActual: modoProp,
  onModoChange,
  resumenCuotas,
  resumenPolizas,
  kpis = {},
  fechaVencimientoDesde = "",
  fechaVencimientoHasta = "",
  onFechaVencimientoDesdeChange,
  onFechaVencimientoHastaChange,
  vencidasUltimosDias = "",
  vencidasMasDeDias = "",
  onVencidasUltimosDiasChange,
  onVencidasMasDeDiasChange,
  onClearVencimientoFilters,
  oficinaActual = "ALL",
  onOficinaChange,
  companiaActual = "",
  onCompaniaChange,
  onVerUltimas,
  status = "idle",
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN";

  const [oficinasList, setOficinasList] = useState([]);
  const [companiasList, setCompaniasList] = useState([]);

  const [modoLocal, setModoLocal] = useState(modoProp || "cuotas");
  useEffect(() => { if (modoProp) setModoLocal(modoProp); }, [modoProp]);
  const modoActual = modoProp || modoLocal;

  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => { setLocalValue(searchValue || ""); }, [searchValue]);
  useEffect(() => { onSearchChange?.(localValue); }, [localValue, onSearchChange]);

  useEffect(() => {
    api.get("companias/").then((res) => {
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const dinamicas = arr.filter((c) => c.activa).map((c) => c.nombre);
      const unificadas = Array.from(new Set([...LEGACY_COMPANIAS, ...dinamicas])).sort();
      setCompaniasList(unificadas);
    }).catch((e) => console.warn("Error cargando aseguradoras", e));

    if (isWebAdmin) {
      PolizasAPI.listOficinas().then((res) => {
        setOficinasList(Array.isArray(res) ? res : res.results || []);
      }).catch((e) => console.warn("Error cargando sucursales", e));
    }
  }, [isWebAdmin]);

  const botones = useMemo(() => (modoActual === "polizas" ? ESTADOS_POLIZAS : ESTADOS_CUOTAS), [modoActual]);
  const dotClass = modoActual === "polizas" ? DOT_POLIZAS : DOT_CUOTAS;

  const resumenPolizasDesdeKpis = useMemo(() => {
    if (!kpis) return undefined;
    const activas = (kpis.activas_al_dia ?? 0) + (kpis.activas_mora_1_30 ?? 0) + (kpis.activas_mora_31_60 ?? 0) + (kpis.activas_mora_61_90 ?? 0) + (kpis.activas_mora_90_mas ?? 0);
    return { todos: kpis.total ?? undefined, activa: activas, vencida: kpis.vencidas ?? undefined, cancelada: kpis.canceladas ?? undefined, finalizada: kpis.finalizadas ?? undefined };
  }, [kpis]);

  const resumen = modoActual === "polizas" ? resumenPolizasDesdeKpis || resumenPolizas || {} : resumenCuotas || {};
  const clearSearch = () => setLocalValue("");

  const kpisCount = useMemo(() => ({
    todos: kpis?.total ?? undefined, al_dia: kpis?.activas_al_dia ?? undefined, mora_1_30: kpis?.activas_mora_1_30 ?? undefined,
    mora_31_60: kpis?.activas_mora_31_60 ?? undefined, mora_61_90: kpis?.activas_mora_61_90 ?? undefined, mora_90_mas: kpis?.activas_mora_90_mas ?? undefined,
  }), [kpis]);

  const isPreset3 = String(vencidasUltimosDias || "") === "3";
  const isPreset7 = String(vencidasUltimosDias || "") === "7";
  const isPreset30 = String(vencidasUltimosDias || "") === "30";
  const isPresetMas30 = String(vencidasMasDeDias || "") === "30";
  const anyRange = Boolean(fechaVencimientoDesde || fechaVencimientoHasta);
  const anyPreset = Boolean(vencidasUltimosDias || vencidasMasDeDias);
  const clearVencimiento = () => onClearVencimientoFilters?.();

  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => {
    if (estadoFinancieroActual !== "todos" || anyRange || anyPreset) setShowAdvanced(true);
  }, [estadoFinancieroActual, anyRange, anyPreset]);

  const isLoading = status === "loading";
  const selectCls = "h-10 rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-3 text-xs md:text-sm font-bold outline-none focus:border-brand-primary/50 cursor-pointer";

  return (
    <div className="space-y-3 rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-card dark:bg-brand-card-dark p-3 text-brand-100 dark:text-brand-200 shadow-sm md:p-4">
      {/* ===== Buscador grande (fila propia) ===== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <HiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-100/40 dark:text-brand-200/40" />
          <input
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
            placeholder="Buscar póliza por patente, nombre o DNI..."
            className="w-full rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.03] dark:bg-brand-200/[0.03] py-3.5 pl-12 pr-4 text-base text-brand-100 dark:text-brand-200 outline-none placeholder:text-brand-100/30 dark:placeholder:text-brand-200/30 focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={() => onSearchSubmit?.()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-primary-deep disabled:opacity-60 sm:text-base"
        >
          <HiSearch className="h-5 w-5" /> {isLoading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* ===== Fila de selects + acciones ===== */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2">
          {isWebAdmin && onOficinaChange && (
            <select value={oficinaActual} onChange={(e) => onOficinaChange(e.target.value)} className={`${selectCls} text-brand-secondary dark:text-brand-secondary-tint`}>
              <option value="ALL" className="bg-brand-card-dark text-brand-200">Todas las sucursales</option>
              {oficinasList.map((o) => <option key={o.id} value={o.id} className="bg-brand-card-dark text-brand-200">{o.nombre}</option>)}
            </select>
          )}

          {onCompaniaChange !== undefined && (
            <select value={companiaActual} onChange={(e) => onCompaniaChange(e.target.value)} className={`${selectCls} text-brand-primary dark:text-brand-primary-tint`}>
              <option value="" className="bg-brand-card-dark text-brand-200">Todas las aseguradoras</option>
              {companiasList.map((c) => <option key={c} value={c} className="bg-brand-card-dark text-brand-200">{c}</option>)}
            </select>
          )}

          {localValue && (
            <button type="button" onClick={clearSearch} disabled={isLoading} className="rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-3 py-2 text-xs hover:bg-brand-100/10 dark:hover:bg-brand-200/10 md:text-sm">Limpiar</button>
          )}
          {!!searchApplied && (
            <button type="button" onClick={() => onClearSearchApplied?.()} disabled={isLoading} className="rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-3 py-2 text-xs text-brand-primary dark:text-brand-primary-tint hover:bg-brand-primary/15 md:text-sm">Quitar búsqueda</button>
          )}
          {typeof onVerUltimas === "function" && (
            <button type="button" onClick={() => onVerUltimas?.()} disabled={isLoading} className="rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-3 py-2 text-xs hover:bg-brand-100/10 dark:hover:bg-brand-200/10 md:text-sm">Ver últimas</button>
          )}
          {typeof totalFiltradas === "number" && (
            <span className="ml-1 text-xs text-brand-100/50 dark:text-brand-200/50 md:text-sm">{totalFiltradas} resultados</span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onModoChange && (
            <div className="inline-flex overflow-hidden rounded-full border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-xs md:text-sm">
              <button type="button" onClick={() => onModoChange?.("polizas")} className={`px-3 py-1.5 transition ${modoActual === "polizas" ? "bg-brand-primary text-white" : "text-brand-100/70 dark:text-brand-200/70 hover:bg-brand-100/10 dark:hover:bg-brand-200/10"}`}>Pólizas</button>
              <button type="button" onClick={() => onModoChange?.("cuotas")} className={`border-l border-brand-100/10 dark:border-brand-200/10 px-3 py-1.5 transition ${modoActual === "cuotas" ? "bg-brand-primary text-white" : "text-brand-100/70 dark:text-brand-200/70 hover:bg-brand-100/10 dark:hover:bg-brand-200/10"}`}>Cuotas</button>
            </div>
          )}
          {onPageSizeChange && (
            <select value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))} disabled={isLoading} className="cursor-pointer rounded-full border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-3 py-1.5 text-xs outline-none md:text-sm">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n} className="bg-brand-card-dark text-brand-200">{n} / pág.</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-100/50 dark:text-brand-200/50 md:text-xs">
        <span className="flex items-center gap-2">
          <span>Modo: <strong className="uppercase text-brand-100 dark:text-brand-200">{modoActual}</strong></span>
          <span className="opacity-40">|</span>
          <span>Sucursal: <strong className="uppercase text-brand-primary dark:text-brand-primary-tint">{user?.perfil?.oficina_nombre || "Local"}</strong></span>
        </span>
        {!!searchApplied && <span className="opacity-80">Búsqueda aplicada: <b className="text-brand-100 dark:text-brand-200">{searchApplied}</b></span>}
      </div>

      {/* Chips estado */}
      <div className="mt-1 flex flex-wrap gap-2">
        {botones.map(({ key, label }) => {
          const active = estadoActual === key;
          const count = modoActual === "cuotas" && key === "todos" ? (typeof totalFiltradas === "number" ? totalFiltradas : resumen?.todos) : resumen?.[key] ?? undefined;
          return (
            <button key={key} type="button" onClick={() => onEstadoChange?.(key)} disabled={isLoading} className={`${chipBase} ${active ? chipActive : chipIdle}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass[key] || "bg-brand-100/30 dark:bg-brand-200/30"}`} />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === "number" && <span className={countBadge(active)}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Avanzados solo modo pólizas */}
      {modoActual === "polizas" && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02]">
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-brand-100/5 dark:hover:bg-brand-200/5 md:text-sm">
            <span className="flex items-center gap-2 text-brand-100 dark:text-brand-200"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/15 text-[10px] text-brand-primary dark:text-brand-primary-tint">⚙</span>Filtros avanzados (mora y vencimiento)</span>
            <span className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : "rotate-0"}`}>▶</span>
          </button>

          {showAdvanced && (
            <div className="space-y-4 border-t border-brand-100/10 dark:border-brand-200/10 px-3 py-3">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-100/40 dark:text-brand-200/40 md:text-xs">Estado financiero (mora)</div>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_FINANCIEROS.map(({ key, label }) => {
                    const active = estadoFinancieroActual === key;
                    const count = kpisCount[key];
                    return (
                      <button key={key} type="button" onClick={() => onEstadoFinancieroChange?.(key)} disabled={isLoading} className={`${chipBase} ${active ? chipActive : chipIdle}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${DOT_FINANCIERO[key] || "bg-brand-100/30 dark:bg-brand-200/30"}`} />
                        <span>{label}</span>
                        {typeof count === "number" && <span className={countBadge(active)}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="grid w-full grid-cols-1 gap-3 md:max-w-[520px] md:grid-cols-2">
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1.5 font-medium text-brand-100/50 dark:text-brand-200/50">Vencimiento desde</span>
                      <input type="date" value={fechaVencimientoDesde || ""} onChange={(e) => onFechaVencimientoDesdeChange?.(e.target.value)} disabled={isLoading} className="cursor-pointer rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.03] dark:bg-brand-200/[0.03] px-3 py-2 text-xs text-brand-100 dark:text-brand-200 outline-none transition-all focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/30 md:text-sm" />
                    </label>
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1.5 font-medium text-brand-100/50 dark:text-brand-200/50">Vencimiento hasta</span>
                      <input type="date" value={fechaVencimientoHasta || ""} onChange={(e) => onFechaVencimientoHastaChange?.(e.target.value)} disabled={isLoading} className="cursor-pointer rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.03] dark:bg-brand-200/[0.03] px-3 py-2 text-xs text-brand-100 dark:text-brand-200 outline-none transition-all focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/30 md:text-sm" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="text-[11px] font-bold uppercase tracking-tighter text-brand-100/40 dark:text-brand-200/40 md:text-xs">Atajos:</span>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(3)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset3 ? "border-brand-primary bg-brand-primary text-white" : "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-brand-100 dark:text-brand-200 hover:bg-brand-100/10 dark:hover:bg-brand-200/10"}`}>3d</button>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(7)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset7 ? "border-brand-primary bg-brand-primary text-white" : "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-brand-100 dark:text-brand-200 hover:bg-brand-100/10 dark:hover:bg-brand-200/10"}`}>7d</button>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(30)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset30 ? "border-brand-primary bg-brand-primary text-white" : "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-brand-100 dark:text-brand-200 hover:bg-brand-100/10 dark:hover:bg-brand-200/10"}`}>30d</button>
                    <button type="button" onClick={() => onVencidasMasDeDiasChange?.(30)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPresetMas30 ? "border-red-500 bg-red-600 text-white" : "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-brand-100 dark:text-brand-200 hover:bg-brand-100/10 dark:hover:bg-brand-200/10"}`}>&gt;30d</button>
                    <button type="button" onClick={clearVencimiento} disabled={(!anyRange && !anyPreset) || isLoading} className={`ml-1 rounded-full border px-3 py-1.5 text-xs transition ${anyRange || anyPreset ? "border-brand-primary bg-brand-primary text-white" : "border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/40 dark:text-brand-200/40"}`}>Limpiar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}