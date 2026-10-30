/**
 * BIGI AWASAANA — Default Catering Catalog & Services (Backend Cloud Functions Copy)
 */

const DEFAULT_CATERING_CATALOG = [
  { id: 'qabuli-pulao-tray', nameEn: "Bigi's Qabuli Pulao Rice Tray", unitPrice: 110.00, servingYield: 25 },
  { id: 'lamb-shank-qabuli-tray', nameEn: "Braised Lamb Shank Qabuli Banquet Tray", unitPrice: 195.00, servingYield: 20 },
  { id: 'zarda-pulao-tray', nameEn: 'Sweet Saffron Zarda Rice Tray', unitPrice: 95.00, servingYield: 25 },
  { id: 'chapli-kabob-tray', nameEn: "Bigi's Famous Chapli Kabob Tray", unitPrice: 145.00, servingYield: 25 },
  { id: 'chicken-tikka-platter', nameEn: 'Charcoal Chicken Tikka Kabob Platter', unitPrice: 135.00, servingYield: 25 },
  { id: 'beef-tikka-platter', nameEn: 'Tender Beef Tikka Kabob Platter', unitPrice: 165.00, servingYield: 25 },
  { id: 'kobideh-kabob-platter', nameEn: 'Hand-Crafted Kobideh Kabob Platter', unitPrice: 140.00, servingYield: 25 },
  { id: 'bolani-potato-tray', nameEn: 'Crispy Potato & Scallion Bolani Platter', unitPrice: 65.00, servingYield: 25 },
  { id: 'mantu-dumplings-tray', nameEn: 'Handmade Afghan Mantu Beef Dumplings Tray', unitPrice: 85.00, servingYield: 20 },
  { id: 'samosa-platter', nameEn: 'Crispy Golden Samosa Platter (Chicken & Veg)', unitPrice: 55.00, servingYield: 25 },
  { id: 'afghan-salata-tray', nameEn: 'Fresh Afghan Salata Salad Tray', unitPrice: 45.00, servingYield: 25 },
  { id: 'afghan-naan-basket', nameEn: 'Fresh Tandoori Afghan Flatbread (Naan) Basket', unitPrice: 30.00, servingYield: 25 },
  { id: 'firni-dessert-tray', nameEn: "Bigi's Traditional Cardamom Pistachio Firni Tray", unitPrice: 55.00, servingYield: 25 },
  { id: 'sheer-brinj-tray', nameEn: 'Sweet Rosewater Sheer Brinj Rice Pudding Tray', unitPrice: 50.00, servingYield: 25 },
  { id: 'doogh-dispenser', nameEn: 'Chilled Wild Mint Doogh Beverage Dispenser', unitPrice: 60.00, servingYield: 35 },
  { id: 'cardamom-chai-station', nameEn: 'Hot Spiced Cardamom Afghan Chai Urn', unitPrice: 45.00, servingYield: 30 },
  { id: 'chutney-trio-pack', nameEn: 'Handmade Chutney Trio Variety Pack (16 oz jars)', unitPrice: 25.00, servingYield: 25 }
];

const OPTIONAL_CATERING_SERVICES = [
  { id: 'chafing_dishes', name: 'Stainless Steel Chafing Dishes & Sterno Fuel', price: 35.00, priceUnit: 'flat_set' },
  { id: 'disposable_dinnerware', name: 'Eco-Friendly Luxury Bamboo Plates & Heavy Cutlery', price: 1.75, priceUnit: 'per_guest' },
  { id: 'buffet_setup_service', name: 'Full Buffet Table Setup & Food Presentation', price: 75.00, priceUnit: 'flat_fee' },
  { id: 'onsite_staff', name: 'Dedicated On-Site Food Attendants (3 Hours)', price: 250.00, priceUnit: 'event_shift' }
];

module.exports = {
  DEFAULT_CATERING_CATALOG,
  OPTIONAL_CATERING_SERVICES
};
