// src/components/portal/index.js
//
// Barril de exports para importar los componentes del Portal del Asegurado
// de forma más corta: import { PolizaCard, PortalHeader } from "../components/portal";

export { default as PortalHeader } from "./PortalHeader";
export { PortalSplashLoading, PortalErrorState, PortalSinPolizas } from "./PortalStates";
export { default as PortalHome } from "./PortalHome";
export { default as PortalSubScreen } from "./PortalSubScreen";
export { default as PortalCuponeraView } from "./PortalCuponeraView";
export { default as PolizaCard } from "./PolizaCard";
export { default as CuotaItem } from "./CuotaItem";
export { default as CuotasList } from "./CuotasList";
export { default as CuponesRobo } from "./CuponesRobo";
export { default as DocumentosPoliza } from "./DocumentosPoliza";
export { default as RenovacionBanner } from "./RenovacionBanner";
export { default as ReciboModal } from "./ReciboModal";
export { default as DocumentoModal } from "./DocumentoModal";
export { default as ThemeToggle } from "./ThemeToggle";
export { usePortalTheme } from "./usePortalTheme";
export * from "./portalUtils";
