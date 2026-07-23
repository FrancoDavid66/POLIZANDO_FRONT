// src/components/portal/PortalHome.jsx
//
// Pantalla inicial ("home") del Portal del Asegurado: saludo, tarjeta grande
// con la próxima cuota a pagar (la más próxima a vencer entre TODAS las
// pólizas del cliente) y accesos a "Mis pólizas" / "Mi cuponera". Look
// mobile-app, inspirado en el diseño de referencia del cliente.

import { motion } from "framer-motion";
import { HiChevronRight, HiDocumentText, HiTicket } from "react-icons/hi2";
import { FaCar } from "react-icons/fa";
import polizandoCabra from "../../assets/logos/polizando_cabrita.webp";
import { CARD, ESTADO_POLIZA, money, springPop } from "./portalUtils";

// Entre todas las pólizas, busca la cuota pendiente con vencimiento más
// próximo. Si no hay ninguna pendiente, no se muestra la tarjeta de cuota.
function buscarProximaCuota(polizas) {
  let mejor = null;
  for (const poliza of polizas) {
    const cuotas = poliza.cuotas || [];
    for (const cuota of cuotas) {
      if (cuota.pagado) continue;
      if (!cuota.fecha_vencimiento) continue;
      if (!mejor || new Date(cuota.fecha_vencimiento) < new Date(mejor.cuota.fecha_vencimiento)) {
        mejor = { cuota, poliza };
      }
    }
  }
  return mejor;
}

function nombreMesLargo(d) {
  if (!d) return "";
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const f = new Date(d);
  if (isNaN(f.getTime())) return "";
  return meses[f.getUTCMonth()] || meses[f.getMonth()];
}

function fmtCorta(d) {
  if (!d) return "—";
  const f = new Date(d);
  if (isNaN(f.getTime())) return "—";
  const dd = String(f.getUTCDate()).padStart(2, "0");
  const mm = String(f.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = f.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function PortalHome({ polizas, onIrAPolizas, onIrACuponera }) {
  const proxima = buscarProximaCuota(polizas);
  const totalCupones = polizas.reduce((acc, p) => acc + (p.cupones_robo?.length || 0), 0);
  const primeraPoliza = polizas[0];
  const est = primeraPoliza
    ? ESTADO_POLIZA[String(primeraPoliza.estado).toLowerCase()] || ESTADO_POLIZA.activa
    : null;

  return (
    <div className="mt-5 space-y-4">
      {/* CUOTA + PAGAR */}
      {proxima ? (
        <motion.div
          {...springPop}
          className="relative overflow-visible rounded-[24px] bg-gradient-to-br from-brand-secondary to-[#c9511f] p-6 text-white shadow-[0_16px_32px_-12px_rgba(226,98,44,0.45)]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[24px]">
            <div
              className="pointer-events-none absolute -bottom-9 -right-4 select-none font-heading font-black leading-[0.8] text-white/10"
              style={{ fontSize: "150px" }}
              aria-hidden="true"
            >
              P
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[13px] font-bold text-brand-secondary-soft">
              Tu cuota{nombreMesLargo(proxima.cuota.fecha_vencimiento) ? ` de ${nombreMesLargo(proxima.cuota.fecha_vencimiento)}` : ""}
            </p>
            <p className="mt-2 font-body text-[42px] font-black leading-none tracking-tight sm:text-[46px]">
              {money(proxima.cuota.monto)}
            </p>
            <p className="mt-1.5 text-xs font-bold text-brand-secondary-soft">
              Vence el {fmtCorta(proxima.cuota.fecha_vencimiento)}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              onClick={onIrAPolizas}
              className="mt-4 w-full rounded-2xl bg-white py-3.5 font-heading text-[16px] font-extrabold text-[#c9511f] shadow-md transition hover:brightness-105"
            >
              Pagar ahora
            </motion.button>
          </div>
          {/* Mascota "Polizando la cabra" asomando en la esquina superior de la tarjeta */}
          <div className="pointer-events-none absolute -top-6 -right-3 z-20 h-16 w-16 select-none overflow-hidden rounded-full border-[3px] border-white shadow-[0_8px_16px_rgba(0,0,0,0.28)] sm:h-[76px] sm:w-[76px]">
            <img
              src={polizandoCabra}
              alt="Polizando la cabra"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>
      ) : null}

      {/* DATOS DEL AUTO (primera póliza) */}
      {primeraPoliza ? (
        <motion.div {...springPop} transition={{ ...springPop.transition, delay: 0.06 }} className={`${CARD} p-4.5`}>
          <div className="mb-3.5 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
              <FaCar className="text-lg" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-[15px] font-bold text-brand-100 dark:text-brand-200">Tu auto</p>
              <p className="truncate text-[11.5px] font-semibold text-brand-100/50 dark:text-brand-200/50">
                {primeraPoliza.marca} {primeraPoliza.modelo}
                {primeraPoliza.patente ? ` · ${primeraPoliza.patente}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-black/[0.05] py-2 dark:border-white/5">
            <span className="text-[12.5px] font-semibold text-brand-100/55 dark:text-brand-200/55">Cobertura</span>
            <span className="text-[12.5px] font-extrabold text-brand-100 dark:text-brand-200">{primeraPoliza.cobertura || "—"}</span>
          </div>
          <div className="flex items-center justify-between border-t border-black/[0.05] py-2 dark:border-white/5">
            <span className="text-[12.5px] font-semibold text-brand-100/55 dark:text-brand-200/55">Póliza</span>
            <span className="text-[12.5px] font-extrabold text-brand-100 dark:text-brand-200">{primeraPoliza.numero_poliza || "—"}</span>
          </div>
          {est ? (
            <div className="flex items-center justify-between border-t border-black/[0.05] pt-2 dark:border-white/5">
              <span className="text-[12.5px] font-semibold text-brand-100/55 dark:text-brand-200/55">Estado</span>
              <span className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-brand-primary dark:text-emerald-300">
                <span className={`h-1.5 w-1.5 rounded-full ${est.dot}`} /> {est.label}
              </span>
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {/* MIS POLIZAS */}
      <motion.button
        {...springPop}
        transition={{ ...springPop.transition, delay: 0.1 }}
        whileTap={{ scale: 0.98 }}
        onClick={onIrAPolizas}
        className={`${CARD} flex w-full items-center gap-3.5 p-4 text-left transition hover:brightness-[0.99]`}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
          <HiDocumentText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold text-brand-100 dark:text-brand-200">Mis pólizas</p>
          <p className="text-[11.5px] font-semibold text-brand-100/50 dark:text-brand-200/50">
            {polizas.length} {polizas.length === 1 ? "seguro activo" : "seguros activos"}
          </p>
        </div>
        <HiChevronRight className="h-5 w-5 shrink-0 text-brand-100/30 dark:text-brand-200/30" />
      </motion.button>

      {/* MI CUPONERA */}
      <motion.button
        {...springPop}
        transition={{ ...springPop.transition, delay: 0.14 }}
        whileTap={{ scale: 0.98 }}
        onClick={onIrACuponera}
        className={`${CARD} flex w-full items-center gap-3.5 p-4 text-left transition hover:brightness-[0.99]`}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-secondary/10 text-brand-secondary dark:bg-brand-secondary/15">
          <HiTicket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold text-brand-100 dark:text-brand-200">Mi cuponera</p>
          <p className="text-[11.5px] font-semibold text-brand-100/50 dark:text-brand-200/50">
            Cupones de pago {new Date().getFullYear()}
            {totalCupones ? ` · ${totalCupones}` : ""}
          </p>
        </div>
        <HiChevronRight className="h-5 w-5 shrink-0 text-brand-100/30 dark:text-brand-200/30" />
      </motion.button>

      <p className="pt-2 text-center font-heading text-xs font-extrabold text-brand-primary dark:text-emerald-300">
        No regalés tu plata 🐐
      </p>
    </div>
  );
}