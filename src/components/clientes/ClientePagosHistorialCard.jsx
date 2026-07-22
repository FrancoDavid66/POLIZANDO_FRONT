// src/components/clientes/ClientePagosHistorialCard.jsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  HiCreditCard,
  HiCheckCircle,
  HiClock,
  HiCurrencyDollar,
  HiCalendar,
} from "react-icons/hi";
import { pagarCuota } from "../../store/slices/clientesSlice";
import { Card, Badge, Button } from "../ui";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClientePagosHistorialCard({ cuotas = [], onPagoExitoso }) {
  const dispatch = useDispatch();
  const [filtroPoliza, setFiltroPoliza] = useState(null);
  const [fechaPagoById, setFechaPagoById] = useState({});
  const [marcandoId, setMarcandoId] = useState(null);

  const agrupado = useMemo(() => {
    const acc = {};
    (cuotas || []).forEach((c) => {
      const key = `${c?.poliza?.marca || ""} ${c?.poliza?.modelo || ""} (${c?.poliza?.patente || "-"})`;
      acc[key] = acc[key] || [];
      acc[key].push(c);
    });
    return acc;
  }, [cuotas]);

  const keys = Object.keys(agrupado);
  const visible = filtroPoliza ? { [filtroPoliza]: agrupado[filtroPoliza] || [] } : agrupado;

  const marcar = async (cuota) => {
    try {
      setMarcandoId(cuota.id);
      const fecha = fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD");
      await dispatch(pagarCuota({ cuotaId: cuota.id, fecha_pago: fecha })).unwrap();
      toast.success("Pago registrado exitosamente");
      onPagoExitoso && onPagoExitoso();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo registrar el pago");
    } finally {
      setMarcandoId(null);
    }
  };

  return (
    <Card padding="none" className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-brand-primary-tint shrink-0">
            <HiCreditCard className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-sm sm:text-base font-bold text-brand-100 dark:text-brand-200 uppercase tracking-tight truncate">
              Historial Financiero
            </h2>
            <p className="text-[9px] sm:text-[10px] text-brand-100/40 dark:text-brand-200/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              Gestión de Cuotas y Pagos
            </p>
          </div>
        </div>
        {cuotas?.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-100/5 dark:bg-brand-200/5 border border-brand-100/10 dark:border-brand-200/10">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Total Cuotas:</span>
            <span className="text-xs font-bold text-brand-100 dark:text-brand-200">{cuotas.length}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-5 flex-1">
        {/* Filtros por póliza */}
        {keys.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => setFiltroPoliza(null)}
              className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                !filtroPoliza
                  ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30"
                  : "bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/50 dark:text-brand-200/50 border border-brand-100/10 dark:border-brand-200/10 hover:bg-brand-100/10 dark:hover:bg-brand-200/10 hover:text-brand-100 dark:hover:text-brand-200"
              }`}
            >
              Todas las Pólizas
            </button>
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setFiltroPoliza(k)}
                className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filtroPoliza === k
                    ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30"
                    : "bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/50 dark:text-brand-200/50 border border-brand-100/10 dark:border-brand-200/10 hover:bg-brand-100/10 dark:hover:bg-brand-200/10 hover:text-brand-100 dark:hover:text-brand-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Listado de Cuotas */}
        {keys.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border border-dashed border-brand-100/15 dark:border-brand-200/15 rounded-2xl bg-brand-100/[0.01] dark:bg-brand-200/[0.01]">
            <HiCurrencyDollar className="text-4xl text-brand-100/15 dark:text-brand-200/15 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">No hay cuotas registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {Object.entries(visible).map(([k, list]) => (
              <motion.article
                key={k}
                className="rounded-2xl bg-brand-100/[0.02] dark:bg-brand-200/[0.02] border border-brand-100/8 dark:border-brand-200/8 p-4 flex flex-col gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Título de la Agrupación */}
                <div className="flex items-start justify-between gap-3 border-b border-brand-100/8 dark:border-brand-200/8 pb-3">
                  <h3 className="text-xs sm:text-sm font-black text-brand-primary dark:text-brand-primary-tint uppercase tracking-wide leading-snug">
                    {k}
                  </h3>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 bg-brand-100/5 dark:bg-brand-200/5 px-2 py-1 rounded-md">
                    {list.length} Cuota{list.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Lista de Cuotas */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-1">
                  {list.map((cuota) => {
                    const isPaid = Boolean(cuota.pagado);

                    return (
                      <motion.div
                        key={cuota.id}
                        className="rounded-2xl border border-brand-100/8 dark:border-brand-200/8 bg-brand-card dark:bg-brand-card-dark p-4 flex flex-col gap-3"
                        initial={{ opacity: 0.8, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {/* Cabecera de Cuota */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-brand-100/5 dark:bg-brand-200/5 flex items-center justify-center text-[10px] font-black text-brand-100 dark:text-brand-200 border border-brand-100/10 dark:border-brand-200/10">
                              #{cuota.cuota_nro}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Cuota</span>
                          </div>
                          <Badge tone={isPaid ? "primary" : "secondary"}>
                            <span className="inline-flex items-center gap-1">
                              {isPaid ? <HiCheckCircle className="text-sm" /> : <HiClock className="text-sm" />} {isPaid ? "Pagada" : "Pendiente"}
                            </span>
                          </Badge>
                        </div>

                        {/* Monto y Fechas */}
                        <div className="grid grid-cols-2 gap-3 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] rounded-xl p-3 border border-brand-100/8 dark:border-brand-200/8">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Monto</span>
                            <span className="text-sm font-mono font-bold text-brand-100 dark:text-brand-200">
                              ${Number(cuota.monto || 0).toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Vencimiento</span>
                            <span className="text-xs font-bold text-brand-100/80 dark:text-brand-200/80">
                              {fmt(cuota.fecha_vencimiento)}
                            </span>
                          </div>

                          {isPaid && (
                            <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-brand-100/8 dark:border-brand-200/8 mt-1">
                              <span className="text-[9px] uppercase font-black tracking-widest text-brand-primary/60 dark:text-brand-primary-tint/70">Fecha de Pago Registrada</span>
                              <span className="text-xs font-bold text-brand-primary dark:text-brand-primary-tint">
                                {cuota.fecha_pago ? fmt(cuota.fecha_pago) : "-"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Formulario de Pago */}
                        {!isPaid && (
                          <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                              <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-100/30 dark:text-brand-200/30" />
                              <input
                                type="date"
                                value={fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD")}
                                onChange={(e) => setFechaPagoById((s) => ({ ...s, [cuota.id]: e.target.value }))}
                                className="h-11 w-full pl-9 pr-3 rounded-xl bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/10 dark:border-brand-200/10 text-xs sm:text-sm font-bold text-brand-100 dark:text-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => marcar(cuota)}
                              loading={marcandoId === cuota.id}
                              className="w-full sm:w-auto"
                            >
                              {marcandoId === cuota.id ? "Procesando" : "Registrar Pago"}
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}