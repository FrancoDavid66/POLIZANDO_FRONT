// src/components/portal/DocumentosPoliza.jsx
//
// Bloque "Papeles" dentro de una PolizaCard: chips de documentos disponibles,
// o aviso de "en proceso de carga" con botón directo a WhatsApp de la oficina.

import { motion } from "framer-motion";
import { HiDocumentText, HiClock } from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa";
import { nombreLindoDoc, ICON_BUBBLE } from "./portalUtils";

export default function DocumentosPoliza({ poliza, cliente, onVerDoc }) {
  const docs = poliza.documentos || [];

  if (docs.length > 0) {
    return (
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
            <HiDocumentText className="h-4 w-4" />
          </div>
          <span className="font-heading text-[16px] font-bold text-brand-100 dark:text-brand-200">Papeles</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {docs.map((d, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onVerDoc({ url: d.url, nombre: nombreLindoDoc(d.tipo, d.nombre) })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-3.5 py-2 text-[12px] font-semibold text-brand-100 shadow-sm transition hover:bg-black/[0.03] dark:border-white/[0.08] dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10"
            >
              <HiDocumentText className="h-4 w-4 text-brand-secondary" /> {nombreLindoDoc(d.tipo, d.nombre)}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
          <HiDocumentText className="h-4 w-4" />
        </div>
        <span className="font-heading text-[16px] font-bold text-brand-100 dark:text-brand-200">Papeles</span>
      </div>
      <div className="flex gap-3 rounded-[18px] border border-[rgba(226,98,44,.24)] bg-[#fdf1ea] p-4 dark:border-amber-400/20 dark:bg-orange-400/[0.1]">
        <HiClock className="mt-0.5 h-[19px] w-[19px] shrink-0 text-brand-secondary dark:text-brand-secondary-tint" />
        <div>
          <p className="text-[13.5px] font-extrabold text-brand-secondary dark:text-brand-secondary-tint">Papeles en proceso de carga</p>
          <p className="mt-1 text-[12px] leading-snug text-brand-100/60 dark:text-brand-200/70">
            Estamos cargando los papeles de esta póliza. Si los necesitás ahora,{" "}
            {poliza.oficina_whatsapp ? (
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                href={`https://wa.me/${poliza.oficina_whatsapp}?text=${encodeURIComponent(
                  `Hola, soy ${cliente?.nombre_completo || cliente?.nombre || ""}. Necesito los papeles de mi póliza del auto ${poliza.patente || ""}. ¿Me los pueden enviar? Gracias.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-extrabold text-brand-primary underline decoration-brand-primary/30 underline-offset-2 dark:text-emerald-300"
              >
                <FaWhatsapp className="h-3.5 w-3.5" /> escribinos
              </motion.a>
            ) : (
              <span className="font-extrabold text-brand-primary dark:text-emerald-300">escribinos</span>
            )}
            .
          </p>
        </div>
      </div>
    </div>
  );
}
