// src/components/pagos/BotonPagarMercadoPago.jsx
import React, { useState } from "react";

/**
 * Botón "Pagar con Mercado Pago" para una cuota.
 *
 * Llama al backend para crear una preferencia de Checkout Pro y redirige
 * al cliente a la pantalla de pago de Mercado Pago.
 *
 * Props:
 *  - cuotaId   (number | string)  -> id de la cuota a cobrar (REQUERIDO)
 *  - disabled  (bool)             -> deshabilitar (ej: cuota ya pagada)
 *  - className (string)           -> clases extra opcionales
 *  - onError   (fn)               -> callback opcional (mensaje) => void
 *
 * Config:
 *  - API_BASE sale de import.meta.env.VITE_API_URL (Vite).
 *  - Manda el token JWT de localStorage ("access"). Si tu app usa el
 *    cliente `api` (axios) con interceptor, reemplazá el fetch por:
 *        const { data } = await api.post("/pagos/mp/crear-preferencia/", { cuota_id: cuotaId });
 *    y borrá el bloque de fetch/token de abajo.
 */

const API_BASE = (import.meta.env?.VITE_API_URL || "").replace(/\/+$/, "");

export default function BotonPagarMercadoPago({
  cuotaId,
  disabled = false,
  className = "",
  onError,
}) {
  const [cargando, setCargando] = useState(false);

  const handlePagar = async () => {
    if (!cuotaId || cargando) return;
    setCargando(true);
    try {
      const token = localStorage.getItem("access") || "";
      const resp = await fetch(`${API_BASE}/api/pagos/mp/crear-preferencia/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cuota_id: cuotaId }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg = data?.detail || "No se pudo generar el link de pago.";
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      // En producción usamos init_point; en sandbox, sandbox_init_point.
      const url = data.init_point || data.sandbox_init_point;
      if (!url) {
        const msg = "Mercado Pago no devolvió un link de pago válido.";
        if (onError) onError(msg);
        else alert(msg);
        return;
      }

      // Redirigimos al checkout de Mercado Pago.
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
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 " +
        "text-sm font-semibold text-white transition " +
        "bg-brand-primary hover:bg-brand-primary/90 " +
        "disabled:opacity-50 disabled:cursor-not-allowed " +
        className
      }
    >
      {cargando ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Generando link…
        </>
      ) : (
        <>Pagar con Mercado Pago</>
      )}
    </button>
  );
}