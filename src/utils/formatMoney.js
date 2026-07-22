// src/utils/formatMoney.js
//
// Antes había 5 versiones de "fmtMoney" repartidas en distintos archivos de
// Pagos (PagosPage, PagosList, PagoWizardModal, FacturaCuotaPDF, CuotasAlertas),
// cada una con su propia combinación de decimales/símbolo. No eran duplicados
// exactos — cada contexto necesitaba un formato distinto (una tarjeta de KPI
// sin centavos, un recibo con "AR$", etc.) — así que en vez de forzar un
// único formato en todos lados, esto centraliza la LÓGICA de formateo detrás
// de opciones, y cada archivo sigue teniendo su propio "fmtMoney" local que
// solo delega acá con las opciones que ya usaba.
//
// Uso:
//   formatMoney(15000)                          → "$ 15.000,00"
//   formatMoney(15000, { decimals: 0 })          → "$ 15.000"
//   formatMoney(15000, { symbol: "" })           → "15.000,00"
//   formatMoney(15000, { symbol: "AR$" })        → "AR$ 15.000,00"
export function formatMoney(value, { decimals = 2, symbol = "$", locale = "es-AR" } = {}) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  try {
    const formatted = n.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return symbol ? `${symbol} ${formatted}` : formatted;
  } catch {
    return symbol ? `${symbol} ${n}` : String(n);
  }
}