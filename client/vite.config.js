import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5173,
    proxy: {
      // Proxy API requests to the backend using an environment variable or
      // default to the local dev server.  When you change the backend port
      // you can set BACKEND_URL in an `.env` file or export it before
      // running `npm run dev`.
      '/api': process.env.BACKEND_URL || 'http://localhost:3000',
      '/ws': {
        target: process.env.BACKEND_URL || 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
