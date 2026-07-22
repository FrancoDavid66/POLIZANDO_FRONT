// src/components/polizas/PolizaTable.jsx
import React, { useMemo, memo } from "react";
import { FaBuilding } from "react-icons/fa";
import { HiChevronRight } from "react-icons/hi";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ---------------- Helpers ---------------- */
function toIntOrNaN(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}
function normalizeEstadoCuotasKey(raw) {
  return (raw || "").toString().trim().toLowerCase() || "";
}

const CUOTAS_STYLES = {
  al_dia:     { label: "AL DÍA",           clase: "border-brand-primary/40 text-brand-primary dark:text-brand-primary-tint bg-brand-primary/10" },
  por_vencer: { label: "POR VENCER",       clase: "border-brand-secondary/40 text-brand-secondary dark:text-brand-secondary-tint bg-brand-secondary/10" },
  vence_hoy:  { label: "VENCE HOY",        clase: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10" },
  vencida_7:  { label: "VENCIDA (7 días)", clase: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10" },
  vencida_30: { label: "VENCIDA (30 días)",clase: "border-red-600/50 text-red-700 dark:text-red-400 bg-red-600/10" },
  vencidas:   { label: "VENCIDAS",         clase: "border-red-600/50 text-red-700 dark:text-red-400 bg-red-600/10" },
};

function computeCuotasBadgeFast(poliza) {
  const keyFromBackend = normalizeEstadoCuotasKey(poliza?.estado_cuotas);
  const impagasCount = toIntOrNaN(poliza?.impagas_count ?? poliza?.impagasCount);
  const cuotasArr = Array.isArray(poliza?.cuotas) ? poliza.cuotas : null;

  const countImpagas = () => {
    if (!Number.isNaN(impagasCount)) return Math.max(0, impagasCount);
    if (!cuotasArr) return 0;
    return cuotasArr.filter((c) => !c?.pagado).length;
  };

  const impagas = countImpagas();
  let key = keyFromBackend;

  if (!key) {
    const proxRaw = poliza?.proxima_vencimiento_impaga || poliza?.proximaVencimientoImpaga || poliza?.proxima_vencimiento || null;
    if (impagas <= 0) key = "al_dia";
    else if (proxRaw) {
      const hoy = startOfDay(new Date());
      const prox = startOfDay(new Date(proxRaw));
      if (Number.isNaN(prox.getTime())) key = "vencidas";
      else {
        const d = diffDays(hoy, prox);
        if (d === 0) key = "vence_hoy";
        else if (d > 0) {
          if (d <= 7) key = "vencida_7";
          else if (d <= 30) key = "vencida_30";
          else key = "vencidas";
        } else {
          key = Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
        }
      }
    } else {
      key = impagas <= 0 ? "al_dia" : "vencidas";
    }
  }

  const st = CUOTAS_STYLES[key] || CUOTAS_STYLES.vencidas;
  return { key, label: st.label, clase: st.clase, extra: `${impagas} impagas` };
}

function useCuotasBadge(poliza) {
  return useMemo(() => computeCuotasBadgeFast(poliza), [poliza]);
}

/* ---------------- EstadoPolizaBadge ---------------- */
const EstadoPolizaBadge = memo(function EstadoPolizaBadge({ estado }) {
  const statusStr = (estado || "desconocido").toString().toLowerCase();
  const configs = {
    activa:          { label: "ACTIVA",          clase: "border-brand-primary/40 text-brand-primary dark:text-brand-primary-tint bg-brand-primary/10", dot: "bg-brand-primary" },
    vencida:         { label: "VENCIDA",         clase: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",          dot: "bg-red-500 animate-pulse" },
    cancelada:       { label: "CANCELADA",       clase: "border-brand-100/15 dark:border-brand-200/15 text-brand-100/50 dark:text-brand-200/50 bg-brand-100/5 dark:bg-brand-200/5",             dot: "bg-brand-100/40 dark:bg-brand-200/40" },
    finalizada:      { label: "FINALIZADA",      clase: "border-brand-100/15 dark:border-brand-200/15 text-brand-100/60 dark:text-brand-200/60 bg-brand-100/5 dark:bg-brand-200/5",             dot: "bg-brand-100/40 dark:bg-brand-200/40" },
    en_verificacion: { label: "EN VERIFICACIÓN", clase: "border-brand-secondary/40 text-brand-secondary dark:text-brand-secondary-tint bg-brand-secondary/10",    dot: "bg-brand-secondary animate-pulse" },
  };
  const config = configs[statusStr] || {
    label: statusStr.toUpperCase(), clase: "border-brand-100/15 dark:border-brand-200/15 text-brand-100/60 dark:text-brand-200/60 bg-brand-100/5 dark:bg-brand-200/5", dot: "bg-brand-100/40 dark:bg-brand-200/40",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${config.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
});

/* ---------------- SortHeader ---------------- */
const SortHeader = memo(function SortHeader({ label, field, ordering, onOrderingChange, className = "" }) {
  const isActive = ordering && (ordering === field || ordering === `-${field}`);
  const dir = ordering?.startsWith("-") ? "desc" : "asc";
  const toggle = () => {
    if (!onOrderingChange) return;
    onOrderingChange(isActive && dir === "asc" ? `-${field}` : field);
  };
  return (
    <th
      className={`border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 p-3 text-[10px] font-black uppercase tracking-widest text-brand-100/50 dark:text-brand-200/50 ${onOrderingChange ? "cursor-pointer select-none hover:text-brand-100/80 dark:hover:text-brand-200/80" : ""} ${className}`}
      onClick={toggle}
    >
      <div className="flex items-center gap-1">
        {label} {onOrderingChange && <span className="text-[10px]">{isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>}
      </div>
    </th>
  );
});

/* ---------------- Desktop row ---------------- */
const DesktopRow = memo(function DesktopRow({ poliza, zebra, isWebAdmin }) {
  const cuotasEst = useCuotasBadge(poliza);
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();
  const esVerificacion = (poliza?.estado || "").toLowerCase() === "en_verificacion";

  return (
    <tr className={`transition-colors ${zebra} hover:bg-brand-primary/5 dark:hover:bg-brand-200/5 ${esVerificacion ? "ring-1 ring-inset ring-brand-secondary/30" : ""}`}>
      <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3">
        <Link to={`/polizas/${poliza.id}`} target="_blank" rel="noopener noreferrer" className="block text-sm font-bold text-brand-primary dark:text-brand-primary-tint hover:brightness-110">
          {poliza.numero_poliza || "-"}
        </Link>
        <div className="text-[10px] font-bold uppercase text-brand-100/40 dark:text-brand-200/40">{poliza.compania || "S/C"}</div>
      </td>

      <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3">
        <Link to={`/clientes/${poliza.cliente?.id}`} className="block text-sm font-medium text-brand-100 dark:text-brand-200 hover:text-brand-primary dark:hover:text-brand-primary-tint">
          {clienteNombre || "-"}
        </Link>
        <div className="font-mono text-[10px] text-brand-100/40 dark:text-brand-200/40">{poliza.cliente?.dni_cuit_cuil}</div>
      </td>

      {isWebAdmin && (
        <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-brand-primary/20 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-tint">
              <FaBuilding className="text-[10px]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-brand-primary dark:text-brand-primary-tint">
              {poliza?.oficina_nombre || "LOCAL"}
            </span>
          </div>
        </td>
      )}

      <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3 font-mono text-sm text-brand-100/80 dark:text-brand-200/80">{poliza.patente || "-"}</td>

      <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3">
        <div className="text-xs text-brand-100/80 dark:text-brand-200/80">{poliza.marca}</div>
        <div className="max-w-[120px] truncate text-[10px] text-brand-100/40 dark:text-brand-200/40">{poliza.modelo}</div>
      </td>

      <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3">
        <div className={`inline-flex flex-col rounded border px-2 py-0.5 ${cuotasEst.clase}`}>
          <span className="text-[10px] font-black uppercase tracking-tight">{cuotasEst.label}</span>
          <span className="text-[9px] font-bold uppercase opacity-70">{cuotasEst.extra}</span>
        </div>
      </td>

      <td className="border-b border-brand-100/8 dark:border-brand-200/8 p-3 text-center">
        <EstadoPolizaBadge estado={poliza.estado} />
        {esVerificacion && (
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-brand-secondary dark:text-brand-secondary-tint">
            Verificar con compañía
          </div>
        )}
      </td>
    </tr>
  );
});

/* ---------------- Mobile card ---------------- */
const MobileCard = memo(function MobileCard({ poliza, isWebAdmin }) {
  const cuotasEst = useCuotasBadge(poliza);
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <Link
      to={`/polizas/${poliza.id}`}
      className="block rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-card dark:bg-brand-card-dark p-3.5 transition-colors hover:bg-brand-primary/5 dark:hover:bg-brand-200/5 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-brand-primary dark:text-brand-primary-tint">{poliza.numero_poliza || "Sin número"}</div>
          <div className="text-[10px] font-bold uppercase text-brand-100/40 dark:text-brand-200/40">{poliza.compania || "S/C"}</div>
        </div>
        <EstadoPolizaBadge estado={poliza.estado} />
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="truncate text-sm font-medium text-brand-100 dark:text-brand-200">{clienteNombre || "Sin titular"}</div>
        <div className="text-xs text-brand-100/50 dark:text-brand-200/50">
          {poliza.marca} {poliza.modelo}
          {poliza.patente ? <> · <span className="font-mono uppercase text-brand-100/70 dark:text-brand-200/70">{poliza.patente}</span></> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={`inline-flex flex-col rounded border px-2 py-0.5 ${cuotasEst.clase}`}>
          <span className="text-[10px] font-black uppercase tracking-tight">{cuotasEst.label}</span>
          <span className="text-[9px] font-bold uppercase opacity-70">{cuotasEst.extra}</span>
        </div>
        <div className="flex items-center gap-2">
          {isWebAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-brand-primary dark:text-brand-primary-tint">
              <FaBuilding className="text-[10px]" /> {poliza?.oficina_nombre || "LOCAL"}
            </span>
          )}
          <HiChevronRight className="h-4 w-4 text-brand-100/30 dark:text-brand-200/30" />
        </div>
      </div>
    </Link>
  );
});

/* ---------------- PolizaTable ---------------- */
const PolizaTable = ({
  polizas = [], status = "idle", page = 1, pageSize = 10, total = 0,
  ordering, onOrderingChange, onPageChange, onNext, onPrev,
  cursorEnabled = false, hasNext = false, hasPrev = false,
}) => {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const totalPages = useMemo(() => (cursorEnabled ? 1 : Math.ceil(total / pageSize)), [total, pageSize, cursorEnabled]);
  const isLoading = status === "loading";

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-card dark:bg-brand-card-dark text-brand-100 dark:text-brand-200 shadow-sm">
      {isLoading && <div className="h-1 w-full animate-pulse bg-brand-primary" />}

      {/* ===== Desktop: tabla (md+) ===== */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <SortHeader label="Póliza / Cía" field="numero_poliza" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Cliente" field="cliente__apellido" ordering={ordering} onOrderingChange={onOrderingChange} />
              {isWebAdmin && <SortHeader label="Sucursal" field="oficina__nombre" ordering={ordering} onOrderingChange={onOrderingChange} />}
              <SortHeader label="Patente" field="patente" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Vehículo" field="marca" ordering={ordering} onOrderingChange={onOrderingChange} />
              <th className="border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 p-3 text-[10px] font-black uppercase tracking-widest text-brand-100/50 dark:text-brand-200/50">Estado pago</th>
              <SortHeader label="Estado" field="estado" ordering={ordering} onOrderingChange={onOrderingChange} className="text-center" />
            </tr>
          </thead>
          <tbody>
            {polizas.map((p, i) => (
              <DesktopRow key={p.id} poliza={p} zebra={i % 2 === 0 ? "bg-transparent" : "bg-brand-100/[0.02] dark:bg-brand-200/[0.02]"} isWebAdmin={isWebAdmin} />
            ))}
          </tbody>
        </table>
        {polizas.length === 0 && !isLoading && (
          <div className="py-12 text-center text-sm text-brand-100/40 dark:text-brand-200/40">Sin pólizas para los filtros aplicados.</div>
        )}
      </div>

      {/* ===== Mobile: tarjetas (< md) ===== */}
      <div className="space-y-2.5 p-3 md:hidden">
        {polizas.map((p) => (
          <MobileCard key={p.id} poliza={p} isWebAdmin={isWebAdmin} />
        ))}
        {polizas.length === 0 && !isLoading && (
          <div className="py-10 text-center text-sm text-brand-100/40 dark:text-brand-200/40">Sin pólizas para los filtros aplicados.</div>
        )}
      </div>

      {/* ===== Paginación ===== */}
      <div className="flex items-center justify-between border-t border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] px-4 py-4 sm:px-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">
          {cursorEnabled ? `Registros: ${polizas.length}` : `Página ${page} de ${totalPages} · Total: ${total}`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => (cursorEnabled ? onPrev?.() : onPageChange?.(page - 1))}
            disabled={(cursorEnabled ? !hasPrev : page <= 1) || isLoading}
            className="h-9 rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-brand-100/10 dark:hover:bg-brand-200/10 disabled:opacity-20"
          >
            Anterior
          </button>
          <button
            onClick={() => (cursorEnabled ? onNext?.() : onPageChange?.(page + 1))}
            disabled={(cursorEnabled ? !hasNext : page >= totalPages) || isLoading}
            className="h-9 rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-brand-100/10 dark:hover:bg-brand-200/10 disabled:opacity-20"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolizaTable;