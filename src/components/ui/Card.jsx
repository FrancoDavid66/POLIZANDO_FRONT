// src/components/ui/Card.jsx
//
// Contenedor base para paneles de contenido. Esquinas redondeadas
// (acompañando la redondez de Baloo 2) y sombra cálida con tinte propio
// en vez del gris genérico de Tailwind.
//
// Uso:
//   <Card><p>Contenido</p></Card>
//   <Card padding="sm" hover onClick={...}>...</Card>
//   <CardHeader title="Clientes" subtitle="128 activos" action={<Button>Nuevo</Button>} />

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  as: Component = "div",
  padding = "md",
  hover = false,
  className = "",
  children,
  ...props
}) {
  const base =
    "rounded-2xl border border-brand-100/10 dark:border-brand-200/10 " +
    "bg-brand-card dark:bg-brand-card-dark " +
    "shadow-[0_2px_12px_-2px_rgba(61,50,42,0.12)] dark:shadow-[0_2px_16px_-2px_rgba(0,0,0,0.4)] " +
    "transition-all duration-200";

  const hoverStyles = hover
    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(61,50,42,0.18)] dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]"
    : "";

  return (
    <Component
      className={`${base} ${hoverStyles} ${PADDING[padding]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-4 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-heading text-lg font-semibold text-brand-100 dark:text-brand-200">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-brand-100/60 dark:text-brand-200/60">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default Card;