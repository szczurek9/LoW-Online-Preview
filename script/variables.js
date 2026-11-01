// Wersja gry — zmieniaj tylko tutaj (pokazuje się w stopce strony).
window.GAME_VERSION = "preview_v1.0.4_01112026_r1";
(function showGameVersion() {
  const element = document.getElementById("game-version");
  if (element) element.textContent = `v${window.GAME_VERSION}`;
})();

// Motywy interfejsu. Stare identyfikatory (z zapisów sprzed zmiany motywów) mapujemy na nowe,
// dzięki czemu wcześniejsze zapisy nadal się wczytują.
window.THEME_IDS = ["noc", "dzien", "kontrast", "las"];
window.DEFAULT_THEME = "noc";
window.LEGACY_THEMES = { prism: "noc", night: "noc", neon: "kontrast", nature: "las" };
window.isKnownTheme = function (theme) {
  return window.THEME_IDS.includes(theme) || Object.prototype.hasOwnProperty.call(window.LEGACY_THEMES, theme);
};
window.normalizeTheme = function (theme) {
  if (window.THEME_IDS.includes(theme)) return theme;
  return window.LEGACY_THEMES[theme] || window.DEFAULT_THEME;
};

// Liczniki przebiegu postaci potrzebne osiągnięciom (zapisywane razem z postacią).
window.createAchievementRun = function () {
  return {
    fistsOnly: true,          // żadna walka nie odbyła się z inną bronią niż Pięści
    noItems: true,            // żadna walka nie odbyła się z przedmiotem AD/AP
    escapes: 0,               // ile razy użyto ucieczki w kampanii
    potionFreeLevels: 0,      // poziomy z rzędu ukończone bez mikstury
    escapeFreeLevels: 0,      // poziomy z rzędu ukończone bez ucieczki (-1 = właśnie użyto ucieczki, bieżący poziom się nie liczy)
  };
};

window.createDefaultPlayer = function () {
  return {
    nickname: "",
    money: 5,
    theme: window.DEFAULT_THEME,
    skinPoints: 1,
    level: 1,
    skinName: "default",
    skinInventory: ["default"],
    weaponName: "Pięści",
    weaponId: "fists",
    weaponDmg: 3,
    weaponBaseDamage: 3,
    weaponAdScaling: 0.01,
    weaponType: "M",
    ad: 0,
    adItemInventory: [],
    equippedAdItems: [],
    adItemSlots: 6,
    armorPenetrationPercent: 0,
    yamatoExecuteCap: 5,
    inventory: [],
    classId: "",
    magicInventory: [],
    equippedMagicItems: [],
    potionInventory: [],
    magicItemSlots: 2,
    healthPoints: 100,
    maxHealthPoints: 100,
    armorPoints: 0,
    bonusArmor: 0,
    magicResistance: 0,
    critChance: 0,
    armorPenetration: 0,
    magicPenetration: 0,
    manaPoints: 100,
    maxManaPoints: 100,
    manaRegenPercent: 0,
    abilityPower: 0,
    magicAbilityPower: 0,
    lifesteal: 0,
    bonusLifesteal: 0,
    magicLifesteal: 0,
    bonusAccuracy: 0,
    bonusDodge: 0,
    statsVersion: 1,           // 1 = bazowe HP/pancerz/MR liczone z klasy i poziomu (patrz ClassStats)
    overkillPool: 0,
    adeptBookStacks: 0,
    adeptBookStackLimit: 30,
    secondWind: false,
    usedEscape: false,
    arenaCooldownUntil: 0,     // ms (Date.now()) do kiedy trwa cooldown areny
    arenaEscapeLockUntil: 0,   // ms do kiedy trwa blokada po ucieczce
    // Osiągnięcia (tylko zapisy założone po zalogowaniu przez Discord).
    achievementsEnabled: false,  // true = ta postać zdobywa osiągnięcia
    achievementSpGranted: 0,     // ile SP za osiągnięcia ta postać już dostała
    achRun: window.createAchievementRun(),
  };
};

window.player = window.createDefaultPlayer();

// Bazowe statystyki klas: [wartość na poziomie 1, przyrost na poziom] w data/classes.json (baseStats).
// Odporność magiczna rośnie ułamkami (np. +0,5 na poziom = +1 co 2 poziomy), dlatego wartość jest zaokrąglana w dół.
window.ClassStats = {
  at(classId, level) {
    const base = window.gameClasses?.find((item) => item.id === classId)?.baseStats;
    if (!base) return null;
    const steps = Math.max(0, (Number(level) || 1) - 1);
    const value = ([start, perLevel]) => Math.floor(start + perLevel * steps);
    return { health: value(base.health), armor: value(base.armor), magicResistance: value(base.magicResistance) };
  },
  // Dodaje do postaci różnicę między poziomami (używane przy awansie).
  applyLevelUp(player, fromLevel, toLevel) {
    const before = this.at(player.classId, fromLevel);
    const after = this.at(player.classId, toLevel);
    if (!before || !after) return;
    player.maxHealthPoints += after.health - before.health;
    player.healthPoints += after.health - before.health;
    player.armorPoints += after.armor - before.armor;
    player.magicResistance += after.magicResistance - before.magicResistance;
  },
};

// Każda klasa ma 8 dynamicznych slotów wspólnych dla przedmiotów AD i magicznych (każdy slot to
// albo AD, albo AP). Limity ad/magic w itemSlotsForClass są tylko górnymi granicami,
// a łączny limit pilnuje hasFreeItemSlot().
window.SHARED_ITEM_SLOTS = 8;
window.itemSlotsForClass = function () {
  return { ad: window.SHARED_ITEM_SLOTS, magic: window.SHARED_ITEM_SLOTS };
};

window.countEquippedItems = function () {
  const p = window.player;
  const equippedIds = p.equippedMagicItems || [];
  const magic = (p.magicInventory || []).filter((item) => item.equipped
    || equippedIds.includes(item.uid)
    || equippedIds.includes(item.id)).length;
  return { ad: (p.equippedAdItems || []).length, magic };
};

// kind: "ad" albo "magic".
window.hasFreeItemSlot = function (kind) {
  const p = window.player;
  const used = window.countEquippedItems();
  return used.ad + used.magic < window.SHARED_ITEM_SLOTS;
};

// Ekwipunek: jedna lista przedmiotów, a nad nią ile slotów zostało wolnych.
// Sloty są wspólne, więc wolne AD i wolne AP to ta sama pula.
window.freeSlotsLabel = function () {
  const used = window.countEquippedItems();
  const free = window.SHARED_ITEM_SLOTS - used.ad - used.magic;
  return `Wolne sloty — AD: ${free} | AP: ${free}`;
};

window.itemSlotLabel = function () {
  const used = window.countEquippedItems();
  return `Sloty: ${used.ad + used.magic}/${window.SHARED_ITEM_SLOTS} (AD: ${used.ad}, AP: ${used.magic})`;
};

// Shared by every screen's status/message line: sets the text and applies
// the status class (success/warning/danger/etc.) alongside the element's
// base class. Used by shop.js, inventory.js, skins.js, mainMenu.js and
// battleUI.js instead of each repeating the same two lines.
window.setStatusMessage = function (element, text, baseClass, type) {
  element.textContent = text;
  element.className = `${baseClass} ${type || ""}`.trim();
};
