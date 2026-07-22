// src/components/layout/Sidebar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiHome, HiUsers, HiDocumentText, HiCurrencyDollar, HiDatabase,
  HiChartBar, HiClipboardList, HiClipboardCheck,
  HiChevronDown, HiRefresh,
  HiBan, HiCash, HiReceiptTax,
  HiShieldCheck, HiX, HiCog,
  HiViewGrid
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";
import logoPolizando from "../../assets/logos/polizando_logo.webp";

const ICON_MAP = {
  home:        HiHome,
  users:       HiUsers,
  doc:         HiDocumentText,
  money:       HiCurrencyDollar,
  db:          HiDatabase,
  chart:       HiChartBar,
  clipboard:   HiClipboardList,
  tasks:       HiClipboardCheck,
  refresh:     HiRefresh,
  ban:         HiBan,
  cash:        HiCash,
  receipt:     HiReceiptTax,
  shield:      HiShieldCheck,
  cog:         HiCog,
  grid:        HiViewGrid,
};

// Rutas que pertenecen a cada grupo con acordeón — se usa para abrirlo solo
// si ya estás parado en una página de adentro (mismo criterio en los 3).
const CARTERA_PATHS  = ["/clientes", "/polizas", "/cuponeras", "/siniestros"];
const FINANZAS_PATHS = ["/pagos", "/recaudacion", "/balanzes", "/servicios"];
const ADMIN_PATHS    = ["/cotizaciones", "/estadisticas", "/admin"];

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponVencidas = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
  // 🚀 NUEVO: Badge de servicios fijos (vencidos + por vencer ≤3d)
  serviciosAlertas = 0,
  // 🆕 Siniestros: el dato ya se pedía en App.jsx, faltaba pasarlo
  siniestrosAbiertos = 0,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin    = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor = user?.perfil?.rol === "VENDEDOR";
  const solTotal   = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const userInicial = (user?.first_name || user?.username || "U")[0].toUpperCase();
  const userName    = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Usuario";
  const oficinaNombre = user?.perfil?.oficina_nombre || "Sucursal";

  const menuGroups = useMemo(() => {
    if (isVendedor) return [{
      title: "Mi Panel", flat: true,
      items: [
        { to: "/",          label: "Inicio",          icon: "home" },
        { to: "/polizas",   label: "Mis Asegurados",  icon: "users" },
        { to: "/comisiones",label: "Mis Comisiones",  icon: "money" },
      ]
    }];

    // 💰 Finanzas: Pagos (operación diaria) + caja/contabilidad
    const finanzasItems = [
      { to: "/pagos",       label: "Gestión de Pagos", icon: "cash" },
      { to: "/recaudacion", label: "Recaudación",      icon: "cash" },
      { to: "/balanzes",    label: "Balances",         icon: "db" },
    ];

    // 🚀 Servicios Fijos solo para admin
    if (isAdmin) {
      finanzasItems.push({
        to: "/servicios",
        label: "Servicios Fijos",
        icon: "receipt",
        badge: serviciosAlertas,
        tone: "amber",
      });
    }

    return [
      // 🏠 Lo de todos los días. "Tareas del día" se sacó de acá — vive como
      // acceso destacado arriba, junto a "Registrar pago" (ver más abajo).
      {
        title: "Principal", flat: true,
        items: [
          { to: "/",            label: "Inicio",      icon: "home" },
          { to: "/solicitudes", label: "Solicitudes", icon: "clipboard", badge: solTotal, tone: "neutral" },
        ]
      },
      // 📋 Cartera: clientes + pólizas + siniestros (todo el libro de negocio junto).
      // Tonos recalibrados: rojo solo para lo genuinamente urgente (cupón
      // vencido, baja pendiente) — el resto es informativo o "a tener en cuenta",
      // no todo tiene que gritar por igual.
      {
        title: "Cartera", id: "cartera", icon: "doc",
        items: [
          { to: "/clientes",             label: "Clientes",      icon: "users" },
          { to: "/polizas",              label: "Pólizas",       icon: "doc" },
          { to: "/polizas/renovaciones", label: "Renovaciones",  icon: "refresh", badge: renovacionesPendientes, tone: "amber" },
          { to: "/cuponeras",            label: "Cuponeras",     icon: "receipt", badge: cuponVencidas,          tone: "red" },
          { to: "/polizas/bajas",        label: "Bajas",         icon: "ban",     badge: bajasPendientes,        tone: "red" },
          { to: "/siniestros",           label: "Siniestros",    icon: "doc",     badge: siniestrosAbiertos,     tone: "neutral" },
        ]
      },
      // 💰 Finanzas: todo lo que es plata en un solo lugar
      {
        title: "Finanzas", id: "finanzas", icon: "db",
        items: finanzasItems,
      },
      // 🛡️ Gerencia (solo admin)
      ...(isAdmin ? [{
        title: "Gerencia", id: "admin", icon: "shield",
        items: [
          { to: "/cotizaciones", label: "Cotizador",     icon: "receipt" },
          { to: "/estadisticas", label: "Estadísticas",  icon: "chart" },
          { to: "/admin",        label: "Configuración", icon: "cog" },
        ]
      }] : [])
    ];
  }, [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos]);

  // 🔽 Los 3 acordeones arrancan CERRADOS — se abren solos si ya estás en una
  // ruta de adentro. Antes "Cartera" arrancaba siempre abierta (mostrando 8
  // filas de una) mientras los otros dos sí chequeaban la ruta — inconsistente,
  // y era buena parte de la sensación de "demasiada información" de entrada.
  const [open, setOpen] = useState({
    cartera:  CARTERA_PATHS.some(p => location.pathname.startsWith(p)),
    finanzas: FINANZAS_PATHS.some(p => location.pathname.startsWith(p)),
    admin:    ADMIN_PATHS.some(p => location.pathname.startsWith(p)),
  });

  // 🆕 El cierre automático al cambiar de ruta ya lo maneja App.jsx
  //    (ahí SÍ se chequea si es mobile antes de cerrar). Este efecto
  //    duplicaba esa lógica pero sin el chequeo, y cerraba el sidebar
  //    en escritorio también — por eso "se borraba" en cada click.

  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-[100dvh] w-72
        flex flex-col
        bg-brand-card dark:bg-brand-card-dark border-r border-brand-100/10 dark:border-brand-200/10
        shadow-2xl shadow-black/10 dark:shadow-black/40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-brand-100/10 dark:border-brand-200/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
              <img src={logoPolizando} alt="Polizando" className="h-6 w-6 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-sm font-bold text-brand-100 dark:text-brand-200 truncate leading-tight">
                Polizando
              </h1>
              <p className="text-[10px] text-brand-primary dark:text-brand-primary-tint font-bold uppercase tracking-widest truncate leading-tight">
                {isVendedor ? "Recomendador" : oficinaNombre}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-brand-100/50 dark:text-brand-200/50 hover:text-brand-100 dark:hover:text-brand-200 hover:bg-brand-100/8 dark:hover:bg-brand-200/10 transition-colors shrink-0">
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Usuario */}
        <div className="px-4 py-3 border-b border-brand-100/10 dark:border-brand-200/10 shrink-0">
          <div className="flex items-center gap-3 bg-brand-100/5 dark:bg-brand-200/5 rounded-xl px-3 py-2.5">
            <div className="h-8 w-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-sm font-bold text-brand-primary-deep dark:text-brand-primary-tint shrink-0">
              {userInicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-100 dark:text-brand-200 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-brand-100/50 dark:text-brand-200/50 truncate leading-tight">
                {isAdmin ? "Administrador" : isVendedor ? "Vendedor" : "Operador"}
              </p>
            </div>
          </div>
        </div>

        {/* 💸🗓️ Accesos rápidos destacados — solo estos dos van con este peso
            visual a propósito. Si todo el menú se viera así, sería más largo
            y más difícil de escanear, no menos — la idea es que estos dos
            salten a la vista y el resto quede como lista simple y calma. */}
        {!isVendedor && (
          <div className="px-3 pt-3 shrink-0 space-y-2">
            <NavLink
              to="/pagos"
              className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-primary-deep text-white shadow-lg shadow-brand-primary/30 hover:brightness-105 transition-all active:scale-[0.98]"
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 shrink-0">
                <HiCurrencyDollar className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-black leading-tight">Registrar pago</div>
                <div className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-tight">Cobrar una cuota</div>
              </div>
              <HiChevronDown className="w-5 h-5 -rotate-90 opacity-80 group-hover:opacity-100 transition" />
            </NavLink>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
          {menuGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-2" : ""}>

              {/* Grupo plano (sin acordeón) */}
              {group.flat ? (
                <>
                  <p className="px-2 pb-1.5 text-[11px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">
                    {group.title}
                  </p>
                  {group.items.map(item => {
                    const Icon = ICON_MAP[item.icon] || HiHome;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === "/"}
                        className={({ isActive }) => `
                          group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium
                          transition-all duration-150 mb-0.5
                          ${isActive
                            ? "bg-brand-primary/15 text-brand-primary-deep dark:text-brand-primary-tint border border-brand-primary/25 shadow-sm"
                            : "text-brand-100/70 dark:text-brand-200/70 hover:text-brand-100 dark:hover:text-brand-200 hover:bg-brand-100/8 dark:hover:bg-brand-200/8"
                          }
                        `}>
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-brand-primary dark:text-brand-primary-tint" : "text-brand-100/40 dark:text-brand-200/40 group-hover:text-brand-100/70 dark:group-hover:text-brand-200/70"}`} />
                            <span className="flex-1 truncate">{item.label}</span>
                            <NavBadge value={item.badge} tone={item.tone} />
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </>
              ) : (
                /* Grupo con acordeón */
                <div>
                  <button onClick={() => toggle(group.id)}
                    className={`
                      w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl
                      text-[15px] font-semibold transition-all duration-150
                      ${open[group.id]
                        ? "bg-brand-100/8 dark:bg-brand-200/10 text-brand-100 dark:text-brand-200"
                        : "text-brand-100/60 dark:text-brand-200/60 hover:text-brand-100 dark:hover:text-brand-200 hover:bg-brand-100/5 dark:hover:bg-brand-200/5"
                      }
                    `}>
                    <div className="flex items-center gap-2.5">
                      {(() => { const Icon = ICON_MAP[group.icon] || HiViewGrid; return <Icon className="w-5 h-5 shrink-0" />; })()}
                      <span>{group.title}</span>
                      {/* Mini-badge en el header del grupo si hay alertas dentro */}
                      <GroupBadge items={group.items} />
                    </div>
                    <motion.div
                      animate={{ rotate: open[group.id] ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center justify-center h-6 w-6 rounded-lg transition-colors ${
                        open[group.id] ? "text-brand-100/70 dark:text-brand-200/70" : "text-brand-100/40 dark:text-brand-200/40"
                      }`}>
                      <HiChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open[group.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pt-1 space-y-0.5">
                          {group.items.map(item => {
                            const Icon = ICON_MAP[item.icon] || HiHome;
                            return (
                              <NavLink key={item.to} to={item.to}
                                className={({ isActive }) => `
                                  group flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                                  transition-all duration-150
                                  ${isActive
                                    ? "bg-brand-primary/15 text-brand-primary-deep dark:text-brand-primary-tint font-semibold"
                                    : "text-brand-100/60 dark:text-brand-200/60 hover:text-brand-100 dark:hover:text-brand-200 hover:bg-brand-100/8 dark:hover:bg-brand-200/8 font-medium"
                                  }
                                `}>
                                {({ isActive }) => (
                                  <>
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-primary dark:text-brand-primary-tint" : "text-brand-100/40 dark:text-brand-200/40 group-hover:text-brand-100/60 dark:group-hover:text-brand-200/60"}`} />
                                    <span className="flex-1 truncate">{item.label}</span>
                                    <NavBadge value={item.badge} tone={item.tone} />
                                  </>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-brand-100/10 dark:border-brand-200/10 shrink-0 space-y-2">
          <ThemeToggle />
          <p className="text-center text-[10px] text-brand-100/30 dark:text-brand-200/30">Polizando © 2026</p>
        </div>
      </aside>
    </>
  );
}

// Badge chico para los items de navegación — envuelve el Badge compartido de
// ui/ con los tonos de severidad del menú:
//   red    = urgente / algo vencido, hay que actuar ya
//   amber  = a tener en cuenta, se viene
//   neutral (default) = informativo — un conteo, no una alarma
function NavBadge({ value = 0, tone = "neutral" }) {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  const cls =
    tone === "red"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : tone === "amber"
        ? "bg-brand-secondary/15 text-brand-secondary dark:text-brand-secondary-tint"
        : "bg-brand-100/10 text-brand-100/60 dark:bg-brand-200/10 dark:text-brand-200/60";
  return (
    <span className={`shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${cls}`}>
      {v}
    </span>
  );
}

// 🚀 Mini-badge en el header del grupo (suma de badges de sus items).
// Tono neutral a propósito: es "acá hay N cosas", no una alarma en sí mismo
// — las alarmas reales ya se ven al abrir el grupo, ítem por ítem.
function GroupBadge({ items }) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.badge) || 0), 0);
  if (total <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold bg-brand-100/10 text-brand-100/60 dark:bg-brand-200/10 dark:text-brand-200/60">
      {total}
    </span>
  );
}