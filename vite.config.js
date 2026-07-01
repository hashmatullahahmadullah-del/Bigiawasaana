import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        menu: resolve(__dirname, 'menu.html'),
        faq: resolve(__dirname, 'faq.html'),
        specials: resolve(__dirname, 'specials.html'),
        locations: resolve(__dirname, 'locations.html'),
        catering: resolve(__dirname, 'catering.html'),
        kitchen: resolve(__dirname, 'kitchen.html'),
        orderStatus: resolve(__dirname, 'order-status.html'),
        customerDisplay: resolve(__dirname, 'customer-display.html'),
        tvMenu: resolve(__dirname, 'tv-menu.html'),
        blog: resolve(__dirname, 'blog.html'),
        review: resolve(__dirname, 'review.html'),
        cateringJs: resolve(__dirname, 'src/catering.js'),
      },
    },
  },
});
