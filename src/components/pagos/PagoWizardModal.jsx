/* src/components/pagos/PagoWizardModal.jsx
   Wizard de pago en 5 pasos — fusión de lo que antes eran 2 modales
   separados (ModalFormaPago + ConfirmarPagoModal), que siempre se abrían
   uno después del otro en el mismo flujo:
   1 → Método (efectivo / transferencia)
   2 → Billetera destino (solo transferencia)
   3 → Enviado por (solo transferencia)
   4 → Monto + responsable + fecha + observaciones
   5 → Confirmar (avisos de atraso/robo + botón final)

   🔧 De paso corrige un bug del flujo viejo: antes el aviso "Pago registrado"
   se mandaba al terminar el paso 4, ANTES de que el usuario viera los avisos
   de riesgo del paso 5 — si después cancelaba ahí, igual había mandado el
   aviso de que se cobró algo que en realidad no se cobró. Ahora el aviso solo
   sale cuando se confirma de verdad en el paso 5.
*/
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCash, HiX, HiCalendar, HiPencil,
  HiChevronLeft, HiCheck, HiUser, HiArrowRight, HiCamera,
} from "react-icons/hi";
import { sendAdminPagoRegistrado } from "../../services/notifications/pagos";
import { solicitudesApi } from "../../services/solicitudes.js";
import { formatMoney } from "../../utils/formatMoney";

const LS_LAST_METODO  = "pagos:lastMetodo";
const LS_LAST_DESTINO = "pagos:lastDestinoCuenta";

function getLocalISODate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isValidISODate(s) {
  if (!s || typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return getLocalISODate(d) === s;
}
function safeGetLS(k) { try { return localStorage.getItem(k) || ""; } catch { return ""; } }
function safeSetLS(k, v) { try { localStorage.setItem(k, String(v ?? "")); } catch {} }
const fmtAR = (n) => {
  const num = Number(String(n ?? "").replace(",", "."));
  return Number.isFinite(num) ? `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ —";
};
const fmtMoney = (n) => formatMoney(n, { symbol: "" });

export default function PagoWizardModal({
  isOpen, onClose, onConfirm,
  defaultMonto,
  title = "Confirmar pago",
  cuentasMercadoPago = [],
  billeterasVirtuales = [],
  mediosCobro = [],
  clienteNombreApellido = "",
  clienteDni = "",
  polizaCompania = "",
  polizaCobertura = "",
  polizaEstado = "",
  numeroPoliza = "",
  pagoCuota = "",
  cuotaNro,
  diasAtraso = 0,
}) {
  /* ── Estado del wizard (pasos 1-4: datos del pago) ── */
  const [step,         setStep]         = useState(1);
  const [metodo,       setMetodo]       = useState("efectivo");
  const [destinoId,    setDestinoId]    = useState("");
  const [destinoOtra,  setDestinoOtra]  = useState("");
  const [enviadoPor,   setEnviadoPor]   = useState("");
  const [cuitRemitente,setCuitRemitente]= useState("");
  const [nroOperacion, setNroOperacion] = useState("");
  const [monto,        setMonto]        = useState("");
  const [fechaPago,    setFechaPago]    = useState(getLocalISODate());
  const [observaciones,setObservaciones]= useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [responsableId, setResponsableId] = useState("");
  const [empleados, setEmpleados] = useState([]);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);

  // ── Estado del paso 5 (confirmación con avisos) ──
  const [cuponeraSubida, setCuponeraSubida] = useState(false);

  const inputMontoRef = useRef(null);

  /* ── Bloquear scroll ── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev || ""; };
  }, [isOpen]);

  /* ── Reset al abrir ── */
  useEffect(() => {
    if (!isOpen) return;
    const lastMetodo  = safeGetLS(LS_LAST_METODO);
    const lastDestino = safeGetLS(LS_LAST_DESTINO);
    setStep(1);
    setMetodo(lastMetodo === "transferencia" ? "transferencia" : "efectivo");
    setDestinoId(lastDestino || "");
    setDestinoOtra("");
    setEnviadoPor(clienteNombreApellido ? String(clienteNombreApellido).trim() : "");
    setCuitRemitente("");
    setNroOperacion("");
    setMonto(Number(defaultMonto) > 0 ? Number(defaultMonto).toLocaleString("es-AR") : "");
    setFechaPago(getLocalISODate());
    setObservaciones("");
    setSubmitting(false);
    setResponsableId("");
    setCuponeraSubida(false);
  }, [isOpen, clienteNombreApellido, defaultMonto]);

  // Traer empleados activos (mismo endpoint que usa Solicitudes)
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setEmpleadosLoading(true);
    (async () => {
      try {
        const emps = await solicitudesApi.empleadosActivos();
        const arr = Array.isArray(emps) ? emps : emps?.results || [];
        if (alive) setEmpleados(arr.filter((e) => e?.activo !== false));
      } catch {
        if (alive) setEmpleados([]);
      } finally {
        if (alive) setEmpleadosLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isOpen]);

  /* ── Medios normalizados ── */
  const medios = useMemo(() => {
    if (!Array.isArray(mediosCobro) || !mediosCobro.length) return [];
    return mediosCobro.filter(m => m && m.activo !== false).map(m => ({
      id: String(m.id),
      proveedor: m.proveedor,
      etiqueta: m.etiqueta || m.valor || "",
      titular: m.titular_nombre || "",
      valor: m.valor || "",
      display: `${m.titular_nombre ? m.titular_nombre + " — " : ""}${m.etiqueta || m.valor || ""}`.trim(),
    }));
  }, [mediosCobro]);

  const mediosMP  = useMemo(() => medios.filter(m => m.proveedor === "mercado_pago"), [medios]);
  const mediosBil = useMemo(() => medios.filter(m => m.proveedor === "billetera_virtual"), [medios]);
  const mpStrings = Array.isArray(cuentasMercadoPago) ? cuentasMercadoPago : [];
  const bilStrings= Array.isArray(billeterasVirtuales) ? billeterasVirtuales : [];

  const destinoEsOtra   = destinoId === "_otra_";
  const needsDestino    = metodo === "transferencia";

  /* ── Validaciones por paso ── */
  const montoNum = useMemo(() => {
    // Soporta: "30.000", "30,000", "30000", "30.000,50"
    const clean = String(monto)
      .replace(/\./g, "")   // quitar puntos de miles
      .replace(",", ".");   // coma decimal → punto
    const n = Number.parseFloat(clean);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [monto]);

  const canNext = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return (destinoId && !destinoEsOtra) || (destinoEsOtra && destinoOtra.trim() !== "");
    if (step === 3) return (
      enviadoPor.trim() !== "" &&
      cuitRemitente.trim() !== ""
    );
    if (step === 4) return Number.isFinite(montoNum) && isValidISODate(fechaPago) && !!responsableId;
    return true; // paso 5: la validación real es "botonBloqueado", no canNext
  }, [step, destinoId, destinoEsOtra, destinoOtra, enviadoPor, cuitRemitente, nroOperacion, montoNum, fechaPago, responsableId]);

  /* ── Navegación pasos 1-4 ── */
  const next = () => {
    if (step === 1) {
      // efectivo → salta pasos 2 y 3, va directo al monto (paso 4)
      setStep(metodo === "efectivo" ? 4 : 2);
    } else if (step === 2) setStep(3);
    else if (step === 3) { setStep(4); setTimeout(() => inputMontoRef.current?.focus(), 50); }
    else if (step === 4) setStep(5); // → pantalla de confirmación con avisos
  };

  const back = () => {
    if (step === 5) setStep(4);
    else if (step === 4 && metodo === "efectivo") setStep(1);
    else if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  /* ── Datos derivados para el paso 5 (avisos) ── */
  const da = Number(diasAtraso) || 0;
  const isCancelada = String(polizaEstado || "").toUpperCase() === "CANCELADA" || String(polizaEstado || "").toUpperCase() === "ANULADA";

  const cobNormalizada = String(polizaCobertura || "").trim().toUpperCase();
  const companiaNorm = String(polizaCompania || "").trim().toUpperCase();

  const isCoberturaA =
    cobNormalizada === "A" ||
    cobNormalizada === "COBERTURA A" ||
    cobNormalizada === "RC" ||
    cobNormalizada.includes("RESPONSABILIDAD CIVIL");

  const isNRE = companiaNorm.includes("NRE") || companiaNorm.includes("NUEVA RUTA");

  const tieneRobo = !isCancelada && !isCoberturaA && (
    cobNormalizada.includes("ROBO") ||
    cobNormalizada.includes("TERCEROS") ||
    cobNormalizada.includes("TODO RIESGO") ||
    cobNormalizada.includes("TR") ||
    cobNormalizada.includes("TC") ||
    cobNormalizada === "B" ||
    cobNormalizada === "C" ||
    cobNormalizada.includes("C1") ||
    cobNormalizada.includes("C+") ||
    cobNormalizada === "D"
  );

  const botonBloqueado = submitting || (tieneRobo && !cuponeraSubida);

  /* ── Confirmar de verdad (paso 5) ── */
  const confirmarFinal = async () => {
    if (botonBloqueado) return;
    setSubmitting(true);
    try {
      const medioSeleccionado = medios.find(m => m.id === destinoId);
      const destino = destinoEsOtra ? destinoOtra.trim()
        : medioSeleccionado ? medioSeleccionado.display
        : destinoId || "";

      const obsPartes = [];
      if (observaciones.trim()) obsPartes.push(observaciones.trim());
      if (needsDestino) {
        if (cuitRemitente.trim()) obsPartes.push(`CUIT: ${cuitRemitente.trim()}`);
        if (nroOperacion.trim())  obsPartes.push(`Op: ${nroOperacion.trim()}`);
      }

      const payload = {
        metodo, forma_pago: metodo,
        monto: Number(montoNum.toFixed(2)),
        fecha_pago: fechaPago,
        observaciones: obsPartes.join(" | ") || undefined,
        enviado_por: enviadoPor.trim() || undefined,
        cuit_remitente: needsDestino ? cuitRemitente.trim() || undefined : undefined,
        nro_operacion: needsDestino ? nroOperacion.trim() || undefined : undefined,
        destino_cuenta: needsDestino ? destino : undefined,
        medio_cobro_id: medioSeleccionado ? Number(medioSeleccionado.id) : undefined,
        destino_tipo: medioSeleccionado?.proveedor,
        responsable_empleado: Number(responsableId),
      };

      safeSetLS(LS_LAST_METODO, metodo);
      if (needsDestino) safeSetLS(LS_LAST_DESTINO, destinoId || "");

      await Promise.resolve(onConfirm?.(payload));

      // El aviso solo sale acá, después de la confirmación real.
      try {
        await sendAdminPagoRegistrado({
          aviso: "Pago registrado",
          cliente_nombre_apellido: clienteNombreApellido,
          cliente_dni: clienteDni,
          poliza_compania: polizaCompania,
          poliza_cobertura: polizaCobertura,
          pago_monto: fmtAR(montoNum),
          pago_metodo: metodo,
          pago_cuota: pagoCuota,
          pago_destino: destino,
        });
      } catch {}
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Indicador de progreso ── */
  const stepLabels = metodo === "efectivo"
    ? ["Método", "Monto", "Confirmar"]
    : ["Método", "Billetera", "Enviado por", "Monto", "Confirmar"];

  const stepIndex = metodo === "efectivo"
    ? (step === 1 ? 0 : step === 4 ? 1 : 2)
    : (step - 1);

  /* ── Variantes animación ── */
  const slideVariants = {
    enter:  { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -30 },
  };

  // Tono del modal según severidad (solo relevante en el paso 5)
  let modalBorder = "border-brand-200/10";
  if (step === 5) {
    if (isCancelada || da >= 15) modalBorder = "border-red-900/60";
    else if (da >= 4) modalBorder = "border-brand-secondary/50";
    else if (da >= 1) modalBorder = "border-yellow-700/50";
  }

  const content = (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-[9999]" onClose={submitting ? () => {} : onClose}>
        <Transition.Child as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 translate-y-3 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-3 scale-95">

              <Dialog.Panel className={`w-full ${step === 5 ? "max-w-2xl" : "max-w-md"} overflow-hidden rounded-2xl bg-brand-card-dark border ${modalBorder} shadow-2xl text-white max-h-[95vh] flex flex-col`}>

                {/* Header */}
                <div className="px-5 py-4 border-b border-brand-200/10 flex items-center justify-between shrink-0">
                  <div>
                    <Dialog.Title className="text-base font-bold text-brand-200">
                      🤑 {title}
                    </Dialog.Title>
                    <p className="text-xs text-brand-200/45 mt-0.5">
                      {clienteNombreApellido && <span className="text-brand-200/60">{clienteNombreApellido}</span>}
                      {pagoCuota && <span> · {pagoCuota}</span>}
                    </p>
                  </div>
                  <button onClick={submitting ? undefined : onClose} disabled={submitting} className="h-8 w-8 rounded-xl flex items-center justify-center text-brand-200/45 hover:text-brand-200/85 hover:bg-brand-200/10 transition-colors disabled:opacity-30">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {stepLabels.map((label, i) => {
                      const done    = i < stepIndex;
                      const active  = i === stepIndex;
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                            done ? "bg-brand-primary" : active ? "bg-brand-secondary" : "bg-brand-200/15"
                          }`} />
                          <span className={`text-[10px] font-medium transition-colors ${
                            done ? "text-brand-primary-tint" : active ? "text-brand-secondary-tint" : "text-brand-200/30"
                          }`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content — scrolleable */}
                <div className="px-5 pb-5 flex-1 overflow-y-auto flex flex-col min-h-[280px]">
                  <AnimatePresence mode="wait" initial={false}>

                    {/* ── PASO 1: Método ── */}
                    {step === 1 && (
                      <motion.div key="step1" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col justify-center gap-4 py-4">
                        <p className="text-sm font-semibold text-brand-200/75 text-center mb-2">¿Cómo paga el cliente?</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setMetodo("efectivo")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
                              metodo === "efectivo"
                                ? "border-brand-primary bg-brand-primary/15 shadow-[0_0_20px_rgba(31,122,76,0.2)]"
                                : "border-brand-200/15 bg-brand-200/10 hover:border-brand-200/25 hover:bg-brand-200/15"
                            }`}>
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                              metodo === "efectivo" ? "bg-brand-primary/20" : "bg-brand-200/10"
                            }`}>
                              💵
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-bold ${metodo === "efectivo" ? "text-brand-primary-tint" : "text-brand-200/75"}`}>
                                Efectivo
                              </div>
                              <div className="text-[11px] text-brand-200/45 mt-0.5">Pago en mano</div>
                            </div>
                            {metodo === "efectivo" && (
                              <div className="h-5 w-5 rounded-full bg-brand-primary flex items-center justify-center">
                                <HiCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>

                          <button type="button" onClick={() => setMetodo("transferencia")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
                              metodo === "transferencia"
                                ? "border-brand-secondary bg-brand-secondary/15 shadow-[0_0_20px_rgba(226,98,44,0.2)]"
                                : "border-brand-200/15 bg-brand-200/10 hover:border-brand-200/25 hover:bg-brand-200/15"
                            }`}>
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                              metodo === "transferencia" ? "bg-brand-secondary/20" : "bg-brand-200/10"
                            }`}>
                              🏦
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-bold ${metodo === "transferencia" ? "text-brand-secondary-tint" : "text-brand-200/75"}`}>
                                Transferencia
                              </div>
                              <div className="text-[11px] text-brand-200/45 mt-0.5">MP / Bancaria</div>
                            </div>
                            {metodo === "transferencia" && (
                              <div className="h-5 w-5 rounded-full bg-brand-secondary flex items-center justify-center">
                                <HiCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── PASO 2: Billetera ── */}
                    {step === 2 && (
                      <motion.div key="step2" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-3 py-4">
                        <p className="text-sm font-semibold text-brand-200/75 text-center mb-2">¿A qué cuenta llegó la plata?</p>

                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {(mediosMP.length > 0 || mpStrings.length > 0) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-brand-secondary-tint font-bold mb-1.5 px-1">Mercado Pago</p>
                              <div className="space-y-1.5">
                                {(mediosMP.length > 0 ? mediosMP : mpStrings.map((s, i) => ({ id: `mp-${i}`, display: s, proveedor: "mercado_pago" }))).map(m => (
                                  <button key={m.id} type="button" onClick={() => setDestinoId(String(m.id))}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                      destinoId === String(m.id)
                                        ? "border-brand-secondary bg-brand-secondary/15"
                                        : "border-brand-200/15 bg-brand-200/10 hover:border-brand-200/25"
                                    }`}>
                                    <span className="text-xl shrink-0">💳</span>
                                    <span className={`text-sm font-medium flex-1 ${destinoId === String(m.id) ? "text-brand-secondary-tint" : "text-brand-200/75"}`}>
                                      {m.display}
                                    </span>
                                    {destinoId === String(m.id) && <HiCheck className="w-4 h-4 text-brand-secondary-tint shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {(mediosBil.length > 0 || bilStrings.length > 0) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-brand-secondary-light font-bold mb-1.5 px-1">Billeteras virtuales</p>
                              <div className="space-y-1.5">
                                {(mediosBil.length > 0 ? mediosBil : bilStrings.map((s, i) => ({ id: `bil-${i}`, display: s }))).map(m => (
                                  <button key={m.id} type="button" onClick={() => setDestinoId(String(m.id))}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                      destinoId === String(m.id)
                                        ? "border-brand-secondary-light bg-brand-secondary-light/15"
                                        : "border-brand-200/15 bg-brand-200/10 hover:border-brand-200/25"
                                    }`}>
                                    <span className="text-xl shrink-0">👛</span>
                                    <span className={`text-sm font-medium flex-1 ${destinoId === String(m.id) ? "text-brand-secondary-light" : "text-brand-200/75"}`}>
                                      {m.display}
                                    </span>
                                    {destinoId === String(m.id) && <HiCheck className="w-4 h-4 text-brand-secondary-light shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <button type="button" onClick={() => setDestinoId("_otra_")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                              destinoEsOtra ? "border-brand-secondary bg-brand-secondary/10" : "border-brand-200/15 bg-brand-200/10 hover:border-brand-200/25"
                            }`}>
                            <span className="text-xl shrink-0">✏️</span>
                            <span className={`text-sm font-medium flex-1 ${destinoEsOtra ? "text-brand-secondary-tint" : "text-brand-200/50"}`}>Otra…</span>
                          </button>

                          {destinoEsOtra && (
                            <input type="text" value={destinoOtra} onChange={e => setDestinoOtra(e.target.value)}
                              placeholder="Nombre de la cuenta o billetera"
                              className="w-full px-4 py-3 rounded-xl bg-brand-200/10 border-2 border-brand-secondary/50 focus:border-brand-secondary text-sm text-brand-200 outline-none transition-colors" />
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* ── PASO 3: Enviado por ── */}
                    {step === 3 && (
                      <motion.div key="step3" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-3 py-4">
                        <p className="text-sm font-semibold text-brand-200/75 text-center mb-1">Datos del remitente</p>
                        <p className="text-[11px] text-brand-200/45 text-center -mt-1 mb-2">Copiá del comprobante de transferencia</p>

                        <div className="bg-brand-secondary/12 border border-brand-secondary/35 rounded-2xl p-4 space-y-4">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs text-brand-secondary-tint font-bold uppercase tracking-wider mb-1.5">
                              👤 Nombre del remitente <span className="text-red-400">*</span>
                            </label>
                            <input type="text" value={enviadoPor} onChange={e => setEnviadoPor(e.target.value)}
                              placeholder="Ej: Williams Javier Coronel"
                              className="w-full px-3 py-2.5 rounded-xl bg-brand-200/[0.06] border border-brand-secondary/30 focus:border-brand-secondary text-sm text-brand-secondary-tint placeholder:text-brand-200/30 outline-none transition-colors" />
                            {clienteNombreApellido && enviadoPor !== clienteNombreApellido && (
                              <button type="button" onClick={() => setEnviadoPor(clienteNombreApellido)}
                                className="mt-1 text-[11px] text-brand-secondary-tint/70 hover:text-brand-secondary-tint transition-colors">
                                ↩ Usar nombre del asegurado ({clienteNombreApellido})
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="flex items-center gap-1.5 text-xs text-brand-secondary-tint font-bold uppercase tracking-wider mb-1.5">
                              🪪 CUIT / CUIL <span className="text-red-400">*</span>
                            </label>
                            <input type="text" inputMode="numeric" value={cuitRemitente}
                              onChange={e => setCuitRemitente(e.target.value)}
                              placeholder="Ej: 20-38721209-5"
                              className="w-full px-3 py-2.5 rounded-xl bg-brand-200/[0.06] border border-brand-secondary/30 focus:border-brand-secondary text-sm text-brand-secondary-tint placeholder:text-brand-200/30 outline-none transition-colors font-mono" />
                          </div>
                        </div>

                        {(!enviadoPor.trim() || !cuitRemitente.trim()) && (
                          <p className="text-[11px] text-brand-200/45 text-center">
                            Todos los campos son obligatorios para transferencias
                          </p>
                        )}
                      </motion.div>
                    )}

                    {/* ── PASO 4: Monto + responsable + fecha ── */}
                    {step === 4 && (
                      <motion.div key="step4" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-4 py-4">

                        {needsDestino && (
                          <div className="bg-brand-200/[0.04] border border-brand-200/10 rounded-xl px-4 py-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-lg shrink-0">🏦</span>
                              <span className="text-brand-200/75 font-medium truncate">
                                {medios.find(m => m.id === destinoId)?.display || destinoOtra || destinoId || "—"}
                              </span>
                            </div>
                            {enviadoPor && (
                              <div className="flex items-center gap-2 text-xs text-brand-200/40">
                                <span>👤</span>
                                <span>{enviadoPor}</span>
                                {cuitRemitente && <span className="font-mono text-brand-200/30">· {cuitRemitente}</span>}
                              </div>
                            )}
                            {nroOperacion && (
                              <div className="flex items-center gap-2 text-xs text-brand-200/40">
                                <span>🔢</span>
                                <span className="font-mono">Op: {nroOperacion}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-brand-primary/12 border border-brand-primary/35 rounded-2xl p-4">
                          <p className="text-xs text-brand-primary-tint font-bold uppercase tracking-wider mb-3">
                            💸 Monto a pagar
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-brand-primary-tint font-bold text-lg shrink-0">AR$</span>
                            <input ref={inputMontoRef} type="text" inputMode="decimal"
                              value={monto}
                              onChange={(e => {
                                const raw = e.target.value.replace(/[^\d.,]/g, "");
                                setMonto(raw);
                              })}
                              onBlur={(e => {
                                const n = Number.parseFloat(String(monto).replace(/\./g, "").replace(",", "."));
                                if (Number.isFinite(n) && n > 0) {
                                  setMonto(n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
                                }
                              })}
                              onFocus={(e => {
                                const n = Number.parseFloat(String(monto).replace(/\./g, "").replace(",", "."));
                                if (Number.isFinite(n)) setMonto(String(n));
                              })}
                              placeholder={defaultMonto ? Number(defaultMonto).toLocaleString("es-AR") : "0"}
                              className="flex-1 bg-transparent text-3xl font-bold text-brand-primary-tint placeholder:text-brand-primary/30 outline-none border-b-2 pb-1 transition-colors border-brand-primary/40 focus:border-brand-primary" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-brand-200/50 font-medium mb-1.5">
                            <HiUser className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                            Responsable (quién cobra) *
                          </label>
                          <select
                            value={responsableId}
                            onChange={(e) => setResponsableId(e.target.value)}
                            disabled={empleadosLoading}
                            className="w-full h-10 px-3 rounded-xl bg-brand-200/10 border border-brand-200/15 text-sm text-brand-200/85 outline-none focus:border-brand-primary transition-colors disabled:opacity-50"
                          >
                            <option value="">
                              {empleadosLoading ? "Cargando…" : "— Elegir —"}
                            </option>
                            {empleados.map((e) => (
                              <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-brand-200/50 font-medium mb-1.5">
                              <HiCalendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Fecha de pago
                            </label>
                            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl bg-brand-200/10 border border-brand-200/15 text-sm text-brand-200/85 outline-none focus:border-brand-primary transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs text-brand-200/50 font-medium mb-1.5">
                              <HiPencil className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Observaciones
                            </label>
                            <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                              placeholder="Referencia, nº comprobante…"
                              className="w-full h-10 px-3 rounded-xl bg-brand-200/10 border border-brand-200/15 text-sm text-brand-200/85 placeholder:text-brand-200/30 outline-none focus:border-brand-primary transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── PASO 5: Confirmar con avisos ── */}
                    {step === 5 && (
                      <motion.div key="step5" variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col gap-4 py-2">

                        {isCancelada && (
                          <div className="p-3 bg-black/20 border border-red-900/60 rounded-lg text-red-300 text-sm">
                            ⚠️ <strong className="text-brand-200">PÓLIZA DADA DE BAJA:</strong> Estás a punto de cobrar una cuota de una póliza cancelada. Esto se registrará como <b>recupero de deuda</b>.
                          </div>
                        )}

                        {!isCancelada && da >= 15 && (
                          <div className="p-4 bg-red-700/40 border border-red-400/50 rounded-xl text-white text-sm border-l-2 border-red-500">
                            <div className="font-black text-xl mb-3">🚨 PELIGRO: ATRASO DE {da} DÍAS</div>
                            <ul className="list-disc pl-5 font-bold space-y-2 text-white/90 text-base">
                              <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                              <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                            </ul>
                          </div>
                        )}

                        {!isCancelada && da >= 4 && da <= 14 && (
                          <div className="p-4 bg-brand-secondary/15 border border-brand-secondary/50 rounded-lg text-brand-secondary-tint text-sm">
                            <div className="font-bold text-xl mb-3">⚠️ ATENCIÓN: ATRASO DE {da} DÍAS</div>
                            <ul className="list-disc pl-5 font-semibold space-y-2 text-white/90 text-base">
                              <li>VERIFICAR QUE LA PÓLIZA NO ESTÉ DADA DE BAJA EN LA COMPAÑÍA.</li>
                              <li>PREGUNTAR Y REVISAR SI TIENE O TUVO ALGÚN SINIESTRO.</li>
                            </ul>
                          </div>
                        )}

                        {!isCancelada && da >= 1 && da <= 3 && (
                          <div className="p-3 bg-yellow-950/30 border border-yellow-800/60 rounded-lg text-yellow-100 text-sm">
                            <div className="font-bold text-lg mb-2">👀 PRECAUCIÓN: {da} {da === 1 ? 'DÍA' : 'DÍAS'} DE ATRASO</div>
                            <ul className="list-disc pl-5 font-medium text-yellow-50/90 text-sm space-y-1.5">
                              <li>Preguntar y revisar si tiene o tuvo algún siniestro.</li>
                            </ul>
                          </div>
                        )}

                        {tieneRobo && (
                          <div className="p-4 bg-brand-card-dark border border-brand-primary/40 rounded-lg text-brand-primary-tint text-sm">
                            <div className="flex items-center gap-2 font-bold text-brand-200 text-base mb-2">
                              <HiCamera className="w-5 h-5 text-brand-primary-tint" />
                              SEGURO CON ROBO
                            </div>
                            <p className="mb-3 text-[13px] leading-relaxed text-brand-primary-tint/90">
                              Estás por cobrar un seguro que incluye Robo. <strong className="text-brand-200">Tenés que pagar la cuponera y subir el comprobante</strong> para poder continuar.
                            </p>
                            <label className="flex items-center gap-3 cursor-pointer bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors p-3 rounded-lg border border-brand-primary/30">
                              <input
                                type="checkbox"
                                checked={cuponeraSubida}
                                onChange={(e) => setCuponeraSubida(e.target.checked)}
                                className="w-5 h-5 accent-brand-primary cursor-pointer rounded"
                              />
                              <span className="text-brand-200 font-semibold text-[13px]">Ya pagué y subí la cuponera.</span>
                            </label>
                          </div>
                        )}

                        <div className="space-y-3 p-4 rounded-lg border bg-brand-200/[0.02] border-brand-200/10">
                          <p className={`text-sm ${da >= 1 || isCancelada ? 'text-white/90' : 'text-brand-200/75'}`}>
                            Vas a pagar la cuota <span className={`font-bold ${da >= 1 || isCancelada ? 'text-white' : 'text-brand-primary-tint'}`}>#{cuotaNro ?? "?"}</span>
                            {numeroPoliza && <> de la póliza <span className="font-bold text-brand-200">{numeroPoliza}</span></>}.
                          </p>

                          <div className="mt-2 text-center">
                            <p className={`text-xs uppercase tracking-[0.18em] mb-2 font-bold ${da >= 1 || isCancelada ? 'text-white/70' : 'text-brand-200/50'}`}>Importe a pagar</p>
                            <p className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-brand-primary-tint">
                              $ {fmtMoney(montoNum)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {/* ── Botones de navegación ── */}
                  <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-brand-200/10 shrink-0">
                    {step > 1 ? (
                      <button type="button" onClick={back} disabled={submitting && step === 5}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-brand-200/15 bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/75 text-sm font-medium transition-colors disabled:opacity-30">
                        <HiChevronLeft className="w-4 h-4" /> {step === 5 ? "Corregir" : "Atrás"}
                      </button>
                    ) : (
                      <button type="button" onClick={onClose}
                        className="h-10 px-4 rounded-xl border border-brand-200/15 bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/50 text-sm font-medium transition-colors">
                        Cancelar
                      </button>
                    )}

                    {step < 5 ? (
                      <motion.button type="button" onClick={next} disabled={!canNext}
                        whileHover={canNext ? { scale: 1.02 } : {}}
                        whileTap={canNext ? { scale: 0.98 } : {}}
                        className={`flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
                          canNext
                            ? step === 1
                              ? metodo === "efectivo" ? "bg-brand-primary hover:bg-brand-primary-deep text-white" : "bg-brand-secondary hover:bg-brand-secondary-light text-white"
                              : step === 2 ? "bg-brand-secondary hover:bg-brand-secondary-light text-white"
                              : "bg-brand-secondary hover:bg-brand-secondary-light text-white"
                            : "bg-brand-200/10 text-brand-200/30 cursor-not-allowed"
                        }`}>
                        Siguiente <HiArrowRight className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button type="button" onClick={confirmarFinal}
                        disabled={botonBloqueado}
                        whileHover={!botonBloqueado ? { scale: 1.02 } : {}}
                        whileTap={!botonBloqueado ? { scale: 0.98 } : {}}
                        className={`flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold transition-all ${
                          botonBloqueado
                            ? "bg-brand-200/10 text-brand-200/30 cursor-not-allowed"
                            : da >= 15 || isCancelada ? "bg-white text-red-700 hover:bg-brand-200/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            : da >= 4 ? "bg-white text-brand-secondary hover:bg-brand-200/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            : da >= 1 ? "bg-white text-yellow-700 hover:bg-brand-200/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            : "bg-brand-primary hover:bg-brand-primary-deep text-white shadow-[0_0_15px_rgba(31,122,76,0.3)]"
                        }`}>
                        {submitting
                          ? <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> Confirmando…</>
                          : <><HiCash className="w-5 h-5" /> Confirmar pago</>
                        }
                      </motion.button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}