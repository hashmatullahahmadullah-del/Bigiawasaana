const { ITEMS } = require('../scripts/menu-items-data.cjs');

const featuredSlugs = [
  'bigi-s-chapli-kabob',
  'bigi-s-kobideh-kabob-skewer',
  'bigi-s-chicken-tikka-kabob-plate',
  'bigi-s-silk-road-wrap-aka-afghan-burger',
  'bigi-s-qabuli-palau-lamb-shank',
  'bigi-s-bolani'
];

const defaultItems = ITEMS.map(it => ({
  id: it.id,
  name: it.name,
  desc: it.shortDesc,
  price: it.price,
  category: it.categorySlug,
  img: it.img,
  slug: it.slug,
  featured: featuredSlugs.includes(it.slug)
}));

console.log('Generated default items count:', defaultItems.length);
console.log('Featured default items:', defaultItems.filter(d => d.featured).map(d => `${d.name} ($${d.price})`));
