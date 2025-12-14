import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/socket.io': 'https://mafia-c6a2.onrender.com'
    }
  }
})
