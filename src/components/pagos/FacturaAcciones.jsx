/* src/components/pagos/FacturaAcciones.jsx
   Fusión de DescargarFactura + EnviarFacturaWhatsapp: los dos generaban el
   mismo PDF (FacturaCuotaPDF) y compartían, literalmente copiados y pegados,
   los mismos helpers de fecha/hora y de nombre de archivo. Ahora esa lógica
   vive en un solo lugar y el componente renderiza los 2 botones juntos.
*/
import { useMemo, useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import { HiDownload, HiShare } from "react-icons/hi";
import FacturaCuotaPDF from "./FacturaCuotaPDF";
import { safeDateFromAny, formatHM, formatDate } from "../../utils/formatDate";

/* ===================== helpers compartidos ===================== */

function slug(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function fmtHM(dt) {
  return formatHM(dt);
}

function fmtFull(dt) {
  return formatDate(dt, { withTime: true, fallback: "" });
}

function pickPagoInfo(cuota) {
  if (!cuota) return { pago_hm: "", pago_hm_full: "", pago_dt_iso: null };
  const pago_hm = (cuota.pago_hm || "").toString();
  const pago_hm_full = (cuota.pago_hm_full || "").toString();
  const dtIso = cuota.pago_registrado_en || null;
  const d = safeDateFromAny(dtIso);
  const hm = pago_hm || (d ? fmtHM(d) : "");
  const full = pago_hm_full || (d ? fmtFull(d) : "");
  return { pago_hm: hm, pago_hm_full: full, pago_dt_iso: dtIso };
}

function nombreArchivo(cuota, poliza, pagoInfo) {
  const hmForName =
    (pagoInfo.pago_hm || "").replace(":", "") ||
    (() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      return `${hh}${mm}`;
    })();
  return `Factura_Cuota_${slug(cuota?.cuota_nro)}_${slug(poliza?.patente || poliza?.dominio || "")}_${new Date().toISOString().slice(0, 10)}_${hmForName}.pdf`;
}

/* Teléfonos AR para whatsapp://send?phone= */
function toWhatsappPhoneAR(raw) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `549${digits}`;
  if (digits.startsWith("54") && !digits.startsWith("549")) return `549${digits.slice(2)}`;
  if (digits.startsWith("549")) return digits;
  return null;
}

function useIsTabletOrMobile(breakpoint = 1024) {
  const [isSmall, setIsSmall] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth <= breakpoint;
  });
  useEffect(() => {
    function handleResize() { setIsSmall(window.innerWidth <= breakpoint); }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);
  return isSmall;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
}

/* ===================== componente ===================== */

/**
 * Props:
 * - cliente, poliza, cuota: objetos necesarios para construir el PDF
 * - className: estilos extra para cada botón (se suman)
 * - mostrarWhatsapp: si es false, solo se muestra el botón de descarga
 *   (el de WhatsApp igual se auto-oculta en desktop)
 */
export default function FacturaAcciones({
  cliente,
  poliza,
  cuota,
  className = "",
  mostrarWhatsapp = true,
}) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const isTabletOrMobile = useIsTabletOrMobile();

  const pagoInfo = useMemo(() => pickPagoInfo(cuota), [cuota]);

  const construirPdf = () => (
    <FacturaCuotaPDF
      cliente={cliente}
      poliza={poliza}
      cuota={cuota}
      pago_hm={pagoInfo.pago_hm}
      pago_hm_full={pagoInfo.pago_hm_full}
      pago_dt_iso={pagoInfo.pago_dt_iso}
    />
  );

  const handleDescargar = async () => {
    if (!cliente || !poliza || !cuota) return;
    try {
      setDownloading(true);
      const blob = await pdf(construirPdf()).toBlob();
      const url = URL.createObjectURL(blob);
      const nombre = nombreArchivo(cuota, poliza, pagoInfo);

      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generando factura:", err);
      alert("No se pudo generar la factura. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsapp = async () => {
    const clienteFinal = cliente || poliza?.cliente || cuota?.poliza?.cliente;
    const polizaFinal = poliza || cuota?.poliza;
    if (!cuota || !polizaFinal || !clienteFinal) {
      alert("Faltan datos de cliente/póliza/cuota para generar la factura.");
      return;
    }
    try {
      setSending(true);
      const blob = await pdf(construirPdf()).toBlob();
      const nombre = nombreArchivo(cuota, polizaFinal, pagoInfo);
      const file = new File([blob], nombre, { type: "application/pdf" });

      const telefonoCliente =
        clienteFinal?.telefono || clienteFinal?.celular ||
        polizaFinal?.cliente?.telefono || polizaFinal?.cliente?.celular ||
        cuota?.telefono;
      const waPhone = toWhatsappPhoneAR(telefonoCliente);
      const displayPhone = (telefonoCliente && String(telefonoCliente).trim()) || waPhone || "";

      if (waPhone && navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(waPhone); } catch {}
      }

      const mobile = isMobileDevice();

      if (mobile && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: nombre, text: displayPhone });
        return;
      }

      // Fallback (PC o sin Web Share): descarga el PDF + abre WhatsApp con el número
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (waPhone) {
        const waText = encodeURIComponent(displayPhone);
        window.open(`https://api.whatsapp.com/send?phone=${waPhone}&text=${waText}`, "_blank", "noopener,noreferrer");
      } else {
        alert("No se encontró un teléfono válido del cliente. El PDF igual se descargó; podés adjuntarlo manualmente.");
      }
    } catch (err) {
      console.error("Error al preparar la factura para WhatsApp:", err);
      alert("No se pudo preparar la factura. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDescargar}
        disabled={downloading}
        aria-busy={downloading ? "true" : "false"}
        className={`h-9 px-3 rounded-lg inline-flex items-center gap-1.5 justify-center transition-colors outline-none text-sm bg-brand-200/10 hover:bg-brand-200/15 border border-brand-200/10 text-brand-200/80 focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        title="Descargar factura (generada en tu dispositivo)"
      >
        <HiDownload className={downloading ? "animate-pulse" : ""} size={16} />
        {downloading ? "Generando…" : "PDF"}
      </button>

      {mostrarWhatsapp && isTabletOrMobile && (
        <button
          type="button"
          onClick={handleWhatsapp}
          disabled={sending}
          className={`h-9 px-3 rounded-lg inline-flex items-center gap-1.5 justify-center transition-colors outline-none text-sm bg-brand-primary/15 hover:bg-brand-primary/25 border border-brand-primary/30 text-brand-primary-tint focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
          title="Enviar por WhatsApp"
        >
          <HiShare size={16} />
          {sending ? "Preparando…" : "WhatsApp"}
        </button>
      )}
    </>
  );
}