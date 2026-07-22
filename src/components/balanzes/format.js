// src/components/balanzes/format.js
// Formateadores compartidos de la sección balanzes (evita copiarlos en cada componente).
import dayjs from "dayjs";

export const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");