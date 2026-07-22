// src/components/pagos/HistorialPagosTab.jsx
//
// Extraído de PagosPage.jsx. Simplificado a pedido: sin el workflow de
// verificación (antes tenía 5 estados con dropdown + contadores clickables).
// Ahora es una lista simple de pagos con filtros por período/búsqueda y
// paginación — nada más. Mismo patrón que CuotasAlertas/HistorialRecordatorios:
// hace sus propios dispatch/useSelector, PagosPage solo lo renderiza sin props.
import { useState, useMemo, useCallback, useEffect, useDeferredValue, useTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiSearch, HiRefresh, HiChevronLeft, HiChevronRight,
} from "react-icons/hi";

import { fetchHistorialPagos } from "../../store/slices/pagosSlice";

/* ── Helpers de fecha propios de esta pestaña ── */
const monthKey = (d) => dayjs(d).format("YYYY-MM");
const ymd = (d) => dayjs(d).format("YYYY-MM-DD");
const monthLabel = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!y || !m) return String(ym || "");
  const d = dayjs(`${y}-${m}-01`);
  return d.isValid() ? d.format("MMMM YYYY") : String(ym || "");
};

const safe = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

/* ── Timestamp de registro del pago ── */
function pickRegistroTs(it) {
  const v = it?.pago_registrado_en ?? it?.registrado_en ?? it?.pago_ts ?? null;
  if (v) return v;

  const f = it?.fecha_guardado_pago || "";
  const h = it?.hora_guardado_pago || it?.pago_hora || "";
  if (f && h) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(f).trim());
    if (m) return `${m[3]}-${m[2]}-${m[1]}T${String(h).trim()}:00`;
  }
  return null;
}

function fmtRegistro(it) {
  const ts = pickRegistroTs(it);
  if (!ts) {
    const f = String(it?.fecha_guardado_pago || "").trim();
    const h = String(it?.pago_hora || it?.hora_guardado_pago || "").trim();
    if (f && h) return `${f} ${h}`;
    if (f) return f;
    if (h) return h;
    return "—";
  }

  const d = dayjs(ts);
  if (d.isValid()) return d.format("DD/MM/YYYY HH:mm");

  try {
    const s = String(ts);
    if (s.includes("T")) {
      const [datePart, timePart] = s.split("T");
      const dd = dayjs(datePart).isValid()
        ? dayjs(datePart).format("DD/MM/YYYY")
        : datePart;
      const hhmm = (timePart || "").slice(0, 5);
      return `${dd} ${hhmm}`.trim();
    }
    return s;
  } catch {
    return "—";
  }
}

/* ── Extracción flexible de datos (la API puede mandar formas distintas) ── */
function extractHpMonto(it) {
  const monto = it?.monto_pagado ?? it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
  const n = Number(monto);
  return Number.isFinite(n) ? n : null;
}

function extractHpCliente(it) {
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  const cli = pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null;
  const apellido = String(cli?.apellido ?? pol?.cliente_apellido ?? it?.cliente_apellido ?? "").trim();
  const nombre = String(cli?.nombre ?? pol?.cliente_nombre ?? it?.cliente_nombre ?? "").trim();
  const asegurado = String(
      pol?.cliente_nombre_apellido ?? pol?.cliente_nombre_completo ??
      it?.cliente_nombre_apellido ?? it?.cliente_nombre_completo ??
      pol?.asegurado_nombre ?? pol?.asegurado ?? it?.asegurado ?? ""
    ).trim();
  const full = `${apellido} ${nombre}`.trim();
  const label = full || asegurado || "Cliente";
  const dni = String(cli?.dni_cuit_cuil ?? pol?.cliente_dni ?? it?.cliente_dni ?? it?.dni ?? it?.dni_cuit_cuil ?? "").trim();
  const tel = String(cli?.telefono ?? pol?.cliente_telefono ?? it?.cliente_telefono ?? it?.telefono ?? "").trim();
  return { label, dni, tel };
}

function extractHpPoliza(it) {
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  const polizaId = pol?.id ?? it?.poliza_id ?? null;
  const patente = String(pol?.patente ?? it?.patente ?? "").trim().toUpperCase();
  const numero = String(pol?.numero_poliza ?? it?.numero_poliza ?? "").trim();
  const compania = String(pol?.compania_nombre ?? it?.compania_nombre ?? it?.compania ?? "").trim();
  const oficina = String(pol?.oficina ?? it?.oficina ?? "").trim();
  const marca = String(pol?.marca ?? it?.marca ?? "").trim();
  const modelo = String(pol?.modelo ?? it?.modelo ?? "").trim();
  const titulo = [patente || null, numero ? `N° ${numero}` : null, compania || null].filter(Boolean).join(" • ");
  const subtitulo = [marca || null, modelo || null].filter(Boolean).join(" ");
  return { polizaId, patente, numero, compania, oficina, titulo: titulo || "Póliza", subtitulo };
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function HistorialPagosTab() {
  const dispatch = useDispatch();
  const [, startTransition] = useTransition();

  const {
    historialPagosItems = [],
    historialPagosMeta = { count: 0, next: null, previous: null },
    historialPagosStatus = "idle",
  } = useSelector((state) => state.pagos || {});

  const loadingHistorialPagos = historialPagosStatus === "loading";

  const [hpModo, setHpModo] = useState("MES");
  const [hpMes, setHpMes] = useState(monthKey(new Date()));
  const [hpDia, setHpDia] = useState(ymd(new Date()));
  const [hpDesde, setHpDesde] = useState(ymd(dayjs().startOf("month")));
  const [hpHasta, setHpHasta] = useState(ymd(new Date()));

  const [hpQInput, setHpQInput] = useState("");
  const [hpQApplied, setHpQApplied] = useState("");
  const [hpPage, setHpPage] = useState(1);
  const hpPageSize = 25;
  const [hpOrdering] = useState("-fecha_pago");
  const deferredHpQInput = useDeferredValue(hpQInput);

  const mesesOptions = useMemo(() => {
    const out = [];
    const base = dayjs().startOf("month");
    for (let i = 0; i < 18; i++) out.push(base.subtract(i, "month").format("YYYY-MM"));
    return out;
  }, []);

  const buildHistorialParams = useCallback(
    (extra = null) => {
      const base = {
        q: hpQApplied || undefined,
        page: hpPage,
        page_size: hpPageSize,
        ordering: hpOrdering || "-fecha_pago",
      };
      let out;
      if (hpModo === "DIA") {
        out = { ...base, dia: hpDia, mes: undefined, desde: undefined, hasta: undefined };
      } else if (hpModo === "RANGO") {
        out = { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined, mes: undefined, dia: undefined };
      } else {
        out = { ...base, mes: hpMes, dia: undefined, desde: undefined, hasta: undefined };
      }
      if (extra && typeof extra === "object") out = { ...out, ...extra };
      return out;
    },
    [hpModo, hpQApplied, hpPage, hpPageSize, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]
  );

  useEffect(() => {
    dispatch(fetchHistorialPagos(buildHistorialParams()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, buildHistorialParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = String(deferredHpQInput || "").trim();
      startTransition(() => {
        setHpQApplied(next);
        setHpPage(1);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [deferredHpQInput, startTransition]);

  const totalPagesHistorial = useMemo(() => {
    const count = Number(historialPagosMeta?.count || 0) || 0;
    const ps = Number(hpPageSize || 25) || 25;
    return Math.max(1, Math.ceil(count / ps));
  }, [historialPagosMeta, hpPageSize]);

  useEffect(() => {
    setHpPage((p) => {
      const n = Number(p || 1) || 1;
      const max = Number(totalPagesHistorial || 1) || 1;
      if (n < 1) return 1;
      if (n > max) return max;
      return n;
    });
  }, [totalPagesHistorial]);

  const setModo = useCallback((m) => {
    setHpModo(m);
    setHpPage(1);
  }, []);

  const onPrevPage = useCallback(() => {
    setHpPage((p) => Math.max(1, (Number(p) || 1) - 1));
  }, []);
  const onNextPage = useCallback(() => {
    setHpPage((p) => Math.min(totalPagesHistorial, (Number(p) || 1) + 1));
  }, [totalPagesHistorial]);

  const historialItems = Array.isArray(historialPagosItems) ? historialPagosItems : [];

  const handleRefreshHistorialPagos = useCallback(() => {
    dispatch(fetchHistorialPagos(buildHistorialParams({ force: true })));
  }, [dispatch, buildHistorialParams]);

  return (
    <motion.div
      key="tab-historial-pagos"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* ╔═══════════════════════════════════════════════════════╗
          ║  BARRA DE FILTROS — compacta y elegante               ║
          ╚═══════════════════════════════════════════════════════╝ */}
      <div className="bg-brand-200/[0.03] border border-brand-200/10 rounded-2xl p-3 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Selector de período */}
          <div className="inline-flex p-0.5 rounded-xl bg-brand-200/[0.03] border border-brand-200/10">
            {["MES", "DIA", "RANGO"].map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  hpModo === m
                    ? "bg-brand-200/10 text-brand-200 shadow-sm"
                    : "text-brand-200/50 hover:text-brand-200/90"
                }`}
              >
                {m === "MES" ? "Mes" : m === "DIA" ? "Día" : "Rango"}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className="flex-1">
            {hpModo === "MES" ? (
              <select value={hpMes} onChange={(e) => { setHpMes(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200 px-3 text-sm focus:border-brand-secondary/40 focus:outline-none transition">
                {mesesOptions.map((ym) => <option key={ym} value={ym}>{monthLabel(ym)}</option>)}
              </select>
            ) : hpModo === "DIA" ? (
              <input type="date" value={hpDia} onChange={(e) => { setHpDia(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200 px-3 text-sm focus:border-brand-secondary/40 focus:outline-none transition" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={hpDesde} onChange={(e) => { setHpDesde(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200 px-3 text-sm focus:border-brand-secondary/40 focus:outline-none transition" />
                <input type="date" value={hpHasta} onChange={(e) => { setHpHasta(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200 px-3 text-sm focus:border-brand-secondary/40 focus:outline-none transition" />
              </div>
            )}
          </div>

          {/* Búsqueda */}
          <div className="relative flex-1 lg:max-w-xs">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-200/40 w-4 h-4" />
            <input value={hpQInput} onChange={(e) => setHpQInput(e.target.value)} placeholder="Patente, DNI, nombre..." className="w-full h-9 pl-9 pr-3 rounded-xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200 text-sm placeholder:text-brand-200/30 focus:border-brand-secondary/40 focus:outline-none transition" />
          </div>

          {/* Refresh */}
          <button onClick={handleRefreshHistorialPagos} className="h-9 px-3 rounded-xl bg-brand-200/[0.03] border border-brand-200/10 text-brand-200/75 hover:text-white hover:border-brand-secondary/30 inline-flex items-center justify-center gap-2 text-sm transition cursor-pointer">
            <HiRefresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ╔═══════════════════════════════════════════════════════╗
          ║  TABLA DE PAGOS — lista simple, sin estados           ║
          ╚═══════════════════════════════════════════════════════╝ */}
      <div className="bg-brand-200/[0.03] border border-brand-200/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-200/10 bg-brand-200/[0.02]">
          <div className="text-sm font-semibold text-brand-200">Pagos</div>
          <div className="text-xs text-brand-200/50 tabular-nums">
            {historialItems.length} en esta página
          </div>
        </div>

        {historialItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-14 w-14 rounded-full bg-brand-200/8 items-center justify-center mb-3">
              <HiSearch className="w-6 h-6 text-brand-200/50" />
            </div>
            <p className="text-sm text-brand-200/50">No hay pagos para mostrar.</p>
            <p className="text-xs text-brand-200/30 mt-1">Probá ajustar los filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-200/8">
            {historialItems.map((it, idx) => {
              const c = extractHpCliente(it);
              const monto = extractHpMonto(it);
              const pol = extractHpPoliza(it);
              const pagoId = it?.id ?? it?.pago_id ?? null;

              return (
                <motion.div
                  key={`hp-${pagoId || idx}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.015 }}
                  className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-brand-200/[0.06] transition-colors"
                >
                  {/* Patente + Compañía */}
                  <div className="col-span-12 sm:col-span-4 flex flex-col gap-1">
                    <div className="text-[13px] font-mono font-bold text-brand-secondary-tint uppercase bg-brand-secondary/10 px-2.5 py-1 rounded-md border border-brand-secondary/20 tracking-wider truncate text-center">
                      {pol.patente || "S/P"}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      {pol.compania && (
                        <span className="text-[10px] font-bold text-brand-secondary-tint bg-brand-secondary/10 px-1.5 py-0.5 rounded border border-brand-secondary/20 truncate max-w-full">
                          {pol.compania}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cliente + DNI */}
                  <div className="col-span-12 sm:col-span-4 min-w-0 flex flex-col justify-center">
                    <div className="text-sm font-semibold text-brand-200 truncate">{c.label}</div>
                    <div className="text-[11px] text-brand-200/50 mt-0.5">
                      DNI {safe(c.dni)}
                    </div>
                  </div>

                  {/* Monto + fecha */}
                  <div className="col-span-12 sm:col-span-4 text-right flex flex-col justify-center">
                    <div className="text-sm font-bold text-brand-primary-tint tabular-nums">${monto}</div>
                    <div className="text-[10px] text-brand-200/50 mt-0.5">{fmtRegistro(it)}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {historialItems.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-brand-200/10 bg-brand-200/[0.02]">
            <button
              onClick={onPrevPage}
              disabled={hpPage <= 1}
              className="h-8 px-3 rounded-lg border border-brand-200/10 bg-brand-card-dark text-brand-200/75 text-xs hover:border-brand-secondary/30 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center gap-1"
            >
              <HiChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs text-brand-200/50 tabular-nums">
              Página {hpPage} de {totalPagesHistorial}
            </span>
            <button
              onClick={onNextPage}
              disabled={hpPage >= totalPagesHistorial}
              className="h-8 px-3 rounded-lg border border-brand-200/10 bg-brand-card-dark text-brand-200/75 text-xs hover:border-brand-secondary/30 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center gap-1"
            >
              Siguiente <HiChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}