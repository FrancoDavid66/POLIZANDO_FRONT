// src/components/solicitudes/modalcreate/SolicitudStep.jsx
import { HiUser, HiExclamationCircle, HiChatAlt2, HiSwitchHorizontal } from "react-icons/hi";
import { motion } from "framer-motion";
// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE DE SEGURIDAD
import { useAuth } from "../../../context/AuthContext";

const sectionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.08 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

/* Opciones de prioridad con su color de acento (paleta de marca brand-*).
   Baja = verde (primary), Normal = naranja (secondary), Alta = rojo (urgencia). */
const PRIORIDADES = [
  { id: "BAJA",   nombre: "Baja",   sub: "Sin apuro",           dot: "bg-brand-primary",   ring: "ring-brand-primary/40",   soft: "bg-brand-primary/10 border-brand-primary/30 text-brand-primary-tint" },
  { id: "NORMAL", nombre: "Normal", sub: "Estándar",            dot: "bg-brand-secondary", ring: "ring-brand-secondary/40", soft: "bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary-tint" },
  { id: "ALTA",   nombre: "Alta",   sub: "Prioridad inmediata", dot: "bg-red-400",         ring: "ring-red-500/40",         soft: "bg-red-500/10 border-red-500/30 text-red-300" },
];

/**
 * Paso final: Datos de la Solicitud
 * (mismo contenido y props que antes — solo rediseño visual + responsive)
 */
export default function SolicitudStep({
  responsableNombre = "",
  onCambiarResponsable = () => {},
  solicitud = { prioridad: "NORMAL", observaciones: "" },
  setSolicitud = () => {},
}) {
  useAuth(); // mantiene el contexto disponible (blindaje)
  const prioridadActual = solicitud.prioridad || "NORMAL";

  return (
    <motion.div
      className="space-y-4"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
    >
      {/* ===== Responsable ===== */}
      <motion.section
        variants={itemVariants}
        className="rounded-3xl border border-brand-200/10 bg-gradient-to-br from-brand-200/[0.06] to-brand-200/[0.02] p-4 sm:p-5 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <HiUser className="text-brand-primary-tint" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-200/50">
            Responsable de gestión
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border border-brand-200/10 bg-black/30">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-brand-primary/30 to-brand-primary-deep/20 flex items-center justify-center text-brand-primary-tint border border-brand-primary/30">
              <HiUser className="text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-brand-200/40 font-bold uppercase tracking-widest">Asignado a</p>
              <p className="text-base font-bold text-brand-200 truncate leading-tight">
                {responsableNombre || "Sin asignar"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCambiarResponsable}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-2xl bg-brand-200/10 border border-brand-200/10 text-brand-200/80 text-xs font-black uppercase tracking-wider hover:bg-brand-200/20 hover:text-brand-200 active:scale-95 transition-all"
          >
            <HiSwitchHorizontal /> Cambiar
          </button>
        </div>
        <p className="text-[10px] text-brand-200/30 italic mt-2 ml-1">
          El responsable recibirá las notificaciones de esta solicitud.
        </p>
      </motion.section>

      {/* ===== Prioridad (pills táctiles, ideal celular) ===== */}
      <motion.section
        variants={itemVariants}
        className="rounded-3xl border border-brand-200/10 bg-gradient-to-br from-brand-200/[0.06] to-brand-200/[0.02] p-4 sm:p-5 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <HiExclamationCircle className="text-brand-secondary-tint" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-200/50">
            Nivel de prioridad
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRIORIDADES.map((p) => {
            const sel = prioridadActual === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSolicitud((s) => ({ ...s, prioridad: p.id }))}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  sel
                    ? `${p.soft} ring-2 ${p.ring}`
                    : "bg-brand-200/5 border-brand-200/10 text-brand-200/70 hover:bg-brand-200/[0.08]"
                }`}
              >
                <span className={`h-3 w-3 rounded-full shrink-0 ${p.dot} ${sel ? "" : "opacity-40"}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">{p.nombre}</span>
                  <span className="block text-[10px] uppercase tracking-wider opacity-60">{p.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* ===== Observaciones ===== */}
      <motion.section
        variants={itemVariants}
        className="rounded-3xl border border-brand-200/10 bg-gradient-to-br from-brand-200/[0.06] to-brand-200/[0.02] p-4 sm:p-5 shadow-xl"
      >
        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-brand-200/50">
            <HiChatAlt2 className="text-brand-secondary-tint" /> Observaciones internas
          </span>
          <textarea
            rows={4}
            value={solicitud.observaciones || ""}
            onChange={(e) => setSolicitud((s) => ({ ...s, observaciones: e.target.value }))}
            placeholder="Detalles adicionales para el equipo técnico…"
            className="w-full rounded-2xl bg-black/30 border border-brand-200/10 px-4 py-3 text-sm text-brand-200 placeholder:text-brand-200/25 outline-none focus:ring-2 ring-brand-primary/40 focus:border-brand-primary/30 transition-all resize-none shadow-inner"
          />
        </label>
      </motion.section>
    </motion.div>
  );
}