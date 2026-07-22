/* src/components/pagos/PagosList.jsx */
import { useDispatch } from "react-redux";
import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { formatMoney } from "../../utils/formatMoney";
import { formatDate } from "../../utils/formatDate";
import axios from "axios";
import {
  HiBadgeCheck,
  HiClock,
  HiCash,
  HiExclamationCircle,
  HiUser,
  HiQuestionMarkCircle,
  HiX,
  HiPencil,
  HiChevronDown,
  HiChevronUp,
  HiCalendar,
  HiShieldCheck,
  HiShieldExclamation,
  HiExclamation,
  HiCheck,
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO Y COMPONENTES
import { useAuth } from "../../context/AuthContext";
import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import PagoWizardModal from "./PagoWizardModal";
import { PALETTE, TONO_STYLES } from "./pagosListStyles";
import CuotaRow from "./CuotaRow";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

/* ====== PALETA SOBRIA — INDUSTRIAL/OPERATIVA ====== */

// 🎯 Lógica unificada de cuotas (única fuente de verdad para fechas/estados)
import {
  sumarDiasHabiles as utilSumarDiasHabiles,
  getEstadoCuota,
  fechaLimitePago,
  getBadgeClasses,
  getBadgeLabel,
  calcCobertura,
  resumenCuotas,
  fmtFecha,
  ESTADO_CUOTA,
} from "../../utils/cuotas";

const fmtMoney = (n) => formatMoney(n, { symbol: "" });
const fmtDate = (d) => formatDate(d);



/* ═══════════════════════════════════════════════════════════════════
   🎯 HELPERS Opción A — frase humana corta + fecha grande
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Construye {titulo (fecha grande), subtitulo (frase humana), tono} para una cuota.
 * Lenguaje SIMPLE para operadores nuevos sin experiencia en seguros.
 */
function buildFraseEstado(cuota, todasLasCuotas = []) {
  if (!cuota) return { titulo: "—", subtitulo: "Sin datos", tono: "neutral" };

  const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
  const fechaPagoReal = cuota?.pago_registrado_en || cuota?.fecha_pago;
  const fp = fechaPagoReal ? dayjs(fechaPagoReal).startOf("day") : null;
  const hoy = dayjs().startOf("day");
  const estado = getEstadoCuota(cuota, todasLasCuotas);

  // 🎯 Fecha LÍMITE de pago (vto de la cuota anterior). Es la que define la mora.
  const limite = fechaLimitePago(cuota, todasLasCuotas);
  const limiteTxt = fmtFecha(limite || cuota?.fecha_vencimiento);

  // ── PAGADA ──
  if (estado === ESTADO_CUOTA.PAGADA) {
    const pagoAtrasado = fp && fv && fp.isAfter(fv);

    if (pagoAtrasado) {
      const diasAtraso = fp.diff(fv, "day");
      return {
        titulo: fmtFecha(fechaPagoReal),
        subtitulo: `Pagó ${diasAtraso} día${diasAtraso === 1 ? "" : "s"} tarde`,
        tono: "warning",
        tooltip: `La cuota vencía el ${fmtFecha(cuota?.fecha_vencimiento)}. El cliente pagó el ${fmtFecha(fechaPagoReal)}, ${diasAtraso} día${diasAtraso === 1 ? "" : "s"} después.`,
      };
    }
    const diasDesdePago = fp ? hoy.diff(fp, "day") : null;
    let subtitulo;
    if (diasDesdePago == null) subtitulo = "Pagó a tiempo";
    else if (diasDesdePago === 0) subtitulo = "Pagó hoy";
    else if (diasDesdePago === 1) subtitulo = "Pagó ayer";
    else subtitulo = `Pagó hace ${diasDesdePago} días`;
    return {
      titulo: fmtFecha(fechaPagoReal),
      subtitulo,
      tono: "success",
      tooltip: "El cliente pagó esta cuota en término (antes del vencimiento o el mismo día).",
    };
  }

  // ── VENCIDA ──
  if (estado === ESTADO_CUOTA.VENCIDA) {
    const dias = limite ? limite.diff(hoy, "day") : null;
    const abs = dias != null ? Math.abs(dias) : "?";
    return {
      titulo: limiteTxt,
      subtitulo: `Lleva ${abs} día${abs === 1 ? "" : "s"} sin pagar`,
      tono: "danger",
      tooltip: `Esta cuota tendría que haberse pagado el ${limiteTxt}. Ya pasaron ${abs} día${abs === 1 ? "" : "s"} y todavía no se pagó.`,
    };
  }

  // ── VENCE HOY ──
  if (estado === ESTADO_CUOTA.VENCE_HOY) {
    return {
      titulo: limiteTxt,
      subtitulo: "Tiene que pagar hoy",
      tono: "warning",
      tooltip: "Esta cuota vence hoy. Si el cliente no paga, mañana el auto queda sin cobertura.",
    };
  }

  // ── POR VENCER ──
  if (estado === ESTADO_CUOTA.POR_VENCER) {
    const dias = limite ? limite.diff(hoy, "day") : null;
    const subtitulo = dias === 1 ? "Le falta 1 día" : `Le faltan ${dias} días`;
    return {
      titulo: limiteTxt,
      subtitulo,
      tono: dias != null && dias <= 3 ? "warning" : "neutral",
      tooltip: `Hay que pagar esta cuota antes del ${limiteTxt}. Si no se paga, el auto va a quedar sin cobertura desde esa fecha.`,
    };
  }

  // ── PENDIENTE ──
  return {
    titulo: "Sin fecha",
    subtitulo: "Pendiente",
    tono: "neutral",
    tooltip: "Esta cuota no tiene fecha de vencimiento cargada.",
  };
}

/**
 * Construye {titulo, subtitulo, tono, tooltip} para la cobertura (auto protegido).
 * Lenguaje SIMPLE: "AUTO PROTEGIDO" / "AUTO SIN PROTECCIÓN" en vez de "cobertura".
 */
function buildFraseCobertura(cobertura, cuota, esCuotaFutura) {
  if (!cobertura) {
    return { titulo: "—", subtitulo: "Sin cobertura", tono: "neutral", tooltip: "" };
  }
  const hoy = dayjs().startOf("day");

  // ── SIN COBERTURA ──
  if (cobertura.tipo === "sin_cobertura") {
    // Si la cuota es FUTURA (todavía no venció), no es urgente: mostramos frase preventiva
    if (esCuotaFutura) {
      return {
        titulo: "Quedará sin cobertura",
        subtitulo: `Desde el ${fmtFecha(cobertura.desde)}, si no pagan la anterior`,
        tono: "danger-soft",
        tooltip: `Si no se paga la cuota anterior antes del ${fmtFecha(cobertura.desde)}, el auto va a quedar sin cobertura del seguro desde esa fecha.`,
      };
    }

    // Cuota vencida sin pagar → urgente, rojo fuerte
    const diasSinCob = cobertura.desde ? hoy.diff(cobertura.desde, "day") : null;
    let subtitulo;
    if (diasSinCob == null || diasSinCob < 0) subtitulo = "Desde su vencimiento";
    else if (diasSinCob === 0) subtitulo = "Desde hoy";
    else subtitulo = `El auto lleva ${diasSinCob} día${diasSinCob === 1 ? "" : "s"} sin cobertura`;
    return {
      titulo: `Sin protección desde ${fmtFecha(cobertura.desde)}`,
      subtitulo,
      tono: "danger",
      tooltip: "El cliente no pagó esta cuota. Su auto NO tiene cobertura del seguro. Si tiene un accidente ahora, la compañía no lo cubre.",
    };
  }

  // ── PAGADA CON ATRASO ──
  if (cobertura.tipo === "atrasado") {
    return {
      titulo: `${fmtFecha(cobertura.desde)} → ${fmtFecha(cobertura.hasta)}`,
      subtitulo: "Protección reactivada por pago tardío",
      tono: "warning",
      tooltip: `Como el cliente pagó tarde, la cobertura arrancó 2 días hábiles después del pago. En los días entre el vencimiento y el ${fmtFecha(cobertura.desde)}, el auto NO estuvo cubierto.`,
    };
  }

  // ── PAGADA EN TÉRMINO ──
  if (cuota?.pagado) {
    return {
      titulo: `${fmtFecha(cobertura.desde)} → ${fmtFecha(cobertura.hasta)}`,
      subtitulo: "Cubierto durante este mes",
      tono: "success",
      tooltip: "El auto del cliente tuvo cobertura del seguro durante este período. Si tuvo un accidente acá, la compañía lo cubre.",
    };
  }

  // ── POR VENCER / VENCE HOY (cuota futura no pagada pero anterior pagada) ──
  return {
    titulo: `Hasta el ${fmtFecha(cobertura.hasta)}`,
    subtitulo: "Cubierto por la cuota anterior",
    tono: "success",
    tooltip: "El cliente está cubierto por la cuota anterior que ya pagó. La protección dura hasta el vencimiento de esta cuota.",
  };
}

/**
 * Estilos por tono semántico.
 */
/**
 * Devuelve el label del badge en lenguaje simple.
 */
function getLabelSimple(state) {
  if (state === "paid") return "Pagada";
  if (state === "overdue") return "Sin pagar";
  return "Falta pagar";
}

/* ═══════════════════════════════════════════════════════════════════ */

function todayKey() { return dayjs().format("YYYY-MM-DD"); }
function msUntilNextDay() {
  const now = dayjs();
  const next = now.add(1, "day").startOf("day").add(2, "second");
  return Math.max(5_000, Math.min(next.diff(now, "millisecond"), 24 * 60 * 60 * 1000));
}

function pickCuotaActualizada(resp) {
  const r = resp && typeof resp === "object" ? resp : null;
  if (!r) return null;
  if (r.cuotaActualizada && typeof r.cuotaActualizada === "object") return r.cuotaActualizada;
  if (r.data && typeof r.data === "object") return r.data;
  return r;
}

function safeStr(v) { return v === null || v === undefined ? "" : String(v).trim(); }
function isBadClienteLabel(s) { const x = safeStr(s).toLowerCase(); return !x || x === "cliente" || x === "client" || x === "asegurado"; }

function resolveCliente(pol, cuota) {
  const p = pol && typeof pol === "object" ? pol : {};
  const c = p?.cliente;
  const isObjCliente = c && typeof c === "object" && !Array.isArray(c);

  const apellido = safeStr(isObjCliente ? c.apellido : "") || safeStr(p.cliente_apellido) || safeStr(cuota?.cliente_apellido);
  const nombre = safeStr(isObjCliente ? c.nombre : "") || safeStr(p.cliente_nombre) || safeStr(cuota?.cliente_nombre);
  const nombreCompletoFlat = safeStr(p.cliente_nombre_completo) || safeStr(p.cliente_nombre_apellido) || safeStr(cuota?.cliente_nombre_completo) || safeStr(cuota?.cliente_nombre_apellido);
  const asegurado = safeStr(p.asegurado_nombre) || safeStr(p.asegurado) || safeStr(cuota?.asegurado);
  const dni = safeStr(isObjCliente ? c.dni_cuit_cuil : "") || safeStr(p.cliente_dni) || safeStr(cuota?.cliente_dni) || safeStr(p.dni_cuit_cuil) || safeStr(cuota?.dni_cuit_cuil);
  const id = (isObjCliente && (typeof c.id === "number" || typeof c.id === "string") ? c.id : null) ?? p.cliente_id ?? cuota?.cliente_id ?? null;

  const byObj = [safeStr(isObjCliente ? c.apellido : ""), safeStr(isObjCliente ? c.nombre : "")].filter(Boolean).join(", ").trim();
  const byParts = [apellido, nombre].filter(Boolean).join(", ").trim();
  const nombreCompleto = byObj || byParts || nombreCompletoFlat || safeStr(asegurado) || (typeof c === "string" && !isBadClienteLabel(c) ? safeStr(c) : "") || "Cliente";

  const nombreAp = (() => {
    if (nombreCompleto.includes(",")) {
      const [ap, nom] = nombreCompleto.split(",").map((x) => x.trim());
      return [nom, ap].filter(Boolean).join(" ").trim();
    }
    return nombreCompleto;
  })();
  return { nombreCompleto, nombreAp, dni, id };
}

function getPolizaId(pol, cuota) {
  const p = pol && typeof pol === "object" ? pol : {};
  const pid = p?.id ?? p?.poliza_id ?? cuota?.poliza_id ?? cuota?.polizaId ?? null;
  const n = Number(pid);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toYmd(d) { const s = String(d || "").trim(); return s ? (s.length >= 10 ? s.slice(0, 10) : s) : ""; }

function buildPolizaCuotasIndex(list) {
  const map = new Map();
  for (const c of (Array.isArray(list) ? list : [])) {
    const pid = getPolizaId(c?.poliza, c);
    if (!pid) continue;
    const arr = map.get(pid) || [];
    arr.push(c);
    map.set(pid, arr);
  }
  for (const [pid, arr] of map.entries()) {
    arr.sort((a, b) => {
      const an = Number(a?.cuota_nro), bn = Number(b?.cuota_nro);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      const af = toYmd(a?.fecha_vencimiento), bf = toYmd(b?.fecha_vencimiento);
      if (af && bf && af !== bf) return af.localeCompare(bf);
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
  }
  return map;
}

function pickNextVencimientoFromIndex(cuota, polizaId, indexMap) {
  if (!cuota || !polizaId || !indexMap) return null;
  const arr = indexMap.get(polizaId);
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const curN = Number(cuota?.cuota_nro);
  if (Number.isFinite(curN)) {
    let best = null, bestN = Infinity;
    for (const c of arr) {
      const n = Number(c?.cuota_nro);
      if (Number.isFinite(n) && n > curN && n < bestN) { bestN = n; best = c; }
    }
    if (best?.fecha_vencimiento) return toYmd(best.fecha_vencimiento);
  }

  const curF = toYmd(cuota?.fecha_vencimiento);
  if (curF) {
    let best = null, bestF = "";
    for (const c of arr) {
      const f = toYmd(c?.fecha_vencimiento);
      if (f && f > curF && (!bestF || f < bestF)) { bestF = f; best = c; }
    }
    if (best?.fecha_vencimiento) return toYmd(best.fecha_vencimiento);
  }
  return null;
}

export default function PagosList({
  cuotas = [],
  actualizarCuotas,
  ocultarPagadas = false,
  cuentasMercadoPago = [],
  billeterasVirtuales = [],
  mediosCobro = [],
}) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [obsAbiertaId, setObsAbiertaId] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);

  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [cuotaFechaSeleccionada, setCuotaFechaSeleccionada] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [ajustarSiguientes, setAjustarSiguientes] = useState(true);
  const [isSubmittingFecha, setIsSubmittingFecha] = useState(false);

  const items = useMemo(() => {
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => !ocultarPagadas || !c.pagado);
  }, [cuotas, ocultarPagadas]);

  const polizaIndex = useMemo(() => buildPolizaCuotasIndex(items), [items]);

  const [hoyKey, setHoyKey] = useState(todayKey());
  useEffect(() => {
    let t = setTimeout(function tick() {
      setHoyKey(todayKey());
      t = setTimeout(tick, msUntilNextDay());
    }, msUntilNextDay());
    return () => clearTimeout(t);
  }, []);

  const hoy = useMemo(() => dayjs(hoyKey).startOf("day"), [hoyKey]);

  const visibleItems = items;

  const abrirPagar = useCallback((cuota) => setCuotaSeleccionada(cuota), []);
  const cerrarPagar = useCallback(() => setCuotaSeleccionada(null), []);
  const abrirDetalle = useCallback((cuota) => setDetalleAbierto(cuota), []);
  const cerrarDetalle = useCallback(() => setDetalleAbierto(null), []);
  const toggleObs = useCallback((id) => setObsAbiertaId((prev) => (prev === id ? null : id)), []);

  const abrirModalFecha = useCallback((cuota) => {
    setCuotaFechaSeleccionada(cuota);
    setNuevaFecha(toYmd(cuota.fecha_vencimiento) || dayjs().format('YYYY-MM-DD'));
    setAjustarSiguientes(true);
    setModalFechaOpen(true);
  }, []);
  const cerrarModalFecha = useCallback(() => { setModalFechaOpen(false); setCuotaFechaSeleccionada(null); }, []);

  const handleCambiarFecha = useCallback(async () => {
    if (!cuotaFechaSeleccionada || !nuevaFecha) return;
    setIsSubmittingFecha(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
      const res = await axios.patch(
        `${BASE_URL.replace(/\/+$/, '')}/cuotas/${cuotaFechaSeleccionada.id}/cambiar-fecha/`, 
        { nueva_fecha: nuevaFecha, ajustar_siguientes: ajustarSiguientes }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const pid = getPolizaId(cuotaFechaSeleccionada.poliza, cuotaFechaSeleccionada);
      const updatedList = [{ id: cuotaFechaSeleccionada.id, fecha_vencimiento: nuevaFecha }];

      if (ajustarSiguientes) {
        let currentBaseDate = dayjs(nuevaFecha);
        items.filter((c) => getPolizaId(c?.poliza, c) === pid && Number(c.cuota_nro) > Number(cuotaFechaSeleccionada.cuota_nro))
             .sort((a, b) => Number(a.cuota_nro) - Number(b.cuota_nro))
             .forEach((c) => {
                currentBaseDate = currentBaseDate.add(1, "month");
                updatedList.push({ id: c.id, fecha_vencimiento: currentBaseDate.format("YYYY-MM-DD") });
             });
      }

      actualizarCuotas?.(updatedList);
      toast.success(`¡Listo! Se actualizaron ${res.data?.cuotas_modificadas || 1} cuotas.`);
      setModalFechaOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.nueva_fecha || error.response?.data?.detail || "Error al cambiar la fecha");
    } finally {
      setIsSubmittingFecha(false);
    }
  }, [cuotaFechaSeleccionada, nuevaFecha, ajustarSiguientes, items, actualizarCuotas]);

  const confirmarPago = useCallback(async (datos) => {
    if (!cuotaSeleccionada) return;
    const cuota = cuotaSeleccionada;
    const pol = cuota.poliza || {};
    const polizaEstado = String(pol.estado || "").toUpperCase();

    const cuotasMismaPoliza = items.filter(c => getPolizaId(c.poliza, c) === getPolizaId(pol, cuota));
    const remainingOverdue = Math.max(0, cuotasMismaPoliza.filter(c => !c.pagado && dayjs(c.fecha_vencimiento).isBefore(dayjs().startOf("day"))).length - 1);

    const payload = { id: cuota.id, ...datos };

    try {
      const resp = await dispatch(marcarCuotaComoPagada(payload)).unwrap();
      const cuotaActualizada = pickCuotaActualizada(resp);
      if (!cuotaActualizada) { toast.error("Pago registrado, pero no actualizó pantalla."); return; }

      if (polizaEstado === "CANCELADA" || polizaEstado === "ANULADA") {
        toast.success("Deuda cobrada exitosamente (Póliza CANCELADA).", { icon: "💀", duration: 5000 });
      } else if (polizaEstado === "VENCIDA") {
        toast.success(remainingOverdue === 0 ? "Pago registrado. ¡Póliza ACTIVA! 🟢" : `Aún debe ${remainingOverdue} cuotas (Sigue VENCIDA). 🔴`, { duration: 6000 });
      } else toast.success("Cuota marcada como pagada");

      const conObs = {
        ...cuotaActualizada,
        poliza: cuotaActualizada.poliza || cuota.poliza,
        observaciones_pago: (datos.observaciones || "").trim(),
        pago_registrado_en: cuotaActualizada.pago_registrado_en || dayjs().toISOString(),
      };
      actualizarCuotas?.([conObs]);
      if (conObs.observaciones_pago) setObsAbiertaId(conObs.id);
      cerrarPagar();
    } catch {
      toast.error("No se pudo registrar el pago");
      throw new Error("pago_fallido"); // el wizard necesita saber que falló para no cerrarse solo
    }
  }, [cuotaSeleccionada, items, dispatch, actualizarCuotas, cerrarPagar]);

  // Datos derivados de la cuota seleccionada, para pasarle al wizard los
  // avisos de riesgo (atraso, robo, póliza cancelada) sin que él tenga que
  // saber nada de la forma de la cuota.
  const wizardContext = useMemo(() => {
    if (!cuotaSeleccionada) return null;
    const pol = cuotaSeleccionada.poliza || {};
    const fv = cuotaSeleccionada.fecha_vencimiento ? dayjs(cuotaSeleccionada.fecha_vencimiento).startOf("day") : null;
    const hoyDate = dayjs().startOf("day");
    const cli = resolveCliente(pol, cuotaSeleccionada);
    const total = cuotaSeleccionada?.cantidad_cuotas ?? (Array.isArray(pol.cuotas) ? pol.cuotas.length : null);
    return {
      numeroPoliza: pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-",
      cuotaNro: cuotaSeleccionada.cuota_nro,
      polizaEstado: String(pol.estado || "").toUpperCase(),
      polizaCobertura: String(pol.cobertura || ""),
      polizaCompania: String(pol.compania_nombre || pol.compania?.nombre || pol.compania || ""),
      diasAtraso: fv && fv.isBefore(hoyDate) ? hoyDate.diff(fv, "day") : 0,
      clienteNombreApellido: cli?.nombreAp || cli?.nombreCompleto || "",
      clienteDni: cli?.dni || "",
      pagoCuota: typeof cuotaSeleccionada.cuota_nro === "number" ? (total ? `Cuota ${cuotaSeleccionada.cuota_nro}/${total}` : `Cuota ${cuotaSeleccionada.cuota_nro}`) : "",
    };
  }, [cuotaSeleccionada]);

  // 🎯 sumarDiasHabiles ahora viene del módulo unificado (utils/cuotas.js)
  const sumarDiasHabiles = useCallback((fecha, dias) => utilSumarDiasHabiles(fecha, dias), []);

  const rowModels = useMemo(() => {
    return visibleItems.map((cuota, idx) => {
      const pol = cuota?.poliza || {};
      const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
      const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
      const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;

      // 🎯 Cuotas de la póliza (para cobertura y para la FECHA LÍMITE DE PAGO real)
      const cuotasPoliza = Array.isArray(pol?.cuotas) ? pol.cuotas : [cuota];
      const idxEnPoliza = cuotasPoliza.findIndex((c) => c?.id === cuota?.id);
      const idxValido = idxEnPoliza >= 0 ? idxEnPoliza : 0;

      // 🎯 Los días se miden contra la fecha de pago (vto de la cuota anterior),
      //    NO contra el vto propio de la cuota (eso marcaba la mora ~1 mes tarde).
      const limite = fechaLimitePago(cuota, cuotasPoliza);
      const dias = limite ? limite.diff(hoy, "day") : null;
      const state = cuota?.pagado ? "paid" : dias !== null && dias < 0 ? "overdue" : "pending";
      const proximoVtoYmd = pickNextVencimientoFromIndex(cuota, getPolizaId(pol, cuota), polizaIndex);

      // 🎯 Cobertura calculada con el helper unificado (cuotas.js)
      const cobertura = calcCobertura(cuota, cuotasPoliza, idxValido, pol?.fecha_emision);

      const pagoAtrasado = cuota?.pagado && fp && fv ? fp.isAfter(fv) : false;
      const sinCobertura = cobertura?.tipo === "sin_cobertura";

      // ¿La cuota es FUTURA? (todavía no llegó su fecha de pago y no está pagada)
      const esCuotaFutura = !cuota?.pagado && dias !== null && dias > 0;

      // 🎯 Frases humanas amigables Opción A
      const fraseEstado = buildFraseEstado(cuota, cuotasPoliza);
      const fraseCobertura = buildFraseCobertura(cobertura, cuota, esCuotaFutura);

      // Número de cuota legible: "Cuota X de Y" (si conocemos el total)
      const totalCuotasPoliza = cuota?.cantidad_cuotas ?? (cuotasPoliza.length || null);
      const cuotaTextoFull = totalCuotasPoliza
        ? `Cuota ${cuota?.cuota_nro ?? "?"} de ${totalCuotasPoliza}`
        : `Cuota ${cuota?.cuota_nro ?? "?"}`;

      return {
        cuota,
        cuotaPdf: { ...cuota, proximo_vencimiento: proximoVtoYmd || cuota?.proximo_vencimiento || null },
        pol,
        nombreCompleto: resolveCliente(pol, cuota)?.nombreCompleto || "Cliente",
        patente: (pol?.patente || "").toUpperCase(),
        modelo: [pol?.marca, pol?.modelo].filter(Boolean).join(" "),
        observacion: ((cuota?.observaciones_pago || cuota?.ultima_observacion_pago || "") || "").toString().trim(),
        hasObs: !!(cuota?.observaciones_pago || cuota?.ultima_observacion_pago),
        isObsOpen: obsAbiertaId === cuota?.id,
        state,
        label: getLabelSimple(state),
        dias,
        polizaEstado: String(pol?.estado || "").toUpperCase(),
        montoTxt: fmtMoney(cuota?.monto),
        sinCobertura,
        pagoAtrasado,
        cuotaTextoFull,
        // 🎯 Datos Opción A
        fraseEstado,
        fraseCobertura,
        esCuotaFutura,
        altaTxt: pol?.fecha_emision ? fmtDate(pol.fecha_emision) : null,
        isWebAdmin,
        abrirModalFecha,
      };
    });
  }, [visibleItems, hoy, obsAbiertaId, polizaIndex, isWebAdmin, abrirModalFecha, sumarDiasHabiles]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200/15 bg-brand-card-dark p-6 sm:p-10 text-center text-sm sm:text-base text-brand-200/50">
        No hay cuotas para mostrar en este filtro.
      </div>
    );
  }

  return (
    <div className={`w-full ${PALETTE.basePanel} rounded-none sm:rounded-3xl border-t border-b sm:border overflow-hidden flex flex-col`}>
      <div className={`px-3 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-sm uppercase tracking-wide ${PALETTE.header}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-brand-200/90">Resultados ({items.length})</span>
        </div>
      </div>

      <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto overscroll-contain pb-6 custom-scrollbar bg-brand-card-dark">
        <ul role="list" className={`divide-y sm:divide-y-0 ${PALETTE.divider}`}>
          {rowModels.map((m, idx) => (
            <motion.li
              key={m?.cuota?.id}
              className="relative"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(0.25, idx * 0.012) }}
            >
              <CuotaRow model={m} abrirDetalle={abrirDetalle} abrirPagar={abrirPagar} onToggleObs={toggleObs} abrirModalFecha={abrirModalFecha} />
            </motion.li>
          ))}
        </ul>
      </div>

      <PagoWizardModal
        isOpen={!!cuotaSeleccionada} onClose={cerrarPagar} onConfirm={confirmarPago} defaultMonto={cuotaSeleccionada?.monto}
        title={`Confirmar pago — Cuota #${cuotaSeleccionada?.cuota_nro ?? "?"}`}
        cuentasMercadoPago={cuentasMercadoPago} billeterasVirtuales={billeterasVirtuales} mediosCobro={mediosCobro}
        clienteNombreApellido={wizardContext?.clienteNombreApellido || ""}
        clienteDni={wizardContext?.clienteDni || ""}
        polizaCompania={wizardContext?.polizaCompania || ""}
        polizaCobertura={wizardContext?.polizaCobertura || ""}
        polizaEstado={wizardContext?.polizaEstado || ""}
        numeroPoliza={wizardContext?.numeroPoliza || ""}
        cuotaNro={wizardContext?.cuotaNro}
        diasAtraso={wizardContext?.diasAtraso || 0}
        pagoCuota={wizardContext?.pagoCuota || ""}
      />

      {/* MODAL DE CAMBIAR FECHA */}
      <AnimatePresence>
        {modalFechaOpen && cuotaFechaSeleccionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-3"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isSubmittingFecha ? undefined : cerrarModalFecha} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[71] w-full max-w-sm rounded-2xl border border-brand-200/15 bg-brand-200/10 px-5 py-5 sm:px-6 sm:py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Cambiar Vencimiento</h3>
                <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-8 w-8 rounded-lg border flex items-center justify-center text-brand-200/75 bg-brand-200/15 hover:bg-brand-200/20 border-brand-200/20 cursor-pointer"><HiX className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-brand-200/75">Cuota <span className="font-bold text-brand-primary-tint">#{cuotaFechaSeleccionada.cuota_nro}</span></p>
                <div>
                  <label className="block text-sm font-semibold text-brand-200/75 mb-1">Nueva fecha</label>
                  <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-brand-card-dark border border-brand-200/20 text-white outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-brand-secondary/10 p-3 rounded-xl border border-brand-secondary/20">
                  <input type="checkbox" checked={ajustarSiguientes} onChange={(e) => setAjustarSiguientes(e.target.checked)} className="mt-1 accent-brand-secondary w-4 h-4" />
                  <span className="text-sm text-brand-secondary-tint">Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).</span>
                </label>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-10 px-4 rounded-xl border border-brand-200/20 bg-brand-200/15 text-sm text-white hover:bg-brand-200/20 cursor-pointer font-medium">Cancelar</button>
                  <button onClick={handleCambiarFecha} disabled={isSubmittingFecha || !nuevaFecha} className="h-10 px-4 rounded-xl border border-transparent bg-brand-secondary text-sm font-bold text-white hover:bg-brand-secondary-light flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-secondary/30">{isSubmittingFecha ? "Guardando..." : "Guardar cambios"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detalleAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-3"
          >
            <div onClick={cerrarDetalle} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[61] w-full max-w-[680px] max-h-[85vh] overflow-y-auto rounded-2xl border border-brand-200/15 bg-brand-200/10 p-4 sm:p-5 shadow-2xl custom-scrollbar"
            >
              <div className="flex items-start justify-between gap-3 sticky top-0 bg-brand-200/10 pb-3 z-10 border-b border-brand-200/15 mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white">Detalle de cuota</h3>
                <button onClick={cerrarDetalle} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl bg-brand-200/15 hover:bg-brand-200/20 border border-brand-200/20 text-brand-200/90 flex items-center justify-center cursor-pointer">
                  <HiX className="w-4 h-4 sm:w-5 sm:h-5" /><span className="hidden sm:inline ml-1 text-sm font-medium">Cerrar</span>
                </button>
              </div>
              {(() => {
                const c = detalleAbierto;
                const pol = c?.poliza || {};
                const cliR = resolveCliente(pol, c);
                const todasCuotas = Array.isArray(pol?.cuotas) ? [...pol.cuotas].sort((a, b) => (a?.cuota_nro || 0) - (b?.cuota_nro || 0)) : [];
                const total = c?.cantidad_cuotas ?? (todasCuotas.length || null);

                // Posición de la cuota actual dentro del array de cuotas
                const idxActual = todasCuotas.findIndex((x) => x?.id === c?.id);

                // 🎯 Cobertura unificada del módulo
                const coberturaActual = idxActual >= 0
                  ? calcCobertura(c, todasCuotas, idxActual, pol?.fecha_emision)
                  : null;

                // Cuota siguiente (para mostrar "la próxima vence el…")
                const cuotaSiguiente = idxActual >= 0 && idxActual < todasCuotas.length - 1
                  ? todasCuotas[idxActual + 1]
                  : null;

                // Resumen agregado
                const resumen = resumenCuotas(todasCuotas);

                // Vto final de la póliza = vto de la última cuota
                const ultimaCuota = todasCuotas[todasCuotas.length - 1] || null;
                const finPoliza = ultimaCuota?.fecha_vencimiento || pol?.fecha_vencimiento || pol?.fecha_vto_poliza || null;

                const estadoActual = getEstadoCuota(c, todasCuotas);

                return (
                  <div className="space-y-4 text-xs sm:text-sm">

                    {/* ═══ 1. CLIENTE Y VEHÍCULO ═══ */}
                    <SectionCard title="Cliente y vehículo" icon={<HiUser className="w-4 h-4" />}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <InfoRow label="Cliente" value={cliR?.nombreCompleto || "—"} />
                        <InfoRow label="DNI/CUIT" value={cliR?.dni || "—"} />
                        <InfoRow label="Patente" value={(pol?.patente || "").toUpperCase() || "—"} />
                        <InfoRow label="Vehículo" value={[pol?.marca, pol?.modelo].filter(Boolean).join(" ") || "—"} />
                        <InfoRow label="Compañía" value={pol?.compania_nombre || pol?.compania?.nombre || pol?.compania || "—"} />
                        <InfoRow label="Cobertura" value={pol?.cobertura || "—"} />
                      </div>
                    </SectionCard>

                    {/* ═══ 2. LÍNEA DE TIEMPO DETALLADA (stepper) ═══ */}
                    <SectionCard title="Línea de tiempo de la póliza" icon={<HiClock className="w-4 h-4" />}>

                      {/* Resumen */}
                      {resumen.total > 0 && (
                        <div className="flex flex-wrap gap-2 text-[11px] mb-3">
                          <span className="px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary-tint border border-brand-primary/20">
                            {resumen.pagadas} pagadas
                          </span>
                          <span className="px-2 py-1 rounded-full bg-brand-secondary/10 text-brand-secondary-tint border border-brand-secondary/20">
                            {resumen.pendientes} pendientes
                          </span>
                          {resumen.vencidas > 0 && (
                            <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                              {resumen.vencidas} vencidas
                            </span>
                          )}
                          {resumen.venceHoy > 0 && (
                            <span className="px-2 py-1 rounded-full bg-brand-secondary/10 text-brand-secondary-tint border border-brand-secondary/20">
                              {resumen.venceHoy} vence hoy
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stepper */}
                      <div className="space-y-0">

                        {/* HITO: Inicio de póliza */}
                        <div className="flex items-center gap-2.5 p-2.5 bg-brand-primary/5 border-l-[3px] border-brand-primary rounded-r-md">
                          <div className="shrink-0 w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold">🚀</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-brand-primary-tint font-bold">Inicio de póliza</div>
                            <div className="text-sm font-semibold text-white">{fmtFecha(pol?.fecha_emision)}</div>
                            <div className="text-[10px] text-brand-200/50">
                              Asegurado · {todasCuotas.length || total || "—"} cuota{todasCuotas.length === 1 ? "" : "s"} mensual{todasCuotas.length === 1 ? "" : "es"}
                            </div>
                          </div>
                        </div>

                        {/* Lista de cuotas con conector */}
                        {todasCuotas.map((cu, i) => {
                          const esActual = cu?.id === c?.id;
                          const estado = getEstadoCuota(cu, todasCuotas);
                          const cob = calcCobertura(cu, todasCuotas, i, pol?.fecha_emision);
                          const cuotaPagada = !!cu?.pagado;
                          const fechaPago = cu?.pago_registrado_en || cu?.fecha_pago;
                          const fv = cu?.fecha_vencimiento ? dayjs(cu.fecha_vencimiento).startOf("day") : null;
                          const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;
                          const pagoAtrasadoCu = cuotaPagada && fp && fv ? fp.isAfter(fv) : false;
                          const diasFaltan = !cuotaPagada && fv ? fv.diff(hoy, "day") : null;
                          const esUltima = i === todasCuotas.length - 1;

                          // Estilo visual según estado
                          let dotBg = "bg-brand-200/20";
                          let dotText = "text-brand-200/75";
                          let cardBg = "bg-brand-200/[0.04]";
                          let cardBorder = "border-brand-200/15";
                          let opacity = "";

                          if (esActual) {
                            dotBg = "bg-brand-secondary";
                            dotText = "text-white";
                            cardBg = "bg-brand-secondary/10";
                            cardBorder = "border-brand-secondary border-2";
                          } else if (cuotaPagada) {
                            dotBg = pagoAtrasadoCu ? "bg-brand-secondary" : "bg-brand-primary";
                            dotText = "text-white";
                            cardBg = pagoAtrasadoCu ? "bg-brand-secondary/5" : "bg-brand-primary/5";
                            cardBorder = pagoAtrasadoCu ? "border-brand-secondary/30" : "border-brand-primary/25";
                          } else if (estado === "vencida") {
                            dotBg = "bg-red-500";
                            dotText = "text-white";
                            cardBg = "bg-red-500/5";
                            cardBorder = "border-red-500/30";
                          } else {
                            opacity = "opacity-75";
                          }

                          // Si está paga y se asegura ese mismo día (cuota 1, fecha pago = fecha vto = fecha emisión), 
                          // el recibo se emite al día hábil siguiente
                          const inicioPolizaYmd = pol?.fecha_emision ? dayjs(pol.fecha_emision).format("YYYY-MM-DD") : null;
                          const cuotaVtoYmd = cu?.fecha_vencimiento ? dayjs(cu.fecha_vencimiento).format("YYYY-MM-DD") : null;
                          const pagoYmd = fechaPago ? dayjs(fechaPago).format("YYYY-MM-DD") : null;
                          const esCuotaPrimera = cu?.cuota_nro === 1;
                          // Si se pagó el mismo día que arrancó la póliza, el recibo cae al día siguiente hábil
                          const reciboEmitido = (cuotaPagada && pagoYmd && esCuotaPrimera && pagoYmd === inicioPolizaYmd)
                            ? utilSumarDiasHabiles(fechaPago, 1)
                            : null;

                          // Si fue pago tardío, la cobertura recién arranca a las 48hs hábiles
                          const inicioCoberturaTardia = pagoAtrasadoCu && cob?.desde ? cob.desde : null;

                          return (
                            <div key={cu.id || i}>
                              {/* Conector vertical */}
                              <div className="ml-[18px] w-[2px] h-3 bg-brand-200/15"></div>

                              <div className={`flex items-stretch gap-2.5 ${opacity}`}>
                                <div className="flex flex-col items-center shrink-0">
                                  <div className={`${esActual ? "w-10 h-10" : "w-9 h-9"} rounded-full ${dotBg} ${dotText} flex items-center justify-center text-sm font-bold ${esActual ? "ring-2 ring-brand-secondary/40 ring-offset-2 ring-offset-slate-800" : ""}`}>
                                    {cuotaPagada && !esActual ? "✓" : (cu?.cuota_nro || (i + 1))}
                                  </div>
                                </div>

                                <div className={`flex-1 p-2.5 ${cardBg} border ${cardBorder} rounded-lg min-w-0`}>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="min-w-0">
                                      {esActual && (
                                        <div className="text-[9px] uppercase tracking-wider text-brand-secondary-tint font-bold mb-0.5">📍 Aquí estás</div>
                                      )}
                                      <div className="text-xs font-bold text-white">
                                        Cuota {cu?.cuota_nro || (i + 1)}
                                        {esUltima && <span className="ml-1 text-[10px] text-red-300 font-normal">· Última</span>}
                                      </div>
                                    </div>
                                    <span className={getBadgeClasses(estado)}>{getBadgeLabel(estado)}</span>
                                  </div>

                                  {/* Datos clave: vence + monto */}
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-brand-200/75 mb-1">
                                    <div>📅 <span className="text-brand-200/40">Vence:</span> <span className="font-medium">{fmtFecha(cu?.fecha_vencimiento)}</span></div>
                                    <div>💵 <span className="text-brand-200/40">Monto:</span> <span className="font-medium">${fmtMoney(cu?.monto)}</span></div>

                                    {cuotaPagada ? (
                                      <>
                                        <div className="col-span-2 text-brand-primary-tint">
                                          ✅ <span className="text-brand-200/50">Pagada el:</span> <span className="font-semibold">{fmtFecha(fechaPago)}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        {diasFaltan !== null && (
                                          <div className={`col-span-2 ${diasFaltan < 0 ? "text-red-300" : diasFaltan === 0 ? "text-brand-secondary-tint" : "text-brand-secondary-tint"}`}>
                                            ⏳ {diasFaltan > 0 ? `Faltan ${diasFaltan} día${diasFaltan === 1 ? "" : "s"}` : diasFaltan === 0 ? "Vence hoy" : `Venció hace ${Math.abs(diasFaltan)} día${Math.abs(diasFaltan) === 1 ? "" : "s"}`}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* AVISO: recibo emitido al día hábil siguiente */}
                                  {reciboEmitido && (
                                    <div className="mt-1.5 text-[10px] px-2 py-1 rounded bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary-tint">
                                      📝 <span className="font-semibold">Recibo emitido:</span> {fmtFecha(reciboEmitido)}
                                      <span className="text-brand-secondary-tint/70 ml-1">(al día hábil siguiente del aseguramiento)</span>
                                    </div>
                                  )}

                                  {/* AVISO: pago tardío recupera cobertura a las 48hs hábiles */}
                                  {pagoAtrasadoCu && inicioCoberturaTardia && (
                                    <div className="mt-1.5 text-[10px] px-2 py-1 rounded bg-brand-secondary/10 border border-brand-secondary/30 text-brand-secondary-tint">
                                      ⚠️ <span className="font-semibold">Pago atrasado:</span> recupera cobertura el {fmtFecha(inicioCoberturaTardia)}
                                      <span className="text-brand-secondary-tint/70 ml-1">(48hs hábiles después del pago)</span>
                                    </div>
                                  )}

                                  {/* Cobertura */}
                                  {cob && cob.tipo === "sin_cobertura" && (
                                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-red-500/20 text-[10px] text-red-300">
                                      🛡 Sin cobertura desde {fmtFecha(cob.desde)}
                                    </div>
                                  )}
                                  {cob && cob.tipo === "ok" && cob.desde && cob.hasta && (
                                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-brand-primary/20 text-[10px] text-brand-primary-tint">
                                      🛡 Cubre: {fmtFecha(cob.desde)} → {fmtFecha(cob.hasta)}
                                    </div>
                                  )}
                                  {cob && cob.tipo === "atrasado" && cob.desde && cob.hasta && (
                                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-brand-secondary/20 text-[10px] text-brand-secondary-tint">
                                      🛡 Cubre: {fmtFecha(cob.desde)} → {fmtFecha(cob.hasta)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* HITO: Vto final */}
                        <div className="ml-[18px] w-[2px] h-3 bg-red-300/60"></div>
                        <div className="flex items-center gap-2.5 p-2.5 bg-red-500/5 border-l-[3px] border-red-500 rounded-r-md">
                          <div className="shrink-0 w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">🏁</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-red-300 font-bold">Vto final de la póliza</div>
                            <div className="text-sm font-semibold text-white">{fmtFecha(finPoliza)}</div>
                            <div className="text-[10px] text-brand-200/50">Renovar antes de esta fecha</div>
                          </div>
                        </div>

                      </div>
                    </SectionCard>

                    {/* Observación si existe */}
                    {(c?.observaciones_pago || c?.ultima_observacion_pago) && (
                      <div className="rounded-xl border border-red-500/50 bg-red-900/30 p-3 sm:p-4 text-red-200 shadow-inner">
                        <div className="flex items-start gap-2">
                          <HiExclamationCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 text-red-400" />
                          <div className="whitespace-pre-wrap break-words text-xs sm:text-sm">
                            <span className="font-bold text-red-300">Observación: </span>
                            {(c?.observaciones_pago || c?.ultima_observacion_pago || "").toString().trim()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-brand-200/10 bg-brand-card-dark px-2.5 py-1.5">
      <span className="text-brand-200/40 text-xs">{label}</span>
      <span className="text-brand-200/90 truncate max-w-[60%] text-right text-xs font-mono">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="rounded-xl border border-brand-200/15 bg-brand-200/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-200/8 border-b border-brand-200/10">
        {icon && <span className="text-brand-secondary-tint">{icon}</span>}
        <span className="text-[11px] uppercase tracking-wider font-bold text-brand-200/75">{title}</span>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}