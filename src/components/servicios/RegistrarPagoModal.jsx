// src/components/servicios/RegistrarPagoModal.jsx
import { useState, useEffect, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiOutlineCloudUpload,
  HiCheck,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineCreditCard,
  HiOutlineCash,
  HiOutlineReceiptTax,
  HiOutlineEye,
  HiOutlineDownload,
} from "react-icons/hi";
import toast from "react-hot-toast";
import dayjs from "dayjs";

import {
  registrarPagoServicio,
  deshacerPagoServicio,
} from "../../store/slices/serviciosSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import { uploadToCloudinary } from "../../utils/cloudinary";

// 🚀 Monto con separador de miles (es-AR): 20000 -> "20.000"
const montoToDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const [i, d] = String(raw).split(".");
  const f = (i || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d != null ? `${f},${d}` : f;
};
const montoFromInput = (t) => {
  const c = String(t).replace(/[^\d,]/g, "");
  const [i, ...r] = c.split(",");
  const d = r.length ? r.join("").slice(0, 2) : null;
  return d != null ? `${i}.${d}` : i;
};

const PASOS = [
  { n: 1, label: "Monto" },
  { n: 2, label: "Pago" },
  { n: 3, label: "Comprobante" },
];

const labelForma = (v) =>
  v === "EFECTIVO" ? "Efectivo" : v === "TRANSFERENCIA" ? "Transferencia" : "Mercado Pago";

export default function RegistrarPagoModal({ pago, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const mediosCobro = useSelector((s) => s.pagos.mediosCobro || []);
  const submitting = useSelector((s) => s.servicios.submitting);

  const yaPagado = pago?.estado === "PAGADO";

  const [step, setStep] = useState(1);
  // El monto se carga al momento de pagar (estos gastos suelen variar mes a mes),
  // por eso NO se pre-carga con el estimado del servicio.
  const [monto, setMonto] = useState(yaPagado ? pago.monto_real : "");
  const [fecha, setFecha] = useState(yaPagado ? pago.fecha_pago : dayjs().format("YYYY-MM-DD"));
  const [formaPago, setFormaPago] = useState(yaPagado ? pago.forma_pago : "TRANSFERENCIA");
  const [medioCobroId, setMedioCobroId] = useState(yaPagado ? pago.medio_cobro : "");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState(yaPagado ? pago.comprobante_url : null);
  const [observaciones, setObservaciones] = useState(yaPagado ? pago.observaciones || "" : "");
  const [subiendo, setSubiendo] = useState(false);

  // 🚀 Billeteras filtradas por oficina (string) o todas si no hay oficina
  useEffect(() => {
    if (pago?.oficina) {
      dispatch(fetchMediosCobro({ oficina: String(pago.oficina), activo: true }));
    } else {
      dispatch(fetchMediosCobro({ activo: true }));
    }
  }, [dispatch, pago?.oficina]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprobanteFile(file);
    setComprobanteUrl(URL.createObjectURL(file));
  };

  // ── Validación por paso ──
  const validarPaso = (s) => {
    if (s === 1) {
      if (!monto || Number(monto) <= 0) { toast.error("Ingresá un monto válido"); return false; }
      if (!fecha) { toast.error("Falta la fecha"); return false; }
    }
    if (s === 2) {
      if (formaPago !== "EFECTIVO" && !medioCobroId) { toast.error("Seleccioná la cuenta"); return false; }
    }
    if (s === 3) {
      if (!comprobanteFile && !comprobanteUrl) { toast.error("Subí el comprobante"); return false; }
    }
    return true;
  };

  const siguiente = () => setStep((v) => Math.min(3, v + 1));
  const atras = () => setStep((v) => Math.max(1, v - 1));

  const handleSubmit = async () => {
    // Validar TODO junto y avisar de una sola vez lo que falte
    const faltan = [];
    if (!monto || Number(monto) <= 0) faltan.push("el monto");
    if (!fecha) faltan.push("la fecha");
    if (formaPago !== "EFECTIVO" && !medioCobroId) faltan.push("la cuenta / billetera");
    // El comprobante es OPCIONAL: si lo subís se guarda, si no, se paga igual.

    if (faltan.length > 0) {
      toast.error(`Te falta completar: ${faltan.join(" \u00b7 ")}`);
      // Llevar al primer paso donde falta algo
      if (!monto || Number(monto) <= 0 || !fecha) setStep(1);
      else if (formaPago !== "EFECTIVO" && !medioCobroId) setStep(2);
      else setStep(3);
      return;
    }

    try {
      setSubiendo(true);
      // Resolver la URL del comprobante:
      // - si hay archivo nuevo → se sube a Cloudinary (devuelve https://…)
      // - si ya había una URL guardada (pago previo) y es http(s) → se reutiliza
      // - cualquier otra cosa (blob:, vacío, null) NO es una URL válida
      let url = null;
      if (comprobanteFile) {
        const subida = await uploadToCloudinary(comprobanteFile, "rc-admin/servicios/comprobantes");
        // uploadToCloudinary devuelve un objeto { secure_url, public_id, ... }
        // → hay que tomar el link de adentro, no el objeto entero.
        url = subida?.secure_url || subida?.url || null;
      } else if (typeof comprobanteUrl === "string" && /^https?:\/\//i.test(comprobanteUrl)) {
        url = comprobanteUrl;
      }
      setSubiendo(false);

      const esUrlValida = typeof url === "string" && /^https?:\/\//i.test(url);

      await dispatch(registrarPagoServicio({
        id: pago.id,
        monto: Number(monto),
        fecha,
        forma_pago: formaPago,
        medio_cobro_id: formaPago === "EFECTIVO" ? null : Number(medioCobroId),
        observaciones,
        // Solo se envía si es una URL real (https://…); si no, se omite y el backend no rebota
        ...(esUrlValida ? { comprobante_url: url } : {}),
      })).unwrap();

      toast.success(`✅ ${pago.servicio_nombre} pagado`);
      onSuccess();
    } catch (err) {
      setSubiendo(false);
      const msg = err?.error || err?.medio_cobro_id || err?.detail || "No se pudo registrar el pago";
      toast.error(typeof msg === "string" ? msg : "No se pudo registrar el pago");
    }
  };

  const handleDeshacer = async () => {
    if (!confirm("¿Deshacer este pago? Se borrará el egreso vinculado en Balanzes.")) return;
    try {
      await dispatch(deshacerPagoServicio(pago.id)).unwrap();
      toast.success("Pago deshecho");
      onSuccess();
    } catch (err) {
      const msg = err?.error || err?.detail || "Error al deshacer";
      toast.error(typeof msg === "string" ? msg : "Error al deshacer");
    }
  };

  const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
  const inputCls = "w-full px-3 h-10 rounded-lg bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/15 focus:border-brand-primary focus:outline-none text-sm text-brand-100 dark:text-brand-200 disabled:opacity-60 transition";

  const cuentaLabel = (() => {
    const m = mediosCobro.find((x) => String(x.id) === String(medioCobroId));
    if (!m) return null;
    return m.etiqueta || m.titular_nombre || m.valor || `Cuenta ${m.id}`;
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/10 sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100/10 dark:border-brand-200/10 shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-brand-100/60 dark:text-brand-200/50 uppercase tracking-wider mb-0.5 font-semibold">
                {yaPagado ? "Detalle del pago" : "Registrar pago"}
              </p>
              <h2 className="text-lg font-bold text-brand-100 dark:text-brand-200 truncate">
                {pago.servicio_nombre}
              </h2>
              {pago.fecha_vencimiento && (
                <p className="text-xs text-brand-100/60 dark:text-brand-200/50 mt-0.5">
                  Vence: {dayjs(pago.fecha_vencimiento).format("DD/MM/YYYY")}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-3 w-9 h-9 rounded-lg bg-brand-100/5 dark:bg-brand-200/10 hover:bg-brand-100/10 dark:hover:bg-brand-200/15 flex items-center justify-center text-brand-100/70 dark:text-brand-200/80 transition shrink-0"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {yaPagado ? (
              /* ════════ YA PAGADO: vista de detalle (igual que antes) ════════ */
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-primary/10 dark:bg-brand-primary/15 border border-brand-primary/20 dark:border-brand-primary/30">
                  <HiCheck className="w-5 h-5 text-brand-primary dark:text-brand-primary-tint shrink-0" />
                  <p className="text-sm text-brand-primary dark:text-brand-primary-tint font-medium">
                    Pagado el {dayjs(pago.fecha_pago).format("DD/MM/YYYY")}
                  </p>
                </div>

                <Field label="Monto" icon={<HiOutlineCash className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-brand-100/40 dark:text-brand-200/40">$</span>
                    <input type="text" value={montoToDisplay(monto)} disabled className="w-full pl-9 pr-3 h-12 text-xl font-bold rounded-lg bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/15 text-brand-100 dark:text-brand-200 disabled:opacity-60" />
                  </div>
                </Field>

                <Field label="Fecha del pago" icon={<HiOutlineCalendar className="w-3.5 h-3.5" />}>
                  <input type="date" value={fecha} disabled className={inputCls} />
                </Field>

                <Field label="Forma de pago" icon={<HiOutlineCreditCard className="w-3.5 h-3.5" />}>
                  <div className="h-10 flex items-center px-3 rounded-lg bg-brand-100/5 dark:bg-brand-200/10 text-sm font-semibold text-brand-100/80 dark:text-brand-200/80">
                    {labelForma(formaPago)}
                  </div>
                </Field>

                <Field label="Comprobante" icon={<HiOutlineReceiptTax className="w-3.5 h-3.5" />}>
                  {comprobanteUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-brand-100/10 dark:border-brand-200/15 bg-brand-100/5 dark:bg-brand-card-dark">
                        {comprobanteUrl.toLowerCase().endsWith(".pdf") ? (
                          <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="block p-6 text-center hover:bg-brand-100/10 dark:hover:bg-brand-200/10 transition">
                            <HiOutlineDocumentText className="w-8 h-8 mx-auto text-brand-100/40 dark:text-brand-200/40 mb-1" />
                            <p className="text-xs font-semibold text-brand-100/70 dark:text-brand-200/80">Abrir PDF</p>
                          </a>
                        ) : (
                          <a href={comprobanteUrl} target="_blank" rel="noreferrer" title="Ver en grande">
                            <img src={comprobanteUrl} alt="Comprobante" className="w-full max-h-64 object-contain hover:opacity-90 transition" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-100/10 dark:border-brand-200/15 text-sm font-medium text-brand-100/80 dark:text-brand-200/85 hover:bg-brand-100/5 dark:hover:bg-brand-200/10 transition"
                        >
                          <HiOutlineEye className="w-4 h-4" /> Ver en grande
                        </a>
                        <a
                          href={comprobanteUrl.includes("/upload/") ? comprobanteUrl.replace("/upload/", "/upload/fl_attachment/") : comprobanteUrl}
                          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-deep text-white text-sm font-semibold transition"
                        >
                          <HiOutlineDownload className="w-4 h-4" /> Descargar
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-brand-100/60 dark:text-brand-200/50">Sin comprobante</p>
                  )}
                </Field>

                {observaciones && (
                  <Field label="Notas">
                    <p className="text-sm text-brand-100/70 dark:text-brand-200/80">{observaciones}</p>
                  </Field>
                )}
              </>
            ) : (
              /* ════════ NO PAGADO: WIZARD ════════ */
              <>
                {/* Stepper */}
                <div className="flex items-center gap-2">
                  {PASOS.map((p, i) => (
                    <Fragment key={p.n}>
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= p.n ? "bg-brand-primary text-white" : "bg-brand-100/10 dark:bg-brand-200/15 text-brand-100/40 dark:text-brand-200/40"}`}>
                          {p.n}
                        </div>
                        <span className={`text-xs font-medium hidden sm:inline ${step >= p.n ? "text-brand-100 dark:text-brand-200" : "text-brand-100/40 dark:text-brand-200/40"}`}>{p.label}</span>
                      </div>
                      {i < PASOS.length - 1 && (
                        <div className={`flex-1 h-0.5 rounded ${step > p.n ? "bg-brand-primary" : "bg-brand-100/10 dark:bg-brand-200/15"}`} />
                      )}
                    </Fragment>
                  ))}
                </div>

                {/* PASO 1: Monto + Fecha */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Field label="Monto" icon={<HiOutlineCash className="w-3.5 h-3.5" />}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-brand-100/40 dark:text-brand-200/40">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={montoToDisplay(monto)}
                          onChange={(e) => setMonto(montoFromInput(e.target.value))}
                          placeholder="0"
                          autoFocus
                          className="w-full pl-9 pr-3 h-12 text-xl font-bold rounded-lg bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/15 focus:border-brand-primary focus:outline-none text-brand-100 dark:text-brand-200 transition"
                        />
                      </div>
                    </Field>

                    <Field label="Fecha del pago" icon={<HiOutlineCalendar className="w-3.5 h-3.5" />}>
                      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                )}

                {/* PASO 2: Forma de pago + Cuenta */}
                {step === 2 && (
                  <div className="space-y-4">
                    <Field label="Forma de pago" icon={<HiOutlineCreditCard className="w-3.5 h-3.5" />}>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { v: "EFECTIVO", label: "Efectivo" },
                          { v: "TRANSFERENCIA", label: "Transfer." },
                          { v: "MERCADOPAGO", label: "MP" },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setFormaPago(opt.v)}
                            className={`h-10 rounded-lg text-xs font-semibold transition ${
                              formaPago === opt.v
                                ? "bg-brand-primary text-white"
                                : "bg-brand-100/5 dark:bg-brand-200/10 text-brand-100/70 dark:text-brand-200/60 hover:bg-brand-100/10 dark:hover:bg-brand-200/15"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </Field>

                    {formaPago !== "EFECTIVO" && (
                      <Field label="Cuenta">
                        <select value={medioCobroId} onChange={(e) => setMedioCobroId(e.target.value)} className={inputCls}>
                          <option value="">Seleccionar billetera...</option>
                          {mediosCobro.map((m) => {
                            const label = m.etiqueta || m.titular_nombre || m.valor || `Cuenta ${m.id}`;
                            const tipo = m.proveedor_display || m.proveedor || "";
                            return (
                              <option key={m.id} value={m.id}>
                                {label}{tipo ? ` (${tipo})` : ""}
                              </option>
                            );
                          })}
                        </select>
                        {mediosCobro.length === 0 && (
                          <p className="text-xs text-brand-secondary dark:text-brand-secondary-tint mt-1">
                            ⚠️ No hay billeteras configuradas. Cargá una desde Configuración de Pagos.
                          </p>
                        )}
                      </Field>
                    )}

                    {formaPago === "EFECTIVO" && (
                      <p className="text-[11px] text-brand-100/60 dark:text-brand-200/50 italic">
                        Pago en efectivo: no hace falta seleccionar cuenta.
                      </p>
                    )}
                  </div>
                )}

                {/* PASO 3: Comprobante + Notas + Resumen */}
                {step === 3 && (
                  <div className="space-y-4">
                    <Field
                      label={<>Comprobante <span className="text-red-500">*</span></>}
                      icon={<HiOutlineReceiptTax className="w-3.5 h-3.5" />}
                    >
                      {comprobanteUrl ? (
                        <div className="relative rounded-lg overflow-hidden border border-brand-100/10 dark:border-brand-200/15 bg-brand-200/60 dark:bg-brand-200/[0.05]">
                          {comprobanteFile?.type === "application/pdf" || comprobanteUrl?.endsWith?.(".pdf") ? (
                            <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="block p-6 text-center hover:bg-brand-100/5 dark:hover:bg-brand-200/15 transition">
                              <HiOutlineDocumentText className="w-8 h-8 mx-auto text-brand-100/40 dark:text-brand-200/40 mb-1" />
                              <p className="text-xs font-semibold text-brand-100/70 dark:text-brand-200/80">Ver PDF</p>
                            </a>
                          ) : (
                            <img src={comprobanteUrl} alt="" className="w-full h-36 object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => { setComprobanteFile(null); setComprobanteUrl(null); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white transition"
                          >
                            <HiX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="block cursor-pointer">
                          <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
                          <div className="rounded-lg border-2 border-dashed border-brand-100/20 dark:border-brand-200/15 hover:border-brand-primary hover:bg-brand-primary/10 dark:hover:bg-brand-primary/15 px-4 py-6 text-center transition">
                            <HiOutlineCloudUpload className="w-8 h-8 mx-auto text-brand-100/40 dark:text-brand-200/40 mb-1.5" />
                            <p className="text-xs font-semibold text-brand-100/80 dark:text-brand-200/80">Subir comprobante</p>
                            <p className="text-[10px] text-brand-100/60 dark:text-brand-200/50 mt-0.5">Foto o PDF</p>
                          </div>
                        </label>
                      )}
                    </Field>

                    <Field label="Notas (opcional)">
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={2}
                        placeholder="..."
                        className="w-full px-3 py-2 rounded-lg bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/15 focus:border-brand-primary focus:outline-none resize-none text-sm text-brand-100 dark:text-brand-200 transition"
                      />
                    </Field>

                    {/* Resumen */}
                    <div className="rounded-xl border border-brand-100/10 dark:border-brand-200/15 bg-brand-200/60 dark:bg-brand-200/[0.04] p-3 text-sm space-y-1.5">
                      <p className="text-[11px] uppercase tracking-wider text-brand-100/40 dark:text-brand-200/40 mb-1">Resumen</p>
                      <div className="flex justify-between"><span className="text-brand-100/60 dark:text-brand-200/50">Monto</span><span className="font-bold text-brand-100 dark:text-brand-200">{fmt(monto)}</span></div>
                      <div className="flex justify-between"><span className="text-brand-100/60 dark:text-brand-200/50">Fecha</span><span className="text-brand-100 dark:text-brand-200">{dayjs(fecha).format("DD/MM/YYYY")}</span></div>
                      <div className="flex justify-between"><span className="text-brand-100/60 dark:text-brand-200/50">Forma de pago</span><span className="text-brand-100 dark:text-brand-200">{labelForma(formaPago)}</span></div>
                      {formaPago !== "EFECTIVO" && (
                        <div className="flex justify-between"><span className="text-brand-100/60 dark:text-brand-200/50">Cuenta</span><span className="text-brand-100 dark:text-brand-200">{cuentaLabel || "—"}</span></div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-4 border-t border-brand-100/10 dark:border-brand-200/10 shrink-0 bg-brand-card dark:bg-brand-card-dark">
            {yaPagado ? (
              <button
                type="button"
                onClick={handleDeshacer}
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-brand-100/5 dark:bg-brand-200/10 hover:bg-red-500/10 dark:hover:bg-red-500/20 text-brand-100/70 dark:text-brand-200/80 hover:text-red-600 dark:hover:text-red-400 font-semibold text-sm transition disabled:opacity-50"
              >
                Deshacer pago
              </button>
            ) : (
              <div className="flex gap-2">
                {step === 1 ? (
                  <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-brand-100/5 dark:bg-brand-200/10 hover:bg-brand-100/10 dark:hover:bg-brand-200/15 text-brand-100/80 dark:text-brand-200/85 font-semibold text-sm transition">
                    Cancelar
                  </button>
                ) : (
                  <button type="button" onClick={atras} className="flex-1 h-11 rounded-xl bg-brand-100/5 dark:bg-brand-200/10 hover:bg-brand-100/10 dark:hover:bg-brand-200/15 text-brand-100/80 dark:text-brand-200/85 font-semibold text-sm transition">
                    ← Atrás
                  </button>
                )}

                {step < 3 ? (
                  <button type="button" onClick={siguiente} className="flex-1 h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-deep font-bold text-white text-sm transition">
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || subiendo}
                    className="flex-1 h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-deep font-bold text-white text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {subiendo || submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {subiendo ? "Subiendo..." : "Registrando..."}
                      </>
                    ) : (
                      <>
                        <HiCheck className="w-4 h-4" />
                        Confirmar pago
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-100/60 dark:text-brand-200/50 mb-1.5">
        {icon}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}