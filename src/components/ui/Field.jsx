// src/components/ui/Field.jsx
//
// Campo de formulario: label + input/select/textarea + error/hint, con
// foco en verde marca en vez del azul genérico del navegador.
//
// Uso:
//   <Field label="Nombre" required error={errors.nombre}>
//     <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan Pérez" />
//   </Field>

const inputBase =
  "w-full rounded-xl border bg-brand-card dark:bg-brand-card-dark px-3.5 py-2.5 text-sm " +
  "text-brand-100 dark:text-brand-200 placeholder:text-brand-100/40 dark:placeholder:text-brand-200/40 " +
  "outline-none transition-colors focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

function borderFor(error) {
  return error ? "border-brand-secondary" : "border-brand-100/15 dark:border-brand-200/15";
}

export function Field({ label, htmlFor, error, hint, required, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-semibold text-brand-100 dark:text-brand-200"
        >
          {label}
          {required && <span className="text-brand-secondary dark:text-brand-secondary-tint ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-brand-secondary dark:text-brand-secondary-tint">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-brand-100/50 dark:text-brand-200/50">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ error, className = "", ...props }) {
  return <input className={`${inputBase} ${borderFor(error)} ${className}`} {...props} />;
}

export function Textarea({ error, className = "", rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`${inputBase} resize-y ${borderFor(error)} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = "", children, ...props }) {
  return (
    <select className={`${inputBase} ${borderFor(error)} ${className}`} {...props}>
      {children}
    </select>
  );
}

export default Field;