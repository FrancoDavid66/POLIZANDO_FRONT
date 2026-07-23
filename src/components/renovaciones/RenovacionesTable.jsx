// src/components/renovaciones/RenovacionesTable.jsx
//
// Tabla simple de renovaciones (sin animaciones ni efectos).
// Columnas: Patente · Compañía · Asegurado · Vto · Estado · Acciones
//
// Botones HTML normales con onClick directo (sin Framer Motion), para que
// los clicks respondan siempre.

import dayjs from "dayjs";
import {
  HiRefresh,
  HiX,
  HiEye,
  HiXCircle,
  HiArrowLeft,
  HiClock,
} from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

const MOTIVO_LABEL = {
  CAMBIO_COMPANIA: "Cambió de compañía",
  VENDIO_AUTO: "Vendió el auto",
  NO_QUIERE: "No quiere seguir",
  NO_CONTESTA: "No contesta",
  NO_PAGO: "No pagó",
  OTRO: "Otro",
};

function getVencimiento(p) {
  return (
    p?.ultima_cuota_vencimiento ||
    p?.vto_referencia ||
    p?.fecha_vencimiento ||
    p?.proxima_vencimiento_impaga ||
    null
  );
}

function formatVto(v) {
  if (!v) return "—";
  try {
    return dayjs(v).format("DD/MM/YY");
  } catch {
    return String(v);
  }
}

function getNombreCompleto(cliente) {
  if (!cliente) return "—";
  const ap = cliente.apellido || "";
  const no = cliente.nombre || "";
  if (ap && no) return `${ap}, ${no}`;
  return ap || no || "—";
}

function getCompania(p) {
  return p?.compania_nombre || p?.compania || "—";
}

// ─────────────────────────────────────────────────────────
// Una fila
// ─────────────────────────────────────────────────────────
function RenovacionRow({
  p,
  submitting,
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
  onVerificar,
  onDesVerificar,
}) {
  const verificada = !!p?.renovacion_verificada;
  const descartada = !!p?.renovacion_descartada;
  const motivo = p?.renovacion_descartada_motivo;
  const motivoLabel = MOTIVO_LABEL[motivo] || motivo || "";
  const detalle = p?.renovacion_descartada_detalle || "";

  const rowClass = cx(
    "border-t border-brand-200/5 transition-colors border-l-[3px]",
    descartada
      ? "border-l-red-500 bg-red-500/[0.06] hover:bg-red-500/[0.10]"
      : verificada
      ? "border-l-brand-secondary bg-brand-secondary/[0.05] hover:bg-brand-secondary/[0.09]"
      : "border-l-transparent hover:bg-brand-primary/[0.06]"
  );

  const textClass = descartada ? "line-through text-brand-200/45" : "text-brand-200/95";

  // Botón cuadrado de ícono reutilizable
  const IconBtn = ({ onClick, title, disabled, className, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cx(
        "inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <tr className={rowClass}>
      {/* Patente */}
      <td className={cx("px-3 py-3 font-bold tabular-nums tracking-wider", textClass)}>
        {verificada && !descartada && (
          <HiClock className="inline mr-1.5 align-middle text-brand-secondary-tint text-base" title="En seguimiento" />
        )}
        {p?.patente || "—"}
      </td>

      {/* Compañía */}
      <td className={cx("px-3 py-3", textClass)}>{getCompania(p)}</td>

      {/* Asegurado */}
      <td className={cx("px-3 py-3", textClass)}>
        <div className="truncate max-w-[260px]" title={getNombreCompleto(p?.cliente)}>
          {getNombreCompleto(p?.cliente)}
        </div>
      </td>

      {/* Vto */}
      <td className={cx("px-3 py-3 text-xs tabular-nums whitespace-nowrap", textClass)}>
        {formatVto(getVencimiento(p))}
      </td>

      {/* Estado */}
      <td className="px-3 py-3">
        {descartada ? (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 text-[10px] font-bold px-2 py-0.5 w-fit">
              <HiXCircle /> No renueva
            </span>
            {motivoLabel && (
              <span className="text-[10px] text-red-300/70" title={detalle}>
                {motivoLabel}
                {detalle ? ` · ${detalle.slice(0, 40)}${detalle.length > 40 ? "…" : ""}` : ""}
              </span>
            )}
          </div>
        ) : verificada ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-secondary/20 border border-brand-secondary/40 text-brand-secondary-tint text-[10px] font-bold px-2 py-0.5">
            <HiClock /> En seguimiento
          </span>
        ) : (
          <span className="text-[10px] text-brand-200/30">—</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {descartada ? (
            <button
              type="button"
              onClick={() => onDesmarcarNoRenueva?.(p)}
              disabled={submitting}
              title="Revertir 'no renueva'"
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200/20 bg-brand-200/8 px-3 py-1.5 text-xs font-bold text-brand-200/85 hover:bg-brand-200/15 transition-colors disabled:opacity-40"
            >
              <HiArrowLeft /> Revertir
            </button>
          ) : (
            <>
              {/* Renovar (principal, con texto) */}
              <button
                type="button"
                onClick={() => onRenovar?.(p)}
                disabled={submitting}
                title="Renovar póliza"
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-primary/40 bg-brand-primary/20 px-3 py-1.5 text-xs font-bold text-brand-primary-tint hover:bg-brand-primary/30 hover:border-brand-primary/60 transition-colors disabled:opacity-40"
              >
                <HiRefresh /> Renovar
              </button>

              {/* Seguimiento (toggle) */}
              <IconBtn
                onClick={() => (verificada ? onDesVerificar?.(p) : onVerificar?.(p))}
                disabled={submitting}
                title={verificada ? "Quitar de seguimiento" : "Marcar en seguimiento"}
                className={
                  verificada
                    ? "border-brand-secondary/60 bg-brand-secondary/30 text-brand-secondary-tint hover:bg-brand-secondary/40"
                    : "border-brand-200/20 bg-brand-200/8 text-brand-200/80 hover:bg-brand-200/15 hover:border-brand-200/35"
                }
              >
                <HiClock />
              </IconBtn>

              {/* No renovar */}
              <IconBtn
                onClick={() => onMarcarNoRenueva?.(p)}
                disabled={submitting}
                title="Marcar que no va a renovar"
                className="border-red-400/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:border-red-400/60"
              >
                <HiX />
              </IconBtn>

              {/* Ver detalle */}
              <a
                href={`/polizas/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver detalle (nueva pestaña)"
                aria-label="Ver detalle"
                className={cx(
                  "inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors",
                  "border-brand-primary/40 bg-brand-primary/15 text-brand-primary-tint hover:bg-brand-primary/25 hover:border-brand-primary/60",
                  submitting && "pointer-events-none opacity-40"
                )}
              >
                <HiEye />
              </a>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────
export default function RenovacionesTable({
  items = [],
  loading = false,
  submitting = false,
  tab = "renovar_hoy",
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
  onVerificar,
  onDesVerificar,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.02] p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-primary/30 border-t-brand-primary" />
        <p className="mt-3 text-sm text-brand-200/60">Cargando renovaciones…</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    const empty = {
      renovar_hoy: { icon: "🎉", text: "No hay pólizas que venzan hoy." },
      en_3_dias: { icon: "🎉", text: "Nada vence en los próximos 3 días." },
      vencidas: { icon: "✅", text: "No tenés pólizas sin renovar." },
    }[tab] || { icon: "—", text: "Sin resultados." };

    return (
      <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.02] p-12 text-center">
        <div className="text-4xl mb-2">{empty.icon}</div>
        <p className="text-sm text-brand-200/60">{empty.text}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200/15 bg-brand-card-dark/60 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-200/[0.04] border-b border-brand-200/10">
            <tr>
              {["Patente", "Compañía", "Asegurado", "Vto", "Estado"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-brand-200/50"
                >
                  {h}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-brand-200/50">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <RenovacionRow
                key={p.id}
                p={p}
                submitting={submitting}
                onRenovar={onRenovar}
                onMarcarNoRenueva={onMarcarNoRenueva}
                onDesmarcarNoRenueva={onDesmarcarNoRenueva}
                onVerificar={onVerificar}
                onDesVerificar={onDesVerificar}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con conteo */}
      <div className="border-t border-brand-200/10 bg-brand-card-dark/80 px-3 py-2 text-[11px] text-brand-200/55">
        Mostrando <span className="font-bold text-brand-200/85">{items.length}</span>{" "}
        {items.length === 1 ? "póliza" : "pólizas"}
      </div>
    </div>
  );
}