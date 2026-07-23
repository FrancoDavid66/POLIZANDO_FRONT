// src/components/portal/usePortalTheme.js
//
// Hook de dark/light mode AUTOCONTENIDO para el Portal del Asegurado.
// El portal es una página pública que vive fuera del <Provider> de Redux
// (App.jsx corta antes de montar el store para /portal/:token), así que no
// puede usar el themeSlice del panel interno. En su lugar maneja su propio
// estado con localStorage, usando la MISMA key ("theme") que themeSlice para
// que, si el cliente comparte navegador con alguien del panel interno, la
// preferencia sea consistente — pero sin depender de Redux para nada.

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "theme";

function getPreferredMode() {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Sin preferencia guardada: respetamos el modo del sistema operativo/navegador.
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function usePortalTheme() {
  const [mode, setMode] = useState(getPreferredMode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Al desmontar el portal, dejamos el <html> como estaba (sin clase "dark"
  // forzada) para no filtrar el tema del portal a otra parte de la app si el
  // cliente navega de nuevo dentro de la misma pestaña.
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  return { mode, toggle, isDark: mode === "dark" };
}
