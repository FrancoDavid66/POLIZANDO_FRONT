// src/components/clientes/ClienteDatosPersonalesCard.jsx
//
// La "Galería DNI" que tenía antes se sacó: mostraba las mismas 2 fotos que
// ClienteDocumentacionCard (que vive al lado, en la misma pantalla), pero
// sin poder subir/reemplazar/borrar. Esta card ahora se enfoca solo en los
// datos de contacto — las fotos viven en un solo lugar.

import dayjs from "dayjs";
import {
  HiIdentification,
  HiPhone,
  HiMail,
  HiLocationMarker,
  HiCalendar,
} from "react-icons/hi";
import { Card, CardHeader, Badge } from "../ui";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClienteDatosPersonalesCard({ cliente }) {
  if (!cliente) return null;

  const estadoActivo = cliente.estado === true || cliente.estado === "activo";

  return (
    <Card padding="none" className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-brand-primary-tint shrink-0">
            <HiIdentification className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-sm sm:text-base font-bold text-brand-100 dark:text-brand-200 uppercase tracking-tight truncate">
              Datos Personales
            </h2>
            <p className="text-[9px] sm:text-[10px] text-brand-100/40 dark:text-brand-200/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              Contacto y documentación
            </p>
          </div>
        </div>
        <Badge tone={estadoActivo ? "primary" : "neutral"} className="shrink-0">
          {estadoActivo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto scrollbar-hide">
        {/* Identificadores Principales */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 pb-4 border-b border-brand-100/10 dark:border-brand-200/10">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">DNI / CUIT</span>
            <span className="text-brand-100 dark:text-brand-200 font-mono font-bold text-sm sm:text-base">{cliente.dni_cuit_cuil || "—"}</span>
          </div>

          {cliente.alias && (
            <div className="flex flex-col gap-1 border-l border-brand-100/10 dark:border-brand-200/10 pl-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">Alias</span>
              <span className="text-brand-primary dark:text-brand-primary-tint font-bold text-sm truncate max-w-[120px] sm:max-w-[200px]">{cliente.alias}</span>
            </div>
          )}

          {cliente.id && (
            <div className="flex flex-col gap-1 ml-auto text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">ID Sist.</span>
              <span className="text-brand-100/60 dark:text-brand-200/60 font-mono font-bold text-sm">#{cliente.id}</span>
            </div>
          )}
        </div>

        {/* Grid de datos en cajas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Teléfono */}
          <div className="flex gap-3 items-start bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/8 dark:border-brand-200/8 p-3 sm:p-4 rounded-2xl">
            <HiPhone className="text-brand-primary dark:text-brand-primary-tint text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-0.5">Teléfono / WhatsApp</span>
              {cliente.telefono ? (
                <a href={`tel:${cliente.telefono}`} className="text-sm font-bold text-brand-100 dark:text-brand-200 hover:text-brand-primary dark:hover:text-brand-primary-tint transition-colors truncate">
                  {cliente.telefono}
                </a>
              ) : (
                <span className="text-sm font-bold text-brand-100/25 dark:text-brand-200/25">—</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex gap-3 items-start bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/8 dark:border-brand-200/8 p-3 sm:p-4 rounded-2xl">
            <HiMail className="text-brand-primary dark:text-brand-primary-tint text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-0.5">Correo Electrónico</span>
              {cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="text-sm font-bold text-brand-100 dark:text-brand-200 hover:text-brand-primary dark:hover:text-brand-primary-tint transition-colors block truncate w-full" title={cliente.email}>
                  {cliente.email}
                </a>
              ) : (
                <Badge tone="secondary">Falta</Badge>
              )}
            </div>
          </div>

          {/* Dirección */}
          <div className="flex gap-3 items-start bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/8 dark:border-brand-200/8 p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <HiLocationMarker className="text-brand-primary dark:text-brand-primary-tint text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-0.5">Dirección y Localidad</span>
              <span className="text-sm font-bold text-brand-100 dark:text-brand-200 leading-snug">
                {cliente.direccion || "—"}
                {cliente.localidad && (
                  <span className="text-brand-100/40 dark:text-brand-200/40 font-normal ml-1">· {cliente.localidad}</span>
                )}
                {!cliente.localidad && !cliente.direccion && (
                  <span className="ml-2 inline-block align-middle"><Badge tone="secondary">Falta</Badge></span>
                )}
              </span>
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div className="flex gap-3 items-start bg-brand-100/[0.03] dark:bg-brand-200/[0.03] border border-brand-100/8 dark:border-brand-200/8 p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <HiCalendar className="text-brand-primary dark:text-brand-primary-tint text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-0.5">Fecha de Nacimiento</span>
              <span className="text-sm font-bold text-brand-100 dark:text-brand-200">
                {fmt(cliente.fecha_nacimiento)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}