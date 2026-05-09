# WinCC OA Sidepanel

<div align="center">

![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/RichardJanisch.winccoa-sidepanel?label=VS%20Marketplace)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.110.0-007ACC.svg)

**Monitor and control your WinCC OA Project directly from Visual Studio Code**

⚠️ *Pre-Release Version - Not all features have been fully tested yet*

</div>

---

## ✨ Features

### 📊 System Monitoring
Real-time monitoring of your WinCC OA system:
- **System Status View** - Check if your WinCC OA system is online or offline
- **Project Information** - View project name, version, and API endpoint
- **Project Explorer** - Quick access to main project and subprojects

### 🎮 Manager Control
Full control over WinCC OA managers:
- **Manager List View** - See all managers with their status (running/stopped)
- **Start/Stop/Restart** - Control individual managers via context menu
- **Live Status Updates** - Automatic polling for manager state changes
- **PID and Options Display** - See process IDs and manager options at a glance

### ⚡ Quick Actions
- **Refresh CTRL Libraries** - Reload libraries with one click
- **System Control** - Start, stop, or restart the entire WinCC OA system
- **Right-click Context Menus** - Quick access to all actions

---

## 🚀 Getting Started

### Installation
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "WinCC OA Sidepanel"
4. Click Install

### Prerequisites
This extension requires the **WinCC OA REST API** to be running. The API provides manager control and system information endpoints.

**Important:** The REST API is available in a separate repository and must be started as a CTRL manager in your running WinCC OA project. Once the API manager is running, this extension can connect to it and provide full system monitoring and manager control capabilities.

### Configuration

Configure the API endpoint and polling interval in VS Code settings:

---

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `winccoa.sidepanel.apiEndpoint` | `http://localhost:3000` | WinCC OA REST API endpoint for manager control |
| `winccoa.sidepanel.pollInterval` | `3000` | Manager status polling interval in milliseconds |

---

## 📋 Usage

### System View
1. Click on the **WinCC OA** icon in the Activity Bar
2. Expand the **System** section to see:
   - System status (Online/Offline)
   - Project Information (name, version, API endpoint)
   - Projects (main project and subprojects)
3. Right-click on system status for Start/Stop/Restart actions

### Console View
1. Click on the **WinCC OA** icon in the Activity Bar
2. Expand the **Console** section to see all managers
3. Right-click on any manager to:
   - Start the manager
   - Stop the manager
   - Restart the manager
4. Use the refresh button to reload CTRL libraries

---

## 🛠️ Requirements

- Visual Studio Code 1.110.0 or higher
- WinCC OA installation with REST API running
- Valid WinCC OA project
- **WinCC OA REST API Manager** - Must be started as a CTRL manager in your project (available in separate repository)

---

## ⚠️ Known Limitations

- Requires WinCC OA REST API Manager to be running (available in separate repository)
- API must be started as CTRL manager in your WinCC OA project before using this extension
- No automatic reconnection if API connection is lost (requires manual refresh)
- Limited error feedback when API is not reachable

---

## 📜 Disclaimer

WinCC OA and Siemens are trademarks of Siemens AG. This project is not affiliated with, endorsed by, or sponsored by Siemens AG. This is a community-driven open source project created to enhance the development experience for WinCC OA developers.

---

## 🤝 Contributing

Contributions are welcome! Whether you want to:
- Report bugs or issues
- Suggest new features
- Improve documentation
- Submit code improvements

Please open an issue or submit a pull request on [GitHub](https://github.com/winccoa-tools-pack/vscode-winccoa-sidepanel).

---

## 🔗 Links

- [GitHub Repository](https://github.com/winccoa-tools-pack/vscode-winccoa-sidepanel)
- [Issue Tracker](https://github.com/winccoa-tools-pack/vscode-winccoa-sidepanel/issues)
- [WinCC OA Documentation](https://www.winccoa.com)

---

<div align="center">

Made with ❤️ for the WinCC OA community

</div>

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](https://github.com/winccoa-tools-pack/.github/blob/main/LICENSE) file for details.

Some repositories may contain third-party software under different license terms.

---

## ⚠️ Disclaimer

**WinCC OA** and **Siemens** are trademarks of Siemens AG. This project is not affiliated with, endorsed by, or sponsored by Siemens AG. This is a community-driven open source project created to enhance the development experience for WinCC OA developers.

---

## 🎉 Thank You

Thank you for using WinCC OA tools package!
We're excited to be part of your development journey. **Happy Coding! 🚀**

---

## Quick Links

- [📦 VS Code Marketplace](https://marketplace.visualstudio.com/search?term=tag%3Awincc-oa&target=VSCode&category=All%20categories&sortBy=Relevance)
- [SIMATIC WinCC Open Architecture](https://www.siemens.com/global/en/products/automation/industry-software/automation-software/scada/simatic-wincc-oa.html)
- [SIMATIC WinCC Open Architecture official documentation](https://www.winccoa.com/documentation/WinCCOA/latest/en_US/index.html)
- [ETM Company](https://www.winccoa.com/company.html)

<center>Made with ❤️ for and by the WinCC OA community</center>
