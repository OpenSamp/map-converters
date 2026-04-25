import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Site is served from a custom subdomain (https://converter.opensamp.com), so
// assets resolve from the root — no `base` override needed.
export default defineConfig({
  plugins: [react()],
});
