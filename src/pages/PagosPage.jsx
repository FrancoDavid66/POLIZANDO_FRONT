/* src/pages/PagosPage.jsx — Panel Pagos + Recordatorios (integrado con slice pagos) */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { formatMoney } from "../utils/formatMoney";
import {
  HiBadgeCheck,
  HiClock,
  HiSearch,
  HiX,
  HiSparkles,
  HiEyeOff,
  HiReceiptTax,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiCalendar,
  HiUserGroup,
  HiIdentification,
  HiChevronRight as HiChevronRightMini,
  HiCheckCircle,
  HiExclamation,
  HiQuestionMarkCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../context/AuthContext";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
import HistorialRecordatorios from "../components/pagos/HistorialRecordatorios";
import HistorialPagosTab from "../components/pagos/HistorialPagosTab";

import {
  fetchMediosCobro,
  fetchHistorialRecordatorios,
} from "../store/slices/pagosSlice";

dayjs.locale("es");

/* ---------- helpers UI ---------- */
const fmtMoney = (v) => formatMoney(v, { decimals: 0 });

const safe = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

function normalizeCuotaFlat(item) {
  const it = item && typeof item === "object" ? item : {};
  const cliIn = it.cliente && typeof it.cliente === "object" ? it.cliente : {};
  const polIn = it.poliza && typeof it.poliza === "object" ? it.poliza : {};

  // 🔎 LOG TEMPORAL - sacar después de confirmar el fix
  if (typeof window !== "undefined" && !window.__normalizerLogged) {
    window.__normalizerLogged = true;
    console.debug("[normalizeCuotaFlat] PRIMER item recibido:", {
      item_completo: it,
      cliIn,
      polIn,
      "cliIn.cliente_id": cliIn?.cliente_id,
      "polIn.poliza_id": polIn?.poliza_id,
    });
  }

  // 🚀 FIX: el cliente puede tener el id en `id` (estándar DRF) o en `cliente_id` (custom flat).
  // Aceptamos ambos formatos para evitar perder datos.
  const cliente = {
    id: cliIn?.id ?? cliIn?.cliente_id ?? it?.cliente_id ?? null,
    apellido: String(cliIn?.apellido ?? it?.cliente_apellido ?? "").trim(),
    nombre: String(cliIn?.nombre ?? it?.cliente_nombre ?? "").trim(),
    dni_cuit_cuil: String(cliIn?.dni_cuit_cuil ?? cliIn?.dni ?? it?.cliente_dni_cuit_cuil ?? it?.cliente_dni ?? "").trim(),
    telefono: String(cliIn?.telefono ?? cliIn?.celular ?? cliIn?.whatsapp ?? "").trim(),
  };

  // 🚀 FIX: similar para póliza — id puede venir como `id` o `poliza_id`
  const poliza = {
    id: polIn?.id ?? polIn?.poliza_id ?? it?.poliza_id ?? null,
    numero_poliza: String(polIn?.numero_poliza ?? it?.numero_poliza ?? "").trim(),
    patente: String(polIn?.patente ?? it?.patente ?? "").trim(),
    marca: String(polIn?.marca ?? it?.marca ?? "").trim(),
    modelo: String(polIn?.modelo ?? it?.modelo ?? "").trim(),
    anio: polIn?.anio ?? it?.anio ?? null,
    cobertura: String(polIn?.cobertura ?? polIn?.cobertura_nombre ?? it?.cobertura ?? "").trim(),
    compania_nombre: String(polIn?.compania_nombre ?? polIn?.compania ?? it?.compania_nombre ?? it?.compania ?? "").trim(),
    compania: String(polIn?.compania ?? polIn?.compania_nombre ?? it?.compania ?? "").trim(),
    oficina: String(polIn?.oficina ?? polIn?.oficina_nombre ?? it?.oficina ?? "").trim(),
    oficina_nombre: String(polIn?.oficina_nombre ?? polIn?.oficina ?? "").trim(),
    fecha_emision: polIn?.fecha_emision ?? it?.fecha_emision ?? null,
    fecha_inicio: polIn?.fecha_inicio ?? null,
    fecha_vencimiento: polIn?.fecha_vencimiento ?? null,
    estado: String(polIn?.estado ?? it?.poliza_estado ?? "").trim(),
    cantidad_cuotas: polIn?.cantidad_cuotas ?? it?.cantidad_cuotas ?? it?.total_cuotas ?? null,
    cliente,
    cliente_id: cliente.id ?? null,
    cliente_nombre: cliente.nombre,
    cliente_apellido: cliente.apellido,
    cliente_dni_cuit_cuil: cliente.dni_cuit_cuil,
    cliente_nombre_apellido: `${cliente.apellido} ${cliente.nombre}`.trim(),
    cliente_nombre_completo: `${cliente.apellido}, ${cliente.nombre}`.trim().replace(/^,\s*|\s*,$/g, ""),
  };

  const pago_registrado_en = it?.pago_registrado_en ?? null;
  const pago_hm = String(it?.pago_hm ?? "").trim();
  const pago_hm_full = String(it?.pago_hm_full ?? "").trim();

  return {
    id: it?.id ?? null,
    cuota_nro: it?.cuota_nro ?? null,
    monto: it?.monto ?? null,
    pagado: Boolean(it?.pagado),
    fecha_vencimiento: it?.fecha_vencimiento ?? null,
    fecha_pago: it?.fecha_pago ?? null,
    forma_pago: String(it?.forma_pago ?? "").trim(),
    pago_registrado_en,
    pago_hm,
    pago_hm_full,
    observaciones: String(it?.observaciones ?? "").trim(),
    observaciones_pago: String(it?.observaciones ?? "").trim(),
    ultima_observacion_pago: String(it?.ultima_observacion_pago ?? "").trim(),
    total_cuotas: it?.total_cuotas ?? null,
    cuota_label: String(it?.cuota_label ?? "").trim(),
    cantidad_cuotas: it?.total_cuotas ?? it?.cantidad_cuotas ?? null,
    poliza_id: poliza.id,
    poliza,
    cliente_id: cliente.id,
    cliente,
  };
}

function clienteKeyFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const id = cli?.id ?? null;
  if (id !== null && id !== undefined && String(id).trim() !== "") return `id:${id}`;
  const dni = String(cli?.dni_cuit_cuil ?? "").trim();
  if (dni) return `dni:${dni}`;
  const nom = `${String(cli?.apellido ?? "").trim()} ${String(cli?.nombre ?? "").trim()}`.trim().toLowerCase();
  return nom ? `nom:${nom}` : "unknown";
}

function clienteLabelFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const ap = String(cli?.apellido ?? "").trim();
  const nom = String(cli?.nombre ?? "").trim();
  return [ap, nom].filter(Boolean).join(" ").trim() || "Cliente";
}

function dniFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  return String(cli?.dni_cuit_cuil ?? "").trim();
}

function uniquePolizaLabel(pol) {
  const p = pol && typeof pol === "object" ? pol : {};
  const nro = String(p.numero_poliza || "").trim();
  const pat = String(p.patente || "").trim().toUpperCase();
  if (nro && pat) return `${nro} • ${pat}`;
  if (nro) return nro;
  if (pat) return pat;
  return "Póliza";
}

function computeClienteGroups(cuotasList) {
  const list = Array.isArray(cuotasList) ? cuotasList : [];
  const hoy = dayjs().startOf("day");
  const map = new Map();

  for (const c of list) {
    const key = clienteKeyFromCuota(c);
    const label = clienteLabelFromCuota(c);
    const dni = dniFromCuota(c);
    const pol = c?.poliza || {};
    const polId = pol?.id ?? null;
    const polLabel = uniquePolizaLabel(pol);

    // 🚨 Extraemos el cliente_id real (puede venir como cliente.id o cliente_id flat)
    const cliObj = c?.cliente || c?.poliza?.cliente || {};
    const clienteId = cliObj?.id ?? cliObj?.cliente_id ?? c?.cliente_id ?? null;

    const hit =
      map.get(key) ||
      {
        key, label, dni,
        cliente_id: clienteId,   // 🚨 Para el banner de alertas
        cuotas: [], polizasSet: new Set(), polizasLabels: new Map(),
        total: 0, pagadas: 0, pendientes: 0, vencidas: 0, venceHoy: 0, porVencer: 0,
        totalMontoPendiente: 0, proximoVto: null,
      };

    // Si el primer item no tuvo ID pero un item posterior sí, lo capturamos
    if (!hit.cliente_id && clienteId) hit.cliente_id = clienteId;

    hit.cuotas.push(c);
    hit.total += 1;

    if (polId !== null && polId !== undefined) {
      const pid = String(polId);
      hit.polizasSet.add(pid);
      if (!hit.polizasLabels.has(pid)) hit.polizasLabels.set(pid, polLabel);
    } else {
      const pseudo = `x:${polLabel}`;
      hit.polizasSet.add(pseudo);
      if (!hit.polizasLabels.has(pseudo)) hit.polizasLabels.set(pseudo, polLabel);
    }

    if (c?.pagado) {
      hit.pagadas += 1;
    } else {
      hit.pendientes += 1;
      const m = Number(c?.monto ?? 0);
      if (Number.isFinite(m)) hit.totalMontoPendiente += m;

      const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).startOf("day") : null;
      if (fv && fv.isValid()) {
        if (fv.isBefore(hoy)) hit.vencidas += 1;
        else if (fv.isSame(hoy)) hit.venceHoy += 1;
        else hit.porVencer += 1;

        if (!hit.proximoVto || fv.isBefore(hit.proximoVto)) hit.proximoVto = fv;
      } else {
        hit.porVencer += 1;
      }
    }
    map.set(key, hit);
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const ap = a.pendientes > 0 ? 1 : 0;
    const bp = b.pendientes > 0 ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.vencidas !== b.vencidas) return b.vencidas - a.vencidas;
    const av = a.proximoVto ? a.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    const bv = b.proximoVto ? b.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    if (av !== bv) return av - bv;
    return String(a.label).localeCompare(String(b.label));
  });

  return arr.map((g) => ({
    ...g,
    polizasCount: g.polizasSet.size,
    polizas: Array.from(g.polizasLabels.values()).slice(0, 6),
    proximoVtoStr: g.proximoVto ? g.proximoVto.format("DD/MM/YYYY") : "—",
  }));
}

/* ================== PAGE ================== */
const PagosPage = () => {
  const dispatch = useDispatch();
  
  // 🚀 Obtenemos los datos del usuario para el Escudo de Sucursal
  const { user } = useAuth();

  // Forzamos la lógica para que sea estricta: solo si dice 'ADMIN'
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  // 🚀 Tab sincronizado con URL query (?tab=pagos|historial_pagos|historial_recordatorios)
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const VALID_TABS = ["pagos", "historial_pagos", "historial_recordatorios"];
  const [tab, setTab] = useState(VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "pagos");

  // Sincronizar cambios de URL → state (cuando el usuario clickea desde sidebar)
  useEffect(() => {
    if (VALID_TABS.includes(tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [lastBuscarQuery, setLastBuscarQuery] = useState("");
  const [lastBuscarMeta, setLastBuscarMeta] = useState({ count: 0, next: null, previous: null });

  const {
    mediosCobro = [],
    mpCuentas = [],
    billeteras = [],
    historialRecordatorios = [],
    historialRecordatoriosStatus = "idle",
  } = useSelector((state) => state.pagos || {});

  const loadingHistorialRecordatorios = historialRecordatoriosStatus === "loading";

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  const handleChangeTab = useCallback(
    (nuevoTab) => {
      if (nuevoTab === tab) return;
      setTab(nuevoTab);
      // Sincronizar con URL para que el sidebar marque el activo correcto
      setSearchParams({ tab: nuevoTab }, { replace: true });
      if (nuevoTab === "historial_recordatorios") {
        dispatch(fetchHistorialRecordatorios());
        return;
      }
    },
    [dispatch, tab, setSearchParams]
  );

  const handleBuscarPolizas = useCallback((cuotasFlat, meta, q) => {
    const lista = Array.isArray(cuotasFlat) ? cuotasFlat : [];
    const normalized = lista.map(normalizeCuotaFlat);

    setCuotas(normalized);
    setClienteSeleccionado(null);

    if (meta && typeof meta === "object") {
      setLastBuscarMeta({
        count: Number(meta?.count || 0) || 0,
        next: meta?.next ?? null,
        previous: meta?.previous ?? null,
      });
    } else {
      setLastBuscarMeta({ count: normalized.length, next: null, previous: null });
    }
    setLastBuscarQuery(String(q || "").trim());
  }, []);

  const handleActualizarCuotas = useCallback((actualizadas = []) => {
    if (!Array.isArray(actualizadas) || actualizadas.length === 0) return;
    setCuotas((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const map = new Map();
      actualizadas.forEach((item) => {
        const obj =
          item?.cuotaActualizada && typeof item.cuotaActualizada === "object"
            ? item.cuotaActualizada
            : item;
        if (obj?.id) map.set(obj.id, obj);
      });
      if (map.size === 0) return prevList;
      return prevList.map((c) => {
        const upd = map.get(c.id);
        return upd ? { ...c, ...upd } : c;
      });
    });
  }, []);

  const handleRefreshHistorialRecordatorios = useCallback(() => {
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  const { totalCuotas, alDia, porVencer, venceHoy, vencidas } = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const stats = { totalCuotas: 0, alDia: 0, porVencer: 0, venceHoy: 0, vencidas: 0 };
    (cuotas || []).forEach((c) => {
      stats.totalCuotas += 1;
      if (c.pagado) {
        stats.alDia += 1;
        return;
      }
      if (!c.fecha_vencimiento) {
        stats.porVencer += 1;
        return;
      }
      const fv = dayjs(c.fecha_vencimiento).startOf("day");
      if (!fv.isValid()) return;
      if (fv.isBefore(hoy)) stats.vencidas += 1;
      else if (fv.isSame(hoy)) stats.venceHoy += 1;
      else stats.porVencer += 1;
    });
    return stats;
  }, [cuotas]);

  const kpis = useMemo(
    () => [
      { label: "Cuotas", value: totalCuotas, icon: HiBadgeCheck, hint: "Total cuotas" },
      { label: "Al día", value: alDia, icon: HiSparkles, hint: "Pagadas" },
      { label: "Por vencer", value: porVencer, icon: HiClock, hint: "Próximas" },
      { label: "Vence hoy", value: venceHoy, icon: HiSearch, hint: "Hoy" },
      { label: "Vencidas", value: vencidas, icon: HiX, hint: "Atrasadas" },
    ],
    [totalCuotas, alDia, porVencer, venceHoy, vencidas]
  );

  const clienteGroups = useMemo(() => computeClienteGroups(cuotas), [cuotas]);
  const visibleCuotasEnModal = useMemo(() => {
    if (!clienteSeleccionado) return [];
    const key = clienteSeleccionado?.key;
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => clienteKeyFromCuota(c) === key);
  }, [cuotas, clienteSeleccionado]);

  const abrirCliente = useCallback((g) => {
    setClienteSeleccionado(g);
  }, []);
  const cerrarClienteModal = useCallback(() => {
    setClienteSeleccionado(null);
  }, []);

  return (
    <div className="min-h-screen bg-brand-card-dark text-brand-200">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-10 2xl:px-12 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span>Pagos y recordatorios</span>
              <span className="inline-flex items-center rounded-full bg-brand-primary/10 text-brand-primary-tint text-xs px-2 py-0.5 border border-brand-primary/30">
                <HiSparkles className="mr-1" />
                <span>Panel operativo</span>
              </span>
            </h1>
            <p className="text-brand-200/50 text-sm sm:text-base mt-1">
              Administrá cuotas, medios de cobro y envíos de recordatorios desde un solo lugar.
              {!isWebAdmin && user?.perfil?.oficina_nombre && <span className="text-brand-primary-tint ml-2 font-bold tracking-widest text-xs uppercase">({user.perfil.oficina_nombre})</span>}
            </p>
          </div>
          
          {/* 🚀 ESCUDO ADMIN: Solo vos ves estos botones */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          </div>
        </div>

        {/* 🚀 TABS REDISEÑADAS — Cobranza primero (uso diario), Verificar segunda */}
        <div className="mb-4 sm:mb-5">
          <div className="inline-flex p-1 rounded-xl bg-brand-200/[0.04] border border-brand-200/10 backdrop-blur w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === "pagos"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-brand-200/50 hover:text-brand-200"
              }`}
            >
              <HiReceiptTax className="text-base" />
              <span>Cobranza</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab("historial_pagos")}
              className={`flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === "historial_pagos"
                  ? "bg-brand-secondary text-white shadow-sm"
                  : "text-brand-200/50 hover:text-brand-200"
              }`}
            >
              <HiBadgeCheck className="text-base" />
              <span>Verificar pagos</span>
            </button>
            {isWebAdmin && (
              <button
                type="button"
                onClick={() => handleChangeTab("historial_recordatorios")}
                className={`flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  tab === "historial_recordatorios"
                    ? "bg-brand-200/10 text-brand-200"
                    : "text-brand-200/50 hover:text-brand-200"
                }`}
              >
                <HiClock className="text-base" />
                <span>Alertas</span>
              </button>
            )}
          </div>
        </div>

        {tab === "pagos" && isWebAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-4">
            {kpis.map(({ label, value, icon: Icon, hint }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-brand-200/[0.06] border border-brand-200/10 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between shadow-[0_0_18px_rgba(15,23,42,0.75)]"
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-brand-200/50">
                    {label}
                  </span>
                  <Icon className="text-brand-200/50 text-sm sm:text-base" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-2xl font-semibold tabular-nums">{value}</span>
                  <span className="text-[0.6rem] sm:text-[0.7rem] text-brand-200/50">{hint}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "pagos" ? (
          <motion.div
            key="tab-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="rounded-2xl border border-brand-200/8 bg-brand-200/[0.03] p-4 sm:p-6 space-y-3">
              <PagosSearch onBuscar={handleBuscarPolizas} />
              <button
                type="button"
                onClick={() => setOcultarPagadas((v) => !v)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-brand-200/75 hover:text-brand-200 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    ocultarPagadas ? "bg-brand-200/80 border-brand-200" : "border-brand-200/25"
                  }`}
                >
                  {ocultarPagadas && <span className="w-2 h-2 rounded bg-brand-card-dark" />}
                </span>
                <HiEyeOff className="w-4 h-4 opacity-70" />
                <span>Ocultar cuotas pagadas</span>
              </button>
            </div>

            <div className="bg-brand-200/[0.06] border border-brand-200/10 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary-tint">
                    <HiUserGroup className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-brand-200">Resultados por cliente</div>
                    <div className="text-xs text-brand-200/50">Elegí un cliente para ver todas sus cuotas.</div>
                  </div>
                </div>
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => setClienteSeleccionado(null)}
                    className="h-9 px-3 rounded-2xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200/90 hover:bg-brand-200/[0.04] cursor-pointer text-xs"
                  >
                    Volver
                  </button>
                )}
              </div>

              {clienteGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-brand-200/10 bg-brand-200/[0.02] p-8 text-center text-brand-200/50">
                  Buscá por cliente, patente o póliza para ver resultados.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                  {clienteGroups.map((g) => {
                    const hasPend = g.pendientes > 0;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => abrirCliente(g)}
                        className={`text-left rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 transition cursor-pointer ${
                          hasPend
                            ? "bg-brand-200/[0.02] border-brand-200/15 hover:bg-brand-200/[0.03]"
                            : "bg-brand-card-dark/25 border-brand-200/10 hover:bg-brand-card-dark/45"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-brand-card-dark border border-brand-200/10 text-brand-200/90">
                                <HiIdentification className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm sm:text-base font-semibold text-brand-200 truncate flex items-center gap-2 flex-wrap">
                                  {g.label}
                                </div>
                                <div className="text-xs text-brand-200/50 truncate">
                                  DNI: <span className="text-brand-200/90">{safe(g.dni, "—")}</span> • Cuotas:{" "}
                                  <span className="text-brand-200/90">{g.total}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.vencidas > 0
                                    ? "bg-red-500/15 border-red-400/30 text-red-300"
                                    : "bg-brand-card-dark border-brand-200/10 text-brand-200/75"
                                }`}
                              >
                                Vencidas: <span className="ml-1">{g.vencidas}</span>
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.pendientes > 0
                                    ? "bg-brand-secondary/15 border-brand-secondary/25 text-brand-secondary-tint"
                                    : "bg-brand-card-dark border-brand-200/10 text-brand-200/75"
                                }`}
                              >
                                Pendientes: <span className="ml-1">{g.pendientes}</span>
                              </span>
                              <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-brand-primary/10 border-brand-primary/25 text-brand-primary-tint">
                                Cobrar: <span className="ml-1">{fmtMoney(g.totalMontoPendiente)}</span>
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-brand-card-dark border border-brand-200/10 text-brand-200/75">
                            <HiChevronRightMini className="w-5 h-5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <AnimatePresence>
              {!!clienteSeleccionado && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={cerrarClienteModal} />

                  <motion.div
                    initial={{ y: 22, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 22, opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="relative z-[81] w-full h-[95dvh] sm:h-auto sm:w-[min(980px,92vw)] sm:max-h-[90vh] flex flex-col bg-brand-card-dark border border-brand-200/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="px-4 sm:px-6 py-4 border-b border-brand-200/10 bg-brand-200/[0.03] shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-semibold text-brand-200 truncate flex items-center gap-2 flex-wrap">
                            {clienteSeleccionado?.label || "Cliente"}
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-brand-200/50 flex flex-wrap gap-x-3 gap-y-1">
                            <span>DNI: <span className="text-brand-200/90 font-semibold">{safe(clienteSeleccionado?.dni, "—")}</span></span>
                            <span>• Cuotas: <span className="text-brand-200/90 font-semibold">{clienteSeleccionado?.total ?? 0}</span></span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={cerrarClienteModal}
                          className="h-10 px-3 rounded-2xl bg-brand-card-dark hover:bg-brand-200/10 border border-brand-200/10 text-brand-200/90 inline-flex items-center gap-2 cursor-pointer"
                        >
                          <HiX className="w-5 h-5" />
                          <span className="hidden sm:inline">Cerrar</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                      <PagosList
                        cuotas={visibleCuotasEnModal}
                        actualizarCuotas={handleActualizarCuotas}
                        ocultarPagadas={ocultarPagadas}
                        cuentasMercadoPago={mpCuentas}
                        billeterasVirtuales={billeteras}
                        mediosCobro={mediosCobro}
                        preferFast={true}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : tab === "historial_pagos" ? (
          <HistorialPagosTab />
        ) : (
          <motion.div key="tab-alertas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-200/[0.06] border border-brand-200/10 rounded-2xl p-3 sm:p-4">
            <HistorialRecordatorios items={historialRecordatorios} loading={loadingHistorialRecordatorios} onRefresh={handleRefreshHistorialRecordatorios} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PagosPage;