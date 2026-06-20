# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.3] - 2026-06-20

### Added
- **Tokens Redesign**: Completely overhauled the Tokens tab with a new UI that utilizes full horizontal space.
- **Summoner Title Selection**: Added the ability to dynamically select the Summoner Title directly from the Tokens tab.

### Changed
- **Token Preview**: The 3D Forge Hologram has been replaced with a sleeker, space-saving 2D preview.
- **UI Layout**: Shifted to a vertically stacked layout to give maximum vertical space to the Unlocked Tokens grid.

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
