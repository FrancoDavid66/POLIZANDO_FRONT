// src/components/ui/Button.jsx
//
// Botón base. "primary" = verde marca (acción principal), "secondary" =
// naranja marca (acción alternativa / que llama la atención), "outline" y
// "ghost" para acciones secundarias.
//
// Uso: <Button onClick={guardar} loading={guardando}>Guardar</Button>

const VARIANTS = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary-deep shadow-sm",
  secondary: "bg-brand-secondary text-white hover:brightness-95 shadow-sm",
  outline:
    "bg-transparent border border-brand-100/20 dark:border-brand-200/20 " +
    "text-brand-100 dark:text-brand-200 hover:bg-brand-100/5 dark:hover:bg-brand-200/5",
  ghost:
    "bg-transparent text-brand-100 dark:text-brand-200 " +
    "hover:bg-brand-100/8 dark:hover:bg-brand-200/10",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-150 active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export default Button;