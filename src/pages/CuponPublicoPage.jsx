// src/pages/CuponPublicoPage.jsx
//
// Página PÚBLICA (sin login) donde el cliente ve los cupones de su póliza de robo
// y confirma el pago tocando "Ya pagué". Se entra por el link /cupon/:token.
//
// El token viene en la URL y es la llave: no hace falta usuario ni contraseña.

import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { HiCheckCircle, HiClock, HiExclamationCircle } from "react-icons/hi";
import polizandoLogo from "../assets/logos/polizando_logo.webp";

// Base de la API (misma var que el resto del front). Le sacamos un /api final
// si viniera incluido, y armamos la ruta pública del portal.
const RAW = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "";
const ROOT = String(RAW).trim().replace(/\/+$/, "").replace(/\/api\/?$/i, "");
const API = (ROOT || "") + "/api/polizas/portal/cupon";

function fmtFecha(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).split("-");
  return d && m ? `${d}/${m}/${y}` : s;
}
function fmtMonto(v) {
  if (v == null) return "—";
  const n = Number(v);
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const BADGE = {
  PENDIENTE: { txt: "Pendiente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300" },
  REPORTADO: { txt: "Aviso recibido", cls: "bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300" },
  PAGADA:    { txt: "Pagado", cls: "bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300" },
  VENCIDA:   { txt: "Vencido", cls: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300" },
};

const CARD =
  "rounded-3xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(20,20,20,0.04),0_8px_24px_-12px_rgba(31,122,76,0.18)] dark:border-white/[0.06] dark:bg-[#2c241d] dark:shadow-none";

export default function CuponPublicoPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(null); // id del cupón que se está reportando

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/${token}/`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("No encontramos esta póliza.");
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Hubo un problema al cargar tus cupones.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const reportar = async (cupon_id) => {
    setEnviando(cupon_id);
    try {
      const res = await fetch(`${API}/${token}/reportar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ cupon_id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo registrar.");
      // Actualizamos el estado local del cupón a REPORTADO
      setData((prev) => ({
        ...prev,
        cupones: prev.cupones.map((c) =>
          c.id === cupon_id ? { ...c, estado: "REPORTADO" } : c
        ),
      }));
    } catch (e) {
      alert(e.message || "No se pudo registrar el pago. Probá de nuevo.");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-brand-200 px-4 py-8 dark:bg-brand-100">
      <div className="w-full max-w-md">

        {/* Header con identidad Polizando */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-6 flex items-center justify-center gap-2.5"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white p-1.5 shadow-md shadow-brand-primary/15">
            <img src={polizandoLogo} alt="Polizando" className="h-full w-full object-contain" />
          </div>
          <span className="font-heading text-lg font-extrabold text-brand-100 dark:text-brand-200">Polizando</span>
        </motion.div>

        {loading && (
          <div className={`${CARD} p-8 text-center text-brand-100/60 dark:text-brand-200/60`}>
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
            Cargando tus cupones…
          </div>
        )}

        {!loading && error && (
          <div className={`${CARD} p-8 text-center`}>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 text-rose-500">
              <HiExclamationCircle className="h-6 w-6" />
            </div>
            <p className="mb-1 font-semibold text-rose-600 dark:text-rose-400">No pudimos abrir tus cupones</p>
            <p className="text-sm text-brand-100/60 dark:text-brand-200/60">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`${CARD} overflow-hidden`}
          >
            {/* Datos */}
            <div className="border-b border-black/[0.04] bg-gradient-to-br from-brand-primary/[0.07] to-brand-secondary/[0.05] p-5 dark:border-white/5">
              <p className="text-sm text-brand-100/60 dark:text-brand-200/60">Hola{data.nombre ? `, ${data.nombre}` : ""} 👋</p>
              <p className="mt-0.5 font-heading text-lg font-bold leading-tight text-brand-100 dark:text-brand-200">{data.vehiculo}</p>
              <p className="text-sm text-brand-100/60 dark:text-brand-200/60">Patente {data.patente}</p>
            </div>

            {/* Cupones */}
            <div className="space-y-3 p-4">
              <p className="px-1 text-xs font-bold uppercase tracking-wider text-brand-100/40 dark:text-brand-200/40">Tus cupones</p>

              {data.cupones.length === 0 && (
                <p className="px-1 py-4 text-center text-sm text-brand-100/50 dark:text-brand-200/50">No hay cupones cargados todavía.</p>
              )}

              {data.cupones.map((c) => {
                const badge = BADGE[c.estado] || BADGE.PENDIENTE;
                const puedeReportar = c.estado === "PENDIENTE" || c.estado === "VENCIDA";
                return (
                  <div key={c.id} className="rounded-2xl border border-black/[0.05] bg-black/[0.015] p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-100 dark:text-brand-200">
                        Vence {fmtFecha(c.fecha_vencimiento)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                        {badge.txt}
                      </span>
                    </div>
                    <p className="mb-3 text-2xl font-black text-brand-100 dark:text-brand-200">{fmtMonto(c.monto)}</p>

                    {puedeReportar && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => reportar(c.id)}
                        disabled={enviando === c.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-deep py-3 font-semibold text-white shadow-sm shadow-brand-primary/25 transition hover:brightness-105 disabled:opacity-60"
                      >
                        {enviando === c.id ? (
                          "Registrando…"
                        ) : (
                          <>
                            <HiCheckCircle className="h-5 w-5" /> Ya pagué
                          </>
                        )}
                      </motion.button>
                    )}
                    {c.estado === "REPORTADO" && (
                      <p className="flex items-center justify-center gap-1.5 py-2 text-center text-sm font-medium text-sky-600 dark:text-sky-300">
                        <HiClock className="h-4 w-4" /> ¡Gracias! Ya recibimos tu aviso 🙌
                      </p>
                    )}
                    {c.estado === "PAGADA" && (
                      <p className="flex items-center justify-center gap-1.5 py-2 text-center text-sm font-medium text-brand-primary dark:text-emerald-300">
                        <HiCheckCircle className="h-4 w-4" /> Pago confirmado
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-black/[0.04] bg-black/[0.015] px-5 py-4 dark:border-white/5 dark:bg-white/[0.02]">
              <p className="text-center text-xs leading-relaxed text-brand-100/50 dark:text-brand-200/50">
                Pagá el cupón en Rapipago, Pago Fácil o Mercado Pago, y después tocá "Ya pagué".
                Nosotros lo verificamos. 🙌
              </p>
            </div>
          </motion.div>
        )}

        <div className="mt-6 flex justify-center">
          <img src={polizandoLogo} alt="Polizando" className="h-5 w-5 opacity-60" />
        </div>
      </div>
    </div>
  );
}
