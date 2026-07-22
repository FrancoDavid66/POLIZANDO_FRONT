// src/components/polizas/CuotasPanel.jsx
//
// Refactor: antes tenía su propia lógica de estado de cuota (esCuponera,
// fechaObjetivo, estadoReal) duplicando lo que ya existe en utils/cuotas.js
// y su propio renderizado de fila en vez de usar CuotaInfoCard (que se
// documenta a sí mismo como "la fuente visual única para mostrar una cuota
// en toda la app"). Ahora usa ambos de verdad.
//
// El caso CUPONERA (AMCA/Antártida/Equidad → cada cuota vence en su propia
// fecha, no en la de la anterior) se preservó — ahora vive centralizado en
// utils/cuotas.js como esCuponera() + el parámetro usarPropio, en vez de
// vivir solo acá.

import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiShieldCheck, HiShieldExclamation } from "react-icons/hi";

import { pagarCuota } from "../../store/slices/polizasSlice";
import { esCuponera, resumenCuotas, fmtFecha } from "../../utils/cuotas";
import CuotaInfoCard from "./CuotaInfoCard";

const CARD = "rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-card dark:bg-brand-card-dark";

export default function CuotasPanel({ poliza }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});

  // ¿Esta póliza usa cuponera? (AMCA/Antártida/La Equidad → fecha propia del cupón)
  const usarPropio = useMemo(
    () => esCuponera(poliza),
    [poliza?.compania, poliza?.compania_nombre]
  );

  // Ordenamos por número de cuota para poder mirar la cuota anterior.
  const cuotasOrdenadas = useMemo(
    () => [...rows].sort((a, b) => Number(a?.cuota_nro || 0) - Number(b?.cuota_nro || 0)),
    [rows]
  );

  // Resumen: ahora delegado a utils/cuotas.js, con el flag de cuponera.
  const resumen = useMemo(
    () => resumenCuotas(cuotasOrdenadas, usarPropio),
    [cuotasOrdenadas, usarPropio]
  );

  // Cobertura real: hasta cuándo quedó cubierto el cliente según la última cuota PAGADA.
  // (Esto no depende de cuponera — es sobre secuencia de pagos, no de qué fecha
  // se usa para juzgar mora; ver nota en utils/cuotas.js sobre calcCobertura.)
  const coberturaResumen = useMemo(() => {
    const pagadas = cuotasOrdenadas.filter((c) => c.pagado);
    if (!pagadas.length) return null;
    const ultima = pagadas.reduce(
      (max, c) => (Number(c.cuota_nro) > Number(max.cuota_nro) ? c : max),
      pagadas[0]
    );
    const hasta = ultima?.fecha_vencimiento ? dayjs(ultima.fecha_vencimiento).startOf("day") : null;
    if (!hasta || !hasta.isValid()) return null;
    const vigente = hasta.diff(dayjs().startOf("day"), "day") >= 0;
    return { hasta, vigente };
  }, [cuotasOrdenadas]);

  const progreso = resumen.total ? Math.round((resumen.pagadas / resumen.total) * 100) : 0;

  const handleMarcarPagada = async (cuota) => {
    if (!cuota?.id || cuota.pagado) return;
    setBusyIds((m) => ({ ...m, [cuota.id]: true }));
    try {
      const payload = { fecha_pago: dayjs().format("YYYY-MM-DD") };
      const updated = await dispatch(pagarCuota({ cuotaId: cuota.id, data: payload })).unwrap();
      setRows((prev) =>
        prev.map((c) =>
          c.id === cuota.id
            ? { ...c, ...updated, pagado: true, fecha_pago: updated?.fecha_pago || payload.fecha_pago }
            : c
        )
      );
      toast.success(`Cuota #${cuota.cuota_nro} marcada como pagada`);
    } catch (e) {
      toast.error(e?.message || "No se pudo marcar la cuota como pagada");
    } finally {
      setBusyIds((m) => {
        const copy = { ...m };
        delete copy[cuota.id];
        return copy;
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Cobertura real (hasta cuándo está cubierto) */}
      {coberturaResumen ? (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 ${
            coberturaResumen.vigente
              ? "border-brand-primary/30 bg-brand-primary/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          {coberturaResumen.vigente ? (
            <HiShieldCheck className="h-6 w-6 shrink-0 text-brand-primary dark:text-brand-primary-tint" />
          ) : (
            <HiShieldExclamation className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <div>
            <div
              className={`text-[10px] uppercase tracking-wide font-bold ${
                coberturaResumen.vigente
                  ? "text-brand-primary/70 dark:text-brand-primary-tint/70"
                  : "text-red-600/70 dark:text-red-400/70"
              }`}
            >
              {coberturaResumen.vigente ? "Cobertura vigente hasta" : "Cobertura vencida desde"}
            </div>
            <div
              className={`text-lg font-bold ${
                coberturaResumen.vigente
                  ? "text-brand-primary dark:text-brand-primary-tint"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {fmtFecha(coberturaResumen.hasta)}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${CARD} p-4 text-sm text-brand-100/50 dark:text-brand-200/50`}>
          Sin pagos registrados todavía · no hay cobertura activa.
        </div>
      )}

      {/* Progreso */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-brand-100/50 dark:text-brand-200/50">
          <span>{resumen.pagadas} de {resumen.total} pagadas</span>
          <span>{progreso}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100/8 dark:bg-brand-200/8">
          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className={`${CARD} p-3 text-center`}>
          <div className="text-lg font-semibold text-brand-primary dark:text-brand-primary-tint">{resumen.pagadas}</div>
          <div className="text-[10px] uppercase tracking-wide text-brand-100/40 dark:text-brand-200/40">Pagadas</div>
        </div>
        <div className={`${CARD} p-3 text-center`}>
          <div className="text-lg font-semibold text-brand-secondary dark:text-brand-secondary-tint">{resumen.pendientes}</div>
          <div className="text-[10px] uppercase tracking-wide text-brand-100/40 dark:text-brand-200/40">Pendientes</div>
        </div>
        <div className={`${CARD} p-3 text-center`}>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">{resumen.vencidas}</div>
          <div className="text-[10px] uppercase tracking-wide text-brand-100/40 dark:text-brand-200/40">Vencidas</div>
        </div>
      </div>

      {/* Lista de cuotas — cada fila es un CuotaInfoCard, la fuente visual única */}
      <div className={`${CARD} overflow-hidden divide-y divide-brand-100/8 dark:divide-brand-200/8`}>
        {cuotasOrdenadas.length === 0 ? (
          <div className="p-8 text-center text-sm text-brand-100/40 dark:text-brand-200/40">
            Esta póliza no tiene cuotas registradas.
          </div>
        ) : (
          cuotasOrdenadas.map((c, i) => (
            <CuotaInfoCard
              key={c.id}
              cuota={c}
              todasLasCuotas={cuotasOrdenadas}
              idx={i}
              polizaFechaEmision={poliza?.fecha_emision}
              onMarcarPagada={handleMarcarPagada}
              busy={!!busyIds[c.id]}
              variant="full"
              usarPropio={usarPropio}
            />
          ))
        )}
      </div>
    </div>
  );
}