// src/components/portal/BotonPagarMercadoPagoPortal.jsx
//
// Botón "Pagar con Mercado Pago" para el PORTAL DEL ASEGURADO (público).
//   - NO manda token JWT (el portal es público).
//   - Manda el TOKEN del portal en la URL + cuota_nro + monto (a mano en prueba).
//   - El backend ubica la cuota por (token_portal + cuota_nro), NO necesita id.
//
// 🔎 VERSIÓN CON DIAGNÓSTICO: console.log en cada paso (F12 → Console).
//    Cuando funcione, te paso la versión limpia.

import { useState } from "react";

// El portal vive FUERA de /api/ → base del backend sin /api.
const API_ORIGIN = String(
  import.meta.env?.VITE_API_BASE ||
  import.meta.env?.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
).trim().replace(/\/+$/g, "").replace(/\/api$/i, "");

export default function BotonPagarMercadoPagoPortal({
  token,
  cuotaNro,
  cuotaId,      // opcional (atajo si el portal alguna vez lo manda)
  polizaId,     // ayuda a ubicar la cuota si el cliente tiene varias pólizas
  monto,
  disabled = false,
  className = "",
  onError,
}) {
  const [cargando, setCargando] = useState(false);

  const handlePagar = async () => {
    console.log("[MP-portal] CLIC", { token, cuotaNro, cuotaId, monto, API_ORIGIN });

    if (!token) {
      console.warn("[MP-portal] ⛔ Falta el TOKEN del portal.");
      alert("Falta el token del portal (revisar PortalAseguradoPage).");
      return;
    }
    // Necesitamos AL MENOS cuota_nro (o cuota_id).
    if ((cuotaNro === undefined || cuotaNro === null || cuotaNro === "") && !cuotaId) {
      console.warn("[MP-portal] ⛔ Falta cuotaNro y cuotaId (no se puede ubicar la cuota).");
      alert("No se pudo identificar la cuota.");
      return;
    }
    if (cargando) return;

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
    console.log("[MP-portal] fetch →", urlEndpoint);

    setCargando(true);
    try {
      const resp = await fetch(urlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuota_nro: cuotaNro,
          cuota_id: cuotaId,      // el backend lo ignora si viene undefined
          poliza_id: polizaId,    // idem
          monto: montoNum,
        }),
      });

      console.log("[MP-portal] status:", resp.status);
      const data = await resp.json().catch(() => ({}));
      console.log("[MP-portal] body:", data);

      if (!resp.ok) {
        const msg = data?.detail || "No se pudo generar el link de pago.";
        console.warn("[MP-portal] ⛔ Backend error:", resp.status, msg);
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      const url = data.init_point || data.sandbox_init_point;
      console.log("[MP-portal] init_point:", url);
      if (!url) {
        const msg = "Mercado Pago no devolvió un link de pago válido.";
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      console.log("[MP-portal] ✅ Redirijo a Mercado Pago");
      window.location.href = url;
    } catch (e) {
      console.error("[MP-portal] ⛔ Error de conexión:", e);
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