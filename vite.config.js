import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: ['4173-imu01bsxwk65eorve26q4-7110b4df.sg1.manus.computer'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    passWithNoTests: true,
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
      },
    },
  },
})
