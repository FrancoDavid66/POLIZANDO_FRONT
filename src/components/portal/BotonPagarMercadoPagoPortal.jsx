// src/components/portal/BotonPagarMercadoPagoPortal.jsx
//
// Botón "Pagar con Mercado Pago" para el PORTAL DEL ASEGURADO (público).
// A diferencia del botón interno, este:
//   - NO manda token JWT (el portal es público, el cliente no está logueado).
//   - Manda el TOKEN del portal en la URL + el MONTO (a mano en modo prueba).
//   - Pega al endpoint público /public/pagos/portal/<token>/mp/crear-preferencia/
//
// 🔎 VERSIÓN CON DIAGNÓSTICO: hace console.log en cada paso. Abrí la consola
//    (F12 → Console) y tocá el botón: vas a ver exactamente dónde se corta.
//    Cuando funcione, te paso la versión limpia (sin logs).

import { useState } from "react";

// El portal vive FUERA de /api/ → base del backend sin /api (igual que
// PortalAseguradoPage.jsx arma PORTAL_BASE).
const API_ORIGIN = String(
  import.meta.env?.VITE_API_BASE ||
  import.meta.env?.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
).trim().replace(/\/+$/g, "").replace(/\/api$/i, "");

export default function BotonPagarMercadoPagoPortal({
  token,
  cuotaId,
  monto,
  disabled = false,
  className = "",
  onError,
}) {
  const [cargando, setCargando] = useState(false);

  const handlePagar = async () => {
    // 🔎 1) ¿Llega el clic?
    console.log("[MP-portal] CLIC en el botón", { token, cuotaId, monto, cargando, API_ORIGIN });

    if (!token) {
      console.warn("[MP-portal] ⛔ Falta el TOKEN del portal (prop token vacía). " +
        "Revisá que PortalAseguradoPage pase token={token} a <PortalHome/>.");
      alert("Falta el token del portal (revisar PortalAseguradoPage).");
      return;
    }
    if (!cuotaId) {
      console.warn("[MP-portal] ⛔ Falta cuotaId (la cuota no tiene id).");
      alert("No se pudo identificar la cuota.");
      return;
    }
    if (cargando) {
      console.log("[MP-portal] Ya estaba cargando, ignoro el clic.");
      return;
    }

    // Normaliza el monto: "47.000" / "47000" / 47000 → 47000
    const montoNum = Number(String(monto ?? "").replace(/\./g, "").replace(",", "."));
    console.log("[MP-portal] monto normalizado:", montoNum);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      const msg = "Ingresá un monto válido antes de pagar.";
      console.warn("[MP-portal] ⛔ Monto inválido:", monto);
      if (onError) onError(msg);
      else alert(msg);
      return;
    }

    const urlEndpoint = `${API_ORIGIN}/public/pagos/portal/${token}/mp/crear-preferencia/`;
    console.log("[MP-portal] 2) Voy a hacer fetch a:", urlEndpoint);

    setCargando(true);
    try {
      const resp = await fetch(urlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuota_id: cuotaId, monto: montoNum }),
      });

      console.log("[MP-portal] 3) Respondió el backend. status:", resp.status);

      const data = await resp.json().catch(() => ({}));
      console.log("[MP-portal] 4) Body de la respuesta:", data);

      if (!resp.ok) {
        const msg = data?.detail || "No se pudo generar el link de pago.";
        console.warn("[MP-portal] ⛔ El backend devolvió error:", resp.status, msg);
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      const url = data.init_point || data.sandbox_init_point;
      console.log("[MP-portal] 5) init_point:", url);
      if (!url) {
        const msg = "Mercado Pago no devolvió un link de pago válido.";
        console.warn("[MP-portal] ⛔ Sin init_point en la respuesta.");
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      console.log("[MP-portal] 6) ✅ Redirijo a Mercado Pago:", url);
      window.location.href = url;
    } catch (e) {
      console.error("[MP-portal] ⛔ Error de conexión en el fetch:", e);
      const msg = "Error de conexión al generar el pago.";
      if (onError) onError(msg);
      else alert(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePagar}
      disabled={disabled || cargando}
      className={
        "mt-4 w-full rounded-2xl bg-white py-3.5 font-heading text-[16px] font-extrabold text-[#c9511f] shadow-md transition hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed " +
        className
      }
    >
      {cargando ? "Generando link…" : "Pagar con Mercado Pago"}
    </button>
  );
}