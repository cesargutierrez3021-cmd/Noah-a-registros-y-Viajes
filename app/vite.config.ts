import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Capacitor sirve los assets con rutas relativas (file:// / rutas del
  // WebView de Android), no desde la raíz del dominio como en un navegador
  // normal — sin esto el build funciona en `npm run dev` pero rompe dentro
  // del APK (assets con ruta absoluta que no existe en el WebView).
  base: './',
  build: {
    outDir: 'dist',
  },
})
