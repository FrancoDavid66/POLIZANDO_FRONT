// src/components/polizas/PolizaCreateModal.jsx
//
// Simplificado a un solo paso: el wizard tenía un "paso 2" para fotos y
// documentos que dependía de un componente (ImagenesDocsStep) que nunca
// existió. Las fotos/documentos son opcionales igual — quedan disponibles
// para cargar después desde VehiculoDocsPanel, en la ficha de la póliza ya
// creada (mismo patrón que la documentación de DNI en Clientes).

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOfficeBuilding, HiCheck } from "react-icons/hi";
import toast from "react-hot-toast";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

import PolizaStep from "../solicitudes/modalcreate/PolizaStep";
import { PolizasAPI } from "../../api/polizas";

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function lastDayOfMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
}
function parseYMDLocal(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function addMonthsLocal(ymd, months) {
  const base = parseYMDLocal(ymd);
  if (!base) return "";
  const y = base.getFullYear();
  const m0 = base.getMonth();
  const d = base.getDate();
  const tMon = m0 + months;
  const y2 = y + Math.floor(tMon / 12);
  const m2 = ((tMon % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(y2, m2);
  const day2 = Math.min(d, maxDay);
  return ymdLocal(new Date(y2, m2, day2, 12, 0, 0, 0));
}

const rmDiacritics = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ✅ Mapeo humano → enum
const COBERTURA_MAP = {
  A: "A",
  "A + GRUA": "A_GRUA",
  B: "B",
  B1: "B1",
  C: "C",
  C1: "C1",
  "C+": "C1",
  "C +": "C1",
  "C TOTAL": "C_TOTAL",
  "C MAXIMA": "C_TOTAL",
  "C MÁXIMA": "C_TOTAL",
  "C FRANQUICIA": "C_FRANQUICIA",
};

const normalizeCobertura = (v = "") => {
  const k = String(v).trim().toUpperCase();
  if (COBERTURA_MAP[k]) return COBERTURA_MAP[k];
  return k.replace(/\s+/g, "_").replace(/__+/g, "_");
};

const COMPANY_CUOTAS_DEFAULT = {
  agrosalta: 6,
  "federacion patronal": 6,
  "federación patronal": 6,
  atm: 4,
  equidad: 3,
  nre: 3,
  providencia: 3,
};

function firstFieldErrors(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const out = [];
  Object.entries(payload).forEach(([k, v]) => {
    if (k === "detail" || k === "message" || k === "error" || k === "detalle") return;
    const txt = Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : JSON.stringify(v);
    out.push(`${k}: ${txt}`);
  });
  return out;
}

const PolizaCreateModal = ({ isOpen, onClose, onSuccess, clienteId }) => {
  const { user } = useAuth();

  const [companiasList, setCompaniasList] = useState([]);
  const [coberturasList, setCoberturasList] = useState([]);
  const [planesPagoList, setPlanesPagoList] = useState([]);

  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);
  const [sinNumero, setSinNumero] = useState(false);
  const [tocoCantidadCuotas, setTocoCantidadCuotas] = useState(false);
  const [saving, setSaving] = useState(false);

  const [poliza, setPoliza] = useState({
    compania: "",
    numero_poliza: "",
    cobertura: "",
    oficina: "",
    patente: "",
    marca: "",
    modelo: "",
    anio: "",
    tipo: "Auto",
    precio_cuota: "",
    cantidad_cuotas_override: "",
    plan_pago: "",
    primer_vencimiento: "",
    fecha_emision: ymdLocal(new Date()),
    dias_a_vencer: 30,
    generar_cuotas_ahora: true,
  });

  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  // Carga de catálogos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      api.get("companias/")
        .then((res) => {
          const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
          setCompaniasList(arr.filter((c) => c.activa).map((c) => ({ id: c.nombre, nombre: c.nombre })));
        })
        .catch((e) => console.warn("No se pudieron cargar las compañías dinámicas.", e));

      api.get("coberturas/")
        .then((res) => {
          const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
          setCoberturasList(arr.filter((c) => c.activa).map((c) => ({ id: c.nombre, nombre: c.nombre })));
        })
        .catch((e) => console.warn("No se pudieron cargar las coberturas dinámicas.", e));

      api.get("planes-pago/")
        .then((res) => {
          const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
          setPlanesPagoList(arr.filter((p) => p.activa));
        })
        .catch((e) => console.warn("No se pudieron cargar los planes de pago dinámicos.", e));

      if (isWebAdmin) {
        setLoadingOficinas(true);
        PolizasAPI.listOficinas()
          .then((res) => setOficinas(Array.isArray(res) ? res : res.results || []))
          .catch(() => toast.error("Error al cargar sucursales"))
          .finally(() => setLoadingOficinas(false));

        if (clienteId) {
          api.get(`clientes/${clienteId}/`)
            .then((res) => {
              const clientOfi = res.data?.oficina || res.data?.oficina_id;
              const ofiId = typeof clientOfi === "object" ? clientOfi?.id : clientOfi;
              if (ofiId) setPoliza((prev) => ({ ...prev, oficina: String(ofiId) }));
            })
            .catch((err) => console.warn("No se pudo autocompletar la sucursal del cliente", err));
        }
      } else if (user?.perfil?.oficina) {
        const ofiId = user.perfil.oficina.id || user.perfil.oficina;
        setPoliza((prev) => ({ ...prev, oficina: String(ofiId) }));
      }
    }
  }, [isOpen, user, isWebAdmin, clienteId]);

  useEffect(() => {
    if (!poliza.fecha_emision) return;
    setPoliza((s) => ({ ...s, primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1) }));
  }, [poliza.fecha_emision]);

  // Si cambia la compañía, reseteamos el plan de pago para obligar a elegir uno válido
  useEffect(() => {
    const raw = (poliza.compania || "").trim();
    setPoliza((s) => ({ ...s, plan_pago: "" }));
    if (!raw || tocoCantidadCuotas) return;
    const key = rmDiacritics(raw).toLowerCase();
    const cant = COMPANY_CUOTAS_DEFAULT[key];
    if (cant) setPoliza((s) => ({ ...s, cantidad_cuotas_override: String(cant) }));
  }, [poliza.compania, tocoCantidadCuotas]);

  const baseErrors = useMemo(() => {
    const e = {};
    if (!poliza.compania.trim()) e.compania = "Requerido";
    if (!poliza.cobertura.trim()) e.cobertura = "Requerido";
    if (!poliza.oficina.trim()) e.oficina = "Requerido";
    if (!poliza.patente.trim()) e.patente = "Requerido";
    if (!poliza.marca.trim()) e.marca = "Requerido";
    if (!poliza.modelo.trim()) e.modelo = "Requerido";
    if (!String(poliza.anio).trim()) e.anio = "Requerido";
    if (!poliza.primer_vencimiento) e.primer_vencimiento = "Requerido";
    if (!poliza.fecha_emision) e.fecha_emision = "Requerido";
    return e;
  }, [poliza]);

  const canSubmit = useMemo(() => !saving && Object.keys(baseErrors).length === 0, [baseErrors, saving]);

  const createPoliza = async () => {
    if (!clienteId) return toast.error("Falta clienteId");
    try {
      setSaving(true);
      const payload = {
        cliente_id: Number(clienteId),
        compania: poliza.compania.trim(),
        numero_poliza: poliza.numero_poliza.trim() || undefined,
        cobertura: normalizeCobertura(poliza.cobertura),
        oficina: poliza.oficina.trim(),
        patente: poliza.patente.trim().toUpperCase(),
        marca: poliza.marca.trim(),
        modelo: poliza.modelo.trim(),
        anio: Number(poliza.anio),
        tipo: poliza.tipo || "Auto",
        precio_cuota: poliza.generar_cuotas_ahora && poliza.precio_cuota ? Number(poliza.precio_cuota) : undefined,
        plan_pago: poliza.plan_pago ? Number(poliza.plan_pago) : undefined,
        cantidad_cuotas_override: poliza.cantidad_cuotas_override ? Number(poliza.cantidad_cuotas_override) : undefined,
        generar_cuotas_ahora: !!poliza.generar_cuotas_ahora,
        fecha_emision: poliza.fecha_emision,
        primer_vencimiento: poliza.primer_vencimiento,
        primer_pago: poliza.primer_vencimiento,
        dias_a_vencer: Number(poliza.dias_a_vencer) || 30,
        combustible: (poliza.combustible || "").trim(),
        numero_chasis: (poliza.numero_chasis || "").trim().toUpperCase(),
        numero_motor: (poliza.numero_motor || "").trim().toUpperCase(),
        carroceria: (poliza.carroceria || "").trim(),
        observaciones: (poliza.observaciones || "").trim(),
      };

      const raw = await PolizasAPI.create(payload);
      toast.success("Póliza creada exitosamente");
      onSuccess?.(raw);
      onClose?.();
    } catch (e) {
      const lines = firstFieldErrors(e?.payload || e?.response?.data);
      if (lines.length) lines.slice(0, 3).forEach((ln) => toast.error(ln));
      else toast.error(e?.message || "Error al crear póliza");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return toast.error("Revisá los datos obligatorios");
    await createPoliza();
  };

  const coberturasOpts = coberturasList;
  const companiasOpts = companiasList;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 px-2 sm:px-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-brand-card dark:bg-brand-card-dark rounded-none sm:rounded-2xl shadow-xl w-full sm:w-[95%] sm:max-w-5xl max-h-[100vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] backdrop-blur">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-brand-100 dark:text-brand-200">Nueva póliza</h2>
                <p className="text-[11px] text-brand-100/50 dark:text-brand-200/50">Datos generales</p>
              </div>
              <button onClick={() => !saving && onClose?.()} className="cursor-pointer h-9 px-3 rounded-lg bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/70 dark:text-brand-200/70 text-xs sm:text-sm">
                Cerrar
              </button>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {isWebAdmin && !clienteId && (
                <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20 mb-4">
                  <label className="text-[10px] font-black text-brand-primary dark:text-brand-primary-tint uppercase tracking-widest flex items-center gap-2 mb-2">
                    <HiOfficeBuilding /> Sucursal de Origen (Solo Admin)
                  </label>
                  <select
                    value={poliza.oficina}
                    onChange={(e) => setPoliza({ ...poliza, oficina: e.target.value })}
                    disabled={loadingOficinas}
                    className="cursor-pointer w-full h-11 bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/10 rounded-lg px-3 text-sm text-brand-100 dark:text-brand-200 font-bold outline-none focus:ring-2 focus:ring-brand-primary/40"
                  >
                    <option value="">— Seleccionar Sucursal —</option>
                    {oficinas.map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </select>
                  {loadingOficinas && <p className="text-[9px] text-brand-primary dark:text-brand-primary-tint mt-1 animate-pulse">Cargando sucursales...</p>}
                </div>
              )}

              <PolizaStep
                polizaModo="nueva"
                poliza={poliza}
                setPoliza={setPoliza}
                sinNumero={sinNumero}
                setSinNumero={setSinNumero}
                companias={companiasOpts}
                coberturas={coberturasOpts}
                planesPago={planesPagoList}
                setTocoCantidadCuotas={setTocoCantidadCuotas}
              />

              <p className="text-xs text-brand-100/40 dark:text-brand-200/40">
                Fotos y documentos del vehículo son opcionales — se cargan después desde la ficha de la póliza, una vez creada.
              </p>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 py-3 border-t border-brand-100/10 dark:border-brand-200/10 flex justify-between items-center bg-brand-100/[0.02] dark:bg-brand-200/[0.02]">
              <div className="text-[10px] text-brand-100/40 dark:text-brand-200/40 uppercase font-bold">
                {!canSubmit && "Completa los campos obligatorios (*)"}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => !saving && onClose?.()} className="cursor-pointer h-10 px-4 text-xs uppercase font-black text-brand-100/40 dark:text-brand-200/40">
                  Cancelar
                </button>
                <button
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="cursor-pointer h-10 px-8 rounded-lg bg-brand-primary text-white text-xs uppercase font-black flex items-center gap-2 hover:bg-brand-primary-deep disabled:opacity-30"
                >
                  {saving ? "Procesando..." : <><HiCheck /> Finalizar</>}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PolizaCreateModal;