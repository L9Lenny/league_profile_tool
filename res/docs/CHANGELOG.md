# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2026-07-11

### Added
- **Selective Clear All Settings (#434, #436)**: Replaced the simple "Yes/No" confirm with a checkbox-based panel that lets users pick exactly what to reset: rank overrides, challenge overrides, background skin, tokens/title/banner/crest, profile icon, status & bio, and auto-enforcer & localStorage.
- **Profile Icon Reset**: "Clear All Settings" now resets the summoner icon via the official LCU endpoint when the "Profile icon" option is selected, restoring the previously saved icon or defaulting to icon 0.
- **Status & Bio Reset**: "Clear All Settings" now resets availability to `"chat"` and clears the status message.

### Fixed
- **LCU Override Fields Not Clearing (#434, #436)**: Fixed a bug where `delete`-ing fields from the chat presence `lol` object did not actually clear them in the League Client. Fields are now explicitly set to empty strings (`""`), which the LCU respects.
- **CDragon Crash on Invalid Data (#434, #436)**: Added `Array.isArray` guard in the Tokens tab to prevent a crash when CDragon returns a non-array response.
- **Auto-Enforcer OR Logic (#434, #436)**: Toggling auto-enforce OFF now also clears the legacy `SAVED_ENFORCE_OFFLINE_KEY`, and the enforcer skips the enforce cycle when the LCU summary merge fails.
- **Background Contrast Issue (#436)**: Increased contrast for danger button hover state from `#ffb3b3` to `#ffd6d6`.

### Changed
- **Clear All Settings UX (#434, #436)**: The entire reset now makes a single `PUT /lol-chat/v1/me` call combining `availability`, `statusMessage`, and `lol` fields, and also calls the official background and challenge preferences endpoints to fully reset profile customizations.
- **Challenge Preferences Reset (#434, #436)**: "Clear All Settings" now sends an empty payload to `POST /lol-challenges/v1/update-player-preferences` to clear equipped tokens, title, banner accent, and crest border.

## [1.9.9] - 2026-07-11

### Fixed
- **Profile Reset After Games (#429)**: The Auto-Enforcer now continuously polls every 15 seconds to re-apply profile picture, rank (tier/division/queue), challenge points, and crystal level after League resets them post-game. Previously, settings were only applied once per session.
- **Rank & Challenge Stats Enforcment (#429)**: Added support for persisting rank overrides (`rankedLeagueTier`, `rankedLeagueDivision`, `rankedLeagueQueue`) and challenge stats (`challengeCrystalLevel`, `challengePoints`) via chat presence, merged with existing `lol` object fields to avoid overwriting unrelated data.

### Changed
- **Polling Instead of Retry (#429)**: Replaced the old retry-with-backoff mechanism (10s interval, 60s max) with a simpler 15s continuous polling loop, ensuring settings survive game-induced resets without log spam on subsequent cycles.

## [1.9.8] - 2026-07-05

### Fixed
- **GitHub Release Assets**: Changed `productName` from `"League Profile Tool"` (with spaces) to `"League-Profile-Tool"` (with hyphens) in `tauri.conf.json` so that the Tauri bundler produces filenames that match the paths expected by the CI release action. Previously, assets were built but silently skipped during upload, resulting in an empty release.

### Changed
- **Updater URLs**: Updated download URL patterns in the CI workflow to use the new hyphenated name, ensuring the auto-updater can locate the correct release assets.

## [1.9.7] - 2026-07-05

### Added
- **Profile Banner Selector**: Added a "Profile Banner" dropdown in the Tokens tab using real banner names fetched from CDragon's `regalia.json`. Banner #1 is shown as "No Banner" (default).

### Removed
- **Crest Visual Rendering**: Removed the crest SVG border overlay on the summoner icon profile banner area. The crest value is still read from the LCU summary and passed through unchanged in the update payload.

### Fixed
- **Title "-1" Sentinel**: Prevented the LCU sentinel value `-1` ("no title") from being sent to the API in TokensTab, PresetsTab, and the auto-restore enforcer.
- **Field Name Mapping**: Mapped summary response fields `bannerId`/`crestId` to the update endpoint's expected field names `bannerAccent`/`crestBorder`. The fallback chain reads from both old and new key names for compatibility.

### Changed
- **LCU Whitelist**: Added `GET /lol-regalia/v3/inventory/` prefix to the allowed LCU request whitelist in the Rust backend.

## [1.9.6] - 2026-06-28

### Added
- **Supplemental Skin Data**: Added a system to include skins missing from CommunityDragon via `src/data/supplemental-skins.json`, resolving issue #303. The first entry is Immortalized Legend Ahri (ID: 103086). Extend the JSON file to add more missing skins.
- **Fallback Splash Placeholder**: When a splash image fails to load (404), a styled placeholder with "Preview not available" text is now shown instead of a broken image icon.
- **Skin Search by Name**: The Direct Skin ID input now accepts skin names with autocomplete suggestions. Search by typing a skin name and select from the dropdown, or enter a numeric ID directly.

### Changed
- **Skin Name Overlay**: The skin name overlay now appears only on hover with a smooth slide-up animation, keeping the splash art fully visible by default.

### Fixed
- **Minimize to Tray**: The close button now correctly hides the window to the system tray instead of force-quitting the app when the "Minimize to Tray" setting is enabled. The app stays running in the background, allowing the Auto-Restore Profile enforcer to re-apply bio and settings on LCU reconnect.

### Dependencies
- Updated `lucide-react` to `1.21.0` in #406, `react-dom` to `19.2.7` in #408, `react` to `19.2.7` and `@types/react` to `20.2.4` in #403 in package.json.
- Updated `vite` to `8.1.0` in #404, `@tauri-apps/cli` to `2.11.3` in #407 in devDependencies.
- Updated `sysinfo` to `0.39.5` in #405 in Cargo.lock.

## [1.9.5] - 2026-06-25

### Added
- **Test Coverage**: Created new comprehensive unit test suites for `FriendManagerTab`, `LobbyTab`, `PresetsTab`, `useProfileEnforcer`, and `useAutoRestore` hooks, successfully increasing overall statement test coverage to over 80%.

### Fixed
- **Security Vulnerability**: Updated `undici` to `7.28.0` in package-lock.json to resolve multiple CVEs in #315 (TLS validation bypass, cross-origin request routing, HTTP header injection, SameSite downgrade, and HTTP response queue poisoning).
- **Security Vulnerability**: Updated `tar` to `0.4.46` in Cargo.lock to resolve PAX header desynchronization issue in #316.
- **Security Vulnerability**: Updated `openssl` to `0.10.81` in Cargo.lock to resolve potential out-of-bounds write in #317.
- **Security Vulnerability**: Configured NPM `overrides` to force `tmp` to `0.2.7` to resolve path traversal vulnerabilities.
- **SonarQube Quality Refactoring**: Resolved code quality and accessibility issues including contrast ratio adjustments for log level badges, adding appropriate ARIA attributes/native button roles to list components, removing duplicate CSS classes, and simplifying regex patterns/cognitive complexity.

### Changed
- **Dependencies**: Updated `tauri` to `2.11.3` in #307, `tauri-build` to `2.6.3` in #308, `serde_json` to `1.0.150` in #301, and `sysinfo` to `0.39.3` in #302 in Cargo.lock.
- **Dependencies**: Updated `lucide-react` to `1.14.0` in #292, `vitest` to `4.1.7` in #295, `@vitest/coverage-v8` to `4.1.7` in #296, `typescript` to `6.0.3` in #291, and `@types/node` to `25.7.0` in #294 in package.json.
- **CI/CD**: Updated GitHub Actions workflows in #311 and SonarSource scanner action in #306.
- **CI/CD**: Added new `ci.yml` workflow with TypeScript compile check, frontend tests, and Rust `cargo check`/`clippy` linting on every push and PR.
- **CI/CD**: Added `test-and-lint` prerequisite job to `release.yml` to block broken builds from being released.
- **TypeScript 6 Migration**: Migrated all test files from `global.fetch` to `globalThis.fetch` for TypeScript 6.0 compatibility in #291.

## [1.9.4] - 2026-06-25
- dependabot: bump vite from 8.0.11 to 8.0.16 in #314

### Added
- **Tokens Redesign**: Completely overhauled the Tokens tab with a new UI that utilizes full horizontal space.
- **Summoner Title Selection**: Added the ability to dynamically select the Summoner Title directly from the Tokens tab.
- **Auto-Enforcer Resilience**: The Auto-Enforcer now isolates each configuration restore. If one fails (e.g. background application), it won't prevent the rest from being applied.
- **Auto-Enforcer Retry Mechanism**: Added an intelligent retry mechanism. If applying settings fails due to the League client loading slowly, the tool will retry every 10 seconds (for up to 60 seconds).

### Fixed
- **Title Persistence**: Fixed an issue where the Summoner Title was not being saved in the Presets and was missing from the Auto-Restore cycle.
- **Settings Toggle Bug**: Fixed a bug where toggles in the Settings tab would fire twice due to an incorrect HTML structure.

  
## [1.9.3] - 2026-06-20

### Fixed
- **Presets & Backgrounds**: Resolved an issue where loading presets or applying backgrounds failed if the profile icon or background skin was unowned. The app now properly falls back to the force method to apply them.


## [1.9.2] - 2026-06-17

### Changed
- Modified and enhanced the System Logs user interface.

## [1.9.1] - 2026-06-08

### Fixed
- **Invisible Status**: Implemented an "Enforce Offline" feature in the Profile tab to prevent the League client from automatically reverting status to "Online" when entering Champion Select.

## [1.9.0] - 2026-05-23

### Added
- **💾 Presets Disk Persistence**: Profile presets are now securely saved to disk, surviving app reinstalls and updates.
- **🛡️ Secure Backend Commands**: Implemented `load_presets` and `save_presets` commands in the Tauri Rust backend to securely manage presets file storage.

### Changed
- **🚀 Performance (React)**: Restructured loading state so that each tab manages its own fetching process locally, preventing the entire app from locking up during a request.
- **⚡ Performance (Rust)**: System process detection logic was rewritten using a singleton `OnceLock`, drastically reducing CPU overhead.
- **🧹 CSS Codebase**: Refactored CSS by removing all duplicate declarations across stylesheets and purged unused dead styles.

### Fixed
- **🧩 Hook Optimization**: Stabilized dependencies in `useLcu` and `useMusicSync` using proper `useCallback` implementations.

## [1.8.0] - 2026-05-20
