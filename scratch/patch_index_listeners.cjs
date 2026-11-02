const fs = require('fs');

function patchFile(filePath, searchStr, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  const normalized = content.replace(/\r\n/g, '\n');
  const normSearch = searchStr.replace(/\r\n/g, '\n');
  const normReplace = replaceStr.replace(/\r\n/g, '\n');

  if (!normalized.includes(normSearch)) {
    console.error(`Failed to find search in ${filePath}:`);
    console.error(normSearch.substring(0, 80));
    return false;
  }

  let updated = normalized.replace(normSearch, () => normReplace);
  if (isCrlf) updated = updated.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Successfully patched ${filePath}`);
  return true;
}

// 1. loyalty
patchFile(
  'src/admin/index.js',
  `    renderLoyalty();
    renderCustomers();
  });`,
  `    renderLoyalty();
    renderCustomers();
  }, (err) => {
    console.warn('Loyalty settings listener notice:', err);
  });`
);

// 2. reviews
patchFile(
  'src/admin/index.js',
  `    renderReviews();
  });`,
  `    renderReviews();
  }, (err) => {
    console.warn('Reviews listener notice:', err);
  });`
);

// 3. catering
patchFile(
  'src/admin/index.js',
  `    renderCatering();
  });
  window.unitSettingsUnsub`,
  `    renderCatering();
  }, (err) => {
    console.warn('Catering inquiries listener notice:', err);
  });
  window.unitSettingsUnsub`
);

// 4. unitSettings
patchFile(
  'src/admin/index.js',
  `  window.unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  window.unitSettingsUnsub = onSnapshot(doc(db, 'unitEconomics_settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitSettings = { ...state.unitSettings, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Unit economics settings notice:', err);
  });`
);

// 5. unitPlatforms
patchFile(
  'src/admin/index.js',
  `  window.unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  window.unitPlatformsUnsub = onSnapshot(doc(db, 'unitEconomics_platforms', 'rates'), (docSnap) => {
    if (docSnap.exists()) {
      state.unitPlatforms = { ...state.unitPlatforms, ...docSnap.data() };
    }
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Unit economics platforms notice:', err);
  });`
);

// 6. ingredients
patchFile(
  'src/admin/index.js',
  `  window.ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  window.ingredientsUnsub = onSnapshot(ingredientsQuery, (snapshot) => {
    state.ingredients = [];
    snapshot.forEach(d => state.ingredients.push({ id: d.id, ...d.data() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Ingredients notice:', err);
  });`
);

// 7. events
patchFile(
  'src/admin/index.js',
  `  window.eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  });`,
  `  window.eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
    state.events = [];
    snapshot.forEach(d => state.events.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() }));
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
  }, (err) => {
    console.warn('Events notice:', err);
  });`
);

// 8. tv_promo
patchFile(
  'src/admin/index.js',
  `      toggleTvPromoEditor(data.active);
    }
  });
}

export function toggleTvPromoEditor`,
  `      toggleTvPromoEditor(data.active);
    }
  }, (err) => {
    console.warn('tv_promo notice:', err);
  });
}

export function toggleTvPromoEditor`
);

// 9. cart_promo
patchFile(
  'src/admin/index.js',
  `      toggleCartPromoEditor(data.active);
    }
  });
}

export function toggleCartPromoEditor`,
  `      toggleCartPromoEditor(data.active);
    }
  }, (err) => {
    console.warn('cart_promo notice:', err);
  });
}

export function toggleCartPromoEditor`
);

// 10. popup
patchFile(
  'src/admin/index.js',
  `      togglePopupEditor(data.active);
    }
  });
}

export const popupActiveCheckbox`,
  `      togglePopupEditor(data.active);
    }
  }, (err) => {
    console.warn('popup notice:', err);
  });
}

export const popupActiveCheckbox`
);

// 11. retail.js
patchFile(
  'src/admin/retail.js',
  `  onSnapshot(q, (snapshot) => {
    retailItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRetailItems();
  });`,
  `  onSnapshot(q, (snapshot) => {
    retailItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRetailItems();
  }, (err) => {
    console.warn('retail_items notice:', err);
  });`
);
