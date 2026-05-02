/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {

        // ── Paleta activa ─────────────────────────────────────────────
        brand: {
          dark:  '#1e3a5f',  // header, sidebar
          mid:   '#2e6da4',  // botones, acentos
          light: '#f8fafc',  // fondos
        },

        // ── Opción B: Tierra volcánica ────────────────────────────────
        // brand: {
        //   dark:  '#3d2b1f',
        //   mid:   '#c4763a',
        //   light: '#faf7f4',
        // },

        // ── Opción C: Teal científico ─────────────────────────────────
        // brand: {
        //   dark:  '#0f4c5c',
        //   mid:   '#1a8a7a',
        //   light: '#f0f9f9',
        // },

      }
    }
  },
  plugins: [],
}