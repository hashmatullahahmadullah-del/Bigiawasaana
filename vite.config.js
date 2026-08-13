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
        tv1: resolve(__dirname, 'tv1.html'),
        tv2: resolve(__dirname, 'tv2.html'),
        blog: resolve(__dirname, 'blog.html'),
        review: resolve(__dirname, 'review.html'),
        cateringJs: resolve(__dirname, 'src/catering.js'),
        itemTemplate: resolve(__dirname, 'item-template.html'),
        blogTemplate: resolve(__dirname, 'blog-template.html'),
        areaTemplate: resolve(__dirname, 'area-template.html'),
        ...areaFiles
      },
    },
  },
});
