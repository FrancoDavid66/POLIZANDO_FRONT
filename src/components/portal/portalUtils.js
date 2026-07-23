// src/components/portal/portalUtils.js
//
// Helpers compartidos por los componentes del Portal del Asegurado.
// Sin estado, sin JSX — solo formateo de datos.

import dayjs from "dayjs";

export function fmt(d) {
  return d ? dayjs(d).format("DD/MM/YYYY") : "—";
}

// Formatea pesos argentinos sin decimales: 35000 → "$35.000"
export function money(n) {
  const v = Number(n || 0);
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Nombre legible del documento. Prioriza el TIPO (dato confiable); el nombre del
// archivo se usa solo como respaldo, y ahí Mercosur/cuponera/certificado se chequean
// ANTES que "póliza" (porque muchos archivos llevan "poliza" en el nombre).
export function nombreLindoDoc(tipo, nombre) {
  const t = String(tipo || "").toUpperCase().trim();
  const n = String(nombre || "").toLowerCase();

  // 1) Por tipo (lo que confiamos)
  if (t.startsWith("MERCO")) return "Tarjeta Mercosur";
  if (t.startsWith("CUPON")) return "Cuponera de robo";
  if (t.startsWith("CERT")) return "Certificado";
  if (t.startsWith("DNI")) return "DNI";
  if (t.startsWith("POLIZA") || t === "PRP" || t.startsWith("FRENTE") || t.startsWith("PROPUESTA"))
    return "Póliza";

  // 2) Respaldo por nombre de archivo (Mercosur/cuponera/cert ANTES que póliza)
  if (n.includes("merco")) return "Tarjeta Mercosur";
  if (n.includes("cupon")) return "Cuponera de robo";
  if (n.includes("cert")) return "Certificado";
  if (n.includes("poliza") || n.includes("prp") || n.includes("propuesta") || n.includes("frente"))
    return "Póliza";

  // 3) Último recurso
  if (t && t !== "OTRO") return t.charAt(0) + t.slice(1).toLowerCase();
  return "Documento";
}

// Tarjeta base compartida: superficie clara con look "fintech" tipo Mercado
// Pago — bordes bien redondeados y sombra marcada pero prolija, con dark mode
// a juego con el resto de Polizando (bg-brand-100 / bg-brand-200).
export const CARD =
  "rounded-[28px] border border-black/[0.04] bg-white shadow-[0_2px_6px_rgba(20,20,20,0.05),0_16px_32px_-16px_rgba(31,122,76,0.22)] dark:border-white/[0.06] dark:bg-[#2c241d] dark:shadow-none";

export const ESTADO_POLIZA = {
  activa: {
    label: "Activa",
    cls: "text-brand-primary border-brand-primary/20 bg-brand-primary/10 dark:text-emerald-300 dark:border-emerald-400/25 dark:bg-emerald-400/10",
    dot: "bg-brand-primary dark:bg-emerald-300",
    // Pill sólido para usar SOBRE el hero degradé verde (PolizaCard): fondo
    // claro y texto verde oscuro, con contraste propio sin depender del fondo.
    pillCls: "bg-[#c8f0d8] text-[#14603b] dark:bg-emerald-400/20 dark:text-emerald-200",
  },
  vencida: {
    label: "Con pago pendiente",
    cls: "text-amber-700 border-amber-500/25 bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/25 dark:bg-amber-400/10",
    dot: "bg-amber-500 dark:bg-amber-300",
    pillCls: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
  },
};

// Círculo de color sólido para íconos, patrón "Mercado Pago": el ícono vive
// adentro de una burbuja de color plano en vez de flotar suelto. `tone` elige
// la paleta (primary=verde marca, secondary=naranja marca, sky/amber/rose para
// estados semánticos).
export const ICON_BUBBLE = {
  primary: "bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300",
  secondary: "bg-brand-secondary/10 text-brand-secondary dark:bg-brand-secondary/15 dark:text-brand-secondary-tint",
  sky: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
  solidPrimary: "bg-gradient-to-br from-brand-primary to-brand-primary-deep text-white shadow-md shadow-brand-primary/25",
};

// Variantes de Framer Motion reutilizables — animaciones "ricas pero
// funcionales": entran con resorte suave, nada de rebotes exagerados tipo
// celebración, pero con presencia (scale + y, no solo fade).
export const springPop = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 260, damping: 24, mass: 0.7 },
};

export const staggerDelay = (index, base = 0.06, max = 0.36) => Math.min(index * base, max);
