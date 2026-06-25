# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
