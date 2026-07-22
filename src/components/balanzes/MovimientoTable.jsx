// src/components/balanzes/MovimientoTable.jsx
// 🚀 UNIFICADO: reemplaza IngresoTable.jsx + EgresoTable.jsx
// Uso:
//   <MovimientoTable tipo="ingreso" items={arr} />   (controlado por props)
//   <MovimientoTable tipo="egreso" />                 (controlado por store, con paginación)
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");
import { HiClock, HiPencil, HiTrash, HiUser, HiOfficeBuilding, HiOutlineExternalLink } from "react-icons/hi";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  fetchIngresos, deleteIngreso,
  fetchEgresos, deleteEgreso,
} from "../../store/slices/cajaSlices";
import MovimientoModal from "./MovimientoModal";

/* ── Config por tipo (clases Tailwind COMPLETAS para que no las purgue) ── */
const CONF = {
  ingreso: {
    label: "Ingresos",
    slice: "ingresos",
    fetchAll: fetchIngresos,
    deleteOne: deleteIngreso,
    signo: "+",
    // colores
    montoText: "text-emerald-400",
    montoBig: "text-emerald-400",
    theadRow: "bg-emerald-600/95 text-white",
    tfootRow: "bg-emerald-900/30 border-t border-emerald-800/50",
    tfootText: "text-emerald-300",
    tfootTextMobile: "text-emerald-400",
    editHover: "hover:bg-emerald-600",
    billeteraBadge: "text-sky-400/80 bg-sky-950/40 border-sky-800/40",
    // comportamiento
    mostrarPagadoPor: true,
    confirmDeleteModal: false, // ingreso usa window.confirm inline
  },
  egreso: {
    label: "Egresos",
    slice: "egresos",
    fetchAll: fetchEgresos,
    deleteOne: deleteEgreso,
    signo: "-",
    montoText: "text-rose-400",
    montoBig: "text-rose-400",
    theadRow: "bg-zinc-900 text-zinc-500",
    tfootRow: "border-t border-zinc-800 bg-zinc-900/60",
    tfootText: "text-rose-400",
    tfootTextMobile: "text-rose-400",
    editHover: "hover:bg-emerald-700",
    billeteraBadge: "text-rose-400/80 bg-rose-950/40 border-rose-800/40",
    mostrarPagadoPor: false,
    confirmDeleteModal: true, // egreso usa modal de confirmación
  },
};

const fmtMoney = (n) => {
  const numeroLimpio = Number(String(n || "0").replace(",", "."));
  return (Number.isFinite(numeroLimpio) ? numeroLimpio : 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const MovimientoTable = ({ tipo = "ingreso", items: itemsProp, className = "" }) => {
  const conf = CONF[tipo] || CONF.ingreso;
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  // ---- STORE (modo paginado) ----
  const {
    list: itemsStore = [],
    status = "idle",
    error = null,
    next = null,
    previous = null,
    currentPage = 1,
  } = useSelector((s) => s[conf.slice] || {});

  const [page, setPage] = useState(currentPage || 1);
  useEffect(() => {
    if (!Array.isArray(itemsProp)) {
      dispatch(conf.fetchAll({ page }));
    }
  }, [dispatch, page, itemsProp, conf]);

  const [itemAEditar, setItemAEditar] = useState(null);
  const [filtroForma, setFiltroForma] = useState("TODAS");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const data = Array.isArray(itemsProp) ? itemsProp : itemsStore;

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (filtroForma === "TODAS") return data;
    return data.filter((it) => {
      const forma = (it?.forma_pago || "EFECTIVO").toUpperCase();
      return forma === filtroForma;
    });
  }, [data, filtroForma]);

  const renderFechaConHora = (item) => {
    if (!item?.fecha) return "—";
    const fechaCorta = dayjs(item.fecha).format("DD/MM/YYYY");
    const hora = item.created_at ? dayjs(item.created_at).format("HH:mm") : null;
    return (
      <div className="flex flex-col">
        <span className="text-zinc-300 font-medium">{fechaCorta}</span>
        {hora && <span className="text-[10px] text-zinc-500 mt-0.5">{hora} hs</span>}
      </div>
    );
  };

  const renderFormaPago = (formaRaw) => {
    const forma = (formaRaw || "EFECTIVO").toUpperCase();
    if (forma === "EFECTIVO") {
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
          💵 EFECTIVO
        </span>
      );
    }
    if (forma === "TRANSFERENCIA") {
      return (
        <span className="inline-flex items-center gap-1.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
          🏦 TRANSF.
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-zinc-700/50 text-zinc-300 border border-zinc-600 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
        💳 {forma}
      </span>
    );
  };

  // 🚀 Descripción con link a póliza (ingreso: link solo en la palabra "Póliza")
  const renderDescripcionIngreso = (descripcion) => {
    if (!descripcion) return "—";
    const match = descripcion.match(/(.*)(Póliza)\s+([\w-]+)(.*)/i);
    if (match) {
      const [, prefix, wordPoliza, polizaNum, suffix] = match;
      return (
        <>
          {prefix}
          <Link
            to={`/polizas?search=${polizaNum}`}
            className="text-sky-400 hover:text-sky-300 hover:underline underline-offset-2 transition-colors relative z-10"
            title={`Buscar póliza ${polizaNum}`}
          >
            {wordPoliza}
          </Link>
          {suffix}
        </>
      );
    }
    return descripcion;
  };

  // 🚀 Descripción con badge de póliza (egreso: quita patente, badge con enlace)
  const renderDescripcionEgreso = (descripcionOriginal) => {
    if (!descripcionOriginal) return "—";
    const matchPoliza = descripcionOriginal.match(/(.*?)(Póliza\s+[\w-]+)(?:\s*\([^)]+\))?(.*)/i);
    if (matchPoliza) {
      const [, preTexto, polizaParte, postTexto] = matchPoliza;
      const polizaNumero = polizaParte.replace(/Póliza\s+/i, "").trim();
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-zinc-200">{preTexto.trim() || "Pago de Egreso"}</span>
          <div className="flex items-center">
            <Link
              to={`/polizas?search=${polizaNumero}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20"
            >
              {polizaParte} <HiOutlineExternalLink className="text-[10px]" />
            </Link>
            {postTexto && <span className="text-zinc-500 ml-1 text-[11px]">{postTexto}</span>}
          </div>
        </div>
      );
    }
    return <div className="max-w-xs sm:max-w-md font-semibold text-zinc-200">{descripcionOriginal}</div>;
  };

  const renderDescripcion = tipo === "egreso" ? renderDescripcionEgreso : renderDescripcionIngreso;

  const totalVisible = useMemo(
    () =>
      (filteredData || []).reduce((acc, it) => {
        const val = Number(String(it?.monto || "0").replace(",", "."));
        return acc + (Number.isFinite(val) ? val : 0);
      }, 0),
    [filteredData]
  );

  // ── Borrado ──
  const doDelete = async (item) => {
    try {
      await dispatch(conf.deleteOne(item.id)).unwrap();
      if (!Array.isArray(itemsProp)) dispatch(conf.fetchAll({ page }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (item) => {
    if (!isWebAdmin) {
      if (!conf.confirmDeleteModal) {
        alert(`No tienes permisos para eliminar ${conf.label.toLowerCase()}. Contacta al administrador.`);
      }
      return;
    }
    if (conf.confirmDeleteModal) {
      // egreso → modal
      setConfirmDelete(item);
      return;
    }
    // ingreso → window.confirm inline
    const ok = window.confirm(
      "¿Seguro que querés eliminar este ingreso? Esta acción afectará el balance."
    );
    if (!ok) return;
    doDelete(item);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    await doDelete(confirmDelete);
    setConfirmDelete(null);
  };

  const isLoading = !Array.isArray(itemsProp) && status === "loading";
  const hasError = !Array.isArray(itemsProp) && status === "failed";

  // Columnas del tfoot que quedan vacías (según tipo)
  const totalRowSpan = tipo === "egreso" ? (isWebAdmin ? 5 : 4) : 5;
  const emptyColSpan = tipo === "egreso" ? (isWebAdmin ? 7 : 6) : 7;

  return (
    <div className={`w-full ${className}`}>
      {/* Encabezado + filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          Listado de {conf.label}
          {isWebAdmin && !Array.isArray(itemsProp) && (
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-normal">
              Vista Global
            </span>
          )}
        </h2>

        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFiltroForma("TODAS")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroForma === "TODAS" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroForma("EFECTIVO")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroForma === "EFECTIVO" ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-zinc-400 hover:text-emerald-400/70"}`}
          >
            Efectivo
          </button>
          <button
            onClick={() => setFiltroForma("TRANSFERENCIA")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroForma === "TRANSFERENCIA" ? "bg-sky-500/20 text-sky-400 shadow-sm" : "text-zinc-400 hover:text-sky-400/70"}`}
          >
            Transf.
          </button>
        </div>
      </div>

      {hasError && (
        <div className="mb-3 text-xs sm:text-sm text-red-400">
          {error || `Error al cargar ${conf.label.toLowerCase()}`}
        </div>
      )}

      {/* ===== Vista DESKTOP/TABLET ===== */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-sm">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={conf.theadRow}>
                <th className="px-3 sm:px-4 py-3 text-left">Descripción</th>
                <th className="px-3 sm:px-4 py-3 text-right">Monto</th>
                <th className="px-3 sm:px-4 py-3 text-left">Fecha y Hora</th>
                <th className="px-3 sm:px-4 py-3 text-center">Categoría / Forma</th>
                <th className="px-3 sm:px-4 py-3 text-left">Cargado por</th>
                {conf.mostrarPagadoPor && <th className="px-3 sm:px-4 py-3 text-left">Pagado por</th>}
                {(conf.mostrarPagadoPor || isWebAdmin) && (
                  <th className="px-3 sm:px-4 py-3 text-center">Acciones</th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-zinc-800/70">
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-32 sm:w-40 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-4 text-right"><div className="h-3 w-16 sm:w-24 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-6 w-24 sm:w-28 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    {conf.mostrarPagadoPor && <td className="px-3 sm:px-4 py-4"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>}
                    {(conf.mostrarPagadoPor || isWebAdmin) && <td className="px-3 sm:px-4 py-4 text-center"><div className="h-3 w-12 sm:w-16 bg-zinc-800 rounded mx-auto" /></td>}
                  </tr>
                ))
              ) : filteredData?.length ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800/70 hover:bg-zinc-900/70">
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="max-w-xs sm:max-w-md truncate font-semibold text-zinc-200">
                        {renderDescripcion(item.descripcion)}
                      </div>
                      {isWebAdmin && item.oficina_nombre && (
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                          <HiOfficeBuilding /> {item.oficina_nombre}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 sm:px-4 py-3 text-right align-middle font-extrabold ${conf.montoText} text-base tracking-tight`}>
                      {conf.signo}${fmtMoney(item.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">{renderFechaConHora(item)}</td>
                    <td className="px-3 sm:px-4 py-3 align-middle text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {renderFormaPago(item.forma_pago)}
                        {item.billetera && item.forma_pago !== "EFECTIVO" && (
                          <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-md truncate max-w-[120px] ${conf.billeteraBadge}`} title={item.billetera}>
                            {item.billetera}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 truncate max-w-[100px]">
                          {item.categoria || "S/C"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                        <HiUser className="text-zinc-500" />
                        {item.usuario_nombre || "Sistema"}
                      </div>
                    </td>
                    {conf.mostrarPagadoPor && (
                      <td className="px-3 sm:px-4 py-3 align-middle text-zinc-300 font-medium text-xs">
                        {item.pagado_por || "—"}
                      </td>
                    )}
                    {(conf.mostrarPagadoPor || isWebAdmin) && (
                      <td className="px-3 sm:px-4 py-3 align-middle">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 relative z-20">
                          {isWebAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setItemAEditar(item)}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-zinc-800 ${conf.editHover} transition-colors`}
                                title={`Editar ${tipo}`}
                              >
                                <HiPencil className="text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-zinc-800 hover:bg-rose-600 transition-colors"
                                title={`Eliminar ${tipo}`}
                              >
                                <HiTrash className="text-sm" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic">Solo Admin</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-12 text-center text-zinc-500" colSpan={emptyColSpan}>
                    No se encontraron {conf.label.toLowerCase()} para este filtro.
                  </td>
                </tr>
              )}
            </tbody>

            {filteredData?.length ? (
              <tfoot>
                <tr className={conf.tfootRow}>
                  <td className="px-3 sm:px-4 py-4 font-semibold text-zinc-300 uppercase tracking-widest text-xs">
                    Total Filtrado
                  </td>
                  <td className={`px-3 sm:px-4 py-4 text-right font-extrabold ${conf.tfootText} text-lg tracking-tight`}>
                    {conf.signo}${fmtMoney(totalVisible)}
                  </td>
                  <td className="px-3 sm:px-4 py-4" colSpan={totalRowSpan} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      {/* ===== Vista MOBILE ===== */}
      <div className="md:hidden">
        {isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={`sk-m-${i}`} className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-2.5 flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : filteredData?.length ? (
          <>
            <ul className="space-y-3">
              {filteredData.map((item) => (
                <li key={item.id} className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xl font-black ${conf.montoBig} tracking-tight`}>
                      {conf.signo}${fmtMoney(item.monto)}
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                      {renderFormaPago(item.forma_pago)}
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                        {item.categoria || "S/C"}
                      </span>
                    </div>
                  </div>

                  <div>
                    {tipo === "egreso" ? (
                      renderDescripcion(item.descripcion)
                    ) : (
                      <p className="text-sm font-semibold text-zinc-100 leading-snug">
                        {renderDescripcion(item.descripcion)}
                      </p>
                    )}
                    {isWebAdmin && item.oficina_nombre && (
                      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <HiOfficeBuilding /> {item.oficina_nombre}
                      </p>
                    )}
                  </div>

                  {conf.mostrarPagadoPor && (
                    <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-900/50 p-2 rounded-lg">
                      <span className="font-semibold text-zinc-500 uppercase text-[10px]">De:</span>
                      <span className="text-zinc-300 truncate">{item.pagado_por || "—"}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                        <HiClock className="text-zinc-600" />
                        {item.fecha ? dayjs(item.fecha).format("DD/MM/YY") : "—"}
                        {item.created_at && ` - ${dayjs(item.created_at).format("HH:mm")} hs`}
                      </span>
                      <span className={`flex items-center gap-1 mt-0.5 ${tipo === "egreso" ? "text-[12px] text-zinc-200 font-semibold" : "text-[10px] text-zinc-500 font-medium"}`}>
                        <HiUser className={tipo === "egreso" ? "text-zinc-400" : "text-zinc-600"} /> Por: {item.usuario_nombre || "Sistema"}
                      </span>
                    </div>

                    <div className="flex gap-2 relative z-20">
                      {isWebAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setItemAEditar(item)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:text-white transition ${tipo === "egreso" ? "hover:bg-rose-600" : "hover:bg-emerald-600"}`}
                          >
                            <HiPencil className="text-[12px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:bg-rose-600 hover:text-white transition"
                          >
                            <HiTrash className="text-[12px]" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className={`mt-4 rounded-2xl px-4 py-4 flex items-center justify-between shadow-sm ${tipo === "egreso" ? "bg-rose-900/20 border border-rose-800/30" : "bg-emerald-900/30 border border-emerald-800/50"}`}>
              <span className="font-bold text-zinc-300 uppercase text-xs tracking-widest">Total Filtrado</span>
              <span className={`font-black ${conf.tfootTextMobile} text-xl tracking-tight`}>
                {conf.signo}${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-zinc-500 text-center py-10 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            No se encontraron {conf.label.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Paginación (solo modo store) */}
      {!Array.isArray(itemsProp) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-xs sm:text-sm bg-zinc-950 p-2 rounded-xl border border-zinc-900">
          <button
            type="button"
            onClick={() => previous && setPage(Math.max(1, page - 1))}
            disabled={!previous}
            className={`px-4 py-2 rounded-lg font-medium transition ${previous ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-zinc-900 text-zinc-600 cursor-not-allowed"}`}
          >
            Anterior
          </button>
          <span className="opacity-70 font-semibold">Página {page}</span>
          <button
            type="button"
            onClick={() => next && setPage(page + 1)}
            disabled={!next}
            className={`px-4 py-2 rounded-lg font-medium transition ${next ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-zinc-900 text-zinc-600 cursor-not-allowed"}`}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal edición (unificado) */}
      {itemAEditar && isWebAdmin ? (
        <MovimientoModal
          tipo={tipo}
          modo="editar"
          isOpen={!!itemAEditar}
          item={itemAEditar}
          onClose={() => setItemAEditar(null)}
        />
      ) : null}

      {/* Modal confirmación borrado (solo egreso) */}
      {conf.confirmDeleteModal && confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">¿Eliminar egreso?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                <span className="font-mono text-rose-400">-${fmtMoney(confirmDelete.monto)}</span>
                {" — "}{confirmDelete.descripcion || "Sin descripción"}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Esta acción afectará el balance. No se puede deshacer.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-4 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="h-9 px-4 rounded-lg bg-rose-700 hover:bg-rose-600 border border-rose-600 text-white text-sm font-medium transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientoTable;