# 🏆 League Profile Tool

A professional-grade, premium tool built with **Tauri v2** and **React** for seamless League of Legends profile customization via the LCU (League Client Update) API.

[![Release](https://img.shields.io/github/v/release/L9Lenny/lol-profile-editor?style=for-the-badge&logo=github&color=c89b3c)](https://github.com/L9Lenny/lol-profile-editor/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/release.yml?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/L9Lenny/lol-profile-editor/actions)
[![Snyk](https://img.shields.io/badge/snyk-monitored-4C4A73?style=for-the-badge&logo=snyk)](https://github.com/L9Lenny/lol-profile-editor/actions/workflows/snyk.yml)
[![Quality Gate](https://img.shields.io/sonar/quality_gate/L9Lenny_lol-profile-editor?server=https%3A%2F%2Fsonarcloud.io&style=for-the-badge&logo=sonarcloud)](https://sonarcloud.io/summary/new_code?id=L9Lenny_lol-profile-editor)
[![Downloads](https://img.shields.io/github/downloads/L9Lenny/lol-profile-editor/total?style=for-the-badge&logo=github&color=0ac1ff)](https://github.com/L9Lenny/lol-profile-editor/releases)
[![License](https://img.shields.io/github/license/L9Lenny/lol-profile-editor?style=for-the-badge&color=785a28)](LICENSE)

---

![League Profile Tool Demo](res/docs/img/demo.png)

---

## ☕ Support the Project

If this tool helped you customize your profile and you enjoy the Hextech experience, consider supporting the development! Every coffee helps keep the engine running and the UI polished.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/profumato)

---

## ✨ Features

### � Core Functionality
- **🏆 Rank Customization**: Modify your visible Solo/Duo rank from Iron to Challenger with live preview
- **🖼️ Icon Library**: Access to 6,000+ profile icons from Data Dragon with smart search and HD previews
- **💬 Profile Bio Management**: Update your chat status and biographical information in real-time
- **📊 Live Preview**: See changes before applying them to your profile

### 🎨 Premium Interface
- **Hextech Glass UI**: Borderless design with holographic grids and gold-trim glassmorphism
- **Smooth Animations**: Polished transitions and micro-interactions throughout
- **Dark Theme**: Eye-friendly interface inspired by the official League client
- **Responsive Layout**: Optimized for different screen sizes

### ⚡ Advanced Features
- **Smart LCU Sync**: Automatic discovery and connection to League Client (no manual configuration)
- **Technical Console**: Built-in logging system for monitoring API interactions
- **Minimize to Tray**: Keep the tool running in the background
- **Auto-Launch**: Start automatically with Windows
- **Auto-Updates**: One-click update system with secure signature verification
- **Security First**: Continuous vulnerability scanning and code quality monitoring

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

## 🔒 Code Quality & Security

This project maintains high standards through automated quality gates and security scanning:

- **🛡️ Snyk Security**: Continuous vulnerability scanning of dependencies to ensure your installation is secure.
- **📊 SonarCloud**: Automated code quality analysis tracking code smells, bugs, and security hotspots.
- **✅ PullApprove**: Structured code review process ensuring all changes are properly vetted.
- **👥 All Contributors**: Recognition system for everyone who contributes to the project.

All security scans and quality checks run automatically on every commit and pull request.

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
