/**
 * Pure function to evaluate active deals against a cart.
 * Runs on both front-end (main.js) and back-end Cloud Functions.
 * 
 * @param {Array} cart - [{ id: string, name: string, price: number, qty: number }]
 * @param {Array} activeDeals - Array of Firestore deal documents
 * @param {Array} menuItems - Array of menu items [{ id, name, price, category }]
 * @returns {Object} { discountCents: number, appliedDeals: Array, itemDiscounts: Object, units: Array }
 */
function evaluateDeals(cart, activeDeals, menuItems) {
  // 1. Flatten the cart into individual units for precise per-unit tracking
  const units = [];
  cart.forEach(item => {
    const menuInfo = menuItems.find(m => m.id === item.id) || {};
    const category = (menuInfo.category || '').toLowerCase();
    const originalPriceCents = Math.round((item.price || menuInfo.price || 0) * 100);
    
    for (let i = 0; i < item.qty; i++) {
      units.push({
        itemId: item.id,
        name: item.name || menuInfo.name || 'Unknown Item',
        category: category,
        originalPriceCents: originalPriceCents,
        priceCents: originalPriceCents,
        discountCents: 0,
        consumedBy: null // dealId
      });
    }
  });

  // 2. Filter active and scheduled deals
  const now = new Date();
  const validDeals = activeDeals.filter(deal => {
    if (!deal.active) return false;
    
    // Date checks
    if (deal.startDate) {
      const start = deal.startDate.toDate ? deal.startDate.toDate() : new Date(deal.startDate);
      if (now < start) return false;
    }
    if (deal.endDate) {
      const end = deal.endDate.toDate ? deal.endDate.toDate() : new Date(deal.endDate);
      if (now > end) return false;
    }
    return true;
  });

  // 3. Sort by priority descending
  validDeals.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const appliedDeals = [];
  const dealUsageCount = {};

  // 4. Evaluate each deal
  for (const deal of validDeals) {
    if (deal.usageLimitPerOrder !== null) {
      dealUsageCount[deal.id] = 0;
    }

    let matchesFound = true;
    while (matchesFound) {
      if (deal.usageLimitPerOrder !== null && dealUsageCount[deal.id] >= deal.usageLimitPerOrder) {
        break;
      }

      // Check conditions
      const condResult = matchConditions(units, deal.conditions, deal.type);
      if (!condResult.qualified) {
        matchesFound = false;
        break;
      }

      // Apply reward
      const rewardResult = applyReward(units, condResult.matchedUnitIndexes, deal);
      if (rewardResult.applied) {
        // Mark consumed units
        const allTouched = [...condResult.matchedUnitIndexes, ...rewardResult.rewardUnitIndexes];
        allTouched.forEach(idx => {
          if (!deal.stackable) {
            units[idx].consumedBy = deal.id;
          }
        });

        if (deal.usageLimitPerOrder !== null) {
          dealUsageCount[deal.id]++;
        }

        const existing = appliedDeals.find(ad => ad.dealId === deal.id);
        if (existing) {
          existing.discountCents += rewardResult.discountCents;
          existing.timesApplied += 1;
        } else {
          appliedDeals.push({
            dealId: deal.id,
            title: deal.title,
            discountCents: rewardResult.discountCents,
            type: deal.type,
            timesApplied: 1
          });
        }
      } else {
        matchesFound = false;
        break;
      }
    }
  }

  // Calculate totals
  const totalDiscountCents = units.reduce((sum, u) => sum + u.discountCents, 0);

  // Group item discounts by itemId for UI rendering
  const itemDiscounts = {};
  units.forEach(u => {
    if (u.discountCents > 0) {
      itemDiscounts[u.itemId] = (itemDiscounts[u.itemId] || 0) + u.discountCents;
    }
  });

  return {
    discountCents: totalDiscountCents,
    appliedDeals,
    itemDiscounts,
    units
  };
}

/**
 * Helper to match deal conditions against available units.
 */
function matchConditions(units, conditions, dealType) {
  if (!conditions) return { qualified: false };

  // 1. Order-wide deals
  if (conditions.appliesToWholeOrder) {
    const eligibleUnits = units.filter(u => u.consumedBy === null);
    const eligibleSubtotal = eligibleUnits.reduce((sum, u) => sum + u.priceCents, 0);
    const minSpendCents = Math.round((conditions.minQty || 0) * 100);
    
    if (eligibleSubtotal >= minSpendCents && eligibleUnits.length > 0) {
      return {
        qualified: true,
        matchedUnitIndexes: eligibleUnits.map(eu => units.indexOf(eu))
      };
    }
    return { qualified: false };
  }

  // 2. Combo / Bundle Deals (exact sets of items/categories required)
  if (dealType === 'bundle_price' || dealType === 'combo') {
    const tempMatchedIndexes = [];
    let matchedAll = true;

    // Match exact item ids
    if (conditions.itemIds && conditions.itemIds.length > 0) {
      for (const reqItemId of conditions.itemIds) {
        const foundIdx = units.findIndex((u, idx) => 
          u.itemId === reqItemId && 
          u.consumedBy === null && 
          !tempMatchedIndexes.includes(idx)
        );
        if (foundIdx !== -1) {
          tempMatchedIndexes.push(foundIdx);
        } else {
          matchedAll = false;
          break;
        }
      }
    }

    // Match exact category ids
    if (matchedAll && conditions.categoryIds && conditions.categoryIds.length > 0) {
      for (const reqCat of conditions.categoryIds) {
        const foundIdx = units.findIndex((u, idx) => 
          u.category === reqCat.toLowerCase() && 
          u.consumedBy === null && 
          !tempMatchedIndexes.includes(idx)
        );
        if (foundIdx !== -1) {
          tempMatchedIndexes.push(foundIdx);
        } else {
          matchedAll = false;
          break;
        }
      }
    }

    if (matchedAll) {
      return { qualified: true, matchedUnitIndexes: tempMatchedIndexes };
    }
    return { qualified: false };
  }

  // 3. Category / Item Specific Deals (requires at least minQty of matching items)
  const matchingUnits = [];
  units.forEach((u, idx) => {
    if (u.consumedBy !== null) return;
    
    const matchesItem = conditions.itemIds?.includes(u.itemId);
    const matchesCat = conditions.categoryIds?.includes(u.category);
    
    const hasItems = conditions.itemIds?.length > 0;
    const hasCats = conditions.categoryIds?.length > 0;

    if ((hasItems && matchesItem) || (hasCats && matchesCat)) {
      matchingUnits.push({ index: idx, price: u.priceCents });
    }
  });

  const requiredQty = conditions.minQty || 1;
  if (matchingUnits.length >= requiredQty) {
    // Take the matching units
    return {
      qualified: true,
      matchedUnitIndexes: matchingUnits.slice(0, requiredQty).map(mu => mu.index)
    };
  }

  return { qualified: false };
}

/**
 * Helper to apply reward and calculate discount amount.
 */
function applyReward(units, matchedUnitIndexes, deal) {
  const reward = deal.reward;
  if (!reward) return { applied: false };

  // 1. Bundle Package Price (Combo / Bundle)
  if (reward.discountType === 'fixedBundlePrice') {
    const currentSubtotal = matchedUnitIndexes.reduce((sum, idx) => sum + units[idx].priceCents, 0);
    const targetBundleCents = Math.round(reward.value * 100);
    const discountCents = currentSubtotal - targetBundleCents;

    if (discountCents > 0) {
      let appliedDiscount = 0;
      matchedUnitIndexes.forEach((idx, i) => {
        let unitDiscount = 0;
        if (i === matchedUnitIndexes.length - 1) {
          unitDiscount = discountCents - appliedDiscount;
        } else {
          unitDiscount = Math.round(discountCents * (units[idx].priceCents / currentSubtotal));
        }
        units[idx].priceCents -= unitDiscount;
        units[idx].discountCents += unitDiscount;
        appliedDiscount += unitDiscount;
      });
      return { applied: true, discountCents, rewardUnitIndexes: [] };
    }
    return { applied: false };
  }

  // 2. Percent Off
  if (reward.discountType === 'percent') {
    let totalDiscount = 0;
    matchedUnitIndexes.forEach(idx => {
      const unitDiscount = Math.round(units[idx].priceCents * (reward.value / 100));
      units[idx].priceCents -= unitDiscount;
      units[idx].discountCents += unitDiscount;
      totalDiscount += unitDiscount;
    });
    return { applied: true, discountCents: totalDiscount, rewardUnitIndexes: [] };
  }

  // 3. Fixed Amount Off
  if (reward.discountType === 'fixed') {
    if (deal.conditions?.appliesToWholeOrder) {
      // Order-level fixed off
      const currentSubtotal = matchedUnitIndexes.reduce((sum, idx) => sum + units[idx].priceCents, 0);
      const discountCents = Math.min(Math.round(reward.value * 100), currentSubtotal);
      
      if (discountCents > 0) {
        let appliedDiscount = 0;
        matchedUnitIndexes.forEach((idx, i) => {
          let unitDiscount = 0;
          if (i === matchedUnitIndexes.length - 1) {
            unitDiscount = discountCents - appliedDiscount;
          } else {
            unitDiscount = Math.round(discountCents * (units[idx].priceCents / currentSubtotal));
          }
          units[idx].priceCents -= unitDiscount;
          units[idx].discountCents += unitDiscount;
          appliedDiscount += unitDiscount;
        });
        return { applied: true, discountCents, rewardUnitIndexes: [] };
      }
      return { applied: false };
    } else {
      // Item-level fixed off (applies to each matching unit)
      let totalDiscount = 0;
      matchedUnitIndexes.forEach(idx => {
        const unitDiscount = Math.min(Math.round(reward.value * 100), units[idx].priceCents);
        units[idx].priceCents -= unitDiscount;
        units[idx].discountCents += unitDiscount;
        totalDiscount += unitDiscount;
      });
      return { applied: true, discountCents: totalDiscount, rewardUnitIndexes: [] };
    }
  }

  // 4. Free Item (BOGO / Free Gift)
  if (reward.discountType === 'freeItem') {
    // Find unconsumed reward items in cart
    const eligibleRewardUnitIndexes = [];
    units.forEach((u, idx) => {
      if (u.consumedBy !== null) return;
      if (matchedUnitIndexes.includes(idx)) return; // Can't be a trigger unit
      
      if (reward.rewardItemIds?.includes(u.itemId)) {
        eligibleRewardUnitIndexes.push(idx);
      }
    });

    if (eligibleRewardUnitIndexes.length > 0) {
      const rewardUnitIndexes = eligibleRewardUnitIndexes.slice(0, reward.rewardQty || 1);
      let totalDiscount = 0;
      rewardUnitIndexes.forEach(idx => {
        const unitDiscount = units[idx].priceCents;
        units[idx].priceCents = 0;
        units[idx].discountCents += unitDiscount;
        totalDiscount += unitDiscount;
      });
      return { applied: true, discountCents: totalDiscount, rewardUnitIndexes };
    }
    return { applied: false };
  }

  return { applied: false };
}
module.exports = { evaluateDeals };
