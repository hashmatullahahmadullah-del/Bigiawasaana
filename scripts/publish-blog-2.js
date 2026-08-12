import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCGJxbu5YDjdrguMrnARfmfkkyM228tFSY",
  authDomain: "bigi-awasaana-7b3ce.firebaseapp.com",
  projectId: "bigi-awasaana-7b3ce",
  storageBucket: "bigi-awasaana-7b3ce.firebasestorage.app",
  messagingSenderId: "807482124970",
  appId: "1:807482124970:web:d819b7ea604e58b3507ed3",
  measurementId: "G-KMWPNQK580"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const blogContent = `
<p>If you've never tried Afghan cuisine before, you're in for a treat. Known for its rich, savory, and deeply aromatic flavor profile, Afghan food bridges the culinary traditions of the Middle East, Central Asia, and the Indian subcontinent. And the best part? It's incredibly accessible and delicious without being overwhelmingly spicy.</p>

<p>For those visiting <strong>Bigi Awasaana</strong> in Los Angeles (Reseda, CA) for the first time, ordering can feel intimidating if you aren't familiar with the names of the dishes. Here is your ultimate beginner's guide on what to order to experience the true taste of Kabul.</p>

<h2>1. Start with the Ultimate Street Food: Bolani</h2>
<p>Before you dive into the main courses, you absolutely must try <strong>Bolani</strong>. This is an Afghan staple—a rustic, thin flatbread that is stuffed with a savory filling, usually a mix of potatoes, leeks, and herbs, and then pan-fried until golden and crispy. It comes piping hot and is served with a side of homemade cilantro-mint chutney or garlic yogurt. It's the perfect shareable appetizer that will instantly hook you.</p>
<p><img src="/images/blog/afghan_food_spread_guide.jpg" alt="Afghan Food Spread featuring Bolani and Kabuli Pulao" /></p>

<h2>2. The Crown Jewel: Kabuli Pulao</h2>
<p>You cannot visit an Afghan restaurant without trying the national dish: <strong>Kabuli Pulao</strong> (or Qabili Palau). This is a masterclass in balancing sweet and savory flavors. The dish features fragrant, long-grain basmati rice cooked in a rich broth, then crowned with tender chunks of slow-cooked lamb or beef, caramelized carrots, and sweet raisins, often garnished with almonds or pistachios.</p>
<p>The meat is usually buried under the mound of rice so it stays incredibly tender and juicy. The contrast between the savory meat and the sweet carrots and raisins is unlike anything else.</p>

<h2>3. For the Meat Lovers: Kebabs</h2>
<p>Afghan kebabs are legendary. The secret lies in the marinade and the charcoal grill. For beginners, we highly recommend trying a mix:</p>
<ul>
  <li><strong>Chicken Tikka Kebab:</strong> Juicy chunks of chicken breast marinated in yogurt and spices, grilled to perfection.</li>
  <li><strong>Chapli Kebab:</strong> A uniquely Afghan and Pashtun creation—a flattened, spiced minced beef patty mixed with tomatoes, coriander, and green chilies, pan-fried for a crispy exterior.</li>
  <li><strong>Koobideh (Luleh):</strong> Flavorful skewers of ground beef mixed with onions and spices, grilled over an open flame.</li>
</ul>

<h2>4. The Hidden Gem: Mantu (Afghan Dumplings)</h2>
<p>If you love dumplings, you will fall in love with <strong>Mantu</strong>. These delicate, steamed dumplings are stuffed with spiced ground beef and onions. What makes them truly special is the topping: they are smothered in a garlicky yogurt sauce and a rich tomato-based lentil or meat sauce, finished with a sprinkle of dried mint. It's a flavor explosion in every bite.</p>

<h2>Ready to Try It?</h2>
<p>Afghan food is all about hospitality, sharing, and incredible flavors. At Bigi Awasaana, we take pride in serving authentic, Halal Afghan street food and traditional dishes to the Los Angeles community.</p>
<p><em>Check out our <a href="/menu.html">Full Menu</a> or visit us today in Reseda to start your culinary journey along the Silk Road!</em></p>
`;

async function publishBlog() {
  try {
    console.log("Publishing new blog post...");
    
    const postData = {
      title: "What to Order at an Afghan Restaurant: A Beginner's Guide (Los Angeles Edition)",
      slug: "what-to-order-afghan-restaurant-guide-los-angeles",
      excerpt: "Trying Afghan cuisine for the first time? Discover the best dishes to order, from the iconic Kabuli Pulao to crispy Bolani and savory Mantu dumplings at Bigi Awasaana in Los Angeles.",
      keywords: "Afghan restaurant Los Angeles, Authentic Afghan food, What to order at an Afghan restaurant, Afghan food near me Reseda, Bolani, Kabuli Pulao",
      content: blogContent,
      coverImage: "/images/blog/afghan_food_spread_guide.jpg", 
      isPublished: true,
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "posts"), postData);
    console.log(`Successfully published blog post with ID: ${docRef.id}`);
    process.exit(0);
  } catch (error) {
    console.error("Error publishing blog post:", error);
    process.exit(1);
  }
}

publishBlog();
