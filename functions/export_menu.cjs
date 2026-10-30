const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function exportMenu() {
    const snapshot = await db.collection('menu').get();
    let csvData = [];
    
    const headers = ['id', 'name', 'name_fa', 'category', 'price', 'description', 'desc_fa', 'img', 'variants', 'addOns', 'featured', 'hidden', 'slug'];
    csvData.push(headers.map(h => '"' + h + '"').join(','));
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        const name = String(data.name || '').replace(/"/g, '""');
        const name_fa = String(data.name_fa || '').replace(/"/g, '""');
        const category = String(data.category || '').replace(/"/g, '""');
        const price = data.price || 0;
        const description = String(data.desc || data.description || '').replace(/"/g, '""');
        const desc_fa = String(data.desc_fa || '').replace(/"/g, '""');
        const img = String(data.img || data.imageUrl || '').replace(/"/g, '""');
        
        let variants = '';
        if (data.variants && Array.isArray(data.variants)) {
            variants = data.variants.map(v => (v.name || '') + ' ($' + (v.price || 0) + ')').join(' | ').replace(/"/g, '""');
        }
        
        let addOns = '';
        if (data.addOns && Array.isArray(data.addOns)) {
            addOns = data.addOns.map(a => (a.name || '') + ' ($' + (a.price || 0) + ')').join(' | ').replace(/"/g, '""');
        }
        
        const featured = data.featured ? 'true' : 'false';
        const hidden = data.hidden ? 'true' : 'false';
        const slug = String(data.slug || '').replace(/"/g, '""');
        
        const row = [id, name, name_fa, category, price, description, desc_fa, img, variants, addOns, featured, hidden, slug];
        csvData.push(row.map(cell => '"' + cell + '"').join(','));
    });
    
    fs.writeFileSync(path.join(__dirname, '../menu_export.csv'), csvData.join('\n'));
    console.log('Exported to menu_export.csv successfully.');
}

exportMenu().catch(console.error);
