// src/components/solicitudes/modalcreate/ClienteYaExisteModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  HiExclamation,
  HiX,
  HiTruck,
  HiCheckCircle,
  HiXCircle,
  HiQuestionMarkCircle,
  HiArrowRight,
  HiUser,
  HiCurrencyDollar,
  HiRefresh,
  HiEye,
  HiInformationCircle,
  HiBan,
  HiSparkles,
} from "react-icons/hi";
import { useAuth } from "../../../context/AuthContext";

/**
 * Modal que se muestra cuando hay coincidencia en la verificación previa.
 *
 * Casos (resultado.caso):
 *  - "PATENTE_VIGENTE"   → 🔴 Auto ya asegurado y vigente → solo pagar/renovar
 *  - "PATENTE_BAJA"      → 🟡 Patente existe pero baja → permite crear nueva
 *  - "CLIENTE_OTRO_AUTO" → 🟢 Cliente existe + patente nueva → vincular y continuar
 *
 * Props:
 *  - open: boolean
 *  - resultado: { caso, cliente_match, patente_match }
 *  - onClose(): cierra el modal
 *  - onContinuarVinculando(clienteId): cuando se vincula al cliente existente y se sigue al alta
 */
export default function ClienteYaExisteModal({ open, resultado, onClose, onContinuarVinculando }) {
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const navigate = useNavigate();

  if (!resultado) return null;

  const { caso, cliente_match, patente_match } = resultado;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-2xl rounded-3xl bg-brand-card-dark border border-brand-200/10 shadow-2xl overflow-hidden"
          >
            {caso === "PATENTE_VIGENTE" && (
              <CasoPatenteVigente
                patenteMatch={patente_match}
                isAdmin={isAdmin}
                onClose={onClose}
                navigate={navigate}
              />
            )}

            {caso === "PATENTE_BAJA" && (
              <CasoPatenteBaja
                patenteMatch={patente_match}
                clienteMatch={cliente_match}
                onClose={onClose}
                onContinuar={() => onContinuarVinculando?.(patente_match?.cliente?.id || null)}
              />
            )}

            {caso === "CLIENTE_OTRO_AUTO" && (
              <CasoClienteOtroAuto
                clienteMatch={cliente_match}
                onClose={onClose}
                onVincular={() => onContinuarVinculando?.(cliente_match?.id || null)}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =====================================================================
   CASO B1 — PATENTE_VIGENTE (auto ya asegurado y al día/con deuda)
   ===================================================================== */
function CasoPatenteVigente({ patenteMatch, isAdmin, onClose, navigate }) {
  const cli = patenteMatch?.cliente || {};
  const alDia = patenteMatch?.al_dia;

  const irAPagar = () => {
    onClose?.();
    navigate?.(`/pagos?poliza=${patenteMatch?.poliza_id}`);
  };

  const irAVerPoliza = () => {
    onClose?.();
    navigate?.(`/polizas/${patenteMatch?.poliza_id}`);
  };

  const renovarPoliza = () => {
    onClose?.();
    navigate?.(`/renovaciones?poliza=${patenteMatch?.poliza_id}`);
  };

  return (
    <>
      {/* Header rojo */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-red-500/20 via-red-500/5 to-transparent border-b border-red-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/60 hover:text-brand-200 transition-all"
        >
          <HiX className="text-lg" />
        </button>
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 shadow-lg shadow-red-900/30 shrink-0"
          >
            <HiBan className="text-3xl" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h2 className="text-brand-200 font-black text-xl sm:text-2xl leading-tight">
              Este auto ya está asegurado
            </h2>
            <p className="text-red-300/90 text-sm mt-1 font-medium">
              No se puede crear una nueva póliza porque el vehículo ya tiene una póliza vigente.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Datos del auto/póliza */}
        <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiTruck className="text-red-400 text-lg" />
            <span className="text-[10px] uppercase tracking-widest font-black text-red-300">
              Póliza encontrada
            </span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Vigente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Patente" value={patenteMatch?.patente || "—"} accent="secondary" />
            <DataPill label="N° Póliza" value={patenteMatch?.numero_poliza || "—"} accent="primary" />
            <DataPill label="Vehículo" value={`${patenteMatch?.marca || ""} ${patenteMatch?.modelo || ""}`.trim() || "—"} accent="secondary" />
            <DataPill label="Compañía" value={patenteMatch?.compania || "—"} accent="primary" />
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiUser className="text-brand-secondary-tint text-lg" />
            <span className="text-[10px] uppercase tracking-widest font-black text-brand-secondary-tint">
              Cliente titular
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Nombre" value={cli?.nombre_apellido || "—"} accent="secondary" />
            <DataPill label="DNI" value={cli?.dni_cuit_cuil || "—"} accent="primary" />
          </div>
        </div>

        {/* Estado de pago */}
        <div
          className={`rounded-xl border p-3 flex items-center gap-3 ${
            alDia === true
              ? "bg-brand-primary/10 border-brand-primary/30"
              : alDia === false
              ? "bg-brand-secondary/10 border-brand-secondary/30"
              : "bg-brand-200/5 border-brand-200/10"
          }`}
        >
          {alDia === true ? (
            <>
              <HiCheckCircle className="text-brand-primary-tint text-2xl shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black text-brand-primary-tint">Al día con los pagos</p>
                <p className="text-xs text-brand-primary-tint/70">No hay cuotas pendientes.</p>
              </div>
            </>
          ) : alDia === false ? (
            <>
              <HiCurrencyDollar className="text-brand-secondary-tint text-2xl shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black text-brand-secondary-tint">
                  {patenteMatch?.cuotas_pendientes} cuota{patenteMatch?.cuotas_pendientes !== 1 ? "s" : ""} pendiente{patenteMatch?.cuotas_pendientes !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-brand-secondary-tint/70">Podés registrar los pagos desde acá.</p>
              </div>
            </>
          ) : (
            <>
              <HiQuestionMarkCircle className="text-brand-200/40 text-2xl shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black text-brand-200/60">Estado de pago no determinado</p>
              </div>
            </>
          )}
        </div>

        {/* Info admin / no admin */}
        <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3 flex items-start gap-2">
          <HiInformationCircle className="text-brand-primary-tint text-base mt-0.5 shrink-0" />
          <p className="text-xs text-brand-primary-tint/90 leading-relaxed">
            Podés <strong className="text-brand-200">registrar el pago desde acá mismo</strong>.
            {!isAdmin && (
              <>
                <br />
                <span className="text-brand-secondary-tint/80">⚠️ La renovación solo puede hacerla un administrador.</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="px-6 py-4 bg-brand-200/[0.02] border-t border-brand-200/10 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/70 font-bold uppercase text-[11px] tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={irAVerPoliza}
          className="px-5 py-2.5 rounded-xl bg-brand-200/10 hover:bg-brand-200/20 text-brand-200 font-bold uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <HiEye /> Ver detalle
        </button>
        {isAdmin && (
          <button
            onClick={renovarPoliza}
            className="px-5 py-2.5 rounded-xl bg-brand-secondary hover:bg-brand-secondary-light text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-brand-secondary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <HiRefresh /> Renovar
          </button>
        )}
        <button
          onClick={irAPagar}
          className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-deep text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-brand-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <HiCurrencyDollar /> Pagar cuota
        </button>
      </div>
    </>
  );
}

/* =====================================================================
   CASO B2 — PATENTE_BAJA (patente existió pero fue dada de baja)
   ===================================================================== */
function CasoPatenteBaja({ patenteMatch, clienteMatch, onClose, onContinuar }) {
  const cli = patenteMatch?.cliente || {};
  // Si el cliente del DNI coincide con el de la patente, lo vinculamos
  const clienteIdVincular = clienteMatch?.id || cli?.id || null;

  return (
    <>
      {/* Header ámbar */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-brand-secondary/20 via-brand-secondary-light/10 to-transparent border-b border-brand-secondary/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/60 hover:text-brand-200 transition-all"
        >
          <HiX className="text-lg" />
        </button>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-brand-secondary/20 border border-brand-secondary/40 text-brand-secondary-tint shadow-lg shrink-0">
            <HiExclamation className="text-3xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-brand-200 font-black text-xl sm:text-2xl leading-tight">
              Patente con baja previa
            </h2>
            <p className="text-brand-secondary-tint/80 text-sm mt-1 font-medium">
              Este vehículo estuvo asegurado pero la póliza fue dada de baja. Podés crear una póliza nueva.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.03] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Patente" value={patenteMatch?.patente || "—"} accent="secondary" />
            <DataPill label="Vehículo" value={`${patenteMatch?.marca || ""} ${patenteMatch?.modelo || ""}`.trim() || "—"} accent="secondary" />
            <DataPill label="Compañía anterior" value={patenteMatch?.compania || "—"} accent="primary" />
            <DataPill label="Cliente histórico" value={cli?.nombre_apellido || "—"} accent="primary" />
          </div>
        </div>

        <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3 flex items-start gap-2">
          <HiSparkles className="text-brand-primary-tint text-base mt-0.5 shrink-0" />
          <p className="text-xs text-brand-primary-tint/90 leading-relaxed">
            {clienteIdVincular
              ? "Vamos a vincular esta nueva póliza al cliente existente para no duplicarlo en la base."
              : "Vas a crear una póliza nueva para este vehículo."}
          </p>
        </div>
      </div>

      <div className="px-6 py-4 bg-brand-200/[0.02] border-t border-brand-200/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/70 font-bold uppercase text-[11px] tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onContinuar}
          className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-deep text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-brand-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Continuar al alta <HiArrowRight />
        </button>
      </div>
    </>
  );
}

/* =====================================================================
   CASO C — CLIENTE_OTRO_AUTO (cliente existe, patente es nueva)
   ===================================================================== */
function CasoClienteOtroAuto({ clienteMatch, onClose, onVincular }) {
  const polizas = clienteMatch?.polizas || [];
  const totalPolizas = polizas.length;
  const polizasActivas = polizas.filter((p) => p?.esta_vigente);

  return (
    <>
      {/* Header verde/azul */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-brand-primary/20 via-brand-primary/5 to-transparent border-b border-brand-primary/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/60 hover:text-brand-200 transition-all"
        >
          <HiX className="text-lg" />
        </button>
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 rounded-2xl bg-brand-primary/20 border border-brand-primary/40 text-brand-primary-tint shadow-lg shadow-brand-primary/30 shrink-0"
          >
            <HiUser className="text-3xl" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h2 className="text-brand-200 font-black text-xl sm:text-2xl leading-tight">
              Cliente ya registrado
            </h2>
            <p className="text-brand-primary-tint/80 text-sm mt-1 font-medium">
              Vamos a vincular esta nueva póliza a su perfil para no duplicar el cliente.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Datos del cliente */}
        <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiUser className="text-brand-secondary-tint text-lg" />
            <span className="text-[10px] uppercase tracking-widest font-black text-brand-secondary-tint">
              Datos del cliente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Nombre" value={clienteMatch?.nombre_apellido || "—"} accent="secondary" />
            <DataPill label="DNI" value={clienteMatch?.dni_cuit_cuil || "—"} accent="primary" />
            <DataPill label="Teléfono" value={clienteMatch?.telefono || "—"} accent="primary" />
          </div>
        </div>

        {/* Pólizas */}
        <div className="rounded-2xl border border-brand-200/10 bg-brand-200/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HiTruck className="text-brand-secondary-tint text-lg" />
              <span className="text-[10px] uppercase tracking-widest font-black text-brand-secondary-tint">
                Pólizas existentes ({totalPolizas})
              </span>
            </div>
            {polizasActivas.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary-tint border border-brand-primary/30">
                {polizasActivas.length} vigente{polizasActivas.length !== 1 && "s"}
              </span>
            )}
          </div>

          {totalPolizas === 0 ? (
            <p className="text-xs text-brand-200/50 italic text-center py-4">Sin pólizas registradas.</p>
          ) : (
            <div className="space-y-2">
              {polizas.slice(0, 5).map((p, i) => (
                <PolizaRow key={p.poliza_id || i} p={p} />
              ))}
              {polizas.length > 5 && (
                <p className="text-[10px] text-brand-200/40 italic text-center pt-2">
                  + {polizas.length - 5} más...
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3 flex items-start gap-2">
          <HiSparkles className="text-brand-primary-tint text-base mt-0.5 shrink-0" />
          <p className="text-xs text-brand-primary-tint/90 leading-relaxed">
            Como vas a asegurar <strong className="text-brand-200">otro vehículo</strong>, vinculamos la nueva
            póliza al cliente existente. <strong className="text-brand-200">La promo aplica</strong> porque es un
            vehículo nuevo en el sistema.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 bg-brand-200/[0.02] border-t border-brand-200/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/70 font-bold uppercase text-[11px] tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onVincular}
          disabled={!clienteMatch?.id}
          className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-deep text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-brand-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Vincular y continuar <HiArrowRight />
        </button>
      </div>
    </>
  );
}

/* ===================== Subcomponentes ===================== */
function DataPill({ label, value, icon: Icon, accent = "primary", fullWidth = false }) {
  const colors = {
    primary: "text-brand-primary-tint",
    secondary: "text-brand-secondary-tint",
  };
  return (
    <div className={`p-3 rounded-xl bg-brand-200/[0.03] border border-brand-200/5 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span className={`text-[9px] uppercase tracking-widest font-black ${colors[accent]} flex items-center gap-1`}>
        {Icon && <Icon className="text-xs" />} {label}
      </span>
      <p className="text-sm font-bold text-brand-200 mt-1 break-words">{value}</p>
    </div>
  );
}

function PolizaRow({ p }) {
  const dadaDeBaja = !p?.esta_vigente;
  const alDia = p?.al_dia;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-brand-200/[0.03] border border-brand-200/5 hover:border-brand-200/10 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-brand-200 truncate">
            {p?.patente || "Sin patente"}
          </span>
          <span className="text-[10px] text-brand-200/50 font-medium">• {p?.compania || "Compañía s/d"}</span>
        </div>
        <p className="text-[11px] text-brand-200/50 truncate mt-0.5">
          {`${p?.marca || ""} ${p?.modelo || ""}`.trim() || "Sin datos"}
          {p?.oficina_nombre && (
            <span className="ml-1.5 text-brand-primary-tint/80 font-bold">→ {p.oficina_nombre}</span>
          )}
        </p>
      </div>
      <div className="shrink-0">
        {dadaDeBaja ? (
          <span className="px-2 py-1 rounded-lg bg-brand-200/5 border border-brand-200/10 text-[9px] uppercase tracking-widest font-black text-brand-200/50">
            Dada de baja
          </span>
        ) : alDia === true ? (
          <span className="px-2 py-1 rounded-lg bg-brand-primary/15 border border-brand-primary/30 text-[9px] uppercase tracking-widest font-black text-brand-primary-tint flex items-center gap-1">
            <HiCheckCircle /> Al día
          </span>
        ) : alDia === false ? (
          <span className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-[9px] uppercase tracking-widest font-black text-red-300 flex items-center gap-1">
            <HiXCircle /> Con deuda
          </span>
        ) : (
          <span className="px-2 py-1 rounded-lg bg-brand-secondary/10 border border-brand-secondary/20 text-[9px] uppercase tracking-widest font-black text-brand-secondary-tint flex items-center gap-1">
            <HiQuestionMarkCircle /> Verificar
          </span>
        )}
      </div>
    </div>
  );
}