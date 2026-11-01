Zip `inventory-ui-changed-files.zip` zawiera tylko trzy zmienione pliki, w ich ścieżkach: `index.html`, `script/inventory.js` i `style/inventory.css`. Wystarczy je rozpakować w katalogu głównym projektu.

## Jak dodać nowy przedmiot

Przedmioty są w plikach `data/ad-items.json` (AD) i `data/magic-items.json` (AP). Sklep i ekwipunek czytają je automatycznie, więc dodanie wpisu wystarczy, żeby pojawił się w sklepie, w ekwipunku i miał chipy statystyk.

### Przedmiot AD (`data/ad-items.json`)

Pola ze statystykami leżą bezpośrednio w obiekcie:

```json
{
  "id": "stormBlade",
  "name": "Ostrze Burzy",
  "price": 1800,
  "description": "+90 AD, +15% szansy na krytyka. Ataki ignorują 8 pkt pancerza.",
  "ad": 90,
  "critChance": 15,
  "armorPenetration": 8,
  "unique": true
}
```

| Pole | Efekt |
|---|---|
| `id`, `name`, `price`, `description` | wymagane |
| `ad` | siła ataku |
| `critChance` | % krytyka (suma ograniczona do 100%) |
| `accuracy` | % celności |
| `lifesteal` | % lifestealu |
| `armorPenetration` | płaska penetracja pancerza |
| `armorPenetrationPercent` | % penetracji pancerza |
| `cooldownReduction` | o ile tur skraca odnowienie wszystkich umiejętności (patrz „Redukcja odnowienia”) |
| `rCooldownReduction` | o ile tur skraca odnowienie tylko umiejętności pod klawiszem R |
| `unique` | `true` = można mieć tylko jedną sztukę |
| `maxOwned` | maksymalna liczba sztuk (np. `2`); działa też dla przedmiotów AD |
| `health` | maksymalne zdrowie (też podnosi aktualne HP przy założeniu) |
| `armor` | pancerz |
| `magicResistance` | odporność magiczna |
| `categories` | zakładki sklepu, w których pokazuje się przedmiot: `["tank"]`, `["warrior"]` lub obie. Przedmiot bez tego pola jest w „Przedmioty AD”. Przedmiot z kilku kategorii w widoku „Wszystkie” pokazuje się raz |

### Przedmioty Tank i Wojownik z efektami

Efekty tych przedmiotów są w kodzie po `id`, ale ich liczby są w JSON-ie (pola przedmiotu), więc tuning nie wymaga ruszania skryptów:

| `id` | Pola z parametrami | Gdzie działa w kodzie |
|---|---|---|
| `golemArmor` | `absorbEveryHits`, `absorbPercent` | `registerHit` w `battleActions.js` (trwały bonus do maks. HP) |
| `giantsHammer` | `maxHealthDamagePercent` | `playerAttack` w `battleActions.js` |
| `chestplateOfTheForest` | `regenEveryTurns`, `regenMaxHealthPercent`, `regenDamagePercent` | `finishPlayerAction` w `battleActions.js` |
| `bloodthirstyChainmail` | `healReductionPercent`, `healStealPercent` | tylko pojedynki, `runAction` w `duelEngine.js` (wrogowie z kampanii się nie leczą) |
| `fireCleaver` | `burnEveryAttacks`, `burnTurns`, `killLifestealPercent`, `killLifestealTurns` | `playerAttack` i `enemyTurn` w `battleActions.js`, tura przeciwnika w `duelEngine.js`; wzór Podpalenia to `burnDamagePerTurn` |
| `starBreaker` | `shieldEveryAttacks`, `shieldAdPercent`, `shieldTurns` | `playerAttack` w `battleActions.js` |
| `runicBelt` | `overloadEvery`, `overloadMagicBase`, `overloadMagicPercent`, `overloadPhysicalBase`, `overloadPhysicalPercent`, `overloadConvertPercent` | `registerHit` w `battleActions.js` i `duelEngine.js` |

Tarcze to lista `state.shields` (`type`: `all`, `physical` lub `magic`; `amount`, `turns`). Odliczanie tur i rysowanie na pasku HP: `battleState.js` (`tickCooldowns`) i `battleUIRender.js` (`renderShields`).

Wrogowie w kampanii zadają obrażenia fizyczne i magiczne według pola `magicDamagePercent` w `data/enemies.json` (domyślnie 20). Brak pola oznacza same obrażenia fizyczne.

Wzmocnienia (zakładka „Wzmocnienia”) zostały usunięte. W `data/skills.json` zostało tylko Drugie Tchnienie i jest ono dostępne w zakładkach AD, Tank, Wojownik i AP.

### Przedmiot AP (`data/magic-items.json`)

Tutaj statystyki są w obiekcie `effects`:

```json
{
  "id": "stormStaff",
  "name": "Kostur Burzy",
  "price": 1200,
  "description": "+80 AP, +50 many, +10 penetracji magii.",
  "effects": { "abilityPower": 80, "mana": 50, "magicPenetration": 10 }
}
```

| Pole w `effects` | Efekt |
|---|---|
| `abilityPower` | AP |
| `mana` | maksymalna mana |
| `manaRegenPercent` | % bazowej regeneracji many |
| `magicPenetration` | penetracja magii |
| `magicResistance` | odporność magiczna |
| `cooldownReduction` | o ile tur skraca odnowienie wszystkich umiejętności (patrz „Redukcja odnowienia”) |
| `rCooldownReduction` | o ile tur skraca odnowienie tylko umiejętności pod klawiszem R |
| `magicLifesteal` | magiczny lifesteal (wymaga też `maxMagicLifesteal` na poziomie przedmiotu, to limit sumy) |

Opcjonalne pola na poziomie przedmiotu: `unique`, `maxOwned` (limit sztuk, np. `3`) i `noClassDiscount: true`. Bez tego ostatniego mag płaci 75% ceny, a łucznik 85% (stałe `MAGIC_DISCOUNT_PCT` w `shop.js`).

### Redukcja odnowienia

Pola `cooldownReduction` i `rCooldownReduction` (AD: bezpośrednio w obiekcie, AP: w `effects`) liczą się z założonych przedmiotów, nie z całego ekwipunku. Całość jest w `battleMath.js` (`cooldownReductions`, `effectiveCooldown`):

- Limity SUMY: `MAX_COOLDOWN_REDUCTION = 2` (ogólna) i `MAX_R_COOLDOWN_REDUCTION = 2` (R). Umiejętność pod R dostaje obie, czyli do −4 tur.
- `MIN_COOLDOWN = 1`: odnowienie nigdy nie spada poniżej 1 tury.
- Umiejętność pod R to zawsze ostatnia na liście klasy w `data/abilities.json`.
- Flaga `"cdReducible": false` w `data/abilities.json` wyłącza redukcję dla danej umiejętności (teraz: Gwiezdne Uderzenie i Mushin). Umiejętności bez `cooldown` nie mają flagi.

### Ikona
Plik `res/icons/ad-items/<id>.png` albo `res/icons/magic-items/<id>.png`, 64×64, z przezroczystością. Nazwa musi być identyczna z `id`. Bez pliku pokaże się ℹ️.

## Czego JSON nie załatwi

- **Efekty specjalne w walce** są wpisane na sztywno w kodzie, po `id`. Przykłady: `snakeFang`, `shadowArrows`, `nightPower` i `assassinCloakAd` w `battleActions.js` i `arena.js`, a `wolfGrip` w obu tych plikach (liczy bonus za każdą sztukę). Pola `special`, `bonusDamage` i `bonusDamageAdScaling` same nic nie robią, bo `bonusDamage` tylko wyświetla się w sklepie. Dla przedmiotu z unikalnym działaniem trzeba dopisać obsługę w tych plikach.
- **Magiczne efekty specjalne** (`adeptBook`, `adeptBookUpgrade`, `abilityPowerMultiplier`) są obsługiwane w `shop.js` i `battleMath.js`. Nowy mnożnik czy podobny mechanizm wymaga zmiany w kodzie.
- **Nowa statystyka** (np. unik z przedmiotu) wymaga jej dopisania w `adjustAdEffects` albo `adjustMagicEffects` w `shop.js`. Żeby pokazała się też jako chip w ekwipunku, dodaj ją w `itemChips()` w `script/inventory.js`.
- **Zapisy** przechowują instancje przedmiotów razem z ich polami, więc zmiana `id` lub statystyk istniejącego przedmiotu nie zmieni tego, co gracze już mają w ekwipunku.