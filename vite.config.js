import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Get all area HTML files
const areaFiles = fs.readdirSync(resolve(__dirname, 'areas'))
  .filter(file => file.endsWith('.html'))
  .reduce((entries, file) => {
    const name = file.replace('.html', '');
    entries[`area_${name}`] = resolve(__dirname, `areas/${file}`);
    return entries;
  }, {});

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase/auth')) {
            return 'vendor-firebase-auth';
          }
          if (id.includes('firebase/functions')) {
            return 'vendor-firebase-functions';
          }
          if (id.includes('firebase/firestore')) {
            return 'vendor-firebase-firestore';
          }
          if (id.includes('firebase/app')) {
            return 'vendor-firebase-app';
          }
          if (id.includes('node_modules/lucide') || id.includes('src/icons.js')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/chart.js')) {
            return 'vendor-admin-libs';
          }
        }
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        menu: resolve(__dirname, 'menu.html'),
        shop: resolve(__dirname, 'shop.html'),
        faq: resolve(__dirname, 'faq.html'),
        specials: resolve(__dirname, 'specials.html'),
        locations: resolve(__dirname, 'locations.html'),
        catering: resolve(__dirname, 'catering.html'),
        quote: resolve(__dirname, 'quote.html'),
        kitchen: resolve(__dirname, 'kitchen.html'),
        orderStatus: resolve(__dirname, 'order-status.html'),
        orderHistory: resolve(__dirname, 'order-history.html'),
        customerDisplay: resolve(__dirname, 'customer-display.html'),
        tv1: resolve(__dirname, 'tv1.html'),
        tv2: resolve(__dirname, 'tv2.html'),
        blog: resolve(__dirname, 'blog.html'),
        review: resolve(__dirname, 'review.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        cateringJs: resolve(__dirname, 'src/catering.js'),
        itemTemplate: resolve(__dirname, 'item-template.html'),
        areaTemplate: resolve(__dirname, 'area-template.html'),
        ...areaFiles
      },
    },
  },
});
