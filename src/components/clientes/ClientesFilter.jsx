// src/components/clientes/ClientesFilter.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiSearch, HiFilter } from "react-icons/hi";

const ClientesFilter = ({ onFilterText, onFilterEstado }) => {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");

  // Debounce búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterText(busqueda.toLowerCase());
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, onFilterText]);

  // Cambio de estado
  useEffect(() => {
    onFilterEstado(estado);
  }, [estado, onFilterEstado]);

  const estados = [
    { value: "todos", label: "Todos los Clientes" },
    { value: "activos", label: "Con Pólizas Activas" },
    { value: "inactivos", label: "Sin Pólizas (Inactivos)" },
  ];

  return (
    <motion.section
      className="rounded-2xl bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/10 p-4 sm:p-5 shadow-sm"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4">
        
        {/* Título + Resumen */}
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-lg bg-brand-primary/10 text-brand-primary dark:text-brand-primary-tint flex items-center justify-center">
             <HiFilter className="text-sm" />
           </div>
           <div>
             <h3 className="text-xs font-black uppercase tracking-widest text-brand-100 dark:text-brand-200">
               Filtros de Búsqueda
             </h3>
             <p className="text-[10px] text-brand-100/40 dark:text-brand-200/40 font-bold uppercase tracking-wider mt-0.5">
               Localizá clientes rápidamente en tu base de datos.
             </p>
           </div>
        </div>

        {/* Buscador + Chips (Grid/Flex layout para que respire) */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          
          {/* Buscador Principal */}
          <div className="w-full lg:flex-1 relative group">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-100/30 dark:text-brand-200/30 text-lg group-focus-within:text-brand-primary dark:group-focus-within:text-brand-primary-tint transition-colors" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Apellido, DNI o CUIT..."
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/10 dark:border-brand-200/10 text-sm font-bold text-brand-100 dark:text-brand-200 placeholder:text-brand-100/20 dark:placeholder:text-brand-200/20 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary/30 transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Filtro por estado (Chips) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mr-2">Estado:</span>
            {estados.map((opt) => {
              const active = estado === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEstado(opt.value)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30"
                      : "bg-brand-100/5 dark:bg-brand-200/5 text-brand-100/50 dark:text-brand-200/50 border border-brand-100/10 dark:border-brand-200/10 hover:bg-brand-100/10 dark:hover:bg-brand-200/10 hover:text-brand-100 dark:hover:text-brand-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </motion.section>
  );
};

export default ClientesFilter;