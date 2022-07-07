import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ttf}"],
      },
      registerType: "autoUpdate",
      manifest: {
        background_color: "#fff",
        theme_color: "#8400ff",
        name: "Celeste Tuner",
        start_url: "/",
        display: "standalone",
        icons: [
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable any",
          },
        ],
      },
    }),
    svelte(),
  ],
});
