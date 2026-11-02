(async () => {
  const url = 'https://firestore.googleapis.com/v1/projects/bigi-awasaana-7b3ce/databases/(default)/documents/menu?pageSize=50';
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.documents) {
    console.log("No documents:", data);
    return;
  }

  const items = data.documents.map(d => {
    const fields = d.fields || {};
    const id = d.name.split('/').pop();
    const name = fields.name?.stringValue || '';
    const img = fields.img?.stringValue || '';
    const price = fields.price?.doubleValue ?? fields.price?.integerValue ?? 0;
    const category = fields.category?.stringValue || '';
    return { id, name, price, img, category };
  });

  console.log(`Fetched ${items.length} items from Firestore REST:`);
  console.log(JSON.stringify(items, null, 2));
})();
