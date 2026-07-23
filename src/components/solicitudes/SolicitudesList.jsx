// src/components/solicitudes/SolicitudesList.jsx
import { memo, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { HiShieldCheck, HiTrash, HiCheck, HiExternalLink, HiOfficeBuilding } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";

/* Variants */
const pressable = { initial: { scale: 1 }, hover: { scale: 1.03 }, tap: { scale: 0.95 } };
const listItem = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

/* Oficinas */
// 🔧 Antes había acá una tabla hardcodeada con las 3 sucursales de Thames
// ("5 esquinas", "axion", "kilometro 39") como respaldo si el dato no venía
// del backend. Polizando no tiene sucursales, así que se saca: ahora se
// muestra tal cual lo que mande el backend (objeto con .nombre, o texto/id
// plano), sin inventar un nombre de oficina que no corresponde.
function getOficinaNombre(valor) {
  if (!valor) return null;
  if (typeof valor === "object") return valor.nombre || valor.id || null;
  const raw = String(valor).trim();
  return raw || null;
}

/* Fecha */
const DATE_FMT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : DATE_FMT.format(d);
}

/* Estado — paleta de marca brand-* (los 7 estados vivos del backend).
   Nota: el label de VIGENTE_24H sigue al backend ("Constancia 12 h vigente"). */
const ESTILO_ESTADO = {
  BORRADOR: "bg-brand-200/10 text-brand-200/80",
  EN_REVISION: "bg-brand-secondary/20 text-brand-secondary-tint border border-brand-secondary/30",
  VIGENTE_24H: "bg-brand-primary/20 text-brand-primary-tint border border-brand-primary/30",
  VENCIDA: "bg-red-500/20 text-red-300 border border-red-400/30",
  CONVERTIDA: "bg-brand-primary/20 text-brand-primary-tint border border-brand-primary/30",
  CANCELADA: "bg-brand-200/10 text-brand-200/40",
  TERMINADA: "bg-brand-200/10 text-brand-200/50 border border-brand-200/15",
};
const ESTADO_LABEL = {
  BORRADOR: "Borrador", EN_REVISION: "En revisión", VIGENTE_24H: "Constancia vigente",
  CONVERTIDA: "Convertida", VENCIDA: "Vencida", CANCELADA: "Cancelada", TERMINADA: "Terminada",
};
function EstadoBadge({ estado }) {
  const cls = ESTILO_ESTADO[estado] || "bg-brand-200/10 text-brand-200/80";
  const label = ESTADO_LABEL[estado] || estado || "-";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg font-bold shrink-0 ${cls}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/* Carga progresiva */
function useProgressive(items, enabled) {
  const [limit, setLimit] = useState(enabled ? 24 : Infinity);
  useEffect(() => {
    if (!enabled) return;
    if (limit >= items.length) return;
    const t = setTimeout(() => setLimit((v) => Math.min(v + 24, items.length)), 120);
    return () => clearTimeout(t);
  }, [enabled, items.length, limit]);
  return enabled ? items.slice(0, limit) : items;
}

/* ====== LISTA ====== */
export default function SolicitudesList({
  items = [], loading = false, refreshing = false,
  onEliminar, onTerminar,
}) {
  const highlightId = useMemo(() => {
    const hash = typeof window !== "undefined" ? window.location.hash?.replace(/^#/, "") : "";
    if (!hash) return null;
    return hash.startsWith("sol-") ? hash.replace(/^sol-/, "") : hash;
  }, []);

  const rows = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((s) => ({
      s,
      oficinaLabel: getOficinaNombre(s?.oficina),
      creado: fmtDate(s?.creado_en),
      isHighlighted: highlightId ? String(s?.id ?? "") === String(highlightId) : false,
    }));
  }, [items, highlightId]);

  const visibles = useProgressive(rows, rows.length > 24);

  if (loading && !rows.length) return <SkeletonList />;

  if (!rows.length) {
    return (
      <div className="grid place-items-center text-center py-16">
        <HiShieldCheck className="w-12 h-12 text-brand-200/15 mb-3" />
        <p className="text-brand-200/50 font-bold">No hay solicitudes acá</p>
        <p className="text-brand-200/25 text-xs mt-1">Probá con otro filtro o creá una nueva.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {visibles.map((row) => (
          <motion.div key={row.s.id} variants={listItem} initial="hidden" animate="visible" exit="hidden" layout>
            <SolicitudCard row={row} onEliminar={onEliminar} onTerminar={onTerminar} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ====== TARJETA ====== */
const SolicitudCard = memo(function SolicitudCard({ row, onEliminar, onTerminar }) {
  const { s, oficinaLabel, creado, isHighlighted } = row;
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const idDelCliente =
    s?.cliente_id || s?.clienteId || s?.cliente?.id || s?.poliza?.cliente_id ||
    s?.poliza?.cliente?.id || (typeof s?.cliente !== "object" && s?.cliente ? s.cliente : null);
  const rutaCliente = idDelCliente ? `/clientes/${idDelCliente}` : `/clientes`;
  const idDePoliza = s?.poliza_id || s?.polizaId || s?.poliza?.id || null;

  const terminada = s?.estado === "TERMINADA";
  const puedeEliminar = isWebAdmin && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s?.estado);
  const puedeTerminar = typeof onTerminar === "function" && !terminada;

  const iniciales =
    (s?.cliente_nombre || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const avatarColor = terminada ? "bg-brand-200/15 text-brand-200/70" : "bg-brand-primary/20 text-brand-primary-tint";

  return (
    <div
      id={String(s?.id ?? "")}
      className={`rounded-2xl border p-4 text-brand-200 transition-all ${
        isHighlighted ? "border-brand-secondary ring-2 ring-brand-secondary/30" : "bg-brand-200/[0.04] border-brand-200/10 hover:border-brand-primary/30 hover:bg-brand-200/[0.06]"
      }`}
    >
      {/* Fila principal */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${avatarColor}`}>
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          {idDelCliente ? (
            <Link
              to={rutaCliente}
              className="font-bold text-[15px] text-brand-200 hover:text-brand-primary-tint transition-colors truncate block"
            >
              {s?.cliente_nombre || "Cliente sin nombre"}
            </Link>
          ) : (
            <span className="font-bold text-[15px] text-brand-200 truncate block">
              {s?.cliente_nombre || "Cliente sin nombre"}
            </span>
          )}
          <p className="text-xs text-brand-200/50 truncate">
            {[s?.vehiculo_marca, s?.vehiculo_modelo].filter(Boolean).join(" ") || "Vehículo"}
            {s?.vehiculo_patente && <> · <span className="uppercase font-mono font-bold text-brand-200/80">{s.vehiculo_patente}</span></>}
          </p>
        </div>
        <EstadoBadge estado={s?.estado || "BORRADOR"} />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-brand-200/10 flex items-center justify-between gap-2">
        <span className="text-[11px] text-brand-200/35 truncate flex items-center gap-1.5">
          {isWebAdmin && oficinaLabel && <><HiOfficeBuilding className="shrink-0" /> {oficinaLabel} ·</>} {creado}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {idDePoliza ? (
            <Link to={`/polizas/${idDePoliza}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-secondary/10 border border-brand-secondary/30 text-brand-secondary-tint text-[11px] font-bold hover:bg-brand-secondary/20 transition">
              Póliza <HiExternalLink />
            </Link>
          ) : idDelCliente ? (
            <Link to={rutaCliente} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-200/5 border border-brand-200/10 text-brand-200/70 text-[11px] font-bold hover:bg-brand-200/10 transition">
              Ver <HiExternalLink />
            </Link>
          ) : null}
          {puedeTerminar && (
            <motion.button onClick={() => onTerminar?.(s)} variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/20 text-brand-primary-tint border border-brand-primary/30 hover:bg-brand-primary/35 transition" title="Finalizar">
              <HiCheck />
            </motion.button>
          )}
          {isWebAdmin && (
            <motion.button onClick={() => onEliminar?.(s)} disabled={!puedeEliminar} variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 transition disabled:opacity-25" title="Eliminar">
              <HiTrash />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
});

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-brand-200/10 bg-brand-200/5 p-4 animate-pulse h-24" />
      ))}
    </div>
  );
}