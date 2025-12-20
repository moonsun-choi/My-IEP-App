import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; 

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', 
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      },
      manifest: {
        name: "My IEP App",
        short_name: "MyIEP",
        description: "특수교사를 위한 개별화교육계획 관찰 기록 및 성장 분석 도구",
        theme_color: "#0891b2",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "https://ui-avatars.com/api/?name=IEP&background=0891b2&color=fff&size=192",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "https://ui-avatars.com/api/?name=IEP&background=0891b2&color=fff&size=512",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});