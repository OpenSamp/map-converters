import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages serves the site under https://<org>.github.io/map-converters/.
  // CI sets NODE_ENV=production via `npm run build`; locally `vite dev` keeps `/`.
  base: mode === "production" ? "/map-converters/" : "/",
}));
