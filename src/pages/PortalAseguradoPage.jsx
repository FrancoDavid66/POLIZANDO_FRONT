// src/pages/PortalAseguradoPage.jsx
//
// Portal del Asegurado (PÚBLICO, sin login). El cliente entra por el link único
// que recibe por WhatsApp: /#/portal/<token>
// Ve sus pólizas vigentes, cuotas, papeles y puede avisar "Ya pagué" en las
// cuponeras de robo. Solo lectura (salvo el aviso de pago).
//
// Esta página es un ORQUESTADOR: guarda el estado y hace los fetch, pero toda
// la presentación vive en componentes hijos de src/components/portal/.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import polizandoLogo from "../assets/logos/polizando_logo.webp";
import {
  PortalHeader,
  PortalSplashLoading,
  PortalErrorState,
  PortalSinPolizas,
  PortalHome,
  PortalSubScreen,
  PortalCuponeraView,
  PolizaCard,
  ReciboModal,
  DocumentoModal,
  usePortalTheme,
} from "../components/portal";

// El portal vive FUERA de /api/ → armamos la base del backend sin /api
const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
).trim().replace(/\/+$/g, "").replace(/\/api$/i, "");
const PORTAL_BASE = `${API_ORIGIN}/public/portal`;

export default function PortalAseguradoPage() {
  const { token } = useParams();
  const { isDark, toggle: toggleTheme } = usePortalTheme();
  const [pantalla, setPantalla] = useState("home"); // "home" | "polizas" | "cuponera"
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [enviando, setEnviando] = useState({});
  const [reciboBusy, setReciboBusy] = useState(null);
  const [recibo, setRecibo] = useState(null);          // { cli, pol, cuota } recibo a previsualizar (HTML)
  const [descargandoRecibo, setDescargandoRecibo] = useState(false);
  const [verDoc, setVerDoc] = useState(null);          // { url, nombre } papel (PDF) a previsualizar

  const cerrarRecibo = () => setRecibo(null);

  // Descarga el recibo como PDF (se genera on-demand con react-pdf)
  const descargarReciboPDF = async () => {
    if (!recibo) return;
    setDescargandoRecibo(true);
    try {
      const [pdfMod, facturaMod, reactMod] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../components/pagos/FacturaCuotaPDF"),
        import("react"),
      ]);
      const { pdf } = pdfMod;
      const FacturaCuotaPDF = facturaMod.default;
      const doc = reactMod.createElement(FacturaCuotaPDF, { cliente: recibo.cli, poliza: recibo.pol, cuota: recibo.cuota });
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Recibo_cuota_${recibo.cuota.cuota_nro}_${recibo.pol.patente || recibo.pol.id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDescargandoRecibo(false);
    }
  };

  // Genera el recibo de una cuota pagada en el navegador del cliente (sin guardar nada).
  const handleRecibo = (cli, pol, cuota) => {
    setRecibo({ cli, pol, cuota });
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const res = await fetch(`${PORTAL_BASE}/${token}/`);
        if (!res.ok) throw new Error(res.status === 404 ? "Este link no es válido o expiró." : "No pudimos cargar tus datos.");
        const json = await res.json();
        if (vivo) setData(json);
      } catch (e) {
        if (vivo) setError(e.message || "Ocurrió un error.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [token]);

  const reportarPago = async (polizaId, cupon) => {
    setEnviando((m) => ({ ...m, [cupon.id]: true }));
    try {
      const res = await fetch(`${PORTAL_BASE}/${token}/cupon/${cupon.id}/reportar-pago/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "No se pudo registrar el aviso.");
      // Actualizamos el estado local del cupón
      setData((prev) => {
        if (!prev) return prev;
        const polizas = prev.polizas.map((p) => {
          if (p.id !== polizaId) return p;
          return {
            ...p,
            cupones_robo: p.cupones_robo.map((cp) =>
              cp.id === cupon.id ? { ...cp, estado: "REPORTADO", reportado: true } : cp
            ),
          };
        });
        return { ...prev, polizas };
      });
      toast.success("¡Gracias! Recibimos tu aviso. Lo verificamos y te confirmamos.");
    } catch (e) {
      toast.error(e.message || "Error al enviar el aviso.");
    } finally {
      setEnviando((m) => { const c = { ...m }; delete c[cupon.id]; return c; });
    }
  };

  // -------- Loading --------
  if (cargando) {
    return <PortalSplashLoading />;
  }

  // -------- Error --------
  if (error) {
    return <PortalErrorState mensaje={error} />;
  }

  const cliente = data?.cliente || {};
  const polizas = data?.polizas || [];
  const primerNombre = String(cliente.nombre || "").trim().split(/\s+/)[0] || "";

  const sinPolizas = polizas.length === 0;

  return (
    <div className="min-h-screen bg-brand-200 text-brand-100 dark:bg-brand-100 dark:text-brand-200">
      <AnimatePresence mode="wait" initial={false}>
        {pantalla === "home" || sinPolizas ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <PortalHeader
              nombre={primerNombre}
              cantidadPolizas={polizas.length}
              isDark={isDark}
              onToggleTheme={toggleTheme}
            />
            <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-10 lg:max-w-5xl lg:px-8">
              {sinPolizas ? (
                <PortalSinPolizas />
              ) : (
                <PortalHome
                  polizas={polizas}
                  onIrAPolizas={() => setPantalla("polizas")}
                  onIrACuponera={() => setPantalla("cuponera")}
                />
              )}
              <div className="mt-8 flex flex-col items-center gap-1.5 text-center">
                <img src={polizandoLogo} alt="Polizando" className="h-6 w-6 opacity-70" />
                <p className="text-[11px] font-medium text-brand-100/50 dark:text-brand-200/50">
                  Portal del asegurado · Polizando
                </p>
              </div>
            </div>
          </motion.div>
        ) : pantalla === "polizas" ? (
          <motion.div
            key="polizas"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <PortalSubScreen titulo="Mis pólizas" onVolver={() => setPantalla("home")}>
              <div
                className={
                  polizas.length > 1
                    ? "grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start lg:gap-6"
                    : "mx-auto grid max-w-md grid-cols-1 gap-5"
                }
              >
                {polizas.map((p, idx) => (
                  <PolizaCard
                    key={p.id}
                    poliza={p}
                    cliente={cliente}
                    index={idx}
                    enviando={enviando}
                    reciboBusy={reciboBusy}
                    onReportarPago={reportarPago}
                    onVerDoc={setVerDoc}
                    onRecibo={handleRecibo}
                  />
                ))}
              </div>
            </PortalSubScreen>
          </motion.div>
        ) : (
          <motion.div
            key="cuponera"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <PortalSubScreen titulo="Mi cuponera" onVolver={() => setPantalla("home")}>
              <PortalCuponeraView polizas={polizas} enviando={enviando} onReportarPago={reportarPago} />
            </PortalSubScreen>
          </motion.div>
        )}
      </AnimatePresence>

      <ReciboModal
        recibo={recibo}
        descargando={descargandoRecibo}
        onDescargar={descargarReciboPDF}
        onCerrar={cerrarRecibo}
      />

      <DocumentoModal doc={verDoc} onCerrar={() => setVerDoc(null)} />
    </div>
  );
}