// src/components/polizas/PolizaDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaCar, FaEdit, FaTrash } from "react-icons/fa";
import {
  HiArrowLeft, HiChevronRight, HiRefresh, HiOfficeBuilding,
  HiCash, HiDocumentText, HiShieldCheck,
} from "react-icons/hi";
import dayjs from "dayjs";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import { fetchPolizaPorId, deletePoliza } from "../../store/slices/polizasSlice";
import { renovarPoliza } from "../../store/slices/renovacionesSlice";
import { PolizasAPI } from "../../api/polizas";
import { getProximaCuota } from "../../utils/cuotas";

import CuotasPanel from "./CuotasPanel";
import VehiculoDocsPanel from "./VehiculoDocsPanel";
import CuponesRoboPanel from "./CuponesRoboPanel";
import SetFotoPerfilButton from "./SetFotoPerfilButton";

import PolizaEditModal from "./PolizaEditModal";
import { ConfirmDialog } from "../ui";
import { RenovacionModal } from "../renovaciones/RenovacionModales";

/* ===================== Estilos base del diseño oscuro ===================== */
const CARD = "rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-card dark:bg-brand-card-dark";
const SOFT_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-3 py-2 text-sm font-semibold text-brand-100/80 dark:text-brand-200/80 transition hover:bg-brand-100/10 dark:hover:bg-brand-200/10";

const ESTADOS = {
  activa:          { label: "Activa",          text: "text-brand-primary dark:text-brand-primary-tint", bg: "bg-brand-primary/10", bd: "border-brand-primary/25", dot: "bg-brand-primary" },
  vencida:         { label: "Vencida",         text: "text-red-600 dark:text-red-400",    bg: "bg-red-500/10",    bd: "border-red-500/25",    dot: "bg-red-500 animate-pulse" },
  cancelada:       { label: "Cancelada",       text: "text-brand-100/50 dark:text-brand-200/50",   bg: "bg-brand-100/5 dark:bg-brand-200/5",   bd: "border-brand-100/15 dark:border-brand-200/15",   dot: "bg-brand-100/40 dark:bg-brand-200/40" },
  finalizada:      { label: "Finalizada",      text: "text-brand-100/60 dark:text-brand-200/60",     bg: "bg-brand-100/5 dark:bg-brand-200/5",     bd: "border-brand-100/15 dark:border-brand-200/15",     dot: "bg-brand-100/40 dark:bg-brand-200/40" },
  en_verificacion: { label: "En verificación", text: "text-brand-secondary dark:text-brand-secondary-tint",   bg: "bg-brand-secondary/10",   bd: "border-brand-secondary/25",   dot: "bg-brand-secondary animate-pulse" },
};

function EstadoBadge({ estado }) {
  const key = String(estado || "").toLowerCase();
  const s = ESTADOS[key] || { label: estado || "—", text: "text-brand-100/50 dark:text-brand-200/50", bg: "bg-brand-100/5 dark:bg-brand-200/5", bd: "border-brand-100/15 dark:border-brand-200/15", dot: "bg-brand-100/40 dark:bg-brand-200/40" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${s.bd} ${s.bg} ${s.text} px-2.5 py-0.5 text-[11px] font-semibold`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function SectionTitle({ Icon, title, right }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-[18px] w-[18px] text-brand-primary dark:text-brand-primary-tint" />
      <span className="text-[15px] font-semibold text-brand-100 dark:text-brand-200">{title}</span>
      {right ? <span className="ml-auto text-xs text-brand-100/50 dark:text-brand-200/50">{right}</span> : null}
    </div>
  );
}

function FilaDato({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-100/8 dark:border-brand-200/8 py-2.5 last:border-0">
      <span className="text-xs text-brand-100/50 dark:text-brand-200/50">{label}</span>
      <span className={`text-right text-[13px] text-brand-100 dark:text-brand-200 ${mono ? "font-mono uppercase tracking-wide text-brand-100/80 dark:text-brand-200/80" : ""}`}>{value}</span>
    </div>
  );
}

export default function PolizaDetails() {
  const { id } = useParams();
  const polizaId = Number(id);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const poliza = useSelector(
    (s) => s.polizas?.byId?.[polizaId] || s.polizas?.poliza || null
  );
  const loadStatus = useSelector((s) => s.polizas?.detailStatus || s.polizas?.status || "idle");
  const loadError = useSelector((s) => s.polizas?.detailError || s.polizas?.error || null);

  const [refreshTick, setRefreshTick] = useState(0);
  const [openEdit, setOpenEdit] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openRenovar, setOpenRenovar] = useState(false);
  const [submittingRenovacion, setSubmittingRenovacion] = useState(false);

  const scrollToSection = (key) => {
    if (key === "documentos" || key === "vehiculo_docs") key = "vehiculo";
    const el = document.getElementById(key);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (polizaId && Number.isFinite(polizaId)) {
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
    }
  }, [polizaId, dispatch]);

  useEffect(() => {
    const refreshAll = async (targetId, focusTab) => {
      try {
        await PolizasAPI.refreshPack(targetId);
      } catch (e) {
        console.warn("[DBG] refreshPack ERROR", e);
      } finally {
        dispatch(fetchPolizaPorId({ id: targetId, force: true }));
        setRefreshTick((x) => x + 1);
        if (focusTab) scrollToSection(focusTab);
      }
    };

    const onAsociada = (ev) => {
      const d = ev?.detail || {};
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };
    const onMediaImportada = (ev) => {
      const d = ev?.detail || {};
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };
    const onRefrescar = () => {
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
      setRefreshTick((x) => x + 1);
    };

    window.addEventListener("solicitud:asociada", onAsociada);
    window.addEventListener("poliza:media_importada", onMediaImportada);
    window.addEventListener("poliza:refrescar", onRefrescar);
    return () => {
      window.removeEventListener("solicitud:asociada", onAsociada);
      window.removeEventListener("poliza:media_importada", onMediaImportada);
      window.removeEventListener("poliza:refrescar", onRefrescar);
    };
  }, [polizaId, dispatch]);

  const avatar = useMemo(() => poliza?.foto_perfil_url || "", [poliza?.foto_perfil_url]);
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const cuotas = useMemo(() => (Array.isArray(poliza?.cuotas) ? poliza.cuotas : []), [poliza?.cuotas]);
  const proxima = useMemo(() => getProximaCuota(cuotas), [cuotas]);
  const cuponesRobo = useMemo(() => (Array.isArray(poliza?.cupones_robo) ? poliza.cupones_robo : []), [poliza?.cupones_robo]);

  const cli = poliza?.cliente || null;
  const clienteId = poliza?.cliente_id ?? cli?.id ?? null;
  const clienteNombre = [cli?.apellido, cli?.nombre].filter(Boolean).join(", ");
  const clienteDni = cli?.dni_cuit_cuil || cli?.dni || "";
  const iniciales = (clienteNombre || "?").split(/[\s,]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  const compania = poliza?.compania_nombre || poliza?.compania || "—";
  const cobertura = poliza?.cobertura || "—";
  const oficina = poliza?.oficina_nombre || user?.perfil?.oficina_nombre || "Local";
  const numero = poliza?.numero_poliza ? `#${poliza.numero_poliza}` : poliza?.id ? `#${poliza.id}` : "#";
  const tipoCarro = [poliza?.tipo, poliza?.carroceria].filter(Boolean).join(" · ");

  const onBack = () => navigate(-1);
  const onPerfilActualizado = () => dispatch(fetchPolizaPorId({ id: polizaId, force: true }));

  const handleConfirmDelete = async () => {
    try {
      await dispatch(deletePoliza(polizaId)).unwrap();
      toast.success("Póliza eliminada con éxito");
      navigate("/polizas", { replace: true });
    } catch (e) {
      toast.error(e?.message || "Error al eliminar");
    } finally {
      setOpenConfirm(false);
    }
  };

  const handleRenovar = async (payload) => {
    if (!poliza?.id) return;
    setSubmittingRenovacion(true);
    const finalPayload = {
      ...(payload || {}),
      transferir_grua: payload?.transferir_grua ?? payload?.transferirGrua ?? payload?.grua ?? 1,
    };
    try {
      const res = await dispatch(renovarPoliza({ id: poliza.id, payload: finalPayload })).unwrap();
      const nuevaId = res?.data?.id;
      toast.success("Póliza renovada correctamente");
      setOpenRenovar(false);
      if (nuevaId) navigate(`/polizas/${nuevaId}`);
      else dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
    } catch (e) {
      toast.error(e?.message || "No se pudo renovar la póliza");
    } finally {
      setSubmittingRenovacion(false);
    }
  };

  if (loadStatus === "loading" || (!poliza && loadStatus !== "failed")) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-1/2 rounded bg-brand-100/5 dark:bg-brand-200/5" />
          <div className="h-20 w-full rounded-2xl bg-brand-100/5 dark:bg-brand-200/5" />
          <div className="h-40 w-full rounded-2xl bg-brand-100/5 dark:bg-brand-200/5" />
        </div>
      </div>
    );
  }

  if (loadStatus === "failed") {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-3 py-8 text-center sm:px-6">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-brand-100 dark:text-brand-200">Acceso denegado / Error</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-100/50 dark:text-brand-200/50">
          {String(loadError || "No tenés permisos para ver esta póliza o no pertenece a tu sucursal.")}
        </p>
        <button onClick={() => navigate("/polizas")} className={`mt-6 ${SOFT_BTN}`}>
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 text-brand-100 dark:text-brand-200">

      <div className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className={SOFT_BTN}>
          <HiArrowLeft className="h-4 w-4" /> Volver
        </button>
        {poliza?.id ? (
          <SetFotoPerfilButton polizaId={poliza.id} onPerfilActualizado={onPerfilActualizado} />
        ) : null}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5">
          {avatar ? (
            <img src={avatar} alt="vehículo" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-brand-primary dark:text-brand-primary-tint">
              <FaCar className="text-2xl" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-brand-100/50 dark:text-brand-200/50">Póliza</span>
            <span className="text-base font-semibold text-brand-primary dark:text-brand-primary-tint">{numero}</span>
            <EstadoBadge estado={poliza?.estado} />
          </div>
          <div className="mt-1 truncate text-[17px] font-semibold">
            {poliza?.marca} {poliza?.modelo}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-brand-100/50 dark:text-brand-200/50">
            {poliza?.patente ? <span className="font-mono uppercase tracking-wide text-brand-100/80 dark:text-brand-200/80">{poliza.patente}</span> : null}
            {poliza?.patente ? " · " : ""}{compania} · Cobertura {cobertura}
          </div>
        </div>
      </div>

      {clienteId ? (
        <Link
          to={`/clientes/${clienteId}`}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3.5 transition hover:border-brand-primary/40 hover:bg-brand-primary/[0.16]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-primary/20 text-sm font-bold text-brand-primary-deep dark:text-brand-primary-tint">{iniciales}</span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-brand-100 dark:text-brand-200">{clienteNombre || "Sin titular"}</span>
              {clienteDni ? <span className="block text-xs text-brand-primary/70 dark:text-brand-primary-tint/70">DNI {clienteDni}</span> : null}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white transition group-hover:bg-brand-primary-deep">Ver cliente <HiChevronRight className="h-4 w-4" /></span>
        </Link>
      ) : null}

      <div className="mb-5 flex gap-2">
        {isWebAdmin ? (
          <button onClick={() => setOpenRenovar(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-deep">
            <HiRefresh className="h-4 w-4" /> Renovar
          </button>
        ) : null}
        <button onClick={() => setOpenEdit(true)} className={`flex-1 ${SOFT_BTN} py-2.5`}>
          <FaEdit className="h-3.5 w-3.5" /> Editar
        </button>
        {isWebAdmin ? (
          <button onClick={() => setOpenConfirm(true)} aria-label="Eliminar" className="inline-flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-red-600 dark:text-red-400 transition hover:bg-red-500/15">
            <FaTrash className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <div className={`${CARD} p-3.5`}>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Compañía</div>
          <div className="text-[15px] font-semibold text-brand-primary dark:text-brand-primary-tint">{compania}</div>
          <div className="mt-0.5 text-xs text-brand-100/50 dark:text-brand-200/50">Cobertura {cobertura}</div>
          <div className="mt-3 border-t border-brand-100/8 dark:border-brand-200/8 pt-2.5">
            <div className="text-[10px] uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Oficina</div>
            <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-brand-primary dark:text-brand-primary-tint">
              <HiOfficeBuilding className="h-4 w-4 shrink-0" /> <span className="truncate">{oficina}</span>
            </div>
          </div>
        </div>
        <div className={`${CARD} flex flex-col p-3.5`}>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Próximo pago</div>
          <div className="flex flex-1 flex-col justify-center">
            {proxima?.fecha_vencimiento ? (
              <>
                <div className="text-2xl font-bold leading-tight text-brand-secondary dark:text-brand-secondary-tint sm:text-3xl">{dayjs(proxima.fecha_vencimiento).format("DD/MM/YYYY")}</div>
                <div className="mt-1.5 text-sm text-brand-100/50 dark:text-brand-200/50">Cuota {proxima.cuota_nro} de {cuotas.length}</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold leading-tight text-brand-primary dark:text-brand-primary-tint sm:text-3xl">Al día</div>
                <div className="mt-1.5 text-sm text-brand-100/50 dark:text-brand-200/50">Sin cuotas pendientes</div>
              </>
            )}
          </div>
        </div>
      </div>

      <section id="vehiculo-datos" className="mb-6 scroll-mt-4">
        <SectionTitle Icon={FaCar} title="Datos del vehículo" />
        <div className={`${CARD} px-3.5`}>
          <FilaDato label="Marca / Modelo" value={[poliza?.marca, poliza?.modelo].filter(Boolean).join(" ")} />
          <FilaDato label="Año" value={poliza?.anio} />
          <FilaDato label="Tipo / Carrocería" value={tipoCarro} />
          <FilaDato label="Combustible" value={poliza?.combustible} />
          <FilaDato label="N° Chasis" value={poliza?.numero_chasis} mono />
          <FilaDato label="N° Motor" value={poliza?.numero_motor} mono />
        </div>
      </section>

      <section id="cuotas" className="mb-6 scroll-mt-4">
        <SectionTitle Icon={HiCash} title="Cuotas" />
        <CuotasPanel poliza={poliza} polizaId={polizaId} />
      </section>

      <section id="vehiculo" className="mb-6 scroll-mt-4">
        <SectionTitle Icon={HiDocumentText} title="Vehículo / papeles" />
        <VehiculoDocsPanel
          key={`veh-${refreshTick}`}
          poliza={poliza}
          polizaId={polizaId}
          focus="fotos"
          onPerfilChange={onPerfilActualizado}
          onRefrescar={() => {
            dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
            setRefreshTick((x) => x + 1);
          }}
        />
      </section>

      {cuponesRobo.length > 0 ? (
        <section id="cuponeras" className="mb-6 scroll-mt-4">
          <SectionTitle Icon={HiShieldCheck} title="Cuponeras" />
          <CuponesRoboPanel polizaId={polizaId} cupones={cuponesRobo} />
        </section>
      ) : null}

      <PolizaEditModal
        isOpen={openEdit}
        poliza={poliza}
        onClose={() => setOpenEdit(false)}
        onSuccess={() => {
          setOpenEdit(false);
          dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
        }}
      />
      <ConfirmDialog
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmDelete}
        message={`¿Confirmás la eliminación total de la póliza ${poliza?.numero_poliza || "S/N"}? Esta acción no se puede deshacer.`}
      />
      <RenovacionModal
        open={openRenovar}
        item={poliza}
        onClose={() => { if (!submittingRenovacion) setOpenRenovar(false); }}
        onSubmit={handleRenovar}
        submitting={submittingRenovacion}
      />
    </div>
  );
}