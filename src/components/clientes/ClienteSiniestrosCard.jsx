// src/components/clientes/ClienteSiniestrosCard.jsx
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiFire,
  HiLocationMarker,
  HiCurrencyDollar,
  HiOutlineShieldExclamation,
  HiUserGroup,
} from "react-icons/hi";
import { Card, Badge } from "../ui";

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "No registrada");

const fmtMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `$${num}`;
  }
};

const resolucionTone = (resolucion) => {
  const v = resolucion.toLowerCase();
  if (v.includes("rechaz")) return "secondary";
  if (v.includes("pend")) return "neutral";
  return "primary";
};

const ClienteSiniestrosCard = ({ siniestros }) => {
  const list = Array.isArray(siniestros) ? siniestros : [];
  const empty = !list.length;

  return (
    <Card padding="none" className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary dark:text-brand-secondary-tint shrink-0">
            <HiFire className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-sm sm:text-base font-bold text-brand-100 dark:text-brand-200 uppercase tracking-tight truncate">
              Registro de Siniestros
            </h2>
            <p className="text-[9px] sm:text-[10px] text-brand-100/40 dark:text-brand-200/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              Historial de incidentes declarados
            </p>
          </div>
        </div>
        {!empty && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-100/5 dark:bg-brand-200/5 border border-brand-100/10 dark:border-brand-200/10">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Total:</span>
            <span className="text-xs font-bold text-brand-100 dark:text-brand-200">{list.length}</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 sm:p-5">
        {empty ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-brand-100/15 dark:border-brand-200/15 rounded-2xl bg-brand-100/[0.01] dark:bg-brand-200/[0.01] h-full">
            <HiOutlineShieldExclamation className="text-4xl text-brand-100/15 dark:text-brand-200/15 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-100/50 dark:text-brand-200/50">Historial Limpio</p>
            <p className="text-[9px] text-brand-100/35 dark:text-brand-200/35 uppercase font-bold tracking-widest mt-1 max-w-xs">
              Este cliente no tiene siniestros registrados.
            </p>
          </div>
        ) : (
          <ul className="space-y-4 max-h-[420px] overflow-y-auto scrollbar-hide pr-1">
            {list.map((siniestro) => {
              const monto = fmtMoney(siniestro.monto_pagado);
              const huboHeridos = Boolean(siniestro.hubo_heridos);
              const resolucion = siniestro.resolucion_final?.trim() || "Pendiente";

              return (
                <motion.li
                  key={siniestro.id}
                  className="rounded-2xl border border-brand-100/8 dark:border-brand-200/8 bg-brand-100/[0.03] dark:bg-brand-200/[0.03] p-4 flex flex-col gap-4 hover:bg-brand-primary/5 dark:hover:bg-brand-200/5 transition-colors"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Top row: fecha + resolución */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100/8 dark:border-brand-200/8 pb-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">
                        Fecha de Denuncia
                      </span>
                      <span className="text-sm font-bold text-brand-100 dark:text-brand-200">
                        {fmtDate(siniestro.fecha_denuncia)}
                      </span>
                    </div>
                    <Badge tone={resolucionTone(resolucion)} className="shrink-0">{resolucion}</Badge>
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Lugar */}
                    <div className="flex gap-3 items-start bg-brand-100/[0.02] dark:bg-brand-200/[0.02] p-3 rounded-xl border border-brand-100/8 dark:border-brand-200/8">
                      <HiLocationMarker className="text-brand-primary dark:text-brand-primary-tint text-lg shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-0.5">Ubicación</span>
                        <span className="text-xs font-bold text-brand-100/90 dark:text-brand-200/90 leading-snug">
                          {siniestro.lugar || "Sin especificar"}
                          {siniestro.localidad && (
                            <span className="text-brand-100/40 dark:text-brand-200/40 font-normal"> · {siniestro.localidad}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Heridos — se mantiene en rojo, es información genuinamente seria */}
                    <div className="flex gap-3 items-start bg-brand-100/[0.02] dark:bg-brand-200/[0.02] p-3 rounded-xl border border-brand-100/8 dark:border-brand-200/8">
                      <HiUserGroup className={huboHeridos ? "text-red-500 text-lg shrink-0 mt-0.5" : "text-brand-100/25 dark:text-brand-200/25 text-lg shrink-0 mt-0.5"} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-0.5">Lesionados</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${huboHeridos ? "text-red-600 dark:text-red-400" : "text-brand-primary dark:text-brand-primary-tint"}`}>
                          {huboHeridos ? "Hubo heridos" : "Sin heridos"}
                        </span>
                      </div>
                    </div>

                    {/* Monto */}
                    {monto && (
                      <div className="flex gap-3 items-start bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10 sm:col-span-2">
                        <HiCurrencyDollar className="text-brand-primary dark:text-brand-primary-tint text-lg shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary/60 dark:text-brand-primary-tint/70 mb-0.5">Indemnización Pagada</span>
                          <span className="text-sm font-mono font-bold text-brand-primary dark:text-brand-primary-tint">
                            {monto}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default ClienteSiniestrosCard;