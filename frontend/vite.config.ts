import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // This allows external access
    port: 5173,
    strictPort: true,
  },
  define: {
    'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify('983130641378-fnd6gehev1mmc45c1kmu9smmo1bosv6j.apps.googleusercontent.com'),
    'process.env.VITE_API_URL': JSON.stringify('https://plinko-challenge.loca.lt'),
    'process.env.VITE_SOCKET_URL': JSON.stringify('wss://plinko-challenge.loca.lt')
  }
})
