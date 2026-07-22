// src/utils/formatDate.js
//
// Mismo patrón que formatMoney.js: antes esto estaba repartido en 3 archivos
// de Pagos (PagosList, FacturaCuotaPDF, FacturaAcciones), cada uno con su
// propia versión de "parsear cualquier fecha de forma segura" + "formatear
// como DD/MM/YYYY, con o sin hora". No eran duplicados exactos — cada uno
// tenía su propio valor de respaldo para fecha inválida ("—" vs "") y uno
// tenía una regla extra ("si dio justo mediodía, probablemente la fecha no
// tenía hora real, no la muestres"). Estas opciones quedan explícitas acá.
//
// Uso:
//   safeDateFromAny(v)                                  → Date válido o null
//   formatDate(v)                                       → "20/07/2026"
//   formatDate(v, { withTime: true })                   → "20/07/2026 14:30"
//   formatDate(v, { withTime: true, smartTime: true })   → oculta la hora si quedó justo en las 12:00 (fecha sin hora real)
//   formatDate(v, { fallback: "" })                      → "" en vez de "—" si la fecha es inválida
//   formatHM(v)                                          → "14:30" (o "" si es inválida)

export function safeDateFromAny(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") {
    const s = v.trim();
    // Fechas "solo día" (YYYY-MM-DD, 10 caracteres) se anclan a mediodía al
    // parsear, para evitar que un corrimiento de huso horario las mueva un
    // día para atrás o adelante.
    const d = new Date(s.length === 10 ? s + "T12:00:00" : s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(value, { withTime = false, smartTime = false, fallback = "—" } = {}) {
  const d = safeDateFromAny(value);
  if (!d) return fallback;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const fecha = `${day}/${month}/${year}`;

  if (!withTime) return fecha;

  if (smartTime && d.getHours() === 12 && d.getMinutes() === 0) {
    // Quedó justo en las 12:00 → probablemente una fecha sin hora real
    // (se ancló a mediodía en safeDateFromAny), no la mostramos.
    return fecha;
  }

  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${fecha} ${hours}:${mins}`;
}

export function formatHM(value, { fallback = "" } = {}) {
  const d = safeDateFromAny(value);
  if (!d) return fallback;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}