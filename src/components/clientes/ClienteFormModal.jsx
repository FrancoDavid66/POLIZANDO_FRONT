// src/components/clientes/ClienteFormModal.jsx
//
// Fusión de ClienteCreateModal + ClienteEditModal: eran casi el mismo
// formulario dos veces (mismos 8 campos, misma función de etiquetas, mismo
// layout). Se diferencian por `cliente`: si viene, es edición; si no, es alta.
//
// Uso:
//   <ClienteFormModal isOpen={...} onClose={...} onSuccess={...} />                          → alta
//   <ClienteFormModal isOpen={...} onClose={...} onSave={...} cliente={clienteAEditar} />     → edición

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiUserAdd, HiPencilAlt, HiX, HiOfficeBuilding, HiCheck } from "react-icons/hi";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { useClienteForm } from "../../hooks/clientes/useClienteForm";
import { useClienteEditForm } from "../../hooks/clientes/useClienteEditForm";

const CAMPOS_ORDENADOS = [
  "nombre", "apellido", "dni_cuit_cuil", "telefono",
  "email", "direccion", "localidad", "fecha_nacimiento",
];

const getLabel = (key) => {
  switch (key) {
    case "dni_cuit_cuil":
      return "DNI / CUIT / CUIL";
    case "fecha_nacimiento":
      return "Fecha de Nacimiento";
    default:
      return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
};

const ClienteFormModal = ({ isOpen, onClose, onSuccess, onSave, cliente = null }) => {
  const isEdit = !!cliente;
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  // Cada modo sigue con su propio hook — uno da de alta, el otro edita. No
  // fusioné esto: no tengo visibilidad de qué hace cada uno por dentro, y
  // prefiero no tocar lo que no veo.
  const createForm = useClienteForm({ onClose, onSuccess });
  const editForm = useClienteEditForm({ cliente, onClose, onSave });
  const { formData, handleChange, handleSubmit, loading } = isEdit ? editForm : createForm;

  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);

  // 🏢 Selector de sucursal: solo al dar de alta, solo para admin (la edición
  // no lo tenía antes tampoco — se mantiene ese comportamiento).
  // 🔧 FIX: antes llamaba a solicitudesApi.oficinasListar(), que ni siquiera
  // existe como método (nunca existió en el services/solicitudes.js real) —
  // esto tiraba un error cada vez que un admin abría el alta de cliente.
  // Ahora usa el api compartido directo contra /usuarios/oficinas/, el mismo
  // patrón que ya usan otras pantallas (ej. ReporteContactosModal en Pagos).
  useEffect(() => {
    if (isOpen && isWebAdmin && !isEdit) {
      const fetchOfis = async () => {
        setLoadingOficinas(true);
        try {
          const res = await api.get("usuarios/oficinas/");
          const data = Array.isArray(res?.data) ? res.data : (res?.data?.results || []);
          setOficinas(data);
        } catch (error) {
          if (error?.response?.status !== 401) toast.error("Error al sincronizar sucursales.");
        } finally {
          setLoadingOficinas(false);
        }
      };
      fetchOfis();
    }
  }, [isOpen, isWebAdmin, isEdit]);

  // DNI/CUIT es obligatorio al crear, pero no al editar (así estaba antes).
  const isRequired = (key) =>
    isEdit
      ? ["nombre", "apellido", "telefono"].includes(key)
      : ["nombre", "apellido", "dni_cuit_cuil", "telefono"].includes(key);

  const formId = isEdit ? "form-editar-cliente" : "form-crear-cliente";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02]">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-brand-primary-tint border border-brand-primary/20 shrink-0">
                  {isEdit ? <HiPencilAlt className="text-2xl" /> : <HiUserAdd className="text-2xl" />}
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-brand-100 dark:text-brand-200 uppercase tracking-tight leading-none">
                    {isEdit ? "Editar Cliente" : "Alta de Cliente"}
                  </h2>
                  <p className="text-[10px] text-brand-100/40 dark:text-brand-200/40 uppercase tracking-widest font-bold mt-1">
                    {isEdit ? "Actualizá los datos de la ficha" : "Registro centralizado"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/40 dark:text-brand-200/40 hover:text-brand-100 dark:hover:text-brand-200 transition-all active:scale-90"
              >
                <HiX className="text-2xl" />
              </button>
            </div>

            <form id={formId} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-hide">
              {/* Selector de sucursal (solo alta + admin) */}
              {!isEdit && isWebAdmin && (
                <div className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 shadow-inner">
                  <label className="text-[10px] font-black text-brand-primary dark:text-brand-primary-tint uppercase tracking-widest flex items-center gap-2 mb-3 ml-1">
                    <HiOfficeBuilding className="text-sm" /> Asignar a Sucursal Específica
                  </label>
                  <div className="relative">
                    <select
                      name="oficina"
                      value={formData.oficina || ""}
                      onChange={handleChange}
                      disabled={loadingOficinas}
                      className="h-14 w-full rounded-xl bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/10 px-4 text-sm font-bold text-brand-100 dark:text-brand-200 outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all cursor-pointer appearance-none"
                    >
                      <option value="">— Selección Automática (Tu perfil) —</option>
                      {oficinas.map((o) => (
                        <option key={o.id} value={o.id}>{o.nombre}</option>
                      ))}
                    </select>
                  </div>
                  {loadingOficinas && (
                    <p className="text-[9px] text-brand-primary/70 dark:text-brand-primary-tint/80 mt-2 ml-1 animate-pulse italic">
                      Sincronizando sucursales...
                    </p>
                  )}
                </div>
              )}

              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {CAMPOS_ORDENADOS.map((key) => (
                  <div key={key} className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-brand-100/50 dark:text-brand-200/50 uppercase tracking-widest flex items-center justify-between ml-1">
                      <span>
                        {getLabel(key)}
                        {isRequired(key) && (
                          <span className="text-brand-secondary dark:text-brand-secondary-tint ml-1.5">*</span>
                        )}
                      </span>
                    </label>
                    <input
                      type={key.includes("fecha") ? "date" : "text"}
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleChange}
                      className="h-12 w-full rounded-xl bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/10 dark:border-brand-200/10 px-4 text-sm font-bold text-brand-100 dark:text-brand-200 placeholder:text-brand-100/20 dark:placeholder:text-brand-200/20 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                      placeholder={`Ingresar ${getLabel(key).toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto h-12 sm:h-11 px-8 rounded-xl bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/60 dark:text-brand-200/60 font-bold uppercase text-[10px] tracking-widest hover:bg-brand-100/10 dark:hover:bg-brand-200/10 transition-all disabled:opacity-30"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form={formId}
                disabled={loading}
                className="w-full sm:w-auto h-12 sm:h-11 px-10 rounded-xl bg-brand-primary text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-primary/30 hover:bg-brand-primary-deep transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isEdit ? (
                  "Guardar Cambios"
                ) : (
                  <>
                    <HiCheck className="text-lg" /> Finalizar Alta
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteFormModal;