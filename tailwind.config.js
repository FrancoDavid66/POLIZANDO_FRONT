export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          // ── Marca (igual en claro y oscuro) ──
          primary: '#1F7A4C',           // verde marca
          'primary-deep': '#14603B',    // verde hondo
          secondary: '#E2622C',         // naranja marca
          'secondary-light': '#EF8146', // naranja claro
          'secondary-soft': '#FFD9C4',  // naranja suave — pensado para texto/íconos sobre fondo verde

          // Versiones aclaradas de primary/secondary, para texto e íconos SOBRE
          // fondos oscuros (dark mode) — el verde/naranja de marca, en su tono
          // saturado normal, no tiene contraste suficiente ahí (medido: ~1.3:1
          // y ~2:1 contra las superficies oscuras, muy por debajo del mínimo
          // WCAG AA de 4.5:1). Usar SOLO como texto/ícono en dark mode; para
          // fondos, botones y light mode seguí usando primary/secondary normal.
          'primary-tint': '#BCD7C9',
          'secondary-tint': '#F5C8B5',

          // ── Superficies: 100 = tono oscuro, 200 = tono claro ──
          // Con esto, clases ya usadas en el código como "bg-brand-200
          // dark:bg-brand-100" y "text-brand-100 dark:text-brand-200" quedan
          // resueltas — antes no pintaban nada, este color no existía.
          100: '#3D322A',   // tinta texto → fondo en dark mode / texto en light mode
          200: '#F4EFE6',   // crema fondo → fondo en light mode / texto en dark mode

          // ── Cards (superficie que resalta un poco sobre el fondo) ──
          card: '#FFFDF8',        // card claro (light mode) — tu valor
          'card-dark': '#605750', // card oscuro (dark mode) — DERIVADO (aclarando la tinta texto 18%), no me pasaste uno. Confirmámelo si tenés un valor oficial.

          // ── Utilidad ──
          whatsapp: '#25D366',
          star: '#F4C542',       // estrellas mundiales
        },
      },
      fontFamily: {
        heading: ['"Baloo 2"', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}