import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      // The firebase SDK alone exceeds the 500 kB default. Raised just past it
      // so the warning still fires on genuinely new bloat.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Vendor code changes far less often than app code; separate chunks
          // let a returning browser reuse them across deploys.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
              return 'react';
            }
            if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-')) {
              return 'charts';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via the DISABLE_HMR env var, along with
      // file watching, to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
