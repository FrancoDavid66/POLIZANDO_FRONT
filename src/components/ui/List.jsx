// src/components/ui/List.jsx
//
// Lista vertical simple — distinta de Table: sin columnas, para
// notificaciones, resúmenes o registros compactos con una línea de
// título y una de detalle.
//
// Uso:
//   <List>
//     <ListItem
//       title="Juan Pérez"
//       subtitle="Póliza #123 · Corolla"
//       trailing={<Badge tone="primary">Al día</Badge>}
//       onClick={() => navigate(`/clientes/${id}`)}
//     />
//   </List>

export function List({ className = "", children, ...props }) {
  return (
    <ul
      className={`divide-y divide-brand-100/8 dark:divide-brand-200/8 rounded-2xl border border-brand-100/10 dark:border-brand-200/10 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </ul>
  );
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  className = "",
  ...props
}) {
  const interactive = typeof onClick === "function";
  return (
    <li
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 bg-brand-card dark:bg-brand-card-dark transition-colors ${
        interactive ? "cursor-pointer hover:bg-brand-primary/5 dark:hover:bg-brand-200/5" : ""
      } ${className}`}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-brand-100 dark:text-brand-200">{title}</p>
        {subtitle && (
          <p className="truncate text-sm text-brand-100/60 dark:text-brand-200/60">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </li>
  );
}

export default List;