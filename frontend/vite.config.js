import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:8000",
        ws: true,
      },
      "/mongodb": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/chatbot": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/verify": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/educational": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
