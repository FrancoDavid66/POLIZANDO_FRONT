// src/components/portal/BotonPagarMercadoPagoPortal.jsx
//
// Botón "Pagar con Mercado Pago" para el PORTAL DEL ASEGURADO (público).
// A diferencia del botón interno, este:
//   - NO manda token JWT (el portal es público, el cliente no está logueado).
//   - Manda el TOKEN del portal en la URL + el MONTO (a mano en modo prueba).
//   - Pega al endpoint público /public/pagos/portal/<token>/mp/crear-preferencia/
//
// Look "fintech" a juego con el portal (blanco sobre el hero naranja).

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
    if (!token || !cuotaId || cargando) return;

    // Normaliza el monto: "47.000" / "47000" / 47000 → 47000
    const montoNum = Number(String(monto ?? "").replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      const msg = "Ingresá un monto válido antes de pagar.";
      if (onError) onError(msg);
      else alert(msg);
      return;
    }

    setCargando(true);
    try {
      const resp = await fetch(
        `${API_ORIGIN}/public/pagos/portal/${token}/mp/crear-preferencia/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cuota_id: cuotaId, monto: montoNum }),
        }
      );

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg = data?.detail || "No se pudo generar el link de pago.";
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      const url = data.init_point || data.sandbox_init_point;
      if (!url) {
        const msg = "Mercado Pago no devolvió un link de pago válido.";
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      window.location.href = url;
    } catch (e) {
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