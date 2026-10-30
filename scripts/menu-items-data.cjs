/**
 * Canonical data source for all 21 active menu items.
 * Built strictly from scratch/live_menu_dump.json and verified blog post facts.
 */

const ITEMS = [
  {
    id: "2YsE0bWoYyJyrMvHQZ5v",
    name: "Bigi's Kobideh Kabob Skewer",
    slug: "bigi-s-kobideh-kabob-skewer",
    categoryName: "Charcoal Kabobs",
    categorySlug: "kabobs",
    price: 19.99,
    img: "/m-img/1787957249457_BigiAwasaana_KobidehKabob.webp",
    shortDesc: "A charcoal-grilled ground beef kabob skewer served over rice or bread with fresh salad.",
    fullDesc: "Bigi's Kobideh Kabob Skewer features 100% hand-slaughtered Zabiha Halal minced beef, blended with minced onions, sumac, cracked black pepper, and Silk Road aromatics. The seasoned beef is pressed by hand onto wide flat metal skewers and grilled directly over live red-hot hardwood lump charcoal at our Reseda grill. The intense charcoal heat creates a delicate, smoky outer crust while sealing in the rich, savory juices inside. Each platter is generously served with your choice of long-grain seasoned basmati rice or hot oven-baked Afghan naan flatbread, accompanied by crisp seasoned salad, grilled tomatoes, and our signature tangy house chutneys. Mild to medium spice level, deeply comforting and savory.",
    spiceLevel: "Mild to Medium",
    comesWith: "Seasoned basmati rice or fresh baked Afghan bread, grilled tomato, crisp side salad, and house garlic yogurt & cilantro chutneys",
    relatedSlugs: ["bigi-s-tikka-kabab-plate", "bigi-s-chapli-kabob", "bigi-s-bolani"],
    blogSlug: "art-of-afghan-charcoal-kabobs-reseda",
    blogTitle: "The Art of Afghan Charcoal Kabobs in Reseda",
    faqs: [
      {
        q: "Is Bigi's Kobideh Kabob 100% Halal?",
        a: "Yes, our Kobideh Kabob is made exclusively with 100% hand-slaughtered Zabiha Halal beef, free of fillers or machine-cut meats."
      },
      {
        q: "Can I choose between rice and Afghan naan?",
        a: "Yes, you can select either fragrant steamed basmati rice or fresh, oven-baked Afghan flatbread with your platter."
      }
    ]
  },
  {
    id: "HasuTY0MWin3nn5IkZcb",
    name: "Bigi's Chicken Tikka Kabob Plate",
    slug: "bigi-s-chicken-tikka-kabob-plate",
    categoryName: "Charcoal Kabobs",
    categorySlug: "kabobs",
    price: 17.99,
    img: "/m-img/1790463609278_BigiAwasaana_ChickenTikaKabob.webp",
    shortDesc: "Chunks of marinated chicken breast bathed overnight in yogurt, ginger, garlic, and proprietary Afghan spices, charcoal-grilled to caramelized perfection.",
    fullDesc: "Our Chicken Tikka Kabob Plate is prepared using tender boneless chicken breast marinated for over twenty-four hours in whole milk yogurt, freshly crushed ginger, minced garlic, lemon juice, turmeric, and our proprietary Silk Road spice blend. Skewered and grilled over searing hardwood coals, the yogurt marinade caramelizes along the edges, imparting an authentic charcoal char while keeping the chicken remarkably moist and tender. Served piping hot over a generous bed of saffron-scented basmati rice or accompanied by fresh Afghan naan bread, crisp sliced cucumbers, sumac-dusted onions, and fresh herbal chutney. Mildly spiced with robust garlic and citrus notes.",
    spiceLevel: "Mild (Citrus and Garlic Marinade)",
    comesWith: "Fragrant basmati rice or oven-warm naan, crisp garden salad, and house dipping chutneys",
    relatedSlugs: ["bigi-s-kobideh-kabob-skewer", "bigi-s-qabuli-palau-lamb-shank", "bigi-s-bolani"],
    blogSlug: "art-of-afghan-charcoal-kabobs-reseda",
    blogTitle: "The Art of Afghan Charcoal Kabobs in Reseda",
    faqs: [
      {
        q: "Is the chicken in the Tikka Kabob spicy?",
        a: "The Chicken Tikka is mildly spiced with citrus, garlic, ginger, and cumin—flavorful and aromatic rather than hot."
      },
      {
        q: "How is the Chicken Tikka cooked?",
        a: "It is skewered and cooked over real hardwood lump charcoal on our Reseda grill for authentic smoke flavor."
      }
    ]
  },
  {
    id: "yfIiD4H87iuPMpR9zdoN",
    name: "Bigi's Tikka Kabab Plate",
    slug: "bigi-s-tikka-kabab-plate",
    categoryName: "Charcoal Kabobs",
    categorySlug: "kabobs",
    price: 19.99,
    img: "/m-img/1789064755515_BigiAwasaana_BeefTikaKabob.webp",
    shortDesc: "Tender chunks of marinated Zabiha Halal beef or chicken tikka charcoal-grilled over live hardwood embers.",
    fullDesc: "Bigi's Tikka Kabab Plate showcases prime cuts of 100% Zabiha Halal meat steeped in a traditional Afghan marinade of strained yogurt, crushed garlic, wild mountain cumin, coriander, and fresh citrus. Once fully infused, the skewers are placed directly over open lump hardwood charcoal, cooking quickly at high heat to achieve crispy caramelized exterior edges while preserving a tender, succulent center. Plated alongside seasoned basmati rice or our signature Afghan tandoor flatbread, crisp Mediterranean salad, and tangy house sauces. Packed with smoky aroma and authentic Afghan heritage.",
    spiceLevel: "Mild to Medium",
    comesWith: "Fluffy basmati rice or fresh Afghan bread, crisp salad, and house herb chutneys",
    relatedSlugs: ["bigi-s-kobideh-kabob-skewer", "bigi-s-chapli-kabob", "bigi-s-beef-shawarma-wrap"],
    blogSlug: "art-of-afghan-charcoal-kabobs-reseda",
    blogTitle: "The Art of Afghan Charcoal Kabobs in Reseda",
    faqs: [
      {
        q: "What makes Bigi's Tikka Kabab unique?",
        a: "We grill exclusively over live charcoal embers without liquid smoke or gas griddles, delivering genuine Silk Road flavor."
      },
      {
        q: "Is the meat 100% Zabiha Halal certified?",
        a: "Yes, every skewer is 100% hand-slaughtered Zabiha Halal certified with zero artificial preservatives."
      }
    ]
  },
  {
    id: "XvAjowz3KjiWQopaHAvb",
    name: "Bigi's Chapli Kabob",
    slug: "bigi-s-chapli-kabob",
    categoryName: "Charcoal Kabobs",
    categorySlug: "kabobs",
    price: 17.99,
    img: "/m-img/1791950307107_1000004875.webp",
    shortDesc: "A wide, flat Pashtun patty of seasoned ground beef with tomatoes, onions, coriander, and green chili, seared for crispy edges and a juicy center.",
    fullDesc: "Bigi's Chapli Kabob is a legendary specialty hailing from eastern Afghanistan and the Khyber region. Coarsely ground 100% Zabiha Halal beef is hand-kneaded with coarsely cracked coriander seeds, whole pomegranate seeds (anardana), diced vine-ripened tomatoes, fresh scallions, crushed garlic, and finely minced green chilies. The patty is pressed wide and thin, then seared on a searing flattop griddle in natural fats until the lace-thin perimeter turns intensely crunchy while the interior remains succulent and aromatic. Served with warm Afghan flatbread or fragrant basmati rice, crisp sliced red onions, fresh lime wedges, and cilantro yogurt chutney. Bold, punchy, and full of texture.",
    spiceLevel: "Medium to Spicy (Cracked Coriander & Green Chili)",
    comesWith: "Fresh Afghan flatbread or seasoned basmati rice, sliced onions, fresh lemon, and cilantro yogurt sauce",
    relatedSlugs: ["bigi-s-kobideh-kabob-skewer", "bigi-s-smash-burger", "bigi-s-bolani"],
    blogSlug: "chapli-kabab-vs-shami-kabab-guide",
    blogTitle: "Chapli Kabab vs. Shami Kabab: Spice Profiles & Textures",
    faqs: [
      {
        q: "What gives Chapli Kabob its signature crunch?",
        a: "Coarsely cracked whole coriander seeds and the thin, flat-pressed searing technique create its famous crispy lacy rim."
      },
      {
        q: "Is the Chapli Kabob spicy?",
        a: "It has a noticeable, pleasant kick from fresh green chilies and warming Afghan spices, balanced by cool cilantro chutney."
      }
    ]
  },
  {
    id: "PgKqdCkeN8gwklvL4rlR",
    name: "Bigi's Cheese Kabob Stick",
    slug: "bigi-s-cheese-kabob-stick",
    categoryName: "Charcoal Kabobs",
    categorySlug: "kabobs",
    price: 10.99,
    img: "/m-img/1791950199331_1000004877.webp",
    shortDesc: "Charcoal-grilled kabob skewer wrapped in a sizzling layer of melted cheese.",
    fullDesc: "Bigi's Cheese Kabob Stick is our viral, crowd-favorite street food creation in Reseda. We take a skewer of seasoned 100% Zabiha Halal meat—freshly charred over glowing hardwood coals—and wrap it while still smoking hot in a molten layer of premium melted cheese. The savory crust of the charcoal grill combined with the creamy richness of melted cheese creates an irresistible flavor fusion that disappears in seconds. Perfect as a handheld street snack or paired with fresh Afghan bread and house garlic sauce. Mild, rich, and decadently satisfying.",
    spiceLevel: "Mild and Cheesy",
    comesWith: "Molten cheese wrap over charcoal skewer, served with house dipping sauce",
    relatedSlugs: ["bigi-s-kobideh-kabob-skewer", "bigi-s-smash-burger", "bigi-s-silk-road-wrap-aka-afghan-burger"],
    blogSlug: "art-of-afghan-charcoal-kabobs-reseda",
    blogTitle: "The Art of Afghan Charcoal Kabobs in Reseda",
    faqs: [
      {
        q: "What type of meat is used in the Cheese Kabob Stick?",
        a: "It features our charcoal-grilled 100% Zabiha Halal beef or chicken skewer blanketed in hot melted cheese."
      },
      {
        q: "Is it served hot?",
        a: "Yes, it is prepared fresh to order directly from the charcoal grill for optimal cheese pull."
      }
    ]
  },
  {
    id: "cv7CVaf8ZPl3RX31F8Vb",
    name: "Bigi's Qabuli Palau Lamb Shank",
    slug: "bigi-s-qabuli-palau-lamb-shank",
    categoryName: "Traditional Afghan Plates",
    categorySlug: "platters",
    price: 19.99,
    img: "/m-img/1788493414501_BigiAwasaana_QabuliPalau.webp",
    shortDesc: "Tender lamb shank slow-braised under spiced sella basmati rice, crowned with caramelized carrots and sweet raisins.",
    fullDesc: "Considered Afghanistan's national crown jewel dish, Bigi's Qabuli Palau features an entire tender 100% Zabiha Halal lamb shank, slow-braised for hours in a rich bone broth infused with cardamom, cinnamon, and black cumin until the meat falls off the bone at the touch of a fork. Aged long-grain sella basmati rice is parboiled in the seasoned lamb broth reduction and gently steamed (dam-pokht). Before serving, the fragrant rice is crowned with sweet golden raisins and caramelized matchstick carrots sautéed in pure ghee with crushed pistachios. Mild, regal, and extraordinarily aromatic.",
    spiceLevel: "Mild (Warm Cardamom & Cumin Notes)",
    comesWith: "Slow-braised lamb shank, carrot & raisin topped basmati rice, side salad, and fresh chutney",
    relatedSlugs: ["bigi-s-chicken-tikka-kabob-plate", "bigi-s-kobideh-kabob-skewer", "bigi-s-firni"],
    blogSlug: "authentic-qabuli-palao-los-angeles",
    blogTitle: "Authentic Qabuli Palao in Los Angeles: The Saffron Rice Guide",
    faqs: [
      {
        q: "Is the lamb shank tender?",
        a: "Yes, our lamb shanks are slow-simmered for several hours until meltingly tender and pull-apart soft."
      },
      {
        q: "What gives Qabuli Palau its distinctive flavor?",
        a: "Aged sella basmati rice cooked in rich lamb reduction broth, topped with sweet glazed carrots and plump raisins."
      }
    ]
  },
  {
    id: "sB2T62F4PX8EreJq9Q4a",
    name: "Bigi's Beef Gyro Rice Bowl",
    slug: "bigi-s-beef-gyro-rice-bowl",
    categoryName: "Traditional Afghan Plates",
    categorySlug: "platters",
    price: 14.99,
    img: "/m-img/1790468044644_BigiAwasaana_BeefGyroPlate.webp",
    shortDesc: "Grilled beef gyro carved over fragrant basmati rice with crisp side salad and house sauces.",
    fullDesc: "Our Beef Gyro Rice Bowl combines savory, thinly shaved 100% Zabiha Halal spiced beef with a hearty base of seasoned long-grain basmati rice. The gyro beef is seared on high heat to crisp the outer ribbons while maintaining juicy tenderness. Layered over warm rice and garnished with diced Persian cucumbers, ripe Roma tomatoes, red onions dusted with tangy sumac, and drizzled generously with our creamy garlic toum and herb sauces. A complete, high-protein meal crafted for busy lunches and post-workout fuel in the San Fernando Valley. Mildly spiced with rich Mediterranean and Central Asian garlic undertones.",
    spiceLevel: "Mild (Savory & Herbaceous)",
    comesWith: "Seasoned basmati rice, crisp cucumber-tomato salad, sumac onions, and house sauces",
    relatedSlugs: ["bigi-s-chicken-gyro-rice-bowl", "bigi-s-beef-shawarma-wrap", "bigi-s-smash-burger"],
    blogSlug: "gyro-vs-shawarma-vs-doner-difference",
    blogTitle: "Gyro vs. Shawarma vs. Döner: What Is the Difference?",
    faqs: [
      {
        q: "Is the beef gyro meat 100% Zabiha Halal?",
        a: "Yes, all beef and poultry at Bigi Awasaana is strictly 100% hand-slaughtered Zabiha Halal."
      },
      {
        q: "What sauces come with the rice bowl?",
        a: "It comes with our house-made garlic toum and fresh herbal cilantro chutney."
      }
    ]
  },
  {
    id: "2lCvDYF1DilvP1caQjoL",
    name: "Bigi's Chicken Gyro Rice Bowl",
    slug: "bigi-s-chicken-gyro-rice-bowl",
    categoryName: "Traditional Afghan Plates",
    categorySlug: "platters",
    price: 12.99,
    img: "/m-img/1790390079047_BigiAwasaana_ChickenGyroPlate.webp",
    shortDesc: "Grilled chicken gyro carved over fragrant basmati rice, finished with a side salad and house dipping sauces.",
    fullDesc: "Tender ribbons of 100% Zabiha Halal chicken thigh and breast marinated in Mediterranean oregano, garlic, olive oil, and coriander, seared until lightly crisp on the grill. Carved and served steaming hot over fluffy, spiced basmati rice, accompanied by a refreshing salad of diced tomatoes, crunchy cucumbers, and pickled red onions. Finished with our signature creamy white sauce and zesty green chutney. Balanced, nutritious, and deeply satisfying. Mild spice profile.",
    spiceLevel: "Mild (Herbs, Garlic, and Lemon)",
    comesWith: "Basmati rice, fresh garden salad, and signature house sauces",
    relatedSlugs: ["bigi-s-beef-gyro-rice-bowl", "bigi-s-chicken-shawarma-wrap", "bigi-s-bolani"],
    blogSlug: "gyro-vs-shawarma-vs-doner-difference",
    blogTitle: "Gyro vs. Shawarma vs. Döner: What Is the Difference?",
    faqs: [
      {
        q: "Is the Chicken Gyro bowl gluten-free?",
        a: "The chicken gyro and rice are prepared without wheat ingredients, making it a popular choice for gluten-conscious diners."
      },
      {
        q: "Can I add extra meat or rice?",
        a: "Yes, extra meat and extra rice add-ons are available directly during ordering."
      }
    ]
  },
  {
    id: "63S1WsuVjtkMfaLnYzIq",
    name: "Bigi's Smash Burger",
    slug: "bigi-s-smash-burger",
    categoryName: "Burgers & Sandwiches",
    categorySlug: "burgers",
    price: 13.00,
    img: "/m-img/1786154168119_1000063335.webp",
    shortDesc: "A 100% Zabiha Halal beef patty smashed thin on a 450° griddle for crispy lacey edges, melted cheese, and Bigi's house sauce.",
    fullDesc: "Bigi's Smash Burger brings culinary food science to Los Angeles halal street dining. We start with fresh, never-frozen 100% Zabiha Halal ground beef. Placed on a screaming-hot 450-degree chrome flattop griddle, the beef is smashed paper-thin with extreme downward pressure. This triggers immediate Maillard browning, yielding an intensely flavorful, deeply caramelized lace-crisp perimeter while locking rich beefy juiciness into the center. Stacked with molten melted American cheese, crisp shredded lettuce, sliced ripe tomatoes, briny dill pickles, and Bigi's tangy house burger sauce on a butter-toasted brioche bun. Pure burger perfection.",
    spiceLevel: "Mild with Tangy House Sauce",
    comesWith: "Crisp lace-edged beef patty, melted cheese, lettuce, tomato, pickles, and house sauce on toasted bun",
    relatedSlugs: ["bigi-s-silk-road-wrap-aka-afghan-burger", "bigi-s-chapli-kabob", "bigi-s-beef-shawarma-wrap"],
    blogSlug: "halal-smash-burger-reseda-tarzana",
    blogTitle: "Halal Smash Burger in Reseda & Tarzana: The Crispy Lace Edge Secret",
    faqs: [
      {
        q: "What makes Bigi's smash burger edges so crispy?",
        a: "We smash 100% Zabiha beef directly on a 450° flat grill, creating an ultra-thin lace edge through maximum Maillard browning."
      },
      {
        q: "Does Bigi's smash burger contain any pork or machine-cut meat?",
        a: "Never. We use strictly 100% hand-slaughtered Zabiha Halal beef, prepared in a strictly Halal kitchen."
      }
    ]
  },
  {
    id: "NZJHy1ZIBfgYH47oC2Wz",
    name: "Bigi's Silk Road Wrap AKA Afghan Burger",
    slug: "bigi-s-silk-road-wrap-aka-afghan-burger",
    categoryName: "Burgers & Sandwiches",
    categorySlug: "burgers",
    price: 9.99,
    img: "/m-img/1790390925304_BigiAwasaana_AfganiBargar.webp",
    shortDesc: "A loaded lavash wrap stuffed with charcoal-grilled kabobs, crispy french fries, fresh veggies, and house sauces.",
    fullDesc: "Known across Kabul as the quintessential midnight street food, the 'Afghan Burger' is not an American round bun—it is a massive, tightly rolled flatbread wrap loaded with flavor. Inside a freshly toasted Afghan lavash, we pack savory charcoal-grilled kabob meat, a generous handful of piping-hot crispy french fries, hard-boiled egg slices, crunchy cucumbers, tomatoes, and shredded cabbage, all generously smothered in garlic mayo and zesty herb chutney. Rolled tight and toasted on the grill, every bite offers a contrasting crunch of hot fries, smoky meat, and fresh veggies. Handheld, hearty, and authentic.",
    spiceLevel: "Mild to Medium",
    comesWith: "Grilled meat, golden french fries, fresh veggies, and house sauces rolled in warm lavash",
    relatedSlugs: ["bigi-s-smash-burger", "bigi-s-beef-shawarma-wrap", "bigi-s-chicken-shawarma-wrap"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "Why is it called an Afghan Burger if it is in a wrap?",
        a: "In Kabul street culture, 'Burger Afghani' refers to charcoal kabobs and hot french fries wrapped tightly in fresh flatbread."
      },
      {
        q: "Are the fries inside the wrap?",
        a: "Yes! Crisp golden fries are rolled directly inside the wrap alongside the grilled meat and fresh herbs."
      }
    ]
  },
  {
    id: "JbIeZPCUejQkuz5QAYnz",
    name: "Bigi's Beef Shawarma Wrap",
    slug: "bigi-s-beef-shawarma-wrap",
    categoryName: "Wraps & Rolls",
    categorySlug: "wraps",
    price: 14.99,
    img: "/m-img/1788494404914_ChatGPT-Image-Sep-3--2026--08_48_25-PM.webp",
    shortDesc: "Marinated beef thigh, slow-stacked and carved, wrapped in warm flatbread with garlic toum, pickled veggies, and fresh herbs.",
    fullDesc: "Thinly carved cuts of 100% Zabiha Halal beef thigh, marinated in red wine vinegar (halal compliant), allspice, coriander, garlic, and Middle Eastern spices. Slow-roasted and flash-seared to lock in savory juices, then bundled inside a warm, pliable flatbread with traditional garlic toum, wild pickled cucumbers, fresh sliced tomatoes, and sumac-dusted onions. Toasted on the press until the bread is crisp and warm. A classic Silk Road handheld feast, made fresh on Victory Blvd.",
    spiceLevel: "Mild (Warm Spices & Garlic Toum)",
    comesWith: "Thinly carved spiced beef, garlic sauce, pickles, tomatoes, and sumac onions in toasted flatbread",
    relatedSlugs: ["bigi-s-chicken-shawarma-wrap", "bigi-s-beef-gyro-rice-bowl", "bigi-s-bolani"],
    blogSlug: "gyro-vs-shawarma-vs-doner-difference",
    blogTitle: "Gyro vs. Shawarma vs. Döner: What Is the Difference?",
    faqs: [
      {
        q: "How does shawarma differ from gyro at Bigi Awasaana?",
        a: "Shawarma features stacked whole-muscle beef cuts spiced with cardamom and allspice, while gyro uses seasoned minced ribbon meat."
      },
      {
        q: "Is the garlic sauce dairy-free?",
        a: "Our traditional Lebanese-style toum is made from fresh garlic, oil, lemon juice, and salt, containing zero dairy."
      }
    ]
  },
  {
    id: "gaN3Y2lOV6eHPYhC3Anb",
    name: "Bigi's Chicken Shawarma Wrap",
    slug: "bigi-s-chicken-shawarma-wrap",
    categoryName: "Wraps & Rolls",
    categorySlug: "wraps",
    price: 11.99,
    img: "/m-img/1788494143573_BigiAwasaana_BigisShawarmaWrap.webp",
    shortDesc: "Marinated chicken thigh slow-stacked and carved, wrapped in warm flatbread with garlic toum, pickled vegetables, and herbs.",
    fullDesc: "Succulent boneless chicken thigh layered with a fragrant spice blend of cardamom, cloves, cinnamon, garlic, and citrus zest. Carved into tender ribbons and wrapped into warm, lightly toasted flatbread with homemade garlic toum, crisp wild pickles, and fresh parsley. Lightly pressed on the griddle to crisp the exterior bread. Light, juicy, and packed with bold Middle Eastern and Afghan spices.",
    spiceLevel: "Mild (Citrus, Garlic & Cardamom)",
    comesWith: "Carved chicken shawarma, garlic toum, pickles, and herbs in warm flatbread",
    relatedSlugs: ["bigi-s-beef-shawarma-wrap", "bigi-s-chicken-gyro-rice-bowl", "bigi-s-bolani"],
    blogSlug: "gyro-vs-shawarma-vs-doner-difference",
    blogTitle: "Gyro vs. Shawarma vs. Döner: What Is the Difference?",
    faqs: [
      {
        q: "Is the Chicken Shawarma prepared with dark or white meat?",
        a: "We use tender, juicy boneless chicken thighs to ensure the meat stays succulent and flavorful."
      },
      {
        q: "Is the chicken 100% Zabiha Halal?",
        a: "Yes, every batch of chicken is 100% hand-slaughtered Zabiha Halal certified."
      }
    ]
  },
  {
    id: "BNoJY3IGYgUxeLkdrMna",
    name: "Bigi's Bolani",
    slug: "bigi-s-bolani",
    categoryName: "Street Bites & Sides",
    categorySlug: "street-bites",
    price: 7.99,
    img: "/m-img/1788493142188_BigiAwasaana_BolaniPotato.webp",
    shortDesc: "Crisp pan-seared Afghan flatbread stuffed with spiced potatoes, scallions, and herbs, served with cool garlic cilantro chutney.",
    fullDesc: "Bigi's Bolani is one of Afghanistan's most cherished traditional street delicacies. We roll unleavened dough paper-thin, stuff it with a savory mixture of smashed Yukon gold potatoes, chopped fresh leeks, scallions, ground coriander, black pepper, and sea salt. Folded into half-moons and seared on a dry, oiled chrome flattop griddle until blistered, golden, and shatteringly crisp on the outside while remaining tender inside. Sliced into generous triangles and served with our scratch-made garlic yogurt and fiery green cilantro chutney. Naturally vegetarian, immensely comforting, and baked fresh daily in our Reseda kitchen.",
    spiceLevel: "Mild (Peppery Leek & Potato Filling) with Zesty Chutney",
    comesWith: "Crisp stuffed flatbread triangles with homemade garlic yogurt and cilantro chutneys",
    relatedSlugs: ["bigi-s-chicken-samosa", "bigi-s-veg-samosa", "bigi-s-kobideh-kabob-skewer"],
    blogSlug: "what-is-bolani-afghan-street-food",
    blogTitle: "What Is Bolani? The Story Behind Afghanistan's Stuffed Flatbread",
    faqs: [
      {
        q: "What is Bolani made of?",
        a: "Paper-thin Afghan dough stuffed with spiced potatoes, scallions, and leeks, pan-fried to golden crispness."
      },
      {
        q: "Is Bolani vegetarian?",
        a: "Yes! Our traditional potato and leek Bolani is 100% vegetarian."
      }
    ]
  },
  {
    id: "FEMCaQpZlF1Tm0Q63TBz",
    name: "Bigi's Chicken Samosa",
    slug: "bigi-s-chicken-samosa",
    categoryName: "Street Bites & Sides",
    categorySlug: "street-bites",
    price: 2.99,
    img: "/m-img/1788130453606_BigiAwasaana_BigChickenSamosa.webp",
    shortDesc: "A golden shatteringly crispy pastry filled with seasoned minced chicken, onions, cilantro, and warm Afghan spices.",
    fullDesc: "Handcrafted pastry folded into a crisp pyramid pocket, generously stuffed with minced 100% Zabiha Halal chicken seasoned with cumin, coriander, ginger, garlic, and fresh green herbs. Fried to a blistered, golden-brown crunch. Served with tangy tamarind and spicy green mint-cilantro chutneys. An ideal appetizer before a hearty kabob platter.",
    spiceLevel: "Mild to Medium (Coriander & Cumin Spiced)",
    comesWith: "Crispy fried pastry filled with seasoned chicken, served with chutney",
    relatedSlugs: ["bigi-s-veg-samosa", "bigi-s-bolani", "bigi-s-chicken-soup"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "Is the chicken samosa fried fresh?",
        a: "Yes, our samosas are prepared daily and fried crisp upon order."
      },
      {
        q: "Is the samosa dough thick or thin?",
        a: "We use a delicate, flaky pastry wrapper that shatters delightfully with every bite."
      }
    ]
  },
  {
    id: "VbCgaDPsaZODs7u68uOK",
    name: "Bigi's Veg Samosa",
    slug: "bigi-s-veg-samosa",
    categoryName: "Street Bites & Sides",
    categorySlug: "street-bites",
    price: 1.99,
    img: "/m-img/1786152891068_1000063326.webp",
    shortDesc: "Crispy fried pastry pocket stuffed with spiced potatoes and sweet green peas, served with tangy chutney.",
    fullDesc: "A timeless street snack spanning the Silk Road, Central Asia, and the Subcontinent. Crisp, flaky triangular pastry pastry filled with diced Yukon potatoes, sweet green garden peas, toasted cumin seeds, coriander, and garam masala. Fried until golden and crunchy. Served with house tamarind and cilantro chutneys. 100% vegetarian.",
    spiceLevel: "Mild to Medium",
    comesWith: "Crisp potato-and-pea stuffed samosa with dipping chutney",
    relatedSlugs: ["bigi-s-chicken-samosa", "bigi-s-bolani", "bigi-s-chicken-soup"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "Is the Veg Samosa vegan?",
        a: "Yes, our vegetable samosa is prepared with plant-based ingredients and fried in 100% vegetable oil."
      },
      {
        q: "Can I order samosas for party catering?",
        a: "Yes! Samosa platters are one of our top-requested catering appetizers across Los Angeles."
      }
    ]
  },
  {
    id: "DOPmbJJnWGQdJXE38jTO",
    name: "Bigi's Chicken Soup",
    slug: "bigi-s-chicken-soup",
    categoryName: "Street Bites & Sides",
    categorySlug: "street-bites",
    price: 6.99,
    img: "/m-img/1788493169048_BigiAwasaana_ChickenSoup.webp",
    shortDesc: "A deeply flavored Afghan chicken broth with tender pulled chicken, aromatic vegetables, and house spices.",
    fullDesc: "Traditional Afghan Shorba (chicken broth) simmered for hours with 100% Zabiha Halal bone-in chicken, sweet carrots, celery, turmeric, garlic, black peppercorns, and fresh herbs. The resulting broth is light yet deeply nourishing, filled with tender shreds of pulled chicken. Served with a wedge of fresh lemon and warm Afghan flatbread. The ultimate restorative comfort food.",
    spiceLevel: "Mild (Nourishing & Herbal)",
    comesWith: "Warm chicken broth, tender chicken shreds, lemon wedge, and bread",
    relatedSlugs: ["bigi-s-bolani", "bigi-s-chicken-samosa", "bigi-s-kobideh-kabob-skewer"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "Is the soup made from real chicken bone broth?",
        a: "Yes, our broth is simmered slowly from whole Zabiha Halal chicken and aromatic herbs."
      },
      {
        q: "Is it good for chilly evenings or recovery?",
        a: "Absolutely, it is a traditional Afghan restorative broth packed with natural nutrients."
      }
    ]
  },
  {
    id: "O2EisQzW3PeTikdmr96N",
    name: "Bigi's Firni",
    slug: "bigi-s-firni",
    categoryName: "Desserts & Beverages",
    categorySlug: "drinks",
    price: 3.99,
    img: "/m-img/1788130417913_BigiAwasaana_Firmi.webp",
    shortDesc: "Silky chilled Afghan milk pudding set with ground rice, perfumed with rosewater, green cardamom, and crushed pistachios.",
    fullDesc: "No Afghan feast is complete without Firni, the beloved chilled custard dessert of Kabul and Herat. Whole milk and heavy cream are gently simmered with finely ground rice flour and pure cane sugar until velvety and thick. Perfumed with green cardamom and pure Persian rosewater, then chilled to a silky pudding consistency. Garnished with crushed emerald pistachios and almond slivers. Floral, delicately sweet, and deeply refreshing after charcoal-grilled meats.",
    spiceLevel: "Sweet (Cardamom & Rosewater)",
    comesWith: "Chilled cardamom-rosewater milk pudding topped with crushed pistachios",
    relatedSlugs: ["bigi-s-qabuli-palau-lamb-shank", "milk-tea-chai", "bigi-s-doogh"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "What gives Firni its floral aroma?",
        a: "Real crushed green cardamom pods and pure culinary rosewater infused during slow simmering."
      },
      {
        q: "Is Firni gluten-free?",
        a: "Yes, traditional Firni is thickened exclusively with ground rice flour and contains no wheat."
      }
    ]
  },
  {
    id: "kXWoq1hkNx4azjZcuuf0",
    name: "Bigi's Doogh",
    slug: "bigi-s-doogh",
    categoryName: "Desserts & Beverages",
    categorySlug: "drinks",
    price: 4.99,
    img: "/m-img/1790103676733_BigiAwasaana_YougurtDrinkDogh.webp",
    shortDesc: "A chilled lightly sparkling Afghan yogurt drink seasoned with dried wild mint, cucumber, and sea salt.",
    fullDesc: "Doogh is the national beverage of Afghanistan and the quintessential companion to charcoal kabobs. Cultured whole-milk yogurt is churned with cold filtered water, dried wild mountain mint, a hint of sea salt, and finely grated cucumber. Chilled until ice-cold. Tart, savory, and cooling, it balances the rich smoke and spice of our grilled meats perfectly.",
    spiceLevel: "Savory & Minty (Zero Heat)",
    comesWith: "Chilled yogurt drink seasoned with wild mint and sea salt",
    relatedSlugs: ["bigi-s-kobideh-kabob-skewer", "bigi-s-qabuli-palau-lamb-shank", "bigi-s-firni"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "Is Doogh sweet or savory?",
        a: "Doogh is a savory, refreshing yogurt drink similar to Turkish Ayran, seasoned with dried mint and salt."
      },
      {
        q: "Why is Doogh paired with kabobs?",
        a: "Its cool yogurt base and dried mint help aid digestion and refresh the palate between savory grilled meats."
      }
    ]
  },
  {
    id: "dK5c0LLrWSIspnaykCGo",
    name: "Milk Tea - Chai",
    slug: "milk-tea-chai",
    categoryName: "Desserts & Beverages",
    categorySlug: "drinks",
    price: 2.49,
    img: "/m-img/1790103595926_BigiAwasaana_KadhakChai_2880x2304.webp",
    shortDesc: "Freshly brewed loose-leaf black tea slow-simmered with whole milk and green cardamom.",
    fullDesc: "Authentic Afghan Shir Chai prepared by slow-brewing premium loose-leaf black tea leaves with whole milk, crushed green cardamom pods, and a light touch of sugar. Simmered until rich, creamy, and deeply aromatic. Served piping hot in true Silk Road hospitality fashion.",
    spiceLevel: "Warm Cardamom Spiced",
    comesWith: "Hot brewed cardamom milk tea",
    relatedSlugs: ["bigi-s-firni", "bigi-s-bolani", "bigi-s-chicken-samosa"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "What spices are in the Afghan Chai?",
        a: "We slow-simmer black tea with freshly cracked green cardamom pods and whole milk."
      },
      {
        q: "Can I request unsweetened tea?",
        a: "Yes, let our team know if you prefer unsweetened tea when ordering."
      }
    ]
  },
  {
    id: "umtvEZ6d98Rb4K0conY1",
    name: "Soft Drinks",
    slug: "soft-drinks",
    categoryName: "Desserts & Beverages",
    categorySlug: "drinks",
    price: 2.45,
    img: "/m-img/1788130024385_101757-middle.webp",
    shortDesc: "A chilled selection of canned and bottled sodas including Coke, Diet Coke, Sprite, and Fanta.",
    fullDesc: "Ice-cold canned and bottled refreshments including Coca-Cola, Diet Coke, Sprite, and Fanta Orange. The classic fizzy pairing for smash burgers, shawarma wraps, and charcoal kabobs on warm Reseda evenings.",
    spiceLevel: "None",
    comesWith: "Chilled can or bottle of your choice",
    relatedSlugs: ["bottled-water", "bigi-s-smash-burger", "bigi-s-beef-shawarma-wrap"],
    blogSlug: "halal-smash-burger-reseda-tarzana",
    blogTitle: "Halal Smash Burger in Reseda & Tarzana",
    faqs: [
      {
        q: "What soft drink options are available?",
        a: "We carry Coke, Diet Coke, Sprite, Zero Sugar, and fruit sodas."
      }
    ]
  },
  {
    id: "9LXen2r7xbZMFFk9MVxG",
    name: "Bottled Water",
    slug: "bottled-water",
    categoryName: "Desserts & Beverages",
    categorySlug: "drinks",
    price: 0.99,
    img: "/m-img/bottled-water.webp",
    shortDesc: "Pure, chilled bottled spring water.",
    fullDesc: "Clean, ice-cold bottled water to keep you refreshed while enjoying our coal-fired kabobs and savory street meals.",
    spiceLevel: "None",
    comesWith: "Chilled bottle of pure water",
    relatedSlugs: ["soft-drinks", "bigi-s-doogh", "bigi-s-smash-burger"],
    blogSlug: "complete-guide-to-afghan-food-los-angeles",
    blogTitle: "The Complete Guide to Authentic Afghan Food in Los Angeles",
    faqs: [
      {
        q: "Is cold water available for pickup?",
        a: "Yes, kept refrigerated and ready for instant pickup with your order."
      }
    ]
  }
];

module.exports = { ITEMS };
