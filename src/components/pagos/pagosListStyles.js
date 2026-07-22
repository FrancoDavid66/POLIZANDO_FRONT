// src/components/pagos/pagosListStyles.js
//
// PALETTE y TONO_STYLES las usan tanto PagosList.jsx (para el panel general)
// como CuotaRow.jsx (para cada fila) — viven acá para que ninguno de los 2
// tenga que importar del otro (evita un import circular).

export const PALETTE = {
  basePanel: "bg-brand-card-dark border-brand-200/10",
  header: "bg-brand-200/5 text-brand-200/80 border-b border-brand-200/10",
  divider: "divide-brand-200/8",
  paid: {
    stripe: "bg-brand-primary",
    cardBg: "bg-brand-200/[0.04] border-brand-200/10",
    text: "text-brand-200/85",
    amountText: "text-brand-primary-tint",
    border: "border-brand-200/10",
    chipBg: "bg-brand-primary/20",
    chipText: "text-brand-primary-tint",
    chipBorder: "border-brand-primary/30",
    noteBg: "bg-brand-200/10",
    noteText: "text-brand-200/75",
    btn: "bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/85 border-brand-200/15",
  },
  pending: {
    stripe: "bg-brand-200/25",
    cardBg: "bg-brand-200/[0.03] border-brand-200/10",
    text: "text-brand-200/50",
    amountText: "text-brand-200/75",
    border: "border-brand-200/10",
    chipBg: "bg-brand-200/10",
    chipText: "text-brand-200/50",
    chipBorder: "border-brand-200/15",
    noteBg: "bg-brand-200/10",
    noteText: "text-brand-200/50",
    btn: "bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/85 border-brand-200/15",
  },
  overdue: {
    stripe: "bg-red-600",
    cardBg: "bg-brand-200/[0.04] border-red-900/40",
    text: "text-brand-200/85",
    amountText: "text-red-400",
    border: "border-red-900/40",
    chipBg: "bg-red-900/40",
    chipText: "text-red-300",
    chipBorder: "border-red-800/50",
    noteBg: "bg-brand-200/10",
    noteText: "text-brand-200/75",
    btn: "bg-red-800/80 hover:bg-red-700 text-red-100 border-red-700/60",
  },
  neutralBtn: "bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/75 border-brand-200/15",
  actionBtn: "bg-brand-200/15 hover:bg-brand-200/20 text-white border-brand-200/20",
  ticketBtn: "bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/85 border-brand-200/15",
};

export const TONO_STYLES = {
  success: {
    bg: "bg-brand-primary/10",
    border: "border-brand-primary/30",
    title: "text-brand-200",
    subtitle: "text-brand-primary-tint/80",
    iconColor: "text-brand-primary-tint",
    label: "text-brand-primary-tint/80",
  },
  warning: {
    bg: "bg-brand-secondary/10",
    border: "border-brand-secondary/30",
    title: "text-brand-200",
    subtitle: "text-brand-secondary-tint/80",
    iconColor: "text-brand-secondary-tint",
    label: "text-brand-secondary-tint/80",
  },
  danger: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    title: "text-red-200",
    subtitle: "text-red-300/80",
    iconColor: "text-red-400",
    label: "text-red-300/80",
  },
  // "danger-soft" = rojo más suave, para advertencias preventivas (cuotas futuras)
  "danger-soft": {
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    title: "text-red-300",
    subtitle: "text-red-300/70",
    iconColor: "text-red-400/70",
    label: "text-red-300/70",
  },
  neutral: {
    bg: "bg-brand-200/[0.04]",
    border: "border-brand-200/10",
    title: "text-brand-200",
    subtitle: "text-brand-200/50",
    iconColor: "text-brand-200/50",
    label: "text-brand-200/40",
  },
};