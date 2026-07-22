// src/components/clientes/ClientePolizasCard.jsx
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  HiCollection,
  HiPlus,
  HiArrowRight,
  HiShieldCheck,
  HiOutlineDocumentSearch,
} from "react-icons/hi";
import { Card, Badge } from "../ui";

const ClientePolizasCard = ({ cliente }) => {
  const navigate = useNavigate();

  // 🚀 Ordenamos: la póliza MÁS NUEVA primero. Criterio: fecha de emisión más reciente;
  // si dos comparten fecha, gana la de mayor ID (la que se creó después).
  const polizas = [...(cliente?.polizas || [])].sort((a, b) => {
    const fa = a?.fecha_emision ? new Date(a.fecha_emision).getTime() : 0;
    const fb = b?.fecha_emision ? new Date(b.fecha_emision).getTime() : 0;
    if (fb !== fa) return fb - fa;
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });

  // Las pólizas se cargan SOLO desde Solicitudes: ahí el sistema ya detecta si
  // el cliente existe y ofrece agregarle una nueva póliza. Este botón lleva ahí.
  const handleCrear = () => navigate("/solicitudes");

  const fmt = (v) => (v === 0 || v ? String(v) : "—");
  const upper = (v) => (v ? String(v).toUpperCase() : "—");

  const estadoTone = (estado) => {
    const v = estado && typeof estado === "string" ? estado.toLowerCase() : estado;
    if (v === "activa") return "primary";
    if (v === "vencida") return "secondary";
    return "neutral";
  };

  return (
    <Card padding="none" className="mt-2">
      <div className="flex flex-col h-full">
        <div className="px-5 py-5 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-brand-primary-tint shrink-0">
              <HiCollection className="text-2xl" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-base sm:text-lg font-bold text-brand-100 dark:text-brand-200 uppercase tracking-tight truncate leading-none mb-1">
                Pólizas del Cliente
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-brand-100/40 dark:text-brand-200/40 font-bold uppercase tracking-wider truncate">
                  Seguros asociados a este perfil
                </span>
                {polizas.length > 0 && <Badge tone="neutral">{polizas.length}</Badge>}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCrear}
            className="shrink-0 h-11 px-5 rounded-xl cursor-pointer bg-brand-primary text-white font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary-deep transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/30 w-full sm:w-auto"
          >
            <HiPlus className="text-sm" /> Asociar Póliza
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1">
          {polizas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-brand-100/15 dark:border-brand-200/15 rounded-2xl bg-brand-100/[0.01] dark:bg-brand-200/[0.01]">
              <HiOutlineDocumentSearch className="text-5xl text-brand-100/15 dark:text-brand-200/15 mb-3" />
              <p className="text-xs font-black text-brand-100/60 dark:text-brand-200/60 uppercase tracking-widest">Sin pólizas vigentes</p>
              <p className="text-[10px] text-brand-100/35 dark:text-brand-200/35 uppercase font-bold tracking-widest mt-1 max-w-xs">
                Este cliente no tiene ningún seguro registrado en el sistema.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {polizas.map((p, idx) => {
                const titulo = `${fmt(p.compania)} · ${fmt(p.numero_poliza || "S/N")}`;
                const esMasReciente = idx === 0 && polizas.length > 1;

                return (
                  <motion.li
                    key={p.id}
                    className="rounded-2xl border border-brand-100/8 dark:border-brand-200/8 bg-brand-100/[0.03] dark:bg-brand-200/[0.03] p-4 flex flex-col gap-4 hover:bg-brand-primary/5 dark:hover:bg-brand-200/5 transition-colors"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Header de la Póliza */}
                    <div className="flex items-start justify-between gap-3 border-b border-brand-100/8 dark:border-brand-200/8 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <HiShieldCheck className="text-brand-primary dark:text-brand-primary-tint text-sm" />
                          <p className="text-sm font-bold text-brand-100 dark:text-brand-200 truncate leading-none">
                            {titulo}
                          </p>
                        </div>
                        {p.producto && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 truncate ml-5">
                            {fmt(p.producto)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {esMasReciente && <Badge tone="secondary">Más reciente</Badge>}
                        <Badge tone={estadoTone(p.estado)}>{fmt(p.estado)}</Badge>
                      </div>
                    </div>

                    {/* Datos del vehículo */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Vehículo</span>
                        <span className="font-bold text-brand-100/80 dark:text-brand-200/80 truncate">{fmt(p.marca)}</span>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Modelo</span>
                        <span className="font-bold text-brand-100/80 dark:text-brand-200/80 truncate">{fmt(p.modelo)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Año</span>
                        <span className="font-bold text-brand-100/80 dark:text-brand-200/80">{fmt(p.anio)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Patente</span>
                        <span className="font-mono font-bold text-brand-primary dark:text-brand-primary-tint">{upper(p.patente)}</span>
                      </div>

                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-4 pt-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-brand-100/40 dark:text-brand-200/40">Cobertura</span>
                        <span className="font-medium text-brand-100/70 dark:text-brand-200/70 truncate">{fmt(p.cobertura)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-brand-100/8 dark:border-brand-200/8 mt-auto">
                      <Link
                        to={`/polizas/${p.id}`}
                        className="w-full h-10 rounded-xl cursor-pointer bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/80 dark:text-brand-200/80 text-[10px] font-black uppercase tracking-widest hover:bg-brand-100/10 dark:hover:bg-brand-200/10 hover:text-brand-100 dark:hover:text-brand-200 transition-all border border-brand-100/10 dark:border-brand-200/10 flex items-center justify-center gap-2"
                      >
                        Ver Detalle de Póliza <HiArrowRight />
                      </Link>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ClientePolizasCard;