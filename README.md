# 🏆 League Profile Tool

A professional-grade, premium tool built with **Tauri v2** and **React** for seamless League of Legends profile customization via the LCU (League Client Update) API.

[![Release](https://img.shields.io/github/v/release/L9Lenny/lol-profile-editor?color=c89b3c&label=latest&style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/release.yml?style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/actions)
[![Security Scan](https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/snyk.yml?label=snyk&style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/actions/workflows/snyk.yml)
[![SonarCloud Quality Gate](https://img.shields.io/sonar/quality_gate/L9Lenny_lol-profile-editor?server=https%3A%2F%2Fsonarcloud.io&style=flat-square)](https://sonarcloud.io/summary/new_code?id=L9Lenny_lol-profile-editor)
[![Downloads](https://img.shields.io/github/downloads/L9Lenny/lol-profile-editor/total?color=0ac1ff&style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/releases)
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![License](https://img.shields.io/github/license/L9Lenny/lol-profile-editor?color=785a28&style=flat-square)](LICENSE)

---

![League Profile Tool Demo](res/docs/img/demo.png)

---

## ☕ Support the Project

If this tool helped you customize your profile and you enjoy the Hextech experience, consider supporting the development! Every coffee helps keep the engine running and the UI polished.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/profumato)

---

## ✨ Features

- 🏆 **Rank Overrides**: Effortlessly modify your visible Solo/Duo rank (from Iron to Challenger) and divisions directly in the social engine and hover cards.
- 🎨 **Hextech Glass UI**: A breathtaking, borderless interface featuring holographic grids, gold-trim glassmorphism, and smooth animations inspired by the official LoL client.
- � **Profile Bio Management**: Update your chat status and biographical information with high-performance LCU bridge integration.
- � **Smart LCU Sync**: Seamless, real-time discovery and connection to the League of Legends client without manual configuration.
- 📜 **Technical Console**: A built-in developer logging system for real-time monitoring and debugging of LCU API interactions.
- ⚙️ **Advanced Management**: 
  - **Minimize to Tray**: Fully managed lifecycle to keep the tool active in the background.
  - **Auto-Launch**: Option to start the toolkit automatically with Windows.
  - **Update Intelligence**: Automated update beacons and one-click installation system.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher.
- **Rust**: Latest stable version installed via [rustup](https://rustup.rs/).
- **League of Legends**: The client must be installed and running for the tool to interact with your profile.

### Development

```bash
# Clone the repository
git clone https://github.com/L9Lenny/lol-profile-editor.git

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

## 🛠️ Built With

- [Tauri v2](https://v2.tauri.app/) - High-performance desktop application framework.
- [React](https://react.dev/) - Modern UI library.
- [Lucide React](https://lucide.dev/) - Beautifully simple icons.
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Check out our [Contributing Guidelines](res/docs/CONTRIBUTING.md) and [Code of Conduct](res/docs/CODE_OF_CONDUCT.md).

## 📜 Changelog

Stay up to date with the latest changes in the [CHANGELOG](res/docs/CHANGELOG.md).

## ✨ Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/L9Lenny"><img src="https://avatars.githubusercontent.com/u/74313264?v=4?s=100" width="100px;" alt="L9Lenny"/><br /><sub><b>L9Lenny</b></sub></a><br /><a href="https://github.com/L9Lenny/lol-profile-editor/commits?author=L9Lenny" title="Code">💻</a> <a href="#design-L9Lenny" title="Design">🎨</a> <a href="#maintenance-L9Lenny" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

---
*Disclaimer: This tool is not affiliated with, endorsed by, or integrated with Riot Games in any official capacity.*
