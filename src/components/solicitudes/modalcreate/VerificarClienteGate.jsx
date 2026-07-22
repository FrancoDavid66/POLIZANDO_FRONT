// src/components/solicitudes/modalcreate/VerificarClienteGate.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiSearch,
  HiIdentification,
  HiTruck,
  HiCheckCircle,
  HiShieldCheck,
  HiX,
  HiArrowRight,
  HiSparkles,
} from "react-icons/hi";
import api from "../../../services/api";
import ClienteYaExisteModal from "./ClienteYaExisteModal";

/* ===================== Helpers ===================== */
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
const normalizePatente = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

// 🆕 Config de la auto-búsqueda por DNI (sin apretar el botón).
const DNI_MIN_LEN = 7; // DNI argentino: mínimo 7 dígitos (CUIT/CUIL = 11)
const AUTO_SEARCH_DEBOUNCE_MS = 600; // espera esta pausa antes de buscar sola

/* ===================== Pequeño input local ===================== */
function Field({ label, icon: Icon, value, onChange, placeholder, onEnter, disabled, autoFocus }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="block text-brand-200/80 font-bold uppercase text-[10px] tracking-widest ml-1 flex items-center gap-1.5">
        {Icon && <Icon className="text-brand-secondary-tint" />}
        {label}
      </span>
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.();
          }
        }}
        className="w-full rounded-xl bg-brand-200/[0.05] border border-brand-200/10 px-4 py-3 outline-none focus:ring-2 ring-brand-secondary/50 focus:border-brand-secondary/30 text-brand-200 placeholder:text-brand-200/20 transition-all shadow-inner text-base"
      />
    </label>
  );
}

/* ===================== Componente principal ===================== */
/**
 * Gate de verificación previa al alta de solicitud.
 * Búsqueda GLOBAL (todas las oficinas).
 *
 * Casos:
 *   NUEVO              → todo nuevo, continuar al alta normal
 *   PATENTE_VIGENTE    → bloqueo: solo pagar (o renovar si admin)
 *   PATENTE_BAJA       → permite crear nueva póliza
 *   CLIENTE_OTRO_AUTO  → vincular al cliente, crear póliza nueva (con promo)
 *
 * Props:
 *  - open: boolean
 *  - onConfirmNuevo({ cliente_id }): cliente_id es opcional (CLIENTE_OTRO_AUTO lo trae)
 *  - onCancel(): cierra todo
 */
export default function VerificarClienteGate({ open, onConfirmNuevo, onCancel, initialDni = "", initialPatente = "", autoVerificar = false }) {
  const [dni, setDni] = useState("");
  const [patente, setPatente] = useState("");
  const [searching, setSearching] = useState(false);
  const [resultado, setResultado] = useState(null); // { caso, cliente_match, patente_match }
  const [showMatchModal, setShowMatchModal] = useState(false);

  // 🆕 Guarda la última combinación DNI+patente ya buscada (a mano o sola),
  // para no repetir la misma consulta dos veces.
  const lastAutoKeyRef = useRef("");

  useEffect(() => {
    if (open) {
      setDni(initialDni || "");
      setPatente(initialPatente || "");
      setSearching(false);
      setResultado(null);
      setShowMatchModal(false);
      lastAutoKeyRef.current = "";
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===== Búsqueda unificada (DNI y/o Patente) ===== */
  const verificar = useCallback(async (dOverride, pOverride) => {
    const d = onlyDigits(typeof dOverride === "string" ? dOverride : dni);
    const p = normalizePatente(typeof pOverride === "string" ? pOverride : patente);

    if (!d && !p) {
      toast.error("Ingresá un DNI o una patente para verificar.");
      return;
    }

    setSearching(true);
    setResultado(null);
    try {
      const params = {};
      if (d) params.dni = d;
      if (p) params.patente = p;

      const resp = await api.get("clientes/verificar-global/", { params });
      const data = resp?.data || {};

      setResultado(data);

      // Caso NUEVO → mostramos confirmación verde y dejamos que el user haga click en "Continuar"
      if (data.caso === "NUEVO") {
        toast.success("¡Cliente nuevo! Podés continuar.");
      } else {
        // Cualquier otro caso → abrimos modal de detalle
        setShowMatchModal(true);
      }
    } catch (err) {
      console.error("[VerificarGate]", err);
      const status = err?.response?.status;
      if (status === 404) {
        // Backend no implementado todavía → tratamos como NUEVO
        setResultado({ caso: "NUEVO", cliente_match: null, patente_match: null });
        toast.success("¡Cliente nuevo! Podés continuar.");
      } else {
        toast.error("Error al verificar. Probá de nuevo.");
      }
    } finally {
      setSearching(false);
    }
  }, [dni, patente]);

  // Auto-verificación al abrir (subida rápida): usa el DNI/patente del PDF
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!open) { autoRanRef.current = false; return; }
    if (autoVerificar && !autoRanRef.current && (initialDni || initialPatente)) {
      autoRanRef.current = true;
      // 🆕 marcamos esta combinación como "ya buscada" para que el efecto de
      // auto-búsqueda por tipeo (de abajo) no la vuelva a disparar de nuevo.
      lastAutoKeyRef.current = `${onlyDigits(initialDni)}|${normalizePatente(initialPatente)}`;
      verificar(initialDni || "", initialPatente || "");
    }
  }, [open, autoVerificar, initialDni, initialPatente, verificar]);

  // 🆕 Auto-búsqueda mientras se tipea el DNI (sin apretar el botón).
  // Espera una pausa de AUTO_SEARCH_DEBOUNCE_MS para no buscar en cada tecla,
  // y no repite la búsqueda si la combinación DNI+patente ya se consultó.
  useEffect(() => {
    if (!open || searching) return;
    const d = onlyDigits(dni);
    if (d.length < DNI_MIN_LEN) return;

    const key = `${d}|${normalizePatente(patente)}`;
    if (key === lastAutoKeyRef.current) return;

    const t = setTimeout(() => {
      lastAutoKeyRef.current = key;
      verificar();
    }, AUTO_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [dni, patente, open, searching, verificar]);

  /* ===== El usuario decide continuar al alta ===== */
  const handleContinuar = (clienteIdParaVincular = null) => {
    // 🆕 Mandamos también el DNI y la patente que se tipearon/verificaron acá,
    // para que el formulario de alta no los pida de nuevo.
    onConfirmNuevo?.({
      cliente_id: clienteIdParaVincular,
      dni: onlyDigits(dni),
      patente: normalizePatente(patente),
    });
  };

  /* ===== Reiniciar búsqueda ===== */
  const reiniciar = () => {
    setDni("");
    setPatente("");
    setResultado(null);
    setShowMatchModal(false);
    lastAutoKeyRef.current = ""; // 🆕 permite volver a auto-buscar el mismo DNI
  };

  if (!open) return null;

  const esNuevo = resultado?.caso === "NUEVO";
  const tieneResultado = !!resultado;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel?.();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-lg rounded-3xl bg-brand-card-dark border border-brand-secondary/30 shadow-2xl shadow-brand-secondary/20 overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-brand-secondary/15 via-brand-secondary-light/10 to-transparent border-b border-brand-secondary/20">
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/60 hover:text-brand-200 transition-all"
              >
                <HiX className="text-lg" />
              </button>

              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="p-3 rounded-2xl bg-brand-secondary/20 border border-brand-secondary/40 text-brand-secondary-tint shadow-lg shadow-brand-secondary/20 shrink-0"
                >
                  <HiShieldCheck className="text-3xl" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-brand-200 font-black text-xl leading-tight flex items-center gap-2">
                    Verificación previa
                    <HiSparkles className="text-brand-secondary-tint text-base" />
                  </h2>
                  <p className="text-brand-secondary-tint/80 text-sm mt-1 font-medium leading-snug">
                    Buscamos en TODAS las oficinas del grupo si el cliente o el vehículo ya están registrados.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* DNI */}
              <Field
                label="DNI / CUIT / CUIL"
                icon={HiIdentification}
                value={dni}
                onChange={setDni}
                placeholder="Ej: 30123456"
                onEnter={() => verificar()}
                disabled={searching}
                autoFocus
              />

              {/* Patente */}
              <Field
                label="Patente del vehículo"
                icon={HiTruck}
                value={patente}
                onChange={(v) => setPatente(v.toUpperCase())}
                placeholder="Ej: AB123CD"
                onEnter={() => verificar()}
                disabled={searching}
              />

              <p className="text-[10px] text-brand-200/40 italic text-center pt-1">
                💡 Tip: completá ambos campos para una verificación más precisa.
              </p>

              {/* Botón principal de verificación */}
              <button
                type="button"
                onClick={() => verificar()}
                disabled={(!dni && !patente) || searching}
                className="w-full py-3 rounded-xl bg-brand-secondary hover:bg-brand-secondary-light text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-brand-secondary/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full bg-white/40 animate-pulse" />
                    Consultando base de datos...
                  </>
                ) : (
                  <>
                    <HiSearch className="text-base" /> Verificar en el sistema
                  </>
                )}
              </button>

              {/* Resultado: CLIENTE NUEVO */}
              {esNuevo && !searching && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-brand-primary/15 to-brand-primary/5 border border-brand-primary/30 flex items-start gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-brand-primary/20 text-brand-primary-tint shrink-0">
                    <HiCheckCircle className="text-lg" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-brand-primary-tint">¡Cliente NUEVO!</p>
                    <p className="text-xs text-brand-primary-tint/70 mt-0.5">
                      No existe en la base. Hacé click en "Continuar" para crear la solicitud.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-brand-200/[0.02] border-t border-brand-200/10 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between sm:items-center">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/70 font-bold uppercase text-[11px] tracking-widest transition-all"
              >
                Cancelar
              </button>

              <div className="flex flex-col-reverse sm:flex-row gap-2">
                {esNuevo && !searching && (
                  <button
                    onClick={() => handleContinuar(null)}
                    className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-deep text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-brand-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Continuar al alta <HiArrowRight />
                  </button>
                )}

                {tieneResultado && (
                  <button
                    onClick={reiniciar}
                    className="px-4 py-2.5 rounded-xl bg-brand-200/5 hover:bg-brand-200/10 text-brand-200/60 hover:text-brand-200 text-[10px] uppercase tracking-widest font-bold transition-all"
                  >
                    Buscar otro
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal con el detalle del match (cuando hay coincidencia) */}
      <ClienteYaExisteModal
        open={showMatchModal}
        resultado={resultado}
        onClose={() => setShowMatchModal(false)}
        onContinuarVinculando={(clienteId) => {
          setShowMatchModal(false);
          handleContinuar(clienteId);
        }}
      />
    </>
  );
}