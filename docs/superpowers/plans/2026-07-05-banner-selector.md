# Banner Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dropdown in TokensTab for selecting owned profile banners, with names from CDragon.

**Architecture:** Single-file change to `TokensTab.tsx` — add banner state, fetch owned banners from LCU inventory, map IDs to names via CDragon `regalia.json` (cached 24h), and add dropdown UI in the regalia customizer card.

**Tech Stack:** React/TypeScript, CDragon JSON, LCU API

## Global Constraints

- Follow existing code patterns in TokensTab.tsx (useState, useEffect, fetch on mount alongside existing fetches)
- Cache regalia.json in localStorage with 24h TTL (same pattern as `cd_challenge_defs`)
- Crest border preserved unchanged (no UI, read from summary and pass through)

---

### Task 1: Add banner selector to TokensTab

**Files:**
- Modify: `src/components/tabs/TokensTab.tsx`
- Test: `src/components/tabs/TokensTab.test.tsx` (no new tests needed — existing tests already cover)

**Interfaces:**
- Consumes: `lcuRequest("GET", "/lol-inventory/v1/inventory/REGALIA_BANNER")`, CDragon `regalia.json`
- Produces: dropdown UI, `bannerAccent` in update payload

- [ ] **Step 1: Add banner state variables**

Add after `selectedTitleId` state (line 316):
```ts
const [availableBanners, setAvailableBanners] = useState<{ id: string; name: string }[]>([]);
const [selectedBannerId, setSelectedBannerId] = useState<string>("");
```

- [ ] **Step 2: Add cache key and regalia.json fetch helper**

Add after `CD_CACHE_TTL` (line 325):
```ts
const REGALIA_CACHE_KEY = "cd_regalia_defs";
```

Add the fetch function after `loadCDDefinitions`:
```ts
const loadRegaliaDefinitions = async (): Promise<Record<string, string>> => {
    try {
        const cached = localStorage.getItem(REGALIA_CACHE_KEY);
        if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CD_CACHE_TTL && data) return data;
        }
    } catch { /* ignore */ }

    try {
        const res = await fetch("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/regalia.json");
        if (res.ok) {
            const data = await res.json();
            const map: Record<string, string> = {};
            (data as any[]).forEach((entry: any) => {
                if (entry.regaliaType === "kBanner" && entry.isSelectable && entry.id) {
                    map[entry.id] = entry.localizedName || `Banner #${entry.id}`;
                }
            });
            try { localStorage.setItem(REGALIA_CACHE_KEY, JSON.stringify({ data: map, ts: Date.now() })); } catch { /* quota */ }
            return map;
        }
    } catch (e) {
        addLog(`Regalia definitions fetch failed: ${e}`);
    }
    return {};
};
```

- [ ] **Step 3: Fetch owned banners in fetchTokens**

Add inside the `Promise.all` in `fetchTokens` (after line 363):
```ts
lcuRequest("GET", "/lol-inventory/v1/inventory/REGALIA_BANNER").catch(() => null),
```

Add after `setAvailableTitles(titlesRes)` block (after line 387):
```ts
// Fetch owned banners
const regaliaDefs = await loadRegaliaDefinitions();
const bannersRes = results[5]; // The 6th promise (added above)
if (Array.isArray(bannersRes)) {
    const owned: { id: string; name: string }[] = [];
    bannersRes.forEach((item: any) => {
        const id = String(item.itemId);
        if (regaliaDefs[id]) {
            owned.push({ id, name: regaliaDefs[id] });
        }
    });
    owned.sort((a, b) => a.name.localeCompare(b.name));
    setAvailableBanners(owned);
    
    // Set current selection from summary
    const currentBanner = safeExtractString(summaryRes.bannerId ?? summaryRes.preferences?.bannerId ?? summaryRes.bannerAccent ?? summaryRes.preferences?.bannerAccent);
    setSelectedBannerId(currentBanner === "-1" ? "" : (currentBanner || ""));
}
```

Note: The `Promise.all` result destructuring needs to be updated to destructure the 6th result.

- [ ] **Step 4: Update Promise.all destructuring**

Change line 363-369 from:
```ts
const [challengesRes, defs, summaryRes, summonerRes, titlesRes] = await Promise.all([
    ...
    lcuRequest("GET", "/lol-challenges/v2/titles/local-player").catch(() => null)
]);
```
To:
```ts
const [challengesRes, defs, summaryRes, summonerRes, titlesRes, bannersRes] = await Promise.all([
    lcuRequest("GET", "/lol-challenges/v1/challenges/local-player").catch(() => null),
    loadCDDefinitions(),
    lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player").catch(() => null),
    lcuRequest("GET", "/lol-summoner/v1/current-summoner").catch(() => null),
    lcuRequest("GET", "/lol-challenges/v2/titles/local-player").catch(() => null),
    lcuRequest("GET", "/lol-inventory/v1/inventory/REGALIA_BANNER").catch(() => null),
]);
```

- [ ] **Step 5: Add banner dropdown UI**

Add inside the `tokens-banner-customizer-group` div, after the title select (after line 715):
```tsx
<label htmlFor="banner-select" style={{ marginTop: '8px' }}>Profile Banner</label>
<select 
    id="banner-select"
    value={selectedBannerId} 
    onChange={(e) => setSelectedBannerId(e.target.value)}
    disabled={!lcu || availableBanners.length === 0}
    style={{ width: '100%' }}
>
    <option value="">No Banner</option>
    {availableBanners.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
    ))}
</select>
```

- [ ] **Step 6: Use selected banner in payload**

In `handleApply`, change the `currentPrefs` building to use selected banner:

Replace line 492 (the bannerAccent assignment):
```ts
bannerAccent: selectedBannerId || summary.bannerId ?? summary.preferences?.bannerId ?? summary.bannerAccent ?? summary.preferences?.bannerAccent ?? "",
```

With:
```ts
bannerAccent: selectedBannerId || currentPrefs.bannerAccent,
```

Wait — the currentPrefs object is built BEFORE the payload. Let me restructure: build currentPrefs normally but override `bannerAccent` with selected value.

Actually, the simplest approach: in the payload construction, use `selectedBannerId` if set, otherwise fall back to the summary value:

```ts
const bannerVal = selectedBannerId || currentPrefs.bannerAccent;
```

Then in the payload:
```ts
const payload = {
    ...currentPrefs,
    bannerAccent: bannerVal,
    challengeIds,
    title: titleVal === "-1" ? "" : titleVal,
};
```

But `currentPrefs` already has `bannerAccent` set from the summary. The spread puts `bannerAccent` from currentPrefs first, then the explicit `bannerAccent: bannerVal` overrides it. This is correct.

- [ ] **Step 7: Run tests**

```bash
npm test
```
Expected: All 120 tests pass.

- [ ] **Step 8: Build check**

```bash
npx tsc --noEmit
```
Expected: No errors.
