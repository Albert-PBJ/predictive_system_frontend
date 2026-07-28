import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  // 'npm run preview' sirve el build de dist/ y es lo que expone el Cloudflare
  // Tunnel en https://imaescar.xyz (ver ~/.cloudflared/config.yml).
  preview: {
    port: 4173,
    // Si el puerto esta ocupado, fallar en vez de saltar al 4174 (el tunnel
    // apunta fijo al 4173 y quedaria sirviendo un 502).
    strictPort: true,
    // Vite bloquea peticiones cuyo Host no reconozca; el tunnel llega con el
    // dominio publico, asi que hay que permitirlo explicitamente.
    allowedHosts: ["imaescar.xyz", "www.imaescar.xyz"],
  },
});
