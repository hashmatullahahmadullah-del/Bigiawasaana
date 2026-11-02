const fs = require('fs');
let code = fs.readFileSync('src/admin/menu.js', 'utf8');

const regex = /export async function populateMealLinks\(\) \{[\s\S]*?if \(editSelect\) editSelect\.innerHTML = optionsHtml;\r?\n\}/;

const replacement = `export async function populateMealLinks() {
  const addSelect = document.getElementById('menu-meal-link');
  const editSelect = document.getElementById('edit-menu-meal-link');
  if (!addSelect && !editSelect) return;
  
  try {
    const q = query(collection(db, "menu"));
    const snapshot = await getDocs(q);
    const meals = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      meals.push({ id: doc.id, name: data.name, cat: data.category });
    });
    
    meals.sort((a, b) => a.name.localeCompare(b.name));
    
    const optionsHtml = '<option value="">No Meal Upgrade (or auto-match)</option>' + 
      meals.map(m => \`<option value="\${m.id}">\${m.name} (\${m.cat})</option>\`).join('');
      
    if (addSelect) addSelect.innerHTML = optionsHtml;
    if (editSelect) editSelect.innerHTML = optionsHtml;
  } catch (err) {
    console.warn("populateMealLinks notice:", err);
  }
}`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/admin/menu.js', code, 'utf8');
  console.log('src/admin/menu.js updated successfully');
} else {
  console.log('Regex did not match');
}
