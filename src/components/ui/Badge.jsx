// src/components/ui/Badge.jsx
//
// Etiqueta chica de estado. Los tonos usan la paleta de marca en vez de
// rojo/verde/amarillo genéricos: primary = al día / OK, secondary =
// atención, neutral = informativo.
//
// Uso: <Badge tone="primary">Al día</Badge>

const TONES = {
  primary: "bg-brand-primary/12 text-brand-primary-deep dark:text-brand-primary-tint",
  secondary: "bg-brand-secondary/12 text-brand-secondary dark:text-brand-secondary-tint",
  neutral: "bg-brand-100/8 text-brand-100/70 dark:bg-brand-200/10 dark:text-brand-200/70",
};

export function Badge({ tone = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;