// src/store/slices/solicitudesSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
// 🚀 IMPORTAMOS LA INSTANCIA SEGURA PARA EVITAR EL 401
import api from '../../services/api';

// 🚀 IMPORTAMOS FETCH DE CLIENTES PARA RECARGARLOS AL CREAR
import { fetchClientes } from './clientesSlice';

/**
 * THUNKS BLINDADOS
 * Todos usan la instancia 'api' que inyecta automáticamente el Token JWT
 */

export const fetchSolicitudes = createAsyncThunk(
  'solicitudes/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      // Soporta filtros, ordenamiento y paginación
      const response = await api.get('/solicitudes/', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 📊 Resumen para el badge del Header.
// 🔧 El endpoint '/resumen/' se sacó del backend (era del feature de constancia).
//    Ahora usamos '/counters/' (lo vivo: pendiente_alta / pendiente_envio) y lo
//    mapeamos a la MISMA forma que ya espera el Header, así no rompe nada.
export const fetchResumen = createAsyncThunk(
  'solicitudes/fetchResumen',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/solicitudes/counters/');
      const c = response.data || {};
      const pendientes = (c.pendiente_alta || 0) + (c.pendiente_envio || 0);
      return {
        por_asegurar: pendientes,
        pendiente_alta: c.pendiente_alta || 0,
        pendiente_envio: c.pendiente_envio || 0,
        total: pendientes,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const crearSolicitud = createAsyncThunk(
  'solicitudes/crear',
  async (body, { rejectWithValue }) => {
    try {
      const response = await api.post('/solicitudes/', body);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🚀 NUEVO THUNK: CREACIÓN COMPLETA (Atrapa Cliente + Póliza + Solicitud)
export const crearSolicitudCompleta = createAsyncThunk(
  'solicitudes/crearCompleta',
  async (body, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post('/solicitudes/crear-completo/', body);

      // Magia: Apenas se crea, obligamos a Redux a recargar las listas para que aparezcan al instante
      dispatch(fetchSolicitudes());
      dispatch(fetchClientes());

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialResumen = {
  por_asegurar: 0,
  pendiente_alta: 0,
  pendiente_envio: 0,
  total: 0,
};

const solicitudesSlice = createSlice({
  name: 'solicitudes',
  initialState: {
    items: [],
    resumen: initialResumen,
    status: 'idle',       // carga de lista
    resumenStatus: 'idle',
    creating: false,      // estado para el modal de creación
    error: null,
  },
  reducers: {
    // Reducer para limpiar errores desde la UI
    resetSolicitudesError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 📝 listar
      .addCase(fetchSolicitudes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSolicitudes.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        // Manejamos tanto respuesta paginada como array plano
        state.items = payload.results || payload || [];
      })
      .addCase(fetchSolicitudes.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error = payload;
      })

      // 📊 resumen (badge del Header)
      .addCase(fetchResumen.pending, (state) => {
        state.resumenStatus = 'loading';
      })
      .addCase(fetchResumen.fulfilled, (state, { payload }) => {
        state.resumenStatus = 'succeeded';
        state.resumen = payload || initialResumen;
      })
      .addCase(fetchResumen.rejected, (state) => {
        state.resumenStatus = 'failed';
      })

      // ✨ crear (simple)
      .addCase(crearSolicitud.pending, (state) => {
        state.creating = true;
      })
      .addCase(crearSolicitud.fulfilled, (state, { payload }) => {
        state.creating = false;
        if (payload) state.items = [payload, ...state.items];
      })
      .addCase(crearSolicitud.rejected, (state) => {
        state.creating = false;
      })

      // 🚀 ✨ CREAR COMPLETA (Manejo del estado)
      .addCase(crearSolicitudCompleta.pending, (state) => {
        state.creating = true;
      })
      .addCase(crearSolicitudCompleta.fulfilled, (state) => {
        state.creating = false;
        // No agregamos el item acá porque el thunk ya despachó fetchSolicitudes()
      })
      .addCase(crearSolicitudCompleta.rejected, (state) => {
        state.creating = false;
      });
  },
});

// Selectores
export const selectSolicitudes = (state) => state.solicitudes.items;
export const selectSolicitudesStatus = (state) => state.solicitudes.status;
export const selectSolicitudesResumen = (state) => state.solicitudes.resumen;
export const selectIsCreatingSolicitud = (state) => state.solicitudes.creating;

export const { resetSolicitudesError } = solicitudesSlice.actions;

export default solicitudesSlice.reducer;