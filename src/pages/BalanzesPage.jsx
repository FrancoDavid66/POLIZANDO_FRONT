// src/pages/BalancesPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus } from "react-icons/fa";
import {
  HiCog, HiOfficeBuilding, HiCalendar,
  HiViewGrid, HiChartBar, HiClipboardList,
  HiCash, HiTrendingDown, HiSwitchHorizontal,
} from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
dayjs.locale("es");

import { useAuth } from "../context/AuthContext";

import { fetchIngresos, fetchEgresos } from "../store/slices/cajaSlices";
import { fetchBalanceDiario } from "../store/slices/balanceSlice";

import MovimientoTable from "../components/balanzes/MovimientoTable";
import MovimientoModal from "../components/balanzes/MovimientoModal";
import { KpiCard, KpiRowGroup } from "../components/balanzes/KpiCards";

import DescargarBalanceDiarioButton from "../components/balanzes/DescargarBalanceDiarioButton";
import BalanceChart from "../components/balanzes/BalanceChart";
import BalanceExportPanel from "../components/balanzes/BalanceExportPanel";
import HistorialPagosPanel from "../components/balanzes/HistorialPagosPanel";
import HistorialCajaPanel from "../components/balanzes/HistorialCajaPanel";
import TransferenciasPanel from "../components/balanzes/TransferenciasPanel";
import BalanzesSettingsModal from "../components/balanzes/BalanzesSettingsModal";

/* -------------------- Helpers -------------------- */
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* Botones de caja rápida (Ingreso / Egreso) */
const BotonesCajaRapida = ({ onIngreso, onEgreso, className = "" }) => (
  <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
    <button
      type="button"
      onClick={onIngreso}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition shadow-sm shadow-emerald-900/30"
    >
      <FaPlus size={12} /> Nuevo ingreso
    </button>
    <button
      type="button"
      onClick={onEgreso}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] transition shadow-sm shadow-rose-900/30"
    >
      <FaPlus size={12} /> Nuevo egreso
    </button>
  </div>
);

/* Toggle Día/Mes */
const ToggleDiaMes = ({ value, onChange, className = "", full = false }) => {
  const btn = (active, on) =>
    `${full ? "flex-1 py-1.5" : "px-4 py-1.5"} text-xs font-bold rounded-lg transition-colors ${
      active ? on : "text-slate-400 hover:text-slate-200"
    }`;
  return (
    <div className={`flex bg-slate-950/60 border border-slate-700/50 rounded-xl p-1 ${className}`}>
      <button onClick={() => onChange("dia")} className={btn(value === "dia", "bg-sky-500/20 text-sky-300")}>
        {full ? "Vista Diaria" : "Diario"}
      </button>
      <button onClick={() => onChange("mes")} className={btn(value === "mes", "bg-emerald-500/20 text-emerald-300")}>
        {full ? "Vista Mensual" : "Mensual"}
      </button>
    </div>
  );
};

/* Botón de pestaña (pill con ícono) */
const TabButton = ({ tab, active, onClick }) => {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
        active
          ? "bg-sky-600 text-white shadow-sm shadow-sky-900/40"
          : "bg-slate-900/60 border border-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800/60"
      }`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {tab.label}
    </button>
  );
};

// Tabs agrupados. El cliente común solo ve "Resumen".
// Grupo 1: vista general. Grupo 2: gestión / históricos.
const TAB_RESUMEN = { id: "resumen", label: "Resumen", icon: HiViewGrid };
const TABS_GENERAL = [
  { id: "grafico", label: "Gráfico", icon: HiChartBar },
  { id: "detalle", label: "Detalle", icon: HiClipboardList },
];
const TABS_GESTION = [
  { id: "historial",      label: "Historial de Pagos",    short: "Pagos",       icon: HiClipboardList },
  { id: "hist_ingresos",  label: "Historial de Ingresos", short: "Ingresos",    icon: HiCash },
  { id: "hist_egresos",   label: "Historial de Egresos",  short: "Egresos",     icon: HiTrendingDown },
  { id: "transferencias", label: "Transferencias",        short: "Transfer.",   icon: HiSwitchHorizontal },
];

const BalancesPage = () => {
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const userOficina = user?.perfil?.oficina?.codigo || user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  const [oficinaSeleccionada, setOficinaSeleccionada] = useState("ALL");
  const [adminTimeView, setAdminTimeView] = useState("dia");

  const { list: ingresos = [], status: ingresosStatus } = useSelector((s) => s.ingresos || {});
  const { list: egresos = [], status: egresosStatus } = useSelector((s) => s.egresos || {});

  const balanceState = useSelector((s) => s.balance || {});
  const balanceData = balanceState?.data;
  const balanceStatus = balanceState?.status;

  const [oficinasAdmin, setOficinasAdmin] = useState([]);

  useEffect(() => {
    if (!isWebAdmin) return;
    const token = localStorage.getItem("access_token");
    const baseURL = import.meta.env.VITE_API_URL;
    axios
      .get(`${baseURL}usuarios/oficinas/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setOficinasAdmin(data);
      })
      .catch((err) => console.error("Error al cargar lista de sucursales:", err));
  }, [isWebAdmin]);

  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [activeTab, setActiveTab] = useState("resumen");
  const [resumenMovTab, setResumenMovTab] = useState("ingresos");

  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [chartYear, setChartYear] = useState(() => dayjs().year());
  const [chartMonth, setChartMonth] = useState("all");

  useEffect(() => {
    const ofi = isWebAdmin ? oficinaSeleccionada : userOficina;
    const desde = dayjs().startOf("month").format("YYYY-MM-DD");
    const hasta = dayjs().endOf("month").format("YYYY-MM-DD");
    dispatch(fetchBalanceDiario({ fecha, oficina: ofi }));
    dispatch(fetchIngresos({ oficina: ofi, desde, hasta, page_size: 500 }));
    dispatch(fetchEgresos({ oficina: ofi, desde, hasta, page_size: 500 }));
  }, [dispatch, fecha, oficinaSeleccionada, isWebAdmin, userOficina]);

  const anioActual = dayjs().year();

  const ingresosMensuales = useMemo(
    () =>
      ingresos.filter((i) => {
        if (!isWebAdmin) return true;
        return oficinaSeleccionada === "ALL" || String(i.oficina) === String(oficinaSeleccionada);
      }),
    [ingresos, isWebAdmin, oficinaSeleccionada]
  );

  const egresosMensuales = useMemo(
    () =>
      egresos.filter((e) => {
        if (!isWebAdmin) return true;
        return oficinaSeleccionada === "ALL" || String(e.oficina) === String(oficinaSeleccionada);
      }),
    [egresos, isWebAdmin, oficinaSeleccionada]
  );

  const getMetrics = useCallback(
    (ofiCode, timeView) => {
      if (timeView === "dia") {
        let source = balanceData;
        if (ofiCode !== "ALL" && ofiCode !== null) {
          source = balanceData?.por_oficina?.find((o) => String(o.scope.oficina) === String(ofiCode)) || null;
        } else if (ofiCode === null) {
          source = balanceData?.sin_oficina || null;
        }
        const tIn = toNumber(source?.totales?.ingresos);
        const tEg = toNumber(source?.totales?.egresos);
        const tBal = toNumber(source?.totales?.balance);
        const tCajaChica = toNumber(source?.totales?.saldo_caja_chica);
        const inForma = source?.ingresos?.por_forma_pago || [];
        const tInEfe = toNumber(inForma.find((f) => f.forma_pago === "EFECTIVO")?.total);
        const tInTransf = toNumber(inForma.find((f) => f.forma_pago === "TRANSFERENCIA")?.total);
        return { tIn, tEg, tBal, tCajaChica, tInEfe, tInTransf };
      } else {
        const ingFiltrados = ofiCode === "ALL" ? ingresosMensuales : ofiCode === null ? ingresosMensuales.filter((i) => !i.oficina) : ingresosMensuales.filter((i) => String(i.oficina) === String(ofiCode));
        const egFiltrados = ofiCode === "ALL" ? egresosMensuales : ofiCode === null ? egresosMensuales.filter((e) => !e.oficina) : egresosMensuales.filter((e) => String(e.oficina) === String(ofiCode));
        const tIn = ingFiltrados.reduce((acc, i) => acc + toNumber(i.monto), 0);
        const tEg = egFiltrados.reduce((acc, e) => acc + toNumber(e.monto), 0);
        const tBal = tIn - tEg;
        const tInEfe = ingFiltrados.filter((i) => (i.forma_pago || "").toUpperCase() === "EFECTIVO").reduce((acc, i) => acc + toNumber(i.monto), 0);
        const tInTransf = ingFiltrados.filter((i) => (i.forma_pago || "").toUpperCase() === "TRANSFERENCIA").reduce((acc, i) => acc + toNumber(i.monto), 0);
        const tEgEfe = egFiltrados.filter((e) => (e.forma_pago || "EFECTIVO").toUpperCase() === "EFECTIVO").reduce((acc, e) => acc + toNumber(e.monto), 0);
        const tCajaChica = tInEfe - tEgEfe;
        return { tIn, tEg, tBal, tCajaChica, tInEfe, tInTransf };
      }
    },
    [balanceData, ingresosMensuales, egresosMensuales]
  );

  const suffix = adminTimeView === "dia" ? "(Día)" : "(Mes)";
  const cargando = ingresosStatus === "loading" || egresosStatus === "loading" || balanceStatus === "loading";

  const empMetricsDia = getMetrics("ALL", "dia");

  const yearsOptions = useMemo(() => {
    const yearsSet = new Set();
    [...ingresos, ...egresos].forEach((item) => {
      if (!item.fecha) return;
      const y = dayjs(item.fecha).year();
      if (Number.isFinite(y)) yearsSet.add(y);
    });
    if (yearsSet.size === 0) yearsSet.add(anioActual);
    return Array.from(yearsSet).sort();
  }, [ingresos, egresos, anioActual]);

  const ingresosPreview = useMemo(() => ingresosMensuales.slice(0, 20), [ingresosMensuales]);
  const egresosPreview = useMemo(() => egresosMensuales.slice(0, 20), [egresosMensuales]);

  const ingresosChart = useMemo(
    () =>
      ingresosMensuales.filter((i) => {
        if (!i.fecha) return false;
        const d = dayjs(i.fecha);
        if (chartYear && d.year() !== chartYear) return false;
        if (chartMonth !== "all" && d.month() + 1 !== Number(chartMonth)) return false;
        return true;
      }),
    [ingresosMensuales, chartYear, chartMonth]
  );

  const egresosChart = useMemo(
    () =>
      egresosMensuales.filter((e) => {
        if (!e.fecha) return false;
        const d = dayjs(e.fecha);
        if (chartYear && d.year() !== chartYear) return false;
        if (chartMonth !== "all" && d.month() + 1 !== Number(chartMonth)) return false;
        return true;
      }),
    [egresosMensuales, chartYear, chartMonth]
  );

  const abrirIngreso = () => setModalIngresoAbierto(true);
  const abrirEgreso = () => setModalEgresoAbierto(true);
  const oficinaActual = isWebAdmin ? oficinaSeleccionada : userOficina;

  // Lista plana (para el dropdown de mobile).
  const TABS = isWebAdmin ? [TAB_RESUMEN, ...TABS_GENERAL, ...TABS_GESTION] : [TAB_RESUMEN];

  useEffect(() => {
    if (!isWebAdmin && activeTab !== "resumen") setActiveTab("resumen");
  }, [isWebAdmin, activeTab]);

  const inputPill =
    "flex items-center gap-2 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2 min-w-0";

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-10 text-slate-50 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* ═══════ HEADER ═══════ */}
      <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Título */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Balances</h1>
              {!isWebAdmin && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest">
                  <HiOfficeBuilding className="shrink-0" />
                  <span className="truncate max-w-[160px]">{user?.perfil?.oficina_nombre || `Oficina ${userOficina}`}</span>
                </span>
              )}
              {cargando && (
                <span className="text-[11px] text-sky-400 font-semibold animate-pulse">Actualizando…</span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {dayjs(fecha).format("DD [de] MMMM YYYY")}
            </p>
          </div>

          {/* Controles */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full xl:w-auto">
            {isWebAdmin && (
              <div className={inputPill}>
                <HiOfficeBuilding className="text-slate-400 shrink-0" />
                <select
                  value={oficinaSeleccionada}
                  onChange={(e) => setOficinaSeleccionada(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-50 outline-none cursor-pointer truncate"
                >
                  <option value="ALL" className="bg-slate-900">Todas las cajas</option>
                  {oficinasAdmin.map((ofi) => (
                    <option key={ofi.id} value={ofi.id} className="bg-slate-900">{ofi.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={inputPill}>
              <HiCalendar className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-50 outline-none"
              />
              <button
                type="button"
                onClick={() => setFecha(dayjs().format("YYYY-MM-DD"))}
                className="text-[10px] sm:text-xs font-semibold text-sky-300 hover:text-sky-200 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition shrink-0"
              >
                Hoy
              </button>
            </div>

            {isWebAdmin && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Configuración de Categorías"
                className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-slate-700/50 bg-slate-950/60 hover:bg-slate-800/60 transition"
              >
                <HiCog className="text-xl text-slate-300" />
              </button>
            )}
          </div>
        </div>

        {/* Barra de acciones: cargar + descargar (agrupadas) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 pt-4 border-t border-slate-800/60">
          <BotonesCajaRapida onIngreso={abrirIngreso} onEgreso={abrirEgreso} />
          {isWebAdmin && (
            <div className="sm:ml-auto">
              <DescargarBalanceDiarioButton
                fecha={fecha}
                oficina={oficinaSeleccionada === "ALL" ? "" : oficinaSeleccionada}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══════ TABS (solo admin) ═══════ */}
      {isWebAdmin && (
        <div className="mb-5">
          {/* Mobile: dropdown limpio */}
          <div className="sm:hidden flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2.5">
              <HiViewGrid className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-100 outline-none"
              >
                <optgroup label="Vista general" className="bg-slate-900">
                  <option value={TAB_RESUMEN.id} className="bg-slate-900">{TAB_RESUMEN.label}</option>
                  {TABS_GENERAL.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900">{t.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Gestión" className="bg-slate-900">
                  {TABS_GESTION.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900">{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {activeTab === "resumen" && (
              <ToggleDiaMes value={adminTimeView} onChange={setAdminTimeView} />
            )}
          </div>

          {/* Desktop: pills agrupados (general | gestión) */}
          <div className="hidden sm:flex flex-wrap justify-between items-center gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Grupo 1: vista general */}
              <TabButton tab={TAB_RESUMEN} active={activeTab === TAB_RESUMEN.id} onClick={() => setActiveTab(TAB_RESUMEN.id)} />
              {TABS_GENERAL.map((tab) => (
                <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
              ))}

              {/* Divisor */}
              <span className="mx-1.5 h-6 w-px bg-slate-700/60" aria-hidden="true" />

              {/* Grupo 2: gestión (usa labels cortos para no amontonar) */}
              {TABS_GESTION.map((tab) => (
                <TabButton key={tab.id} tab={{ ...tab, label: tab.short }} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
              ))}
            </div>
            {activeTab === "resumen" && (
              <ToggleDiaMes value={adminTimeView} onChange={setAdminTimeView} />
            )}
          </div>
        </div>
      )}

      {/* ═══════ TAB: Resumen ═══════ */}
      {activeTab === "resumen" && (
        <section className="space-y-6">
          {isWebAdmin && (
            <ToggleDiaMes value={adminTimeView} onChange={setAdminTimeView} className="sm:hidden" full />
          )}

          {isWebAdmin ? (
            <div className="space-y-5">
              {oficinaSeleccionada === "ALL" ? (
                <>
                  <KpiRowGroup title="Caja General (Todas las Sucursales)" metrics={getMetrics("ALL", adminTimeView)} suffix={suffix} highlight />
                  {balanceData?.por_oficina?.map((ofi) => (
                    <KpiRowGroup key={ofi.scope.oficina} title={`Sucursal: ${ofi.scope.oficina_nombre}`} metrics={getMetrics(ofi.scope.oficina, adminTimeView)} suffix={suffix} />
                  ))}
                  {balanceData?.sin_oficina && (
                    <KpiRowGroup title="Sin Sucursal Asignada" metrics={getMetrics(null, adminTimeView)} suffix={suffix} />
                  )}
                </>
              ) : (
                <KpiRowGroup title="Sucursal Seleccionada" metrics={getMetrics("ALL", adminTimeView)} suffix={suffix} highlight />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard title="Neto Total (Día)" value={empMetricsDia.tBal} variant="blue" />
              <KpiCard title="Ingreso Efectivo (Día)" value={empMetricsDia.tInEfe} variant="green" />
              <KpiCard title="Ingreso Transf. (Día)" value={empMetricsDia.tInTransf} variant="green" />
            </div>
          )}

          {/* Movimientos del mes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <h2 className="text-sm md:text-base font-semibold truncate">Movimientos del mes (primeros 20)</h2>
                <div className="flex gap-1 bg-slate-950/60 border border-slate-800/60 rounded-full p-1 text-[11px] sm:text-xs">
                  <button
                    type="button"
                    onClick={() => setResumenMovTab("ingresos")}
                    className={`flex-1 px-4 py-1 rounded-full transition ${resumenMovTab === "ingresos" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-slate-400 hover:text-white"}`}
                  >
                    Ingresos
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumenMovTab("egresos")}
                    className={`flex-1 px-4 py-1 rounded-full transition ${resumenMovTab === "egresos" ? "bg-rose-500/20 text-rose-300 font-semibold" : "text-slate-400 hover:text-white"}`}
                  >
                    Egresos
                  </button>
                </div>
              </div>
              {isWebAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("detalle")}
                  className="text-[11px] sm:text-xs md:text-sm text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline whitespace-nowrap shrink-0"
                >
                  Ver detalle
                </button>
              )}
            </div>

            <div className="-mx-2 md:mx-0">
              {resumenMovTab === "ingresos" && (
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-3 sm:p-4 overflow-x-auto">
                  <MovimientoTable tipo="ingreso" items={ingresosPreview} />
                </div>
              )}
              {resumenMovTab === "egresos" && (
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-3 sm:p-4 overflow-x-auto">
                  <MovimientoTable tipo="egreso" items={egresosPreview} />
                </div>
              )}
            </div>
          </section>
        </section>
      )}

      {/* ═══════ TAB: Gráfico ═══════ */}
      {activeTab === "grafico" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-slate-400">Año</span>
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="bg-slate-950/60 border border-slate-700/50 text-[11px] sm:text-xs rounded-xl px-3 py-1.5 text-slate-50 outline-none focus:border-sky-500"
              >
                {yearsOptions.map((y) => (
                  <option key={y} value={y} className="bg-slate-900">{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-slate-400">Mes</span>
              <select
                value={chartMonth}
                onChange={(e) => setChartMonth(e.target.value)}
                className="bg-slate-950/60 border border-slate-700/50 text-[11px] sm:text-xs rounded-xl px-3 py-1.5 text-slate-50 outline-none focus:border-sky-500"
              >
                <option value="all" className="bg-slate-900">Todos</option>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900">
                    {dayjs().month(idx).format("MMMM")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="-mx-2 sm:mx-0">
            <BalanceChart ingresos={ingresosChart} egresos={egresosChart} className="w-full" />
          </div>
        </section>
      )}

      {/* ═══════ TAB: Detalle ═══════ */}
      {activeTab === "detalle" && (
        <section className="space-y-6">
          {/* Mobile resumido */}
          <div className="md:hidden space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Ingresos del Día</h3>
                <p className="text-2xl font-extrabold mt-1 truncate">${fmtMoney(empMetricsDia.tIn)}</p>
              </div>
              <div className="bg-rose-600 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Egresos del Día</h3>
                <p className="text-2xl font-extrabold mt-1 truncate">${fmtMoney(empMetricsDia.tEg)}</p>
              </div>
              <div className="bg-sky-600/40 border border-sky-400/50 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Resultado del Día</h3>
                <p className={`text-2xl font-extrabold mt-1 truncate ${empMetricsDia.tBal >= 0 ? "text-sky-50" : "text-rose-100"}`}>
                  ${fmtMoney(empMetricsDia.tBal)}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Para ver el detalle completo con todas las columnas y exportar el Excel, usá la versión de escritorio.
            </p>
          </div>

          {/* Desktop completo */}
          <div className="hidden md:block space-y-6">
            <div className="-mx-2 sm:mx-0">
              <BalanceExportPanel
                ingresos={ingresosMensuales}
                egresos={egresosMensuales}
                mes={dayjs(fecha).format("YYYY-MM")}
                oficina={oficinaActual}
                fileName={`Reporte_Mensual_${dayjs(fecha).format("YYYY-MM")}.xlsx`}
                className="w-full"
              />
            </div>

            <section className="space-y-6">
              <h2 className="text-lg font-semibold">Ingresos del mes</h2>
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <MovimientoTable tipo="ingreso" items={ingresosMensuales} />
              </div>

              <h2 className="text-lg font-semibold pt-2">Egresos del mes</h2>
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <MovimientoTable tipo="egreso" items={egresosMensuales} />
              </div>
            </section>
          </div>
        </section>
      )}

      {/* ═══════ Tabs de gestión ═══════ */}
      {activeTab === "historial" && (
        <section className="mt-2">
          <HistorialPagosPanel oficinasAdmin={oficinasAdmin} oficinaProp={oficinaActual} />
        </section>
      )}

      {activeTab === "hist_ingresos" && (
        <section className="mt-2">
          <HistorialCajaPanel tipo="ingreso" oficinasAdmin={oficinasAdmin} oficinaProp={oficinaActual} />
        </section>
      )}

      {activeTab === "hist_egresos" && (
        <section className="mt-2">
          <HistorialCajaPanel tipo="egreso" oficinasAdmin={oficinasAdmin} oficinaProp={oficinaActual} />
        </section>
      )}

      {activeTab === "transferencias" && (
        <section className="mt-2">
          <TransferenciasPanel oficinasAdmin={oficinasAdmin} oficinaProp={oficinaActual} />
        </section>
      )}

      {/* Modales */}
      <MovimientoModal tipo="ingreso" modo="crear" isOpen={modalIngresoAbierto} onClose={() => setModalIngresoAbierto(false)} />
      <MovimientoModal tipo="egreso" modo="crear" isOpen={modalEgresoAbierto} onClose={() => setModalEgresoAbierto(false)} />
      <BalanzesSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default BalancesPage;