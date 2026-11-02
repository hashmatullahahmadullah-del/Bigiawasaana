const fs = require('fs');

function patchFile(filePath, searchStr, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  const normalized = content.replace(/\r\n/g, '\n');
  const normSearch = searchStr.replace(/\r\n/g, '\n');
  const normReplace = replaceStr.replace(/\r\n/g, '\n');

  if (!normalized.includes(normSearch)) {
    console.error(`Failed to find search string in ${filePath}`);
    return false;
  }

  let updated = normalized.replace(normSearch, () => normReplace);
  if (isCrlf) updated = updated.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Successfully patched ${filePath}`);
  return true;
}

// 1. menu.js
patchFile(
  'src/admin/menu.js',
  `      updateTvSpecialLiveBadge(sp);
    }
  });
}`,
  `      updateTvSpecialLiveBadge(sp);
    }
  }, (err) => {
    console.warn('tv_display listener notice:', err);
  });
}`
);

// 2. settings.js
patchFile(
  'src/admin/settings.js',
  `      document.querySelectorAll('.pickup-day-cb').forEach(cb => {
        cb.checked = openDays.includes(parseInt(cb.value, 10));
      });
    }
  });
}`,
  `      document.querySelectorAll('.pickup-day-cb').forEach(cb => {
        cb.checked = openDays.includes(parseInt(cb.value, 10));
      });
    }
  }, (err) => {
    console.warn('pickupConfig listener notice:', err);
  });
}`
);

// 3. deals.js
patchFile(
  'src/admin/deals.js',
  `    renderDeals();
    updateActiveDealsCount();
  });

  return unsub;`,
  `    renderDeals();
    updateActiveDealsCount();
  }, (err) => {
    console.warn('deals listener notice:', err);
  });

  return unsub;`
);

// 4. blog.js
patchFile(
  'src/admin/blog.js',
  `        blogList.appendChild(card);
      });
    });
  }`,
  `        blogList.appendChild(card);
      });
    }, (err) => {
      console.warn('posts listener notice:', err);
    });
  }`
);
