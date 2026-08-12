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
<h2>The Best Afghan Street Food in the SFV</h2>
<p>If you're looking for the most authentic Afghan street food in Los Angeles, you don't need to look any further than Reseda. Bigi Awasaana brings the vibrant, spice-filled streets of Kabul straight to the San Fernando Valley. Here are three absolute must-try items on our menu that will transport your taste buds.</p>

<h3>1. Chapli Kabab</h3>
<p>This isn't your average patty. The Chapli Kabab is a legendary Pashtun-style minced meat kabab, flattened and pan-fried to crispy perfection. Packed with a fragrant blend of coriander, pomegranate seeds, green chilies, and tomatoes, every bite offers a complex crunch and burst of savory heat. We serve ours fresh off the grill, exactly how it's done in the bustling food markets back home.</p>

<h3>2. Authentic Bolani</h3>
<p>Think of Bolani as the ultimate Afghan comfort food. It's a thin, rustic flatbread stuffed with a savory filling—most traditionally, freshly chopped leeks, potatoes, and herbs—then pan-fried until the exterior is golden and blistered. It's crispy on the outside, soft and savory on the inside, and absolutely incredible when dipped in our homemade cilantro-mint chutney.</p>

<h3>3. The Halal Afghan Burger</h3>
<p>Don't let the word "burger" fool you; this is a street food masterpiece unlike anything you'll find at a typical fast-food joint. Our Afghan Burger features a massive, flavor-packed Halal beef patty, layered with fresh vegetables, zesty sauces, and sometimes even crispy fries, all wrapped tightly in a soft lavash bread. It's a handheld feast that perfectly captures the bold, hearty essence of Afghan street eating.</p>

<p><em>Ready to experience these flavors for yourself? Visit us at Bigi Awasaana in Reseda today or order online for pickup!</em></p>
`;

async function publishBlog() {
  try {
    console.log("Publishing blog post...");
    
    const postData = {
      title: "3 Authentic Afghan Street Foods You Need to Try in Reseda",
      slug: "3-authentic-afghan-street-foods-reseda",
      excerpt: "Discover the best Halal Afghan street food in the San Fernando Valley. From crispy Chapli Kababs to stuffed Bolani flatbreads, these are the top 3 must-try dishes at Bigi Awasaana.",
      keywords: "Afghan Food, Reseda, Chapli Kabab, Bolani, Halal Burger, San Fernando Valley",
      content: blogContent,
      coverImage: "/images/blog/afghan_street_food_spread.jpg", 
      isPublished: true,
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "posts"), postData);
    console.log(\`Successfully published blog post with ID: \${docRef.id}\`);
    process.exit(0);
  } catch (error) {
    console.error("Error publishing blog post:", error);
    process.exit(1);
  }
}

publishBlog();
