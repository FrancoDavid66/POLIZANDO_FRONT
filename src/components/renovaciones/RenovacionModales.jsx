// src/components/renovaciones/RenovacionModales.jsx
//
// UNIFICADO: TODOS los modales de Renovaciones en un solo archivo.
//   - RenovacionModal          (renovar; incluye ErrorBanner interno)
//   - PolizaYaRenovadaModal    (aviso 'ya renovada')
//   - DescartarRenovacionModal (marcar 'no renueva' con motivo)
//   - SubirPolizaSistemaModal  (subir papeles/cuponera tras renovar)
// Se exportan con nombre; la página los importa desde este mismo módulo.
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";
import api from "../../services/api";
import { HiArrowRight, HiCheckCircle, HiDocumentText, HiExclamation, HiExclamationCircle, HiInformationCircle, HiSparkles, HiUpload, HiX } from "react-icons/hi";

//
// UNIFICADO: incluye ErrorBanner y PolizaYaRenovadaModal como piezas internas
// (antes eran 3 archivos). PolizaYaRenovadaModal se exporta con nombre para que
// la página lo siga usando desde este mismo módulo.





const cx = (...a) => a.filter(Boolean).join(" ");

/* ══════════ ErrorBanner (ex ErrorBanner.jsx) ══════════ */
function severityFor(code) {
  if (!code) return "error";
  if (code === "CUOTAS_IMPAGAS" || code === "FECHA_PASADA" || code === "COMPANIA_CAMBIADA") {
    return "warning";
  }
  return "error";
}

const BANNER_STYLES = {
  error: {
    bg: "bg-rose-500/10", border: "border-rose-500/40", icon: "text-rose-400",
    title: "text-rose-200", text: "text-rose-100/85", action: "text-rose-300",
  },
  warning: {
    bg: "bg-amber-500/10", border: "border-amber-500/40", icon: "text-amber-400",
    title: "text-amber-200", text: "text-amber-100/85", action: "text-amber-300",
  },
};

function ErrorBanner({ error, onClose, children }) {
  if (!error) return null;
  const code = error.error || error.code || "ERROR_DESCONOCIDO";
  const sev = severityFor(code);
  const s = BANNER_STYLES[sev];
  const Icon = sev === "warning" ? HiInformationCircle : HiExclamation;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      className={cx("rounded-xl border p-3.5 flex items-start gap-3", s.bg, s.border)}
    >
      <Icon className={cx("text-2xl shrink-0 mt-0.5", s.icon)} />
      <div className="flex-1 min-w-0">
        <div className={cx("text-sm font-extrabold mb-0.5", s.title)}>
          {error.message || "Ocurrió un error"}
        </div>
        {error.detail && (
          <div className={cx("text-xs leading-relaxed", s.text)}>{error.detail}</div>
        )}
        {error.action && (
          <div className={cx("text-xs font-medium mt-1.5 leading-relaxed", s.action)}>
            💡 {error.action}
          </div>
        )}
        {error.context && Object.keys(error.context).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(error.context)
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-mono text-white/70">
                  <span className="opacity-60">{k}:</span>
                  <span className="font-bold">{String(v)}</span>
                </span>
              ))}
          </div>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors" title="Cerrar">
          <HiX className={s.icon} />
        </button>
      )}
    </motion.div>
  );
}

/* ══════════ PolizaYaRenovadaModal (ex PolizaYaRenovadaModal.jsx) ══════════ */
export function PolizaYaRenovadaModal({ open, error, onClose }) {
  if (!open || !error) return null;

  const ctx = error.context || {};
  const nuevaId = ctx.nueva_poliza_id;
  const nuevoNumero = ctx.nueva_numero || "—";
  const nuevaFecha = ctx.nueva_fecha || null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 18, opacity: 0, scale: 0.96 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <HiExclamationCircle className="text-3xl text-amber-400 shrink-0" />
              <div>
                <div className="text-lg font-extrabold text-white">No se puede renovar</div>
                <div className="text-xs text-amber-200/80 mt-0.5">{error.message}</div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/15 transition-colors" title="Cerrar">
              <HiX />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-white/85 leading-relaxed">
              {error.detail || "Esta póliza ya tiene una versión renovada en el sistema."}
            </p>
            {nuevaId && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">Versión renovada</div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">N° de póliza:</span>
                    <span className="font-bold text-white tabular-nums">{nuevoNumero}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">ID interno:</span>
                    <span className="font-mono text-white tabular-nums">#{nuevaId}</span>
                  </div>
                  {nuevaFecha && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Fecha de emisión:</span>
                      <span className="text-white tabular-nums">{nuevaFecha}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {error.action && (
              <div className="text-xs text-amber-200/90 leading-relaxed">💡 {error.action}</div>
            )}
            <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end pt-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition-colors">
                Cerrar
              </button>
              {nuevaId && (
                <a
                  href={`/polizas/${nuevaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 text-sm font-extrabold text-white hover:bg-sky-400 transition-colors shadow-md shadow-sky-500/20"
                >
                  Ver póliza nueva <HiArrowRight />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 🎯 Helper interno: obtener la última cuota de una lista
// (la de mayor cuota_nro y fecha_vencimiento)
function getUltimaCuota(cuotas) {
  if (!Array.isArray(cuotas) || cuotas.length === 0) return null;
  return [...cuotas]
    .filter((c) => c && c.fecha_vencimiento)
    .sort((a, b) => {
      // Primero por cuota_nro descendente
      const nroA = Number(a.cuota_nro || 0);
      const nroB = Number(b.cuota_nro || 0);
      if (nroB !== nroA) return nroB - nroA;
      // Después por fecha descendente
      return new Date(b.fecha_vencimiento) - new Date(a.fecha_vencimiento);
    })[0] || null;
}

export function RenovacionModal({
  open,
  item,
  onClose,
  onSubmit,
  submitting,
  // 🆕 Error estructurado que viene del backend tras un intento fallido
  // Formato: { error, message, detail, action, context }
  error = null,
}) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaCompania, setNuevaCompania] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  // 🆕 Tipo y precio: se confirman/corrigen a mano en cada renovación.
  const [tipo, setTipo] = useState("");
  const [precioCuota, setPrecioCuota] = useState("");

  const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

  // 🆕 Input que aparece SOLO cuando el backend dijo "COBERTURA_NO_CONFIGURADA"
  const [cantidadCuotasOverride, setCantidadCuotasOverride] = useState("");

  const necesitaOverride = error?.error === "COBERTURA_NO_CONFIGURADA";

  useEffect(() => {
    if (!open) return;

    setNuevoNumero(item?.numero_poliza || "");
    setNuevaCompania(item?.compania || "");
    setTipo(item?.tipo || "");
    setPrecioCuota("");

    // Default sugerido para override = cantidad de cuotas de la póliza original
    setCantidadCuotasOverride(
      item?.cantidad_cuotas ? String(item.cantidad_cuotas) : ""
    );

    // 🎯 LÓGICA UNIFICADA: la nueva póliza empieza el MISMO DÍA que venció
    // la última cuota de la póliza vieja (sin gap).
    let fechaCalculada = null;
    const ultimaCuota = getUltimaCuota(item?.cuotas);
    if (ultimaCuota?.fecha_vencimiento) {
      fechaCalculada = dayjs(ultimaCuota.fecha_vencimiento);
    }

    if (!fechaCalculada) {
      const fallbackStr =
        item?.ultima_cuota_vencimiento ||
        item?.vto_referencia ||
        item?.fecha_vencimiento ||
        item?.primer_pago;
      if (fallbackStr) {
        fechaCalculada = dayjs(fallbackStr);
      }
    }

    setNuevaFecha(fechaCalculada ? fechaCalculada.format("YYYY-MM-DD") : "");
  }, [open, item]);

  if (!open) return null;

  const handleSubmit = () => {
    const payload = {
      nuevoNumero: (nuevoNumero || "").trim() || undefined,
      nuevaCompania: (nuevaCompania || "").trim() || undefined,
      nuevaFecha: nuevaFecha || undefined,
      tipo: tipo || undefined,
      precio_cuota: precioCuota !== "" ? precioCuota : undefined,
    };

    // Si el banner muestra el input de cuotas y el usuario lo completó, lo enviamos
    if (necesitaOverride) {
      const n = parseInt(cantidadCuotasOverride, 10);
      if (Number.isFinite(n) && n > 0) {
        payload.cantidad_cuotas_override = n;
        // El backend lo lee como snake_case
        payload.cantidad_cuotas = n;
      }
    }

    onSubmit(payload);
  };

  const canSubmit =
    !!tipo &&
    (necesitaOverride
      ? Number.isFinite(parseInt(cantidadCuotasOverride, 10)) &&
        parseInt(cantidadCuotasOverride, 10) > 0
      : true);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sticky top-0 bg-slate-900 z-10">
            <div>
              <div className="text-lg font-extrabold text-white">Renovar póliza</div>
              <div className="mt-1 text-sm text-white/80">
                {item?.patente ? (
                  <>
                    <span className="font-semibold text-white">{item.patente}</span> ·{" "}
                    {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                ) : (
                  <>
                    {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                )}
              </div>
            </div>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15 transition-colors"
              onClick={onClose}
              disabled={submitting}
              title="Cerrar"
              type="button"
            >
              <HiX />
            </button>
          </div>

          <div className="grid gap-3 p-4">
            {/* 🆕 Banner de error estructurado (cuando viene del backend) */}
            <AnimatePresence>
              {error && (
                <ErrorBanner error={error}>
                  {/* Input inline solo si el error es "COBERTURA_NO_CONFIGURADA" */}
                  {necesitaOverride && (
                    <div className="bg-black/30 rounded-lg p-3 mt-1">
                      <label className="text-xs font-bold text-white/90 mb-1.5 block">
                        Cantidad de cuotas (manual)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={cantidadCuotasOverride}
                          onChange={(e) => setCantidadCuotasOverride(e.target.value)}
                          disabled={submitting}
                          placeholder="Ej: 6"
                          className="w-24 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white text-sm outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                        />
                        <span className="text-[11px] text-white/60">
                          cuotas mensuales se van a generar
                        </span>
                      </div>
                    </div>
                  )}
                </ErrorBanner>
              )}
            </AnimatePresence>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Nuevo número (opcional)</label>
              <input
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Ej: 12345-ABC"
              />
              <div className="text-xs text-white/60">
                Si existe, el backend lo hace único (agrega sufijo -R1, -R2…).
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Tipo de vehículo *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
              >
                <option value="" className="bg-slate-900">— Elegir —</option>
                {TIPOS_VEHICULO.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
              <div className="text-xs text-white/60">
                Confirmá o corregí el tipo (define el precio). Si nació mal cargado, corregilo acá.
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Precio de cuota (opcional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioCuota}
                onChange={(e) => setPrecioCuota(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Ej: 35000"
              />
              <div className="text-xs text-white/60">
                Si lo dejás vacío, las cuotas quedan en $0 y se cargan después desde Pagos.
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Nueva compañía (opcional)</label>
              <input
                value={nuevaCompania}
                onChange={(e) => setNuevaCompania(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Ej: RUS / SANCOR / etc."
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">Inicio de vigencia (alta)</label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
              />
              <div className="text-xs text-white/60">
                Es el día que <strong className="text-white/80">arranca la cobertura</strong>. Por defecto, el día que vence la última cuota de la póliza actual (así no queda hueco). La <strong className="text-white/80">1ª cuota vence un mes después</strong>.
              </div>
            </div>

            <div className="mt-1 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <HiExclamation className="mt-0.5 shrink-0 text-xl text-amber-400" />
              <div className="text-[13px] leading-relaxed text-amber-100/90">
                <strong className="block text-sm font-bold text-amber-400 mb-0.5">Atención</strong>
                La póliza actual pasará a estado <strong>FINALIZADA</strong> y se creará una nueva versión <strong>ACTIVA</strong>.
                <br />
                <span className="mt-1 block opacity-90">No te olvides de emitir/subir la póliza en la página web de la aseguradora si corresponde.</span>
              </div>
            </div>

            <div className="mt-3 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15 transition-colors"
                onClick={onClose}
                disabled={submitting}
                type="button"
              >
                Cancelar
              </button>

              <button
                className={cx(
                  "rounded-xl px-5 py-2 font-extrabold text-black transition-colors shadow-md",
                  submitting || !canSubmit
                    ? "bg-white/40 shadow-none cursor-not-allowed"
                    : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20"
                )}
                disabled={submitting || !canSubmit}
                type="button"
                onClick={handleSubmit}
              >
                {submitting
                  ? "Procesando..."
                  : necesitaOverride
                  ? "Reintentar renovación"
                  : "Renovar póliza"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}






//
// Modal chico para elegir el motivo cuando se marca "No renovar".
// 5 motivos predefinidos + "Otro" con texto libre.






const MOTIVOS = [
  { value: "CAMBIO_COMPANIA", label: "Cambió de compañía", emoji: "🏢" },
  { value: "VENDIO_AUTO",     label: "Vendió el auto",     emoji: "🚗" },
  { value: "NO_QUIERE",       label: "No quiere seguir",   emoji: "🙅" },
  { value: "NO_CONTESTA",     label: "No contesta",        emoji: "📵" },
  { value: "NO_PAGO",         label: "No pagó",            emoji: "💸" },
  { value: "OTRO",            label: "Otro motivo",        emoji: "❓" },
];

export function DescartarRenovacionModal({
  open,
  item,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    if (open) {
      setMotivo("");
      setDetalle("");
    }
  }, [open]);

  if (!open) return null;

  const isOtro = motivo === "OTRO";
  const canSubmit = !!motivo && (!isOtro || detalle.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ motivo, detalle: detalle.trim() });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose?.();
        }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="text-lg font-extrabold text-white">No renovar</div>
              <div className="mt-1 text-xs text-white/70">
                {item?.patente && (
                  <>
                    <span className="font-semibold text-white">{item.patente}</span>
                    {item?.cliente && (
                      <> · {item.cliente.apellido}, {item.cliente.nombre}</>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/15 transition-colors disabled:opacity-50"
              onClick={onClose}
              disabled={submitting}
              type="button"
              title="Cerrar"
            >
              <HiX />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            <p className="text-xs text-white/70">
              ¿Por qué este cliente no va a renovar?
            </p>

            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS.map((m) => {
                const active = motivo === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMotivo(m.value)}
                    disabled={submitting}
                    className={cx(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold text-left transition-all disabled:opacity-50",
                      active
                        ? "border-rose-400/60 bg-rose-500/20 text-rose-50 ring-2 ring-rose-500/30"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    )}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Detalle (opcional siempre, obligatorio si motivo=OTRO) */}
            <div className="mt-2">
              <label className="text-[11px] font-bold text-white/70 mb-1 block">
                Detalle {isOtro ? <span className="text-rose-400">*</span> : <span className="text-white/40">(opcional)</span>}
              </label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                disabled={submitting}
                rows={2}
                maxLength={300}
                placeholder={
                  isOtro
                    ? "Especificá el motivo…"
                    : "Notas adicionales (ej: 'llamar en 30 días')"
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30 transition-colors disabled:opacity-50 resize-none"
              />
              <div className="mt-0.5 text-right text-[10px] text-white/40">
                {detalle.length}/300
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
              <HiExclamation className="mt-0.5 shrink-0 text-amber-400" />
              <div className="text-[11px] leading-relaxed text-amber-100/90">
                Esto <strong>no cancela ni da de baja</strong> la póliza. Solo marca que el cliente no va a renovar.
                Podés revertirlo en cualquier momento desde la pestaña "No renovaron".
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={cx(
                "rounded-xl px-5 py-2 text-sm font-extrabold transition-colors shadow-md",
                canSubmit && !submitting
                  ? "bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/20"
                  : "bg-white/20 text-white/50 shadow-none cursor-not-allowed"
              )}
            >
              {submitting ? "Guardando…" : "Confirmar 'No renueva'"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


/* src/components/renovaciones/SubirPolizaSistemaModal.jsx */







/* ⚠️ AJUSTÁ ESTA RUTA si tu lector de PDF está en otra URL.
   Es el endpoint del LectorPdfView (el que usa la subida rápida). */
const LECTOR_PDF_ENDPOINT = "polizas/lector-pdf/";

const SLOTS = [
  { key: "POLIZA", label: "Póliza / frente" },
  { key: "MERCOSUR", label: "Mercosur" },
  { key: "CUPONERA", label: "Cuponera (si es con robo)" },
];

/* ── normalizadores para comparar ── */
const fmtFecha = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(iso);
};
const normPat = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normDni = (v) => String(v || "").replace(/\D/g, "");
const normNom = (v) =>
  String(v || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/* Dos nombres "coinciden" si comparten al menos una palabra de 3+ letras */
function nombreCoincide(a, b) {
  const pa = normNom(a).split(" ").filter((w) => w.length >= 3);
  const pb = normNom(b).split(" ").filter((w) => w.length >= 3);
  if (!pa.length || !pb.length) return true;
  return pa.some((w) => pb.includes(w));
}

function SlotPdf({ slot, archivo, onPick }) {
  const ref = useRef(null);
  return (
    <div className="rounded-2xl bg-black/40 border border-white/5 p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
        <HiDocumentText className="text-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{slot.label}</div>
        <div className="text-[11px] text-white/40 truncate">{archivo ? archivo.name : "Sin archivo"}</div>
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all ${
          archivo ? "bg-white/5 text-white border border-white/10 hover:bg-white/10" : "bg-indigo-500 text-white hover:bg-indigo-400"
        }`}
      >
        <HiUpload className="text-sm" /> {archivo ? "Cambiar" : "Elegir"}
      </button>
      <input ref={ref} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </div>
  );
}

export function SubirPolizaSistemaModal({ isOpen, item, onClose, onSaved }) {
  const [files, setFiles] = useState({ POLIZA: null, MERCOSUR: null, CUPONERA: null });
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [fechaInicial, setFechaInicial] = useState("");

  // flujo de inconsistencias
  const [inconsistencias, setInconsistencias] = useState([]);
  const [idxInc, setIdxInc] = useState(0);
  const [correcciones, setCorrecciones] = useState({});
  const [datosLeidos, setDatosLeidos] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFiles({ POLIZA: null, MERCOSUR: null, CUPONERA: null });
      setResultado(null); setFechaInicial("");
      setInconsistencias([]); setIdxInc(0); setCorrecciones({}); setDatosLeidos(null);
    }
  }, [isOpen]);

  const pick = (key, file) => {
    if ((file.type || "").toLowerCase() !== "application/pdf") { toast.error("Tiene que ser un PDF"); return; }
    setFiles((s) => ({ ...s, [key]: file }));
  };

  const seleccionados = () =>
    SLOTS.map((s) => ({ tipo: s.key, file: files[s.key] })).filter((x) => x.file);

  /* Lee el PDF, calcula inconsistencias y decide si frenar o guardar */
  const analizar = async () => {
    const archivos = seleccionados();
    if (!archivos.length) { toast.error("Subí al menos un papel"); return; }

    setSaving(true);
    try {
      let datosOut = { numero: "", compania: "", cupones: [], _patente: "", _dni: "", _nombre: "", _apellido: "" };
      try {
        const fd = new FormData();
        archivos.forEach((x) => fd.append("archivos", x.file));
        const lectura = await api.post(LECTOR_PDF_ENDPOINT, fd, { headers: { "Content-Type": "multipart/form-data" } });
        const datos = lectura?.data?.datos || {};
        datosOut = {
          numero: datos?.poliza?.numero || "",
          compania: datos?.poliza?.compania || "",
          cupones: datos?.cupones || [],
          _patente: datos?.vehiculo?.patente || "",
          _dni: datos?.cliente?.dni || "",
          _nombre: datos?.cliente?.nombre || "",
          _apellido: datos?.cliente?.apellido || "",
          _vig_desde: datos?.poliza?.vigencia_desde || "",
          _vig_hasta: datos?.poliza?.vigencia_hasta || "",
        };
      } catch {
        toast("No se pudieron leer los datos del PDF, pero se guardan los papeles.", { icon: "⚠️" });
        await guardarFinal(datosOut, {});
        return;
      }

      // comparar lo que NO debería cambiar
      const patPol = item.patente_real || (item.patente !== "—" ? item.patente : "");
      const incs = [];
      if (datosOut._patente && patPol && normPat(datosOut._patente) !== normPat(patPol)) {
        incs.push({ campo: "patente", label: "Patente", valorPdf: datosOut._patente, valorPol: patPol, correccion: { patente: datosOut._patente } });
      }
      if (datosOut._dni && item.cliente_dni && normDni(datosOut._dni) !== normDni(item.cliente_dni)) {
        incs.push({ campo: "dni", label: "DNI", valorPdf: datosOut._dni, valorPol: item.cliente_dni, correccion: { dni: datosOut._dni } });
      }
      const nomPdf = `${datosOut._apellido} ${datosOut._nombre}`.trim();
      if (nomPdf && item.cliente && item.cliente !== "—" && !nombreCoincide(nomPdf, item.cliente)) {
        incs.push({ campo: "nombre", label: "Titular", valorPdf: nomPdf, valorPol: item.cliente, correccion: { nombre: datosOut._nombre, apellido: datosOut._apellido } });
      }

      // Vigencia vieja: si el papel ya venció, probablemente es el de la póliza anterior.
      // Se avisa PRIMERO (lo más importante a chequear en una renovación).
      const hoyStr = new Date().toISOString().slice(0, 10);
      if (datosOut._vig_hasta && datosOut._vig_hasta < hoyStr) {
        incs.unshift({ campo: "vigencia", label: "Vigencia", valorPdf: datosOut._vig_hasta, vieja: true });
      }

      if (incs.length) {
        setDatosLeidos(datosOut);
        setInconsistencias(incs);
        setIdxInc(0);
        setCorrecciones({});
        setSaving(false); // pausamos para que el usuario decida
      } else {
        await guardarFinal(datosOut, {});
      }
    } catch (e) {
      toast.error(e?.message || "No se pudo procesar");
      setSaving(false);
    }
  };

  /* El usuario resuelve la inconsistencia actual */
  const resolver = (usarPdf) => {
    const inc = inconsistencias[idxInc];
    const nuevas = usarPdf ? { ...correcciones, ...inc.correccion } : correcciones;
    setCorrecciones(nuevas);
    if (idxInc + 1 < inconsistencias.length) {
      setIdxInc(idxInc + 1);
    } else {
      setInconsistencias([]);
      setSaving(true);
      guardarFinal(datosLeidos, nuevas);
    }
  };

  /* Sube los PDFs y manda todo al backend */
  const guardarFinal = async (datos, corr) => {
    try {
      const archivos = seleccionados();
      const documentos = [];
      for (const x of archivos) {
        const { secure_url, public_id } = await uploadToCloudinary(x.file, "de-thames/polizas/documentos");
        if (!secure_url) throw new Error("Sin URL de Cloudinary");
        documentos.push({ tipo: x.tipo, url: secure_url, public_id: public_id || "", nombre: x.file.name, mime: x.file.type });
      }
      const datosOut = { numero: datos.numero, compania: datos.compania, cupones: datos.cupones };
      const body = { poliza_id: item.poliza_id, documentos, datos: datosOut, correcciones: corr || {} };
      if (!files.CUPONERA && fechaInicial) body.fecha_inicial_cuotas = fechaInicial;
      const res = await api.post("tareas/subir-papeles-sistema/", body);
      setResultado(res?.data?.resumen || { documentos_guardados: documentos.length, autocompletado: [], cupones_actualizados: 0 });
      toast.success("Papeles cargados ✅");
    } catch (e) {
      toast.error(e?.message || "No se pudo cargar");
    } finally {
      setSaving(false);
    }
  };

  const incActual = inconsistencias[idxInc] || null;

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden"
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <HiDocumentText className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Subir póliza a sistema</h2>
                  <p className="text-[11px] text-white/40">{item.cliente} · {item.patente}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
            </div>

            {resultado ? (
              <div className="p-6">
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <HiCheckCircle className="text-3xl" />
                  </div>
                  <div className="text-lg font-bold text-white">¡Papeles cargados!</div>
                  <div className="text-sm text-white/60 space-y-1">
                    <div>{resultado.documentos_guardados} archivo(s) guardado(s).</div>
                    {resultado.autocompletado?.length > 0 && (
                      <div className="inline-flex items-center gap-1 text-indigo-300"><HiSparkles /> {resultado.autocompletado.join(", ")}.</div>
                    )}
                    {resultado.cupones_actualizados > 0 && (
                      <div className="text-amber-300">{resultado.cupones_actualizados} cupón(es) de robo actualizado(s).</div>
                    )}
                    {resultado.cuotas_actualizadas > 0 && (
                      <div className="text-sky-300">{resultado.cuotas_actualizadas} cuota(s) reprogramada(s).</div>
                    )}
                  </div>
                </div>
                <button onClick={() => onSaved?.()} className="mt-4 w-full h-12 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400">Listo</button>
              </div>
            ) : incActual ? (
              incActual.campo === "vigencia" ? (
                <div className="p-6">
                  <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <HiExclamation className="text-3xl" />
                    </div>
                    <div className="text-lg font-bold text-white">¿Es el papel correcto?</div>
                    <div className="text-[11px] text-white/40">{idxInc + 1} de {inconsistencias.length}</div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
                    <p className="text-[13px] leading-snug text-amber-100">
                      La vigencia de este papel termina el <b>{fmtFecha(incActual.valorPdf)}</b>, una fecha que ya pasó.
                      Puede ser el papel de la <b>póliza anterior</b>, no el de la renovación nueva.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button onClick={() => resolver(false)} className="w-full h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 font-bold text-sm hover:bg-sky-500/25">
                      Está bien, continuar
                    </button>
                    <button onClick={onClose} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10">
                      Cancelar, es el papel viejo
                    </button>
                  </div>
                </div>
              ) : (
              <div className="p-6">
                <div className="flex flex-col items-center text-center gap-2 mb-4">
                  <div className="h-14 w-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <HiExclamation className="text-3xl" />
                  </div>
                  <div className="text-lg font-bold text-white">El dato no coincide</div>
                  <div className="text-[11px] text-white/40">{idxInc + 1} de {inconsistencias.length}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 divide-y divide-white/5 mb-4">
                  <div className="px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{incActual.label} en el PDF</div>
                    <div className="text-sm font-bold text-rose-300">{incActual.valorPdf}</div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{incActual.label} en la póliza</div>
                    <div className="text-sm font-bold text-sky-300">{incActual.valorPol}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => resolver(false)} className="w-full h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 font-bold text-sm hover:bg-sky-500/25">
                    Dejar la de la póliza
                  </button>
                  <button onClick={() => resolver(true)} className="w-full h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold text-sm hover:bg-amber-500/25">
                    Usar la del PDF
                  </button>
                  <button onClick={onClose} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10">
                    Cancelar, me equivoqué de papel
                  </button>
                </div>
              </div>
              )
            ) : (
              <>
                <div className="p-5 space-y-3">
                  {SLOTS.map((s) => (
                    <SlotPdf key={s.key} slot={s} archivo={files[s.key]} onPick={(f) => pick(s.key, f)} />
                  ))}
                  {!files.CUPONERA && (
                    <div className="rounded-2xl bg-black/40 border border-white/5 p-4">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
                        Fecha de la 1ª cuota (sin cuponera)
                      </label>
                      <input
                        type="date"
                        value={fechaInicial}
                        onChange={(e) => setFechaInicial(e.target.value)}
                        className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <p className="mt-1.5 text-[11px] text-white/40">Las demás cuotas se calculan +1 mes cada una.</p>
                    </div>
                  )}
                  <p className="text-[11px] text-white/40 leading-snug pt-1">
                    La app lee los PDFs y completa sola número y compañía. Si la patente, el DNI o el titular no coinciden, te avisa antes de guardar.
                  </p>
                </div>

                <div className="px-6 py-5 border-t border-white/5 flex justify-end gap-3">
                  <button onClick={onClose} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 disabled:opacity-50">Cancelar</button>
                  <button onClick={analizar} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 disabled:opacity-50 inline-flex items-center gap-2">
                    {saving ? (<><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Procesando…</>) : (<><HiUpload /> Subir y leer</>)}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}