// src/components/pagos/FacturaCuota.jsx
import React from "react";
import dayjs from "dayjs";
import polizandoLogo from "../../assets/logos/polizando_logo.webp";
import polizandoCabra from "../../assets/logos/polizando_cabrita.webp";

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : v;

const fmtMoney = (n) =>
  "$" + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(n || 0));

const fmtMoneyDecimal = (n) =>
  "AR$ " +
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    if (typeof d === "string") {
      const dateStr = d.slice(0, 10);
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        if (yyyy && mm && dd) {
          return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
        }
      }
    }
    const m = dayjs(d);
    if (!m.isValid()) return "—";
    return m.format("DD/MM/YYYY");
  } catch {
    return "—";
  }
};

const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const nombreMes = (d) => {
  if (!d) return "—";
  const m = dayjs(typeof d === "string" ? d.slice(0, 10) : d);
  if (!m.isValid()) return "—";
  return `${MESES_ES[m.month()]} ${m.year()}`;
};

const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const { fecha_vencimiento, fecha_pago } = cuota;
  if (!fecha_vencimiento || !fecha_pago) return false;
  const v = dayjs(fecha_vencimiento).startOf("day");
  const p = dayjs(fecha_pago).startOf("day");
  if (!v.isValid() || !p.isValid()) return false;
  return p.isAfter(v);
};

// 🚀 NUEVA FUNCIÓN: Suma 1 día (24hs)
const calcularDiaSiguienteStr = (fechaPago) => {
  if (!fechaPago) return "—";
  const d = new Date(fechaPago);
  if (isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Suma 48hs hábiles
const calcularRehabilitacionStr = (fechaPago) => {
  if (!fechaPago) return "—";
  const d = new Date(fechaPago);
  if (isNaN(d.getTime())) return "—";
  let added = 0;
  while (added < 2) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function FacturaCuota({ cliente, poliza, cuota, ocultarNumeroPoliza = false }) {
  if (!cliente || !poliza || !cuota) return null;

  const cuotaNroStr = String(safe(cuota.cuota_nro));
  const esPrimeraCuota = cuotaNroStr === "1";
  const pagoAtrasado = !esPrimeraCuota && isPagoAtrasado(cuota);

  const fechaDiaSiguiente = cuota.pagado
    ? calcularDiaSiguienteStr(cuota.pago_registrado_en || cuota.fecha_pago)
    : "—";

  const fechaRehabilitacion = cuota.pagado
    ? calcularRehabilitacionStr(cuota.pago_registrado_en || cuota.fecha_pago)
    : "—";

  const fechaPagoReal = cuota.pago_registrado_en || cuota.fecha_pago;
  const numeroRecibo = cuota.id != null ? `N° ${cuota.id}` : "N° —";

  const vehiculoStr = [safe(poliza.marca, ""), safe(poliza.modelo, "")]
    .filter(Boolean)
    .join(" ") || "—";
  const patenteStr = safe(poliza.patente, "");

  const formaPagoStr = cuota.forma_pago ? capitalizar(cuota.forma_pago) : "—";
  const whatsappStr = safe(poliza.oficina_whatsapp, "11 3946-2296");

  return (
    <div className="max-w-[640px] mx-auto rounded-[22px] bg-brand-card text-brand-100 shadow-[0_24px_60px_rgba(0,0,0,0.22)] overflow-hidden print:shadow-none">
      {/* ENCABEZADO verde */}
      <div className="relative bg-gradient-to-br from-brand-primary to-brand-primary-deep px-6 sm:px-8 pt-6 pb-6 overflow-hidden">
        <div
          className="absolute -bottom-16 -right-6 select-none pointer-events-none font-heading font-black text-white/[0.06] leading-[0.8]"
          style={{ fontSize: "180px" }}
          aria-hidden="true"
        >
          P
        </div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white p-1.5 shrink-0">
              <img src={polizandoLogo} alt="Polizando" className="w-full h-full object-contain" />
            </span>
            <div className="leading-tight">
              <div className="font-heading font-extrabold text-2xl sm:text-[26px] text-white">
                Polizando
              </div>
              <div className="font-body font-extrabold text-[9.5px] tracking-[0.14em] text-brand-secondary-soft mt-1">
                NO REGALÉS TU PLATA
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-body font-extrabold text-[13px] tracking-[0.14em] text-brand-secondary-soft">
              COMPROBANTE
            </div>
            <div className="font-heading font-extrabold text-xl sm:text-[22px] text-white mt-1.5">
              DE PAGO
            </div>
          </div>
        </div>
      </div>

      {/* META: número y fecha */}
      <div className="flex border-b border-brand-100/10">
        <div className="flex-1 px-6 sm:px-8 py-4 border-r border-brand-100/10">
          <div className="font-body font-extrabold text-[10px] tracking-[0.12em] text-brand-100/45">
            N.º DE RECIBO
          </div>
          <div className="font-heading font-extrabold text-lg sm:text-xl text-brand-100 mt-1.5">
            {numeroRecibo}
          </div>
        </div>
        <div className="flex-1 px-6 sm:px-8 py-4">
          <div className="font-body font-extrabold text-[10px] tracking-[0.12em] text-brand-100/45">
            FECHA DE PAGO
          </div>
          <div className="font-heading font-extrabold text-lg sm:text-xl text-brand-100 mt-1.5">
            {cuota.pagado && fechaPagoReal ? fmtDate(fechaPagoReal) : "—"}
          </div>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="px-6 sm:px-8 pt-5 pb-1.5">
        <div className="font-body font-extrabold text-[10px] tracking-[0.14em] text-brand-secondary mb-3.5">
          DATOS DEL CLIENTE
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <div className="font-body font-bold text-xs text-brand-100/50">Nombre y apellido</div>
            <div className="font-body font-extrabold text-[15px] sm:text-base text-brand-100 mt-1">
              {safe(cliente.nombre)} {safe(cliente.apellido)}
            </div>
          </div>
          <div>
            <div className="font-body font-bold text-xs text-brand-100/50">DNI</div>
            <div className="font-body font-extrabold text-[15px] sm:text-base text-brand-100 mt-1">
              {safe(cliente.dni_cuit_cuil)}
            </div>
          </div>
          {!ocultarNumeroPoliza && (
            <div>
              <div className="font-body font-bold text-xs text-brand-100/50">N.º de póliza</div>
              <div className="font-body font-extrabold text-[15px] sm:text-base text-brand-100 mt-1">
                {safe(poliza.numero_poliza)}
              </div>
            </div>
          )}
          <div>
            <div className="font-body font-bold text-xs text-brand-100/50">Vehículo</div>
            <div className="font-body font-extrabold text-[15px] sm:text-base text-brand-100 mt-1">
              {vehiculoStr}
              {patenteStr ? ` · ${patenteStr}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* DETALLE */}
      <div className="px-6 sm:px-8 pt-6 pb-1.5">
        <div className="font-body font-extrabold text-[10px] tracking-[0.14em] text-brand-secondary mb-3">
          DETALLE DEL PAGO
        </div>
        <div className="rounded-2xl border border-brand-100/10 overflow-hidden">
          <div className="flex justify-between px-5 py-3.5 bg-brand-200 font-body font-extrabold text-[11px] tracking-[0.06em] text-brand-100/55">
            <span>CONCEPTO</span>
            <span>IMPORTE</span>
          </div>
          <div className="flex justify-between items-center px-5 py-4 border-t border-brand-100/10">
            <div>
              <div className="font-heading font-extrabold text-base text-brand-100">
                Seguro de Auto
              </div>
              <div className="font-body font-bold text-[12.5px] text-brand-100/55 mt-0.5">
                Cuota {safe(cuota.cuota_nro)} · Período {nombreMes(cuota.fecha_vencimiento)}
              </div>
            </div>
            <div className="font-body font-extrabold text-base sm:text-lg text-brand-100">
              {fmtMoney(cuota.monto)}
            </div>
          </div>
          <div className="flex justify-between items-center px-5 py-3.5 border-t border-brand-100/10">
            <div className="font-body font-bold text-[13px] text-brand-100/70">Medio de pago</div>
            <div className="font-body font-extrabold text-sm text-brand-100">{formaPagoStr}</div>
          </div>
        </div>
      </div>

      {/* TOTAL + SELLO */}
      <div className="flex items-center gap-3 sm:gap-4 px-6 sm:px-8 pt-5 pb-1.5">
        <div
          className={`flex-none rotate-[-9deg] border-[3px] rounded-xl px-3 sm:px-4 py-2 font-heading font-extrabold text-lg sm:text-2xl tracking-wide opacity-90 ${
            cuota.pagado
              ? "border-brand-primary text-brand-primary"
              : "border-brand-secondary text-brand-secondary"
          }`}
        >
          {cuota.pagado ? "PAGADO" : "PENDIENTE"}
        </div>
        <div className="flex-1 bg-brand-primary rounded-2xl px-4 sm:px-6 py-4 flex justify-between items-center min-w-0">
          <span className="font-heading font-extrabold text-sm sm:text-[15px] text-brand-secondary-soft">
            {cuota.pagado ? "TOTAL PAGADO" : "TOTAL A PAGAR"}
          </span>
          <span className="font-body font-black text-2xl sm:text-4xl text-white tracking-tight truncate ml-2">
            {fmtMoney(cuota.monto)}
          </span>
        </div>
      </div>

      {/* VENCIMIENTO */}
      {cuota.fecha_vencimiento && (
        <div className="mx-6 sm:mx-8 mt-5 bg-[#fdf2ec] dark:bg-brand-secondary-soft/10 border border-brand-secondary/20 rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <span className="text-lg shrink-0" aria-hidden="true">📅</span>
          <div className="font-body font-bold text-[13.5px] leading-snug text-brand-100">
            {!cuota.pagado
              ? (
                <>
                  Vencimiento: <strong className="text-brand-secondary">{fmtDate(cuota.fecha_vencimiento)}</strong>. No te olvides de abonarla a tiempo.
                </>
              )
              : (
                <>
                  Vencimiento de esta cuota: <strong className="text-brand-secondary">{fmtDate(cuota.fecha_vencimiento)}</strong>.
                </>
              )}
          </div>
        </div>
      )}

      {/* ALERTA PRIMERA CUOTA */}
      {esPrimeraCuota && (
        <div className="mx-6 sm:mx-8 mt-4 rounded-2xl border border-sky-200 bg-sky-50 text-slate-700 text-sm px-4 py-3 text-justify">
          <p className="font-semibold uppercase text-xs tracking-wider mb-2 text-center text-slate-600">
            Aviso Legal: Inicio de Cobertura
          </p>
          <p>
            El cliente toma conocimiento de que su vehículo comenzará a tener cobertura a partir del{" "}
            <strong className="font-bold">día siguiente</strong> a la realización de este primer pago (Fecha
            estimada: <strong className="font-bold">{fechaDiaSiguiente}</strong>).
          </p>
        </div>
      )}

      {/* ALERTA PAGO ATRASADO */}
      {pagoAtrasado && (
        <div className="mx-6 sm:mx-8 mt-4 rounded-2xl border border-rose-200 bg-rose-50 text-slate-700 text-sm px-4 py-3 text-justify">
          <p className="font-semibold uppercase text-xs tracking-wider mb-2 text-center text-slate-600">
            Aviso Legal: Pago fuera de término
          </p>
          <p>
            El cliente acepta y confirma bajo juramento que{" "}
            <strong className="font-bold">NO ha tenido ningún siniestro ni reclamo</strong> en los días
            previos a este pago, durante los cuales la póliza se encontraba vencida.
          </p>
          <p className="mt-2">
            Asimismo, toma conocimiento de que la cobertura retomará su vigencia a partir del{" "}
            <strong className="font-bold">día siguiente o a las 48 horas hábiles</strong> de este pago (Fecha
            máxima estimada: <strong className="font-bold">{fechaRehabilitacion}</strong>), período en el
            cual <strong className="font-bold">TAMPOCO TENDRÁ COBERTURA</strong>.
          </p>
        </div>
      )}

      {/* PIE */}
      <div className="relative mt-6 bg-brand-200 px-6 sm:px-8 pt-5 pb-6 flex justify-between items-end gap-4 overflow-hidden">
        <div className="relative z-10 min-w-0">
          <div className="inline-block font-heading font-extrabold text-[13px] text-white bg-brand-primary px-4 py-2 rounded-full">
            ¡Gracias por confiar en Polizando!
          </div>
          <div className="font-body font-bold text-[12.5px] leading-relaxed text-brand-100/70 mt-3.5">
            WhatsApp <strong className="text-brand-100">{whatsappStr}</strong> · www.polizando.com
            <br />
            Comprobante válido como constancia de pago.
          </div>
          <div className="inline-flex items-center gap-2 mt-3.5 bg-white border border-brand-100/10 rounded-full py-1.5 pl-2.5 pr-3.5">
            <svg width="30" height="20" viewBox="0 0 30 20" className="rounded-sm block shrink-0">
              <rect width="30" height="20" fill="#fff" />
              <rect width="30" height="6.67" fill="#75AADB" />
              <rect y="13.33" width="30" height="6.67" fill="#75AADB" />
              <circle cx="15" cy="10" r="2.6" fill="#F6B40E" stroke="#85340A" strokeWidth="0.5" />
            </svg>
            <span className="font-body font-extrabold text-[11px] leading-tight text-brand-100">
              Las Malvinas
              <br />
              <span className="text-brand-100/60 font-bold">son argentinas 🇦🇷</span>
            </span>
          </div>
        </div>
        {/* Mascota "Polizando la cabra" */}
        <div className="relative z-10 shrink-0 w-[110px] sm:w-[150px] h-[90px] sm:h-[120px] -mb-6 flex items-end justify-center">
          <img
            src={polizandoCabra}
            alt="Polizando la cabra"
            className="w-full h-auto drop-shadow-[0_10px_12px_rgba(20,60,40,0.18)]"
          />
        </div>
      </div>
    </div>
  );
}