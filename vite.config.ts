/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // 2.2MB model weights — separate chunk for async loading
            if (id.includes('src/vendor/controller-d1')) return 'mindar-weights';
            if (id.includes('src/vendor/')) return 'mindar-vendor';
            if (id.includes('node_modules/three/addons/')) return 'three-addons';
            if (id.includes('node_modules/three/')) return 'three';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
