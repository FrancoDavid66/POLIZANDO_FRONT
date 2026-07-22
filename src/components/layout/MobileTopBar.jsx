// src/components/layout/MobileTopBar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaHome, FaClipboardList, FaUsers, FaFileAlt, FaMoneyCheckAlt,
  FaEllipsisH, FaChartPie,
  FaDatabase, FaSyncAlt, FaTimes, FaBan, FaCashRegister,
  FaFileInvoiceDollar, FaCarCrash, FaShieldAlt,
  FaReceipt, // 🚀 NUEVO ÍCONO PARA SERVICIOS FIJOS
  FaClipboardCheck, // 🆕 ÍCONO PARA TAREAS DEL DÍA
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";

const Badge = ({ value = 0 }) => {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white shadow-lg">
      {v}
    </span>
  );
};

export default function MobileTopBar({
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
  cuponVencidas = 0,
  // 🚀 NUEVO
  serviciosAlertas = 0,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const MOBILE_NAV_H = 68;
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const isVendedor = user?.perfil?.rol === 'VENDEDOR';

  // 🌟 Pestañas de Abajo
  const primaryTabs = useMemo(() => {
    if (isVendedor) {
      return [
        { to: "/", label: "Inicio", icon: FaHome },
        { to: "/polizas", label: "Asegurados", icon: FaUsers },
        { to: "/comisiones", label: "Comisiones", icon: FaMoneyCheckAlt },
      ];
    }
    return [
      { to: "/", label: "Inicio", icon: FaHome },
      { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList, badge: solTotal },
      { to: "/clientes", label: "Clientes", icon: FaUsers },
      { to: "/polizas", label: "Pólizas", icon: FaFileAlt },
      { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },
    ];
  }, [solTotal, isVendedor]);

  // 🚀 Tramos del Menú "MÁS"
  const menuSections = useMemo(() => {
    if (isVendedor) return [];

    // 🚀 Items de Finanzas (con servicios fijos solo para admin)
    const finanzasItems = [
      { to: "/recaudacion", label: "Caja Local", icon: FaCashRegister },
      { to: "/balanzes", label: "Balances", icon: FaDatabase },
    ];

    if (isWebAdmin) {
      finanzasItems.push({
        to: "/servicios",
        label: "Servicios Fijos",
        icon: FaReceipt,
        badge: serviciosAlertas,
      });
    }

    return [
      {
        title: "Gestión de Pólizas",
        items: [
          { to: "/tareas", label: "Tareas del día", icon: FaClipboardCheck },
          { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt, badge: cuponVencidas },
          { to: "/polizas/renovaciones", label: "Renovaciones", icon: FaSyncAlt, badge: renovacionesPendientes },
          { to: "/polizas/bajas", label: "Bajas", icon: FaBan, badge: bajasPendientes },
          { to: "/siniestros", label: "Siniestros", icon: FaCarCrash },
        ]
      },
      {
        title: "Finanzas",
        items: finanzasItems,
      },
      ...(isWebAdmin ? [{
        title: "Gerencia & Admin",
        items: [
          { to: "/cotizaciones", label: "Cotizador", icon: FaFileInvoiceDollar },
          { to: "/estadisticas", label: "Estadísticas", icon: FaChartPie },
          { to: "/admin", label: "Configuración", icon: FaShieldAlt },
        ]
      }] : [])
    ];
  }, [isWebAdmin, isVendedor, cuponVencidas, renovacionesPendientes, bajasPendientes, serviciosAlertas]);

  const isPrimaryActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  const sheetBottom = `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px) + 10px)`;

  // 🚀 Calculamos el total de alertas para el botón "Más"
  const moreBadgeTotal = useMemo(() => {
    return menuSections.reduce((acc, section) => {
      return acc + section.items.reduce((sum, item) => sum + (Number(item.badge) || 0), 0);
    }, 0);
  }, [menuSections]);

  return (
    <>
      <AnimatePresence>
        {moreOpen && !isVendedor && (
          <motion.div
            className="lg:hidden fixed inset-0 z-[60] bg-black/60"
            onClick={() => setMoreOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className="absolute left-3 right-3 rounded-2xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-card dark:bg-brand-card-dark backdrop-blur p-3 shadow-2xl"
              style={{ bottom: sheetBottom }}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.985 }}
              transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.9 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-extrabold text-brand-100 dark:text-brand-200">Menú Completo</div>
                <button
                  className="rounded-xl border border-brand-100/10 dark:border-brand-200/10 px-3 py-2 text-brand-100/70 dark:text-brand-200/70 hover:bg-brand-100/8 dark:hover:bg-brand-200/8 cursor-pointer"
                  onClick={() => setMoreOpen(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto custom-scrollbar pb-2">
                {menuSections.map((section, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40 mb-1.5 px-1">
                      {section.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {section.items.map(({ to, label, icon: Icon, badge }) => (
                        <button
                          key={to}
                          onClick={() => { setMoreOpen(false); navigate(to); }}
                          className="cursor-pointer relative flex items-center gap-2 rounded-xl border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/5 dark:bg-brand-200/5 px-2.5 py-3 text-left text-xs font-semibold text-brand-100 dark:text-brand-200 hover:bg-brand-100/10 dark:hover:bg-brand-200/10 active:scale-[0.99] transition"
                        >
                          <span className={`relative inline-flex items-center justify-center h-7 w-7 rounded-lg ${
                            section.title === 'Finanzas' ? 'bg-brand-primary/15 text-brand-primary dark:text-brand-primary-tint' :
                            section.title === 'Gerencia & Admin' ? 'bg-brand-secondary/15 text-brand-secondary dark:text-brand-secondary-tint' :
                            'bg-brand-100/10 dark:bg-brand-200/10 text-brand-100/70 dark:text-brand-200/70'
                          }`}>
                            <Icon className="h-3.5 w-3.5" />
                            {badge > 0 && <Badge value={badge} />}
                          </span>
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra fija inferior */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-card dark:bg-brand-card-dark border-t border-brand-100/10 dark:border-brand-200/10 shadow-lg"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="flex items-center justify-around h-full px-1">
          {primaryTabs.map(({ to, label, icon: Icon, badge }) => {
            const active = isPrimaryActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition gap-0.5 ${
                  active ? "text-brand-primary dark:text-brand-primary-tint" : "text-brand-100/50 dark:text-brand-200/50"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && <Badge value={badge} />}
                </div>
                <span className="text-[10px] font-semibold leading-tight">{label}</span>
              </NavLink>
            );
          })}

          {!isVendedor && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition gap-0.5 ${
                moreOpen ? "text-brand-primary dark:text-brand-primary-tint" : "text-brand-100/50 dark:text-brand-200/50"
              }`}
            >
              <div className="relative">
                <FaEllipsisH className="h-5 w-5" />
                {moreBadgeTotal > 0 && <Badge value={moreBadgeTotal} />}
              </div>
              <span className="text-[10px] font-semibold leading-tight">Más</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}