// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import clientesReducer from "./slices/clientesSlice";
import themeReducer from "./slices/themeSlice";
import polizasReducer from "./slices/polizasSlice";
import pagosReducer from "./slices/pagosSlice";
import siniestrosReducer from "./slices/siniestrosSlice";
import { ingresosReducer, egresosReducer } from "./slices/cajaSlices";
import balanceReducer from "./slices/balanceSlice";

import cuponesRoboReducer from "./slices/cuponesRoboSlice";

// Renovaciones
import renovacionesReducer from "./slices/renovacionesSlice";

// ✅🆕 Bajas
import bajasReducer from "./slices/bajasSlice";

// ✅🆕 Recaudación / Cierres de caja
import recaudacionReducer from "./slices/recaudacionSlice";

// 🚀 NUEVO: Cotizaciones
import cotizacionesReducer from "./slices/cotizacionesSlice";

// 🚀 NUEVO: Panel de Administración
import adminReducer from "./slices/adminSlice"; 

// Solicitudes
import solicitudesReducer from "./slices/solicitudesSlice";

// 🚀 NUEVO: Servicios y Gastos Fijos
import serviciosReducer from "./slices/serviciosSlice";


export const store = configureStore({
  reducer: {
    clientes: clientesReducer,
    theme: themeReducer,
    polizas: polizasReducer,
    pagos: pagosReducer,
    siniestros: siniestrosReducer,
    ingresos: ingresosReducer,
    egresos: egresosReducer,
    balance: balanceReducer,

    cuponesRobo: cuponesRoboReducer,

    renovaciones: renovacionesReducer,

    // ✅🆕
    bajas: bajasReducer,

    // ✅🆕
    recaudacion: recaudacionReducer,

    // 🚀 NUEVO
    cotizaciones: cotizacionesReducer,

    // 🚀 NUEVO: Panel Admin (Usuarios y Oficinas)
    admin: adminReducer,

    // Solicitudes
    solicitudes: solicitudesReducer,

    // 🚀 NUEVO: Servicios y Gastos Fijos
    servicios: serviciosReducer,

  },
});

export default store;