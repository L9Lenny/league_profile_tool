# Banner Selector

## Goal
Add a dropdown in TokensTab to let the user select which owned profile banner to display, without affecting the current crest border.

## Data Sources
- **Owned banners**: `GET /lol-inventory/v1/inventory/REGALIA_BANNER` → returns `[{itemId, ...}]`
- **Banner names**: CDragon `regalia.json` → array with `{id, localizedName, regaliaType, isSelectable}` — cache 24h like challenges

## UI
- Dropdown "Profile Banner" below the existing "Summoner Title" in the right panel
- Shows `localizedName` from CDragon, or `"Banner #{itemId}"` as fallback
- Populated on mount alongside tokens/titles
- Selected banner ID stored in component state

## Payload
- `bannerAccent` in the update payload uses the selected banner ID
- `crestBorder` and `prestigeCrestBorderLevel` are read from summary and passed through unchanged (no crest UI)

## Files Changed
- `src/components/tabs/TokensTab.tsx` — add state, fetch, dropdown, payload integration
