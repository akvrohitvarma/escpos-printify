import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Strip crossorigin attributes from built HTML so assets load over both HTTP and HTTPS
const removeCrossOrigin = () => ({
  name: 'remove-crossorigin',
  transformIndexHtml: (html) => html.replace(/ crossorigin/g, ''),
})

export default defineConfig({
  plugins: [react(), tailwindcss(), removeCrossOrigin()],
  server: {
    proxy: {
      '/print': 'http://localhost:3000',
      '/preview': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/config': 'http://localhost:3000',
      '/printers': 'http://localhost:3000'
    }
  }
})
