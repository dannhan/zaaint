import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  appType: 'mpa',
  build: {
    target: 'es2020',
  },
})
