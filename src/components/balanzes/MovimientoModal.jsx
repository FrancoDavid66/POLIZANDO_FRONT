// src/components/balanzes/MovimientoModal.jsx
// 🚀 UNIFICADO: reemplaza IngresoCreateModal + EgresoCreateModal + IngresoEditModal + EgresoEditModal
// Uso:
//   <MovimientoModal tipo="ingreso" modo="crear"  isOpen onClose />
//   <MovimientoModal tipo="egreso"  modo="editar" isOpen item={row} onClose />
//
// Se preserva EXACTO el comportamiento de cada uno de los 4 modales originales:
//  - crear  → wizard de 3 pasos
//  - editar → formulario plano
//  - ingreso guarda "pagado_por" como campo aparte
//  - egreso mete "[Cuenta: X] → Destinatario" dentro de la descripción (crear)
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import { useAuth } from "../../context/AuthContext";
import {
  createIngreso, updateIngreso,
  createEgreso, updateEgreso,
} from "../../store/slices/cajaSlices";
import { fetchBalanceDiario, createCategoria } from "../../store/slices/balanceSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";
import { fmtMoney } from "./format";

/* ── Helpers comunes ── */
const normalizarStr = (raw) => (raw ?? "").toString().trim();
const today = () => dayjs().format("YYYY-MM-DD");

const API_BASE = (import.meta.env.VITE_API_URL || "/api/").toString();
const OFICINAS_URL = (API_BASE.endsWith("/") ? API_BASE : API_BASE + "/") + "usuarios/oficinas/";

const STEPS = [
  { n: 1, label: "Monto" },
  { n: 2, label: "Detalle" },
  { n: 3, label: "Confirmar" },
];

// Monto es-AR: 20000 -> "20.000"
const montoToDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const [intPart, decPart] = String(raw).split(".");
  const intFmt = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart != null ? `${intFmt},${decPart}` : intFmt;
};
const montoFromInput = (text) => {
  const cleaned = String(text).replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  const dec = rest.length ? rest.join("").slice(0, 2) : null;
  return dec != null ? `${intPart}.${dec}` : intPart;
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

/* Sugerencias locales (solo edición de ingreso) */
const STORAGE_CATS = "balanzes_categorias";
const STORAGE_WALLETS = "balanzes_billeteras";
const uniqClean = (arr = []) =>
  Array.from(new Set(arr.map((x) => (x ?? "").toString().trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
const readLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (k, arr) => {
  try {
    localStorage.setItem(k, JSON.stringify(uniqClean(arr)));
  } catch {
    // ignore
  }
};

/* ── Config por tipo ── */
const CONF = {
  ingreso: {
    createThunk: createIngreso,
    updateThunk: updateIngreso,
    catTipo: "INGRESO",
    accent: "emerald",
    asterisk: "text-emerald-400",
    labelFormaPago: (fp) =>
      fp === "EFECTIVO" ? "Efectivo / Caja" : fp === "TRANSFERENCIA" ? "Transferencia" : "Mercado Pago",
    cuentaLabel: "Cuenta destino (del estudio)",
    walletPlaceholder: "Ej: Banco Nación, alias.mp…",
    titleCrear: "Cargar nuevo ingreso",
    titleEditar: "Editar ingreso",
    submitCrear: "Confirmar ingreso",
    submitEditar: "Actualizar ingreso",
  },
  egreso: {
    createThunk: createEgreso,
    updateThunk: updateEgreso,
    catTipo: "EGRESO",
    accent: "rose",
    asterisk: "text-rose-400",
    labelFormaPago: (fp) =>
      fp === "EFECTIVO" ? "Efectivo / Caja Chica" : fp === "TRANSFERENCIA" ? "Transferencia Bancaria" : "Mercado Pago",
    cuentaLabel: "Cuenta origen (del estudio)",
    walletPlaceholder: "Ej: Banco Provincia, Ualá…",
    titleCrear: "Cargar nuevo egreso",
    titleEditar: "Editar egreso",
    submitCrear: "Confirmar egreso",
    submitEditar: "Actualizar egreso",
  },
};

/* clases dependientes del acento (literales completas para Tailwind) */
const ACCENT = {
  emerald: {
    inputFocus: "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
    stepOn: "bg-emerald-500 text-zinc-900",
    stepLine: "bg-emerald-500",
    fpOn: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
    nextBtn: "text-zinc-900 bg-emerald-400 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-500/20",
    submitOn: "bg-emerald-400 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-500/20 text-zinc-900",
    submitOff: "bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed border border-emerald-500/10",
    resumenMonto: "text-emerald-300",
    inputFocusLite: "focus:border-emerald-500",
  },
  rose: {
    inputFocus: "focus:border-rose-500 focus:ring-1 focus:ring-rose-500",
    stepOn: "bg-rose-500 text-white",
    stepLine: "bg-rose-500",
    fpOn: "bg-rose-500/20 text-rose-300 border-rose-500/50",
    nextBtn: "text-white bg-rose-500 hover:bg-rose-600 active:scale-95 shadow-lg shadow-rose-500/20",
    submitOn: "bg-rose-500 hover:bg-rose-600 active:scale-95 shadow-lg shadow-rose-500/20 text-white",
    submitOff: "bg-rose-500/30 text-rose-100/50 cursor-not-allowed border border-rose-500/10 text-white",
    resumenMonto: "text-rose-300",
    inputFocusLite: "focus:border-rose-500",
  },
};

export default function MovimientoModal({ tipo = "ingreso", modo = "crear", isOpen, onClose, item }) {
  const conf = CONF[tipo] || CONF.ingreso;
  const acc = ACCENT[conf.accent];
  const esEgreso = tipo === "egreso";
  const esEditar = modo === "editar";
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina?.codigo || user?.perfil?.oficina || "";

  const { categorias, oficinas: oficinasStore } = useSelector((s) => s.balance || {});
  const mediosCobro = useSelector((s) => (s.pagos?.mediosCobro || []).filter((m) => m.activo !== false));

  // Para edición: oficinas del store. Para creación: store o fetch local.
  const [oficinasLocal, setOficinasLocal] = useState([]);
  const oficinas = (oficinasStore && oficinasStore.length) ? oficinasStore : oficinasLocal;

  useEffect(() => { dispatch(fetchMediosCobro({ activo: true })); }, [dispatch]);

  // Solo creación: cargar oficinas por axios si es admin
  useEffect(() => {
    if (esEditar || !isOpen || !isWebAdmin) return;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    axios
      .get(OFICINAS_URL, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        const d = r.data;
        setOficinasLocal(Array.isArray(d) ? d : d?.results || []);
      })
      .catch(() => {});
  }, [isOpen, isWebAdmin, esEditar]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    monto: "",
    fecha: today(),
    forma_pago: "EFECTIVO",
    billetera: "",
    categoria: "",
    descripcion: "",
    pagado_por: "",
    destinatario: "",
    observaciones: "",
    oficina: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const montoRef = useRef(null);
  const catRef = useRef(null);
  const fechaRef = useRef(null);
  const billeRef = useRef(null);

  // Sugerencias locales (edición de ingreso)
  const [localCats, setLocalCats] = useState([]);
  const [localWallets, setLocalWallets] = useState([]);

  const ingresosList = useSelector((s) => s.ingresos?.list || []);
  const egresosList = useSelector((s) => s.egresos?.list || []);

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitting(false);
    setStep(1);

    if (esEditar && item) {
      let fp = item.forma_pago || "EFECTIVO";
      if (fp === "VIRTUAL") fp = "TRANSFERENCIA";
      setForm({
        monto: typeof item.monto === "number" ? item.monto.toString() : item.monto ?? "",
        fecha: toDateInput(item.fecha) || today(),
        forma_pago: fp,
        billetera: item.billetera || "",
        categoria: item.categoria || "",
        descripcion: item.descripcion || "",
        pagado_por: item.pagado_por || "",
        destinatario: "",
        observaciones: item.observaciones || "",
        oficina: item.oficina || "",
      });
    } else {
      setForm({
        monto: "",
        fecha: today(),
        forma_pago: "EFECTIVO",
        billetera: "",
        categoria: "",
        descripcion: "",
        pagado_por: "",
        destinatario: "",
        observaciones: "",
        oficina: "",
      });
    }
    setLocalCats(readLS(STORAGE_CATS, []));
    setLocalWallets(readLS(STORAGE_WALLETS, []));
    setTimeout(() => montoRef.current?.focus(), 60);
  }, [isOpen, item, esEditar]);

  const catOpciones = useMemo(() => {
    const fromIng = ingresosList.map((i) => i?.categoria);
    const fromEg = egresosList.map((e) => e?.categoria);
    return uniqClean([...fromIng, ...fromEg, ...localCats, form.categoria]);
  }, [ingresosList, egresosList, localCats, form.categoria]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCategoriaChange = (val) => setForm((p) => ({ ...p, categoria: val }));
  const setFormaPago = (fp) =>
    setForm((p) => ({ ...p, forma_pago: fp, billetera: fp === "EFECTIVO" ? "" : p.billetera }));

  const isVirtual = form.forma_pago !== "EFECTIVO";

  const inputBase =
    `w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none ${acc.inputFocus}`;

  /* ── Validación ── */
  // Wizard (crear): por paso. Egreso pide descripción en paso 2; ingreso no.
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
      if (isVirtual && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
    }
    if (s === 2) {
      if (esEgreso && !form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
      if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    }
    if (s === 3) {
      if (!esEgreso && !form.fecha) e.fecha = "Seleccioná la fecha.";
      if (isWebAdmin && !form.oficina) e.oficina = `Seleccioná la sucursal de este ${tipo}.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Edición (form plano): todo junto.
  const validateEditar = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (!esEgreso && !form.fecha) e.fecha = "Seleccioná la fecha.";
    if (esEgreso && !form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (isVirtual && !form.billetera?.trim()) e.billetera = esEgreso ? "Indicá la cuenta / banco." : "Indicá la billetera/cuenta.";
    if (isWebAdmin && !form.oficina) e.oficina = `Seleccioná la sucursal de este ${tipo}.`;
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      const map = { monto: montoRef, fecha: fechaRef, categoria: catRef, billetera: billeRef };
      setTimeout(() => map[first]?.current?.focus(), 0);
    }
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  };
  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };
  const validateAll = () => validateStep(1) && validateStep(2) && validateStep(3);

  /* ── Construcción del payload ── */
  const buildPayloadCrear = () => {
    const montoNum = tipo === "egreso" ? parseFloat(form.monto || "0") : Number(form.monto || 0);
    const catNorm = normalizarStr(form.categoria);
    const billeteraDetalle = isVirtual ? (form.billetera || "Sin especificar") : "";

    if (esEgreso) {
      const destinatario = normalizarStr(form.destinatario);
      let descripcionBase = normalizarStr(form.descripcion);
      if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;
      if (destinatario) descripcionBase = `${descripcionBase} → ${destinatario}`;
      return {
        descripcion: descripcionBase,
        monto: montoNum,
        categoria: catNorm,
        fecha: form.fecha,
        forma_pago: form.forma_pago,
        billetera: billeteraDetalle,
        observaciones: form.observaciones || "",
        oficina: isWebAdmin ? form.oficina : undefined,
      };
    }

    // ingreso
    let descripcionBase = normalizarStr(form.descripcion) || `Ingreso ${catNorm}`.trim();
    if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;
    return {
      monto: montoNum,
      fecha: form.fecha,
      forma_pago: form.forma_pago,
      billetera: billeteraDetalle,
      categoria: catNorm || "Sin categoría",
      descripcion: descripcionBase,
      pagado_por: normalizarStr(form.pagado_por) || "No especificado",
      oficina: isWebAdmin ? form.oficina : undefined,
    };
  };

  const buildPayloadEditar = () => {
    const montoNum = tipo === "egreso" ? parseFloat(form.monto || "0") : Number(form.monto || 0);
    const billeteraDetalle = isVirtual ? (form.billetera || "Sin especificar") : "";

    if (esEgreso) {
      return {
        id: item.id,
        descripcion: form.descripcion,
        monto: montoNum,
        categoria: form.categoria,
        forma_pago: form.forma_pago,
        billetera: billeteraDetalle,
        observaciones: form.observaciones || "",
        ...(form.fecha ? { fecha: form.fecha } : {}),
        ...(isWebAdmin && form.oficina ? { oficina: form.oficina } : {}),
      };
    }
    return {
      id: item.id,
      monto: montoNum,
      fecha: form.fecha,
      forma_pago: form.forma_pago,
      billetera: billeteraDetalle,
      categoria: form.categoria || "Sin categoría",
      descripcion: form.descripcion,
      pagado_por: form.pagado_por,
      ...(isWebAdmin && form.oficina ? { oficina: form.oficina } : {}),
    };
  };

  /* ── Submit ── */
  const handleSubmit = async (ev) => {
    ev.preventDefault();

    if (!esEditar) {
      // crear = wizard
      if (step < 3) { handleNext(); return; }
      if (!validateAll()) return;

      const payload = buildPayloadCrear();
      const catNorm = normalizarStr(form.categoria);
      try {
        setSubmitting(true);
        await dispatch(conf.createThunk(payload)).unwrap();

        const ofiParaBalance = isWebAdmin ? form.oficina : userOficina;
        dispatch(fetchBalanceDiario({ fecha: payload.fecha, oficina: ofiParaBalance }));

        const existeCat = (categorias || []).some((c) => c.nombre.toLowerCase() === catNorm.toLowerCase());
        if (catNorm && !existeCat) {
          dispatch(createCategoria({ nombre: catNorm, tipo: conf.catTipo }));
        }
        onClose?.();
      } catch (err) {
        console.error(`Error al crear ${tipo}:`, err);
        if (!esEgreso) alert("Error al guardar el ingreso. Revisá la consola.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // editar = form plano
    if (!item) return;
    if (!validateEditar()) return;

    const payload = buildPayloadEditar();
    const billeteraDetalle = payload.billetera;
    try {
      setSubmitting(true);
      await dispatch(conf.updateThunk(payload)).unwrap();
      if (billeteraDetalle) {
        writeLS(STORAGE_WALLETS, uniqClean([...localWallets, billeteraDetalle]));
      }
      onClose?.();
    } catch (err) {
      console.error(`Error al actualizar ${tipo}:`, err);
    } finally {
      setSubmitting(false);
    }
  };

  const finalDisabledCrear =
    submitting || !form.monto ||
    (esEgreso ? !form.descripcion : !form.fecha) ||
    !form.categoria ||
    (isWebAdmin && !form.oficina) ||
    (isVirtual && !form.billetera);

  const disabledEditar =
    submitting || !form.monto || Number(form.monto) <= 0 ||
    (!esEgreso && !form.fecha) ||
    (esEgreso && !form.descripcion) ||
    !form.categoria ||
    (isVirtual && !form.billetera) ||
    (isWebAdmin && !form.oficina);

  /* ── Bloque billetera + persona (compartido) ── */
  const renderCuentaBlock = () => (
    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1.5 text-zinc-400">
          {conf.cuentaLabel} <span className={conf.asterisk}>*</span>
        </label>
        {mediosCobro.length > 0 ? (
          <select
            name="billetera"
            value={form.billetera}
            onChange={handleChange}
            className={`w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none ${acc.inputFocusLite} transition-colors`}
          >
            <option value="">Seleccionar cuenta…</option>
            {mediosCobro.map((m) => (
              <option key={m.id} value={m.valor}>
                {m.etiqueta || m.titular_nombre} — {m.valor} ({m.proveedor?.replace("_", " ")})
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={billeRef}
            name="billetera"
            value={form.billetera}
            onChange={handleChange}
            placeholder={conf.walletPlaceholder}
            className={`w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none ${acc.inputFocusLite}`}
          />
        )}
        {errors.billetera && <p className="text-[11px] text-rose-400 mt-1">{errors.billetera}</p>}
      </div>
      <div>
        {esEgreso ? (
          <>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Destinatario / A quién se pagó</label>
            <input
              name="destinatario"
              value={form.destinatario}
              onChange={handleChange}
              placeholder="Ej: Proveedor X, nombre del titular…"
              className={`w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none ${acc.inputFocusLite}`}
            />
          </>
        ) : (
          <>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Enviado por (cliente / remitente)</label>
            <input
              name="pagado_por"
              value={form.pagado_por}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez, nombre del banco…"
              className={`w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none ${acc.inputFocusLite}`}
            />
          </>
        )}
      </div>
    </div>
  );

  /* ── Selector de forma de pago (3 botones) ── */
  const renderFormaPagoBtns = () => (
    <div className="flex flex-wrap gap-2">
      {["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO"].map((fp) => (
        <button
          key={fp}
          type="button"
          onClick={() => setFormaPago(fp)}
          className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === fp ? acc.fpOn : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}
        >
          {conf.labelFormaPago(fp)}
        </button>
      ))}
    </div>
  );

  /* ═══════════════ RENDER: CREAR (wizard) ═══════════════ */
  const renderCrear = () => (
    <form onSubmit={handleSubmit} className="space-y-5 text-zinc-50">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s.n ? acc.stepOn : "bg-zinc-800 text-zinc-500"}`}>
                {s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step >= s.n ? "text-zinc-100" : "text-zinc-500"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${step > s.n ? acc.stepLine : "bg-zinc-800"}`} />
            )}
          </Fragment>
        ))}
      </div>

      {/* PASO 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Monto <span className={conf.asterisk}>*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
              <input ref={montoRef} name="monto" type="text" inputMode="decimal" value={montoToDisplay(form.monto)} onChange={(e) => setForm((p) => ({ ...p, monto: montoFromInput(e.target.value) }))} className={`pl-7 ${inputBase}`} placeholder="0" />
            </div>
            {errors.monto && <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-400">Forma de pago <span className={conf.asterisk}>*</span></label>
            {renderFormaPagoBtns()}
          </div>

          {isVirtual && renderCuentaBlock()}
        </div>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {esEgreso && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción / Motivo <span className={conf.asterisk}>*</span></label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Ej: Artículos de limpieza, Luz…" className={inputBase} />
              {errors.descripcion && <p className="text-[11px] text-rose-400 mt-1">{errors.descripcion}</p>}
            </div>
          )}

          <CategoriaSelect
            tipo={conf.catTipo}
            value={form.categoria}
            onChange={handleCategoriaChange}
            error={errors.categoria}
            refProp={catRef}
            asteriskColor={conf.asterisk}
          />

          {!esEgreso && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Detalle del ingreso…" className={inputBase} />
              </div>
              {!isVirtual && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-zinc-400">Pagado por <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                  <input name="pagado_por" value={form.pagado_por} onChange={handleChange} placeholder="Ej: Juan Pérez" className={inputBase} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PASO 3 */}
      {step === 3 && (
        <div className="space-y-4">
          {isWebAdmin && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Sucursal <span className={conf.asterisk}>*</span></label>
              <select name="oficina" value={form.oficina} onChange={handleChange} className={inputBase}>
                <option value="">Seleccione una sucursal...</option>
                {oficinas?.map((ofi) => (
                  <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
                ))}
              </select>
              {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              {esEgreso ? "Fecha del egreso" : "Fecha"} <span className={conf.asterisk}>*</span>
            </label>
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} className={inputBase} />
            {errors.fecha && <p className="text-[11px] text-rose-400 mt-1">{errors.fecha}</p>}
          </div>

          {esEgreso && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Observaciones <span className="text-zinc-500 font-normal">(Opcional)</span></label>
              <textarea name="observaciones" onChange={handleChange} value={form.observaciones} rows={2} placeholder="Nº de comprobante, detalles de la factura..." className={`${inputBase} resize-none`} />
            </div>
          )}

          {/* Resumen */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Resumen</p>
            <div className="flex justify-between"><span className="text-zinc-400">Monto</span><span className={`font-bold ${acc.resumenMonto}`}>{fmtMoney(form.monto)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Forma de pago</span><span className="text-zinc-200">{conf.labelFormaPago(form.forma_pago)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Categoría</span><span className="text-zinc-200">{form.categoria || "—"}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Descripción</span><span className="text-zinc-200 truncate ml-3 text-right">{form.descripcion || "—"}</span></div>
          </div>
        </div>
      )}

      {/* Footer wizard */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800">
        {step === 1 ? (
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</button>
        ) : (
          <button type="button" onClick={handleBack} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">← Atrás</button>
        )}
        {step < 3 ? (
          <button type="button" onClick={handleNext} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${acc.nextBtn}`}>Siguiente →</button>
        ) : (
          <button type="submit" disabled={finalDisabledCrear} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${finalDisabledCrear ? acc.submitOff : acc.submitOn}`}>{submitting ? "Guardando…" : conf.submitCrear}</button>
        )}
      </div>
    </form>
  );

  /* ═══════════════ RENDER: EDITAR (form plano) ═══════════════ */
  const renderEditar = () => (
    <form onSubmit={handleSubmit} className="space-y-5 text-zinc-50">
      {/* Monto / Fecha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">Monto <span className={conf.asterisk}>*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
            <input ref={montoRef} name="monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleChange} className={`pl-7 ${inputBase}`} placeholder="0.00" />
          </div>
          {errors.monto && <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">{esEgreso ? "Fecha del egreso" : "Fecha"} {!esEgreso && <span className={conf.asterisk}>*</span>}</label>
          <input ref={fechaRef} type="date" name="fecha" value={form.fecha} onChange={handleChange} className={inputBase} />
          {errors.fecha && <p className="text-[11px] text-rose-400 mt-1">{errors.fecha}</p>}
        </div>
      </div>

      {/* Sucursal (admin) */}
      {isWebAdmin && (
        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">Sucursal <span className={conf.asterisk}>*</span></label>
          <select name="oficina" value={form.oficina} onChange={handleChange} className={inputBase}>
            <option value="">Seleccione una sucursal...</option>
            {oficinas?.map((ofi) => (
              <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
            ))}
          </select>
          {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
        </div>
      )}

      {/* Egreso: descripción + categoría (grid). Ingreso: forma de pago primero. */}
      {esEgreso ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción / Motivo <span className={conf.asterisk}>*</span></label>
            <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Ej: Artículos de limpieza, Luz…" className={inputBase} />
            {errors.descripcion && <p className="text-[11px] text-rose-400 mt-1">{errors.descripcion}</p>}
          </div>
          <div>
            <CategoriaSelect label="Categoría" required value={form.categoria} onChange={handleCategoriaChange} className="mb-0" />
            {errors.categoria && <p className="text-[11px] text-rose-400 mt-1">{errors.categoria}</p>}
          </div>
        </div>
      ) : null}

      {/* Forma de pago */}
      <div>
        <label className="block text-xs font-medium mb-2 text-zinc-400">Forma de pago <span className={conf.asterisk}>*</span></label>
        {renderFormaPagoBtns()}
      </div>

      {/* Billetera + persona */}
      {isVirtual && renderCuentaBlock()}

      {/* Ingreso: categoría (datalist) + descripción/pagado_por */}
      {!esEgreso && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Categoría <span className={conf.asterisk}>*</span></label>
            <input
              ref={catRef}
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              list="cat-suggestions-mov-editar"
              placeholder="Escribí o elegí una categoría"
              className={inputBase}
            />
            <datalist id="cat-suggestions-mov-editar">
              {catOpciones.map((opt) => (<option key={opt} value={opt} />))}
            </datalist>
            {errors.categoria && <p className="text-[11px] text-rose-400 mt-1">{errors.categoria}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción <span className="text-zinc-500 font-normal">(Opcional)</span></label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Ej: Cobro servicio X" className={inputBase} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Pagado por <span className="text-zinc-500 font-normal">(Opcional)</span></label>
              <input name="pagado_por" value={form.pagado_por} onChange={handleChange} placeholder="Ej: Juan Pérez" className={inputBase} />
            </div>
          </div>
        </>
      )}

      {/* Egreso: observaciones */}
      {esEgreso && (
        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">Observaciones <span className="text-zinc-500 font-normal">(Opcional)</span></label>
          <textarea name="observaciones" onChange={handleChange} value={form.observaciones} rows={2} placeholder="Nº de comprobante, detalles de la factura..." className={`${inputBase} resize-none`} />
        </div>
      )}

      {/* Footer editar */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <button type="button" onClick={onClose} disabled={submitting} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</button>
        <button type="submit" disabled={disabledEditar} className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${disabledEditar ? acc.submitOff : acc.submitOn}`}>{submitting ? "Guardando…" : conf.submitEditar}</button>
      </div>
    </form>
  );

  const title = esEditar ? conf.titleEditar : conf.titleCrear;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={title}>
      {esEditar ? renderEditar() : renderCrear()}
    </ModalWrapper>
  );
}