import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        menu: resolve(__dirname, 'menu.html'),
        specials: resolve(__dirname, 'specials.html'),
        locations: resolve(__dirname, 'locations.html'),
        catering: resolve(__dirname, 'catering.html'),
        kitchen: resolve(__dirname, 'kitchen.html'),
        orderStatus: resolve(__dirname, 'order-status.html'),
        customerDisplay: resolve(__dirname, 'customer-display.html'),
        cateringJs: resolve(__dirname, 'src/catering.js'),
      },
    },
  },
});
