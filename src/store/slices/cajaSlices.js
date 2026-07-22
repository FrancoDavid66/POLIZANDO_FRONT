// src/store/slices/cajaSlices.js
// 🚀 UNIFICADO: ingresos + egresos en un solo archivo (reemplaza ingresosSlice.js y egresosSlice.js)
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * 🔐 Token del almacenamiento local (igual para ingresos y egresos).
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * 🏭 Fábrica de slice de caja (ingreso / egreso).
 *
 * @param {object} cfg
 * @param {string} cfg.resource   - segmento de la API y prefijo de acciones ("ingresos" | "egresos")
 * @param {string} cfg.singular   - texto para los mensajes ("el ingreso" | "el egreso")
 * @param {boolean} [cfg.detailedCreateError] - parseo de error de create campo por campo (ingresos)
 * @param {boolean} [cfg.notFoundDelete]       - mensaje especial si delete devuelve 404 (egresos)
 */
function createCajaSlice({ resource, singular, detailedCreateError = false, notFoundDelete = false }) {
  const fetchAll = createAsyncThunk(
    `${resource}/fetch`,
    async (params = {}, { rejectWithValue }) => {
      const page = params.page || 1;
      const oficina = (params.oficina !== undefined && params.oficina !== null) ? params.oficina : "";
      const page_size = params.page_size || 500;
      try {
        const queryParams = { page, page_size };
        if (oficina) queryParams.oficina = oficina;
        if (params.desde) queryParams.fecha__gte = params.desde;
        if (params.hasta) queryParams.fecha__lte = params.hasta;
        const res = await axios.get(`${BASE_URL}${resource}/`, {
          params: queryParams,
          headers: getAuthHeaders(),
        });
        return res.data;
      } catch (error) {
        console.error(`Error al obtener ${resource}:`, error?.response?.data || error?.message);
        return rejectWithValue(error?.response?.data || `Error al obtener ${singular}s`);
      }
    }
  );

  const createOne = createAsyncThunk(
    `${resource}/create`,
    async (data, { rejectWithValue }) => {
      try {
        const res = await axios.post(`${BASE_URL}${resource}/`, data, {
          headers: getAuthHeaders(),
        });
        toast.success(`${capFirst(singular)} creado correctamente.`);
        return res.data;
      } catch (error) {
        const backendData = error.response?.data;

        if (detailedCreateError) {
          console.error(`Error al crear ${singular} /api/${resource}/:`, {
            status: error.response?.status,
            data: backendData,
          });
          let message = `Error al crear ${singular}`;
          if (backendData && typeof backendData === "object") {
            const detalles = Object.entries(backendData)
              .map(([field, msgs]) => (Array.isArray(msgs) ? `${field}: ${msgs.join(" | ")}` : `${field}: ${msgs}`))
              .join(" — ");
            if (detalles) message = `Error al crear ${singular}: ${detalles}`;
          }
          toast.error(message);
          return rejectWithValue(backendData || message);
        }

        console.error(`Error al crear ${singular}:`, error?.response?.data || error?.message);
        return rejectWithValue(error?.response?.data?.message || `Error al crear ${singular}`);
      }
    }
  );

  const updateOne = createAsyncThunk(
    `${resource}/update`,
    async (data, { rejectWithValue }) => {
      try {
        const res = await axios.put(`${BASE_URL}${resource}/${data.id}/`, data, {
          headers: getAuthHeaders(),
        });
        toast.success(`${capFirst(singular)} actualizado correctamente.`);
        return res.data;
      } catch (error) {
        console.error(`Error al actualizar ${singular}:`, error?.response?.data || error?.message);
        return rejectWithValue(error?.response?.data?.message || `Error al actualizar ${singular}`);
      }
    }
  );

  const deleteOne = createAsyncThunk(
    `${resource}/delete`,
    async (id, { rejectWithValue }) => {
      try {
        await axios.delete(`${BASE_URL}${resource}/${id}/`, {
          headers: getAuthHeaders(),
        });
        toast.success(`${capFirst(singular)} eliminado correctamente.`);
        return id;
      } catch (error) {
        if (notFoundDelete && error?.response?.status === 404) {
          return rejectWithValue(`${capFirst(singular)} con ID ${id} no existe.`);
        }
        return rejectWithValue(error?.response?.data?.message || `Error al eliminar ${singular}`);
      }
    }
  );

  const slice = createSlice({
    name: resource,
    initialState: {
      list: [],
      status: "idle",
      error: null,
      next: null,
      previous: null,
      count: 0,
      currentPage: 1,
    },
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state) => {
          state.status = "loading";
        })
        .addCase(fetchAll.fulfilled, (state, action) => {
          state.status = "succeeded";
          const payload = action.payload || {};
          // ingresos aceptaba array crudo; egresos siempre paginado → `?? []` cubre ambos.
          state.list = payload.results ?? (Array.isArray(payload) ? payload : []);
          state.next = payload.next ?? null;
          state.previous = payload.previous ?? null;
          state.count = payload.count ?? 0;
          state.currentPage = action.meta?.arg?.page ?? 1;
          state.error = null;
        })
        .addCase(fetchAll.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.payload || `Error al obtener ${singular}s`;
        })
        // Crear
        .addCase(createOne.fulfilled, (state, action) => {
          state.list = [action.payload, ...state.list];
          state.status = "succeeded";
          state.error = null;
        })
        .addCase(createOne.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.payload || `Error al crear ${singular}`;
        })
        // Actualizar
        .addCase(updateOne.fulfilled, (state, action) => {
          const idx = state.list.findIndex((it) => it.id === action.payload?.id);
          if (idx !== -1) state.list[idx] = action.payload;
          state.status = "succeeded";
          state.error = null;
        })
        .addCase(updateOne.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.payload || `Error al actualizar ${singular}`;
        })
        // Eliminar
        .addCase(deleteOne.fulfilled, (state, action) => {
          state.list = state.list.filter((it) => it.id !== action.payload);
          state.status = "succeeded";
          state.error = null;
        })
        .addCase(deleteOne.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.payload || `Error al eliminar ${singular}`;
        });
    },
  });

  return { reducer: slice.reducer, fetchAll, createOne, updateOne, deleteOne };
}

const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ──────── INSTANCIAS ────────
const ingresos = createCajaSlice({
  resource: "ingresos",
  singular: "ingreso",
  detailedCreateError: true,
});

const egresos = createCajaSlice({
  resource: "egresos",
  singular: "egreso",
  notFoundDelete: true,
});

// ──────── EXPORTS: reducers ────────
export const ingresosReducer = ingresos.reducer;
export const egresosReducer = egresos.reducer;

// ──────── EXPORTS: thunks (mismos nombres de siempre) ────────
export const fetchIngresos = ingresos.fetchAll;
export const createIngreso = ingresos.createOne;
export const updateIngreso = ingresos.updateOne;
export const deleteIngreso = ingresos.deleteOne;

export const fetchEgresos = egresos.fetchAll;
export const createEgreso = egresos.createOne;
export const updateEgreso = egresos.updateOne;
export const deleteEgreso = egresos.deleteOne;