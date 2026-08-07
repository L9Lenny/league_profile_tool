# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.11.0] - 2026-08-07

### Added
- Skin request feature (#892)

### Changed
- Updated analytics endpoint to `https://freakanalytics.duckdns.org`

### Fixed
- Reduced cognitive complexity in `BackgroundTab.tsx` (`fetchChampions`, `fetchUnifiedChampSkins`) by extracting helper functions (#897, #899)
- Replaced assignment expression with nullish coalescing operator `??=` in `BackgroundTab.tsx` (#898)
- Fixed async banner data loading in `TokensTab` test

### Dependencies
- **npm:** lucide-react 1.21.0 → 1.24.0, react-icons 5.6.0 → 5.7.0, @types/node 26.0.1 → 26.1.1, @vitejs/plugin-react 6.0.1 → 6.0.3, vitest 4.1.9 → 4.1.10, postcss 8.5.15 → 8.5.25
- **cargo:** base64 0.22.1 → 0.23.0, serde 1.0.228 → 1.0.229, serde_json 1.0.150 → 1.0.151, serde_with 3.19.0 → 3.21.0, tauri-plugin-dialog 2.7.1 → 2.7.2, tauri-plugin-log 2.8.0 → 2.9.0
- **github_actions:** actions/setup-node v6 → v7, tauri-apps/tauri-action v0 → v1, github/codeql-action v4 → v4.37.4, SonarSource/sonarqube-scan-action 8.2.0 → 8.2.1

### CI
- Filtered SonarQube auto-created GitHub issues to medium and high severities

## [1.10.2] - 2026-07-30

### Fixed
- Updated updater.json with signatures for v1.10.2
