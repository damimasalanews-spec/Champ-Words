import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Game client lives at /game (the website is served at the root)
  base: '/game/',
  server: {
    port: 5173
  }
})
