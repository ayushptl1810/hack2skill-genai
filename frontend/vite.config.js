import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: (() => {
      const httpTarget = process.env.BACKEND_URL || "http://127.0.0.1:7860";
      const wsTarget = httpTarget.replace(/^http(s?):\/\//, (m, s) =>
        s ? "wss://" : "ws://"
      );
      return {
        "/mongodb": { target: httpTarget, changeOrigin: true },
        "/educational": { target: httpTarget, changeOrigin: true },
        "/verify": { target: httpTarget, changeOrigin: true },
        "/chatbot": { target: httpTarget, changeOrigin: true },
        "/health": { target: httpTarget, changeOrigin: true },
        "/frames": { target: httpTarget, changeOrigin: true },
        "/static": { target: httpTarget, changeOrigin: true },
        "/ws": { target: wsTarget, ws: true, changeOrigin: true },
      };
    })(),
  },
});
