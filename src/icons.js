/**
 * Premium SVG Icons Library
 * Clean, lightweight, vector replacement for casual emojis.
 * Matches Bigi Awasaana's dark luxury aesthetic.
 */

function svg(paths, size = 18, className = 'ui-icon', extraAttr = '') {
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extraAttr}>${paths}</svg>`;
}

export const iconBolt = (size = 18, className = 'ui-icon') =>
  svg('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>', size, className);

export const iconCard = (size = 18, className = 'ui-icon') =>
  svg('<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>', size, className);

export const iconLock = (size = 18, className = 'ui-icon') =>
  svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', size, className);

export const iconShield = (size = 18, className = 'ui-icon') =>
  svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', size, className);

export const iconCheck = (size = 18, className = 'ui-icon') =>
  svg('<polyline points="20 6 9 17 4 12"/>', size, className);

export const iconCheckCircle = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="12" r="10"/><polyline points="16 10 11 15 8 12"/>', size, className);

export const iconAlertTriangle = (size = 18, className = 'ui-icon') =>
  svg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', size, className);

export const iconClock = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', size, className);

export const iconMapPin = (size = 18, className = 'ui-icon') =>
  svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', size, className);

export const iconPhone = (size = 18, className = 'ui-icon') =>
  svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>', size, className);

export const iconPackage = (size = 18, className = 'ui-icon') =>
  svg('<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>', size, className);

export const iconTruck = (size = 18, className = 'ui-icon') =>
  svg('<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>', size, className);

export const iconUtensils = (size = 18, className = 'ui-icon') =>
  svg('<path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10a4 4 0 0 1-8 0V2"/><path d="M11 2v4"/><path d="M15 14v8"/><path d="M7 14v8"/>', size, className);

export const iconCalendar = (size = 18, className = 'ui-icon') =>
  svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', size, className);

export const iconUser = (size = 18, className = 'ui-icon') =>
  svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', size, className);

export const iconCrown = (size = 18, className = 'ui-icon') =>
  svg('<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/>', size, className);

export const iconAward = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>', size, className);

export const iconMedal = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="9" r="6"/><path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.11"/>', size, className);

export const iconSparkle = (size = 18, className = 'ui-icon') =>
  svg('<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>', size, className);

export const iconFlame = (size = 18, className = 'ui-icon') =>
  svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>', size, className);

export const iconRefresh = (size = 18, className = 'ui-icon') =>
  svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', size, className);

export const iconPlus = (size = 18, className = 'ui-icon') =>
  svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', size, className);

export const iconMinus = (size = 18, className = 'ui-icon') =>
  svg('<line x1="5" y1="12" x2="19" y2="12"/>', size, className);

export const iconTrash = (size = 18, className = 'ui-icon') =>
  svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>', size, className);

export const iconX = (size = 18, className = 'ui-icon') =>
  svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', size, className);

export const iconShoppingBag = (size = 18, className = 'ui-icon') =>
  svg('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>', size, className);

export const iconFileText = (size = 18, className = 'ui-icon') =>
  svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', size, className);

export const iconBell = (size = 18, className = 'ui-icon') =>
  svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', size, className);

export const iconBellOff = (size = 18, className = 'ui-icon') =>
  svg('<path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><line x1="1" y1="1" x2="23" y2="23"/>', size, className);

export const iconStar = (size = 18, className = 'ui-icon', fill = 'currentColor') =>
  `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

export const iconChart = (size = 18, className = 'ui-icon') =>
  svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', size, className);

export const iconTrendingUp = (size = 18, className = 'ui-icon') =>
  svg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', size, className);

export const iconTrendingDown = (size = 18, className = 'ui-icon') =>
  svg('<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>', size, className);

export const iconTv = (size = 18, className = 'ui-icon') =>
  svg('<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>', size, className);

export const iconTag = (size = 18, className = 'ui-icon') =>
  svg('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>', size, className);

export const iconUsers = (size = 18, className = 'ui-icon') =>
  svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', size, className);

export const iconCar = (size = 18, className = 'ui-icon') =>
  svg('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.2 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>', size, className);

export const iconReceipt = (size = 18, className = 'ui-icon') =>
  svg('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/>', size, className);

export const iconEdit = (size = 18, className = 'ui-icon') =>
  svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>', size, className);

export const iconSettings = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', size, className);

export const iconMoon = (size = 18, className = 'ui-icon') =>
  svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', size, className);

export const iconSun = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>', size, className);

export const iconSearch = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', size, className);

export const iconCamera = (size = 18, className = 'ui-icon') =>
  svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', size, className);

export const iconDollarSign = (size = 18, className = 'ui-icon') =>
  svg('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', size, className);

export const iconMegaphone = (size = 18, className = 'ui-icon') =>
  svg('<path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>', size, className);

export const iconSmartphone = (size = 18, className = 'ui-icon') =>
  svg('<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', size, className);

export const iconVolume2 = (size = 18, className = 'ui-icon') =>
  svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>', size, className);

export const iconVolumeX = (size = 18, className = 'ui-icon') =>
  svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>', size, className);

export const iconMaximize = (size = 18, className = 'ui-icon') =>
  svg('<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>', size, className);

export const iconMinimize = (size = 18, className = 'ui-icon') =>
  svg('<path d="M4 14h6v6m10-10h-6V4m0 16v-6h6M10 4v6H4"/>', size, className);

export const iconGlobe = (size = 18, className = 'ui-icon') =>
  svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', size, className);

export const iconSave = (size = 18, className = 'ui-icon') =>
  svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', size, className);

export const iconGift = (size = 18, className = 'ui-icon') =>
  svg('<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>', size, className);

export const iconGiftBox = (size = 18, className = 'ui-icon') => iconGift(size, className);

export const iconDrinkCan = (size = 18, className = 'ui-icon') =>
  svg('<path d="M7 4h10M7 20h10M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4zM10 2v3M12 9v6M9 12h6"/>', size, className);

export const iconSkewer = (size = 18, className = 'ui-icon') =>
  svg('<line x1="2" y1="22" x2="22" y2="2"/><circle cx="8" cy="16" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="16" cy="8" r="2.5"/>', size, className);

export const iconVoucher = (size = 18, className = 'ui-icon') =>
  svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="2" cy="12" r="2.5" fill="#0B0B0B"/><circle cx="22" cy="12" r="2.5" fill="#0B0B0B"/><line x1="12" y1="7" x2="12" y2="17" stroke-dasharray="2 2"/>', size, className);

export function getRewardItemIcon(reward = {}, size = 26, className = 'ui-icon') {
  const normTitle = (reward.title || reward.name || '').toLowerCase();
  const normType = (reward.rewardType || '').toLowerCase();
  if (normTitle.includes('drink') || normTitle.includes('cola') || normTitle.includes('soda') || normTitle.includes('water') || normTitle.includes('beverage')) {
    return iconDrinkCan(size, className);
  }
  if (normTitle.includes('tikka') || normTitle.includes('kabob') || normTitle.includes('kebab') || normTitle.includes('skewer') || normTitle.includes('meat') || normTitle.includes('plate') || normTitle.includes('chicken') || normTitle.includes('beef') || normTitle.includes('lamb')) {
    return iconSkewer(size, className);
  }
  if (normType.includes('discount') || normTitle.includes('off') || normTitle.includes('dollar') || normTitle.includes('voucher') || normTitle.includes('$')) {
    return iconVoucher(size, className);
  }
  return iconGift(size, className);
}

export function renderTierBadge(tier, showLabel = true) {
  const norm = String(tier || 'bronze').toLowerCase();
  if (norm.includes('gold')) {
    return `<span class="premium-tier-badge tier-gold" title="Gold Tier">${iconCrown(14, 'ui-icon ui-icon-no-margin')} ${showLabel ? 'Gold' : ''}</span>`;
  }
  if (norm.includes('silver')) {
    return `<span class="premium-tier-badge tier-silver" title="Silver Tier">${iconAward(14, 'ui-icon ui-icon-no-margin')} ${showLabel ? 'Silver' : ''}</span>`;
  }
  return `<span class="premium-tier-badge tier-bronze" title="Bronze Tier">${iconMedal(14, 'ui-icon ui-icon-no-margin')} ${showLabel ? 'Bronze' : ''}</span>`;
}

// Attach to window for non-module compatibility if needed
if (typeof window !== 'undefined') {
  window.BigiIcons = {
    bolt: iconBolt,
    card: iconCard,
    lock: iconLock,
    shield: iconShield,
    check: iconCheck,
    checkCircle: iconCheckCircle,
    alert: iconAlertTriangle,
    clock: iconClock,
    mapPin: iconMapPin,
    phone: iconPhone,
    package: iconPackage,
    truck: iconTruck,
    utensils: iconUtensils,
    calendar: iconCalendar,
    user: iconUser,
    crown: iconCrown,
    award: iconAward,
    medal: iconMedal,
    sparkle: iconSparkle,
    star: iconStar,
    flame: iconFlame,
    refresh: iconRefresh,
    plus: iconPlus,
    minus: iconMinus,
    trash: iconTrash,
    x: iconX,
    shoppingBag: iconShoppingBag,
    fileText: iconFileText,
    bell: iconBell,
    bellOff: iconBellOff,
    chart: iconChart,
    trendingUp: iconTrendingUp,
    trendingDown: iconTrendingDown,
    tv: iconTv,
    tag: iconTag,
    users: iconUsers,
    car: iconCar,
    receipt: iconReceipt,
    edit: iconEdit,
    settings: iconSettings,
    moon: iconMoon,
    sun: iconSun,
    search: iconSearch,
    camera: iconCamera,
    dollar: iconDollarSign,
    megaphone: iconMegaphone,
    smartphone: iconSmartphone,
    volume2: iconVolume2,
    volumeX: iconVolumeX,
    maximize: iconMaximize,
    minimize: iconMinimize,
    globe: iconGlobe,
    save: iconSave,
    gift: iconGift,
    giftBox: iconGiftBox,
    drinkCan: iconDrinkCan,
    skewer: iconSkewer,
    voucher: iconVoucher,
    getRewardItemIcon,
    renderTierBadge
  };
}
