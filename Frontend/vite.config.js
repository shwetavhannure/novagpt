import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on the network too, so a phone on the same Wi-Fi can open http://<laptop-ip>:5174
    port: 5174, // Runs the frontend on port 5174 so it doesn't clash with your other project
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Points frontend API calls to your new backend port
        changeOrigin: true,
      },
    },
  },
})