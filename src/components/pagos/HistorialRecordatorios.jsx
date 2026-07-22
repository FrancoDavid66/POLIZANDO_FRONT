// src/components/pagos/HistorialRecordatorios.jsx
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiClock,
  HiRefresh,
  HiPhone,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiSearch,
} from "react-icons/hi";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${horas}:${mins}`;
}

function formatMoney(value) {
  if (value == null) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return `$${num.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function estadoChip(estadoRaw) {
  const estado = (estadoRaw || "").toUpperCase();
  if (estado === "OK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 text-brand-primary-tint border border-brand-primary/40 px-2 py-0.5 text-[11px]">
        <HiCheckCircle className="w-3 h-3" />
        OK
      </span>
    );
  }
  if (estado === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-300 border border-red-400/40 px-2 py-0.5 text-[11px]">
        <HiXCircle className="w-3 h-3" />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-200/10 text-brand-200/70 border border-brand-200/25 px-2 py-0.5 text-[11px]">
      {estado || "N/D"}
    </span>
  );
}

export default function HistorialRecordatorios({
  items = [],
  loading = false,
  onRefresh,
}) {

  const [search, setSearch] = useState("");

  const filtrados = useMemo(() => {
    let data = Array.isArray(items) ? [...items] : [];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((it) => {
        const clienteNombre =
          it.cliente_nombre ||
          it.cliente_nombre_apellido ||
          (it.cliente &&
            `${it.cliente.nombre || ""} ${it.cliente.apellido || ""}`) ||
          "";
        const doc =
          it.cliente_documento ||
          (it.cliente && it.cliente.dni_cuit_cuil) ||
          "";
        const tel = it.telefono || "";
        const resumen = it.texto_resumen || "";
        return (
          clienteNombre.toLowerCase().includes(q) ||
          String(doc).toLowerCase().includes(q) ||
          String(tel).toLowerCase().includes(q) ||
          resumen.toLowerCase().includes(q)
        );
      });
    }

    // Orden: últimos envíos primero
    data.sort((a, b) => {
      const da = new Date(a.created_at || a.fecha || 0).getTime();
      const db = new Date(b.created_at || b.fecha || 0).getTime();
      return db - da;
    });

    return data;
  }, [items, search]);

  return (
    <div className="rounded-lg bg-brand-card-dark border border-brand-200/10 ring-1 ring-brand-200/8 text-brand-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-brand-200/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-primary/15 border border-brand-primary/40 flex items-center justify-center">
            <HiClock className="w-4 h-4 text-brand-primary-tint" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              Historial de recordatorios enviados
            </h2>
            <p className="text-[11px] text-brand-200/60">
              Lista de mensajes masivos enviados a los clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-brand-200/45">
            <span>Mostrando</span>
            <span className="font-semibold text-brand-200">
              {filtrados.length}
            </span>
            <span>envíos</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-xl border border-brand-200/15 bg-brand-200/5 px-3 py-1.5 text-[11px] hover:bg-brand-200/10 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            ) : (
              <HiRefresh className="w-3.5 h-3.5" />
            )}
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 border-b border-brand-200/10">
        <div className="relative w-full sm:w-64">
          <HiSearch className="w-3.5 h-3.5 text-brand-200/40 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, doc, teléfono..."
            className="w-full pl-7 pr-2 py-1.5 rounded-xl bg-brand-200/[0.03] border border-brand-200/15 text-[11px] text-brand-200 placeholder:text-brand-200/35 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          />
        </div>
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-brand-200/5 border-b border-brand-200/10 text-brand-200/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha / hora</th>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium">Resumen</th>
                <th className="px-3 py-2 text-right font-medium">Monto total</th>
                <th className="px-3 py-2 text-center font-medium">Cuotas</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200/8">
              <AnimatePresence initial={false}>
                {loading && filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-brand-200/45 text-xs"
                    >
                      Cargando historial...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-brand-200/45 text-xs"
                    >
                      No hay envíos registrados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((it) => {
                    const key = it.id || `${it.telefono}-${it.created_at}`;
                    const clienteNombre =
                      it.cliente_nombre ||
                      it.cliente_nombre_apellido ||
                      (it.cliente &&
                        `${it.cliente.nombre || ""} ${
                          it.cliente.apellido || ""
                        }`.trim()) ||
                      "Sin nombre";
                    const doc =
                      it.cliente_documento ||
                      (it.cliente && it.cliente.dni_cuit_cuil) ||
                      "";
                    const cuotasCount =
                      it.cuotas_count ||
                      (Array.isArray(it.cuotas_ids) ? it.cuotas_ids.length : null);

                    return (
                      <motion.tr
                        key={key}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="hover:bg-brand-200/[0.04]"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{formatDateTime(it.created_at || it.fecha)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1">
                              <HiUser className="w-3 h-3 text-brand-200/40" />
                              <span className="truncate max-w-[12rem] text-brand-200/90">
                                {clienteNombre}
                              </span>
                            </span>
                            {doc && (
                              <span className="text-[10px] text-brand-200/45">
                                Doc: {doc}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] text-brand-200/75">
                            <HiPhone className="w-3 h-3 text-brand-200/40" />
                            {it.telefono || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-brand-200/75">
                            {it.texto_resumen || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className="font-medium text-brand-200">
                            {formatMoney(it.monto_total)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="text-[11px] text-brand-200">
                            {cuotasCount != null ? cuotasCount : "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {estadoChip(it.estado_envio)}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista mobile */}
      <div className="md:hidden divide-y divide-brand-200/8">
        {loading && filtrados.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-brand-200/45">
            Cargando historial...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-brand-200/45">
            No hay envíos registrados con los filtros actuales.
          </div>
        ) : (
          filtrados.map((it) => {
            const key = it.id || `${it.telefono}-${it.created_at}`;
            const clienteNombre =
              it.cliente_nombre ||
              it.cliente_nombre_apellido ||
              (it.cliente &&
                `${it.cliente.nombre || ""} ${
                  it.cliente.apellido || ""
                }`.trim()) ||
              "Sin nombre";
            const doc =
              it.cliente_documento ||
              (it.cliente && it.cliente.dni_cuit_cuil) ||
              "";
            const cuotasCount =
              it.cuotas_count ||
              (Array.isArray(it.cuotas_ids) ? it.cuotas_ids.length : null);

            return (
              <div key={key} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-brand-200/60">
                    {formatDateTime(it.created_at || it.fecha)}
                  </div>
                  {estadoChip(it.estado_envio)}
                </div>
                <div className="mt-1 text-sm font-medium text-brand-200">
                  {clienteNombre}
                </div>
                {doc && (
                  <div className="text-[11px] text-brand-200/45">Doc: {doc}</div>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-brand-200/60">
                  <span className="inline-flex items-center gap-1">
                    <HiPhone className="w-3 h-3 text-brand-200/40" />
                    {it.telefono || "-"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-brand-200/75">
                  {it.texto_resumen || "-"}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-brand-200/60">
                    Cuotas:{" "}
                    <span className="font-semibold text-brand-200">
                      {cuotasCount != null ? cuotasCount : "-"}
                    </span>
                  </span>
                  <span className="text-brand-200/60">
                    Total:{" "}
                    <span className="font-semibold text-brand-200">
                      {formatMoney(it.monto_total)}
                    </span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}