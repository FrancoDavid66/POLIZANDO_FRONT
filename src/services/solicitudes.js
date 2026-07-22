// src/services/solicitudes.js
// Servicio para Solicitudes + Documentos + Empleados (catálogo)
//
// 🔧 Migrado de fetch() manual (con lectura de token a mano) al cliente `api`
// compartido (src/services/api.js), que ya inyecta el token y maneja sesión
// expirada. La interfaz pública (solicitudesApi.listar, .crear, etc.) no
// cambió: mismos nombres, mismos parámetros, mismo shape de error
// (err.message con el detalle, err.status con el código HTTP) para no
// romper a nadie que ya la usa.

import api from "./api";

const API  = "/solicitudes";
const DOCS = "/documentos";
const EMP  = "/empleados";

/** Arma un Error con el mismo shape que ya usaba el resto de la app
 * (err.message enriquecido, err.status), a partir de un error de axios. */
function toAppError(axiosErr) {
  if (!axiosErr?.response) {
    const err = new Error("No se pudo conectar con el servidor.");
    err.cause = axiosErr;
    return err;
  }
  const { status, data } = axiosErr.response;
  let msg = `HTTP ${status}`;
  const detail =
    data?.detail ||
    data?.error ||
    data?.message ||
    (Array.isArray(data?.non_field_errors) ? data.non_field_errors.join(", ") : null);
  if (detail) msg += ` · ${detail}`;
  else if (data && typeof data === "object") msg += ` · ${JSON.stringify(data).slice(0, 400)}`;
  else if (typeof data === "string" && data) msg += ` · ${data.slice(0, 400)}`;

  const err = new Error(msg);
  err.status = status;
  err.payload = data;
  return err;
}

async function req(method, url, body, opts = {}) {
  const { signal, params, responseType } = opts;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  try {
    const res = await api.request({
      method,
      url,
      data: body,
      params,
      signal,
      responseType,
      // Con FormData dejamos que el navegador (vía axios) ponga el boundary solo.
      headers: isForm ? {} : (body !== undefined ? { "Content-Type": "application/json" } : {}),
    });
    return res;
  } catch (e) {
    throw toAppError(e);
  }
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
}

export const solicitudesApi = {
  // -------- Solicitudes --------
  async listar(params = {}) {
    const { signal, ...restParams } = params || {};
    const res = await req("GET", `${API}/`, undefined, { params: restParams, signal });
    return unwrapList(res.data);
  },

  async crear(body) {
    const res = await req("POST", `${API}/`, body);
    return res.data;
  },

  async eliminar(id) {
    const res = await req("DELETE", `${API}/${id}/`);
    return res.data;
  },

  async update(id, body) {
    const res = await req("PATCH", `${API}/${id}/`, body);
    return res.data;
  },

  async crearCompleto(payload, opts = {}) {
    const res = await req("POST", `${API}/crear-completo/`, payload, opts);
    return res.data;
  },

  async terminar(id) {
    const res = await req("POST", `${API}/${id}/terminar/`, {});
    return res.data;
  },

  // --- Asignación ---
  async tomar(id, arg, empleadoId) {
    let body = {};
    if (typeof arg === "object" && arg !== null) body = { ...arg };
    else if (typeof arg === "number" && empleadoId === undefined) body = { empleado_id: arg };
    else if (typeof arg === "string" && typeof empleadoId === "number") body = { responsable: arg, empleado_id: empleadoId };
    else if (typeof arg === "string") body = { responsable: arg };
    else if (typeof empleadoId === "number") body = { empleado_id: empleadoId };
    const res = await req("POST", `${API}/${id}/tomar/`, body);
    return res.data;
  },

  async reasignar(id, arg, empleadoId) {
    let body = {};
    if (typeof arg === "object" && arg !== null) body = { ...arg };
    else if (typeof arg === "number" && empleadoId === undefined) body = { empleado_id: arg };
    else if (typeof arg === "string" && typeof empleadoId === "number") body = { responsable: arg, empleado_id: empleadoId };
    else if (typeof arg === "string") body = { responsable: arg };
    else if (typeof empleadoId === "number") body = { empleado_id: empleadoId };
    const res = await req("POST", `${API}/${id}/reasignar/`, body);
    return res.data;
  },

  async marcarTarea(id, key, done) {
    const map = {
      alta: "alta_compania", pendiente_alta: "alta_compania",
      envio: "enviar_poliza", pendiente_envio: "enviar_poliza",
      enviar_poliza: "enviar_poliza", alta_compania: "alta_compania",
    };
    const k = map[key] || key;
    const payload = { key: k, done: !!done };

    const candidates = [`${API}/${id}/marcar_tarea/`, `${API}/${id}/tareas/`];
    for (const url of candidates) {
      try {
        const res = await req("POST", url, payload);
        return res.data;
      } catch {
        // probar siguiente
      }
    }

    if (k === "alta_compania" || k === "enviar_poliza") {
      return this.update(id, { [k]: !!done });
    }

    return { id, [k]: !!done };
  },

  // -------- Documentos --------
  async listarDocs(solicitudId) {
    const res = await req("GET", `${DOCS}/`, undefined, { params: { solicitud: solicitudId } });
    return unwrapList(res.data);
  },

  async crearDoc(payload) {
    const res = await req("POST", `${DOCS}/`, payload);
    return res.data;
  },

  async eliminarDoc(id) {
    const res = await req("DELETE", `${DOCS}/${id}/`);
    return res.data;
  },

  async actualizarDoc(id, data) {
    const res = await req("PATCH", `${DOCS}/${id}/`, data);
    return res.data;
  },

  // -------- Empleados (catálogo) --------
  async empleadosListar(params = {}) {
    const res = await req("GET", `${EMP}/`, undefined, { params });
    return unwrapList(res.data);
  },

  async empleadosActivos() {
    const res = await req("GET", `${EMP}/activos/`);
    return unwrapList(res.data);
  },

  async crearEmpleado(body) {
    const res = await req("POST", `${EMP}/`, body);
    return res.data;
  },

  async actualizarEmpleado(id, body) {
    const res = await req("PATCH", `${EMP}/${id}/`, body);
    return res.data;
  },

  async eliminarEmpleado(id) {
    const res = await req("DELETE", `${EMP}/${id}/`);
    return res.data;
  },

  // -------- Asociar a póliza (GRANULAR) --------
  async asociarAPoliza(id, { poliza_id, modo = "copiar", incluir, cliente } = {}) {
    if (!poliza_id) throw new Error("Falta poliza_id");

    const payload = { poliza_id, modo };

    if (incluir && (Array.isArray(incluir.fotos) || Array.isArray(incluir.docs))) {
      const inc = {};
      if (Array.isArray(incluir.fotos) && incluir.fotos.length) inc.fotos = incluir.fotos;
      if (Array.isArray(incluir.docs) && incluir.docs.length) inc.docs = incluir.docs;
      if (Object.keys(inc).length) payload.incluir = inc;
    }

    if (cliente && typeof cliente === "object") {
      const c = {};
      ["dni_frente", "dni_dorso", "pasaporte_frente", "pasaporte_dorso"].forEach((k) => {
        if (k in cliente) c[k] = !!cliente[k];
      });
      if (Object.keys(c).length) payload.cliente = c;
    }

    const res = await req("POST", `${API}/${id}/asociar_a_poliza/`, payload);
    return res.data;
  },
};

export default solicitudesApi;