// src/components/pagos/ReportesModal.jsx
//
// Fusión de ReporteEfectividadModal + ReporteContactosModal: los dos eran
// "un modal con datos sobre cobranza", uno mostrando métricas en pantalla y
// el otro dejando descargar un listado. Ahora son 2 pestañas del mismo modal
// en vez de 2 modales y 2 botones separados en PagosPage.
//
// De paso: primera vez que se le aplica la marca a estos 2 (nunca se había
// hecho), se saca react-toastify (el resto de la app usa react-hot-toast) y
// se saca el selector de oficina — Polizando no tiene sucursales.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiChartBar,
  HiClock,
  HiCurrencyDollar,
  HiCheckCircle,
  HiLightningBolt,
  HiExclamationCircle,
  HiDocumentText,
  HiTable,
  HiDownload,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { fetchReporteEfectividad } from "../../store/slices/pagosThunks";
import api from "../../services/api";

const DELTAS_INFO = [
  { delta: -7, label: "Vencidas hace 7 días", color: "text-red-300", bg: "bg-red-500/10 border-red-500/30" },
  { delta: -3, label: "Vencidas hace 3 días", color: "text-red-300", bg: "bg-red-500/10 border-red-500/30" },
  { delta: 0, label: "Vencen HOY", color: "text-brand-secondary-tint", bg: "bg-brand-secondary/10 border-brand-secondary/30" },
  { delta: 3, label: "Vencen en 3 días", color: "text-brand-primary-tint", bg: "bg-brand-primary/10 border-brand-primary/30" },
  { delta: 7, label: "Vencen en 7 días", color: "text-brand-secondary-tint", bg: "bg-brand-secondary/10 border-brand-secondary/30" },
];

function KpiCard({ label, value, icon, color, bg, border }) {
  return (
    <div className={`p-4 rounded-lg border ${border} ${bg} flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <div className={`text-lg ${color}`}>{icon}</div>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand-200/50">{label}</span>
      </div>
      <div className={`text-2xl sm:text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function ReportesModal({
  isOpen,
  onClose,
}) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("efectividad"); // "efectividad" | "contactos"
  const [activeSubTab, setActiveSubTab] = useState("pagados"); // dentro de efectividad

  const {
    reporteEfectividad,
    reporteEfectividadStatus,
    reporteEfectividadError,
  } = useSelector((state) => state.pagos);

  const [downloading, setDownloading] = useState(null); // "pdf" | "excel" | null

  useEffect(() => {
    if (isOpen && tab === "efectividad") {
      dispatch(fetchReporteEfectividad());
      setActiveSubTab("pagados");
    }
  }, [isOpen, tab, dispatch]);

  if (!isOpen) return null;

  const loading = reporteEfectividadStatus === "loading";
  const error = reporteEfectividadError;
  const kpis = reporteEfectividad?.kpis || {};
  const pagados = reporteEfectividad?.detalle_pagados || [];
  const pendientes = reporteEfectividad?.detalle_pendientes || [];

  const handleDescargar = async (formato) => {
    setDownloading(formato);
    try {
      const response = await api.get("notificaciones/cuotas/reporte-contactos/", {
        params: { formato },
        responseType: "blob",
      });

      const hoy = new Date().toISOString().slice(0, 10);
      const ext = formato === "pdf" ? "pdf" : "xlsx";
      const filename = `contactos_pendientes_${hoy}.${ext}`;

      const blob = new Blob([response.data], {
        type: formato === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Reporte ${formato.toUpperCase()} descargado ✅`);
    } catch (err) {
      console.error("Error descargando reporte:", err);
      toast.error("No se pudo generar el reporte.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-brand-card-dark border border-brand-200/10 rounded-xl w-full max-w-5xl shadow-md flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* HEADER */}
          <div className="flex justify-between items-center p-5 sm:p-6 border-b border-brand-200/10 bg-brand-200/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-200/10 flex items-center justify-center text-brand-secondary-tint border border-brand-200/15">
                <HiChartBar className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-brand-200 leading-none">Reportes de cobranza</h3>
                <p className="text-xs text-brand-200/50 mt-1">Efectividad de recordatorios y listado de contactos.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-brand-200/50 hover:text-brand-200 p-2 rounded-xl hover:bg-brand-200/10 transition-colors"
            >
              <HiX size={24} />
            </button>
          </div>

          {/* TABS PRINCIPALES */}
          <div className="flex items-center gap-2 px-5 sm:px-6 pt-4 border-b border-brand-200/10 shrink-0">
            <button
              onClick={() => setTab("efectividad")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors ${
                tab === "efectividad"
                  ? "bg-brand-200/8 text-brand-200 border border-b-0 border-brand-200/10"
                  : "text-brand-200/50 hover:text-brand-200/80"
              }`}
            >
              <HiChartBar className="text-lg" />
              Efectividad
            </button>
            <button
              onClick={() => setTab("contactos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors ${
                tab === "contactos"
                  ? "bg-brand-200/8 text-brand-200 border border-b-0 border-brand-200/10"
                  : "text-brand-200/50 hover:text-brand-200/80"
              }`}
            >
              <HiDownload className="text-lg" />
              Contactos
            </button>
          </div>

          {/* BODY */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
            {tab === "efectividad" ? (
              loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-brand-200/15 border-t-brand-secondary rounded-full animate-spin mb-3" />
                  <p className="text-brand-200/50 text-sm font-semibold animate-pulse">Calculando métricas de cobranza...</p>
                </div>
              ) : error ? (
                <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-6 text-center text-red-400">
                  <p className="font-semibold">Hubo un problema al cargar el reporte.</p>
                  <p className="text-xs mt-2 opacity-80">{typeof error === "string" ? error : "Error desconocido"}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPIS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <KpiCard
                      label="Avisos Enviados"
                      value={kpis.total_mensajes_enviados || 0}
                      icon={<HiLightningBolt />}
                      color="text-brand-secondary-tint" bg="bg-brand-secondary/10" border="border-brand-secondary/20"
                    />
                    <KpiCard
                      label="Cobrados post-aviso"
                      value={kpis.pagos_recuperados || 0}
                      icon={<HiCurrencyDollar />}
                      color="text-brand-primary-tint" bg="bg-brand-primary/10" border="border-brand-primary/25"
                    />
                    <KpiCard
                      label="Tasa de Pago"
                      value={kpis.tasa_conversion || "0%"}
                      icon={<HiCheckCircle />}
                      color="text-brand-secondary-tint" bg="bg-brand-secondary/10" border="border-brand-secondary/20"
                    />
                    <KpiCard
                      label="Reacción Promedio"
                      value={`${kpis.tiempo_promedio_respuesta_horas || 0} hs`}
                      icon={<HiClock />}
                      color="text-brand-200/75" bg="bg-brand-200/8" border="border-brand-200/15"
                    />
                  </div>

                  {/* SUB-TABS Pagados/Pendientes */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-brand-200/10 pb-2">
                      <button
                        onClick={() => setActiveSubTab("pagados")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          activeSubTab === "pagados"
                            ? "bg-brand-primary/15 text-brand-primary-tint border border-brand-primary/30"
                            : "text-brand-200/50 hover:text-brand-200/80 hover:bg-brand-200/8"
                        }`}
                      >
                        <HiCheckCircle className="text-lg" />
                        Pagados ({pagados.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab("pendientes")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          activeSubTab === "pendientes"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "text-brand-200/50 hover:text-brand-200/80 hover:bg-brand-200/8"
                        }`}
                      >
                        <HiExclamationCircle className="text-lg" />
                        Siguen Pendientes ({pendientes.length})
                      </button>
                    </div>

                    {activeSubTab === "pagados" && (
                      pagados.length === 0 ? (
                        <div className="text-center py-10 bg-brand-200/[0.03] border border-brand-200/10 rounded-lg">
                          <p className="text-brand-200/50 text-sm">Aún no hay registros de pagos realizados tras recibir un aviso.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-brand-200/10 bg-brand-200/[0.03]">
                          <table className="w-full text-left text-sm text-brand-200/75 whitespace-nowrap">
                            <thead className="bg-brand-200/5 text-xs uppercase font-bold text-brand-200/50 border-b border-brand-200/10">
                              <tr>
                                <th className="px-4 py-3">Asegurado</th>
                                <th className="px-4 py-3">Póliza / Patente</th>
                                <th className="px-4 py-3">Aviso Enviado</th>
                                <th className="px-4 py-3">Fecha de Pago</th>
                                <th className="px-4 py-3">Tiempo de Reacción</th>
                                <th className="px-4 py-3 text-right">Monto Cobrado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-200/8">
                              {pagados.map((d, i) => (
                                <tr key={i} className="hover:bg-brand-200/[0.05] transition-colors">
                                  <td className="px-4 py-3 font-semibold text-brand-200/90">{d.cliente}</td>
                                  <td className="px-4 py-3">
                                    <span className="bg-brand-200/10 text-brand-200/75 px-2 py-1 rounded text-xs border border-brand-200/15">
                                      {d.patente || "S/P"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-brand-200/50">{d.fecha_mensaje}</td>
                                  <td className="px-4 py-3 text-xs text-brand-primary-tint font-medium">{d.fecha_pago}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      d.horas_tardanza <= 24 ? "bg-brand-primary/15 text-brand-primary-tint" :
                                      d.horas_tardanza <= 72 ? "bg-brand-secondary/15 text-brand-secondary-tint" :
                                      "bg-red-500/15 text-red-400"
                                    }`}>
                                      {d.horas_tardanza} hs
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-brand-200/90 tabular-nums">
                                    ${d.monto_recuperado}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {activeSubTab === "pendientes" && (
                      pendientes.length === 0 ? (
                        <div className="text-center py-10 bg-brand-200/[0.03] border border-brand-200/10 rounded-lg">
                          <p className="text-brand-200/50 text-sm">No hay avisos pendientes de cobro actualmente.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-brand-200/10 bg-brand-200/[0.03]">
                          <table className="w-full text-left text-sm text-brand-200/75 whitespace-nowrap">
                            <thead className="bg-brand-200/5 text-xs uppercase font-bold text-brand-200/50 border-b border-brand-200/10">
                              <tr>
                                <th className="px-4 py-3">Asegurado</th>
                                <th className="px-4 py-3">Póliza / Patente</th>
                                <th className="px-4 py-3">Aviso Enviado</th>
                                <th className="px-4 py-3">Tipo de Aviso</th>
                                <th className="px-4 py-3">Tiempo Transcurrido</th>
                                <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-200/8">
                              {pendientes.map((d, i) => (
                                <tr key={i} className="hover:bg-brand-200/[0.05] transition-colors">
                                  <td className="px-4 py-3 font-semibold text-brand-200/90">{d.cliente}</td>
                                  <td className="px-4 py-3">
                                    <span className="bg-brand-200/10 text-brand-200/75 px-2 py-1 rounded text-xs border border-brand-200/15">
                                      {d.patente || "S/P"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-brand-200/50">{d.fecha_mensaje}</td>
                                  <td className="px-4 py-3 text-xs text-brand-200/75 capitalize">{d.tipo_mensaje.replace("_", " ")}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      d.dias_sin_pagar <= 2 ? "bg-brand-secondary/15 text-brand-secondary-tint" : "bg-red-500/15 text-red-400"
                                    }`}>
                                      {d.dias_sin_pagar} días
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-red-300 tabular-nums">
                                    ${d.monto_adeudado}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            ) : (
              /* ── TAB CONTACTOS ── */
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold text-brand-200/75 uppercase tracking-wide mb-2">
                    El reporte incluye
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DELTAS_INFO.map(({ delta, label, color, bg }) => (
                      <div key={delta} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${bg}`}>
                        <span className={`font-bold ${color} text-sm w-10 text-center`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                        <span className="text-sm text-brand-200/85">{label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl border bg-brand-secondary-light/10 border-brand-secondary-light/30">
                      <span className="font-bold text-brand-secondary-light text-[10px] w-10 text-center">RENOV</span>
                      <span className="text-sm text-brand-200/85">
                        Las primeras cuotas de pólizas renovadas salen marcadas aparte.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDescargar("pdf")}
                    disabled={downloading !== null}
                    className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg transition-colors"
                  >
                    <HiDocumentText className="w-5 h-5" />
                    {downloading === "pdf" ? "Generando..." : "Descargar PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDescargar("excel")}
                    disabled={downloading !== null}
                    className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-2xl bg-brand-primary hover:bg-brand-primary-deep disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg transition-colors"
                  >
                    <HiTable className="w-5 h-5" />
                    {downloading === "excel" ? "Generando..." : "Descargar Excel"}
                  </button>
                </div>

                <p className="text-[11px] text-brand-200/45 text-center pt-2">
                  El archivo incluye solo clientes con teléfono cargado.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}