# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-12-14

### Added
- Structured logging system with ExtensionOutputChannel
- Configurable log levels: ERROR, WARN, INFO, DEBUG, TRACE
- Visual log level icons (❌ ⚠️ ℹ️ 🔍 🔬) in output channel
- Detailed logging for all commands and operations
- Auto-show output channel on errors
- Timestamp and source information in log messages
- Toolbar buttons in Console view for quick access (Open Config, Open LogViewer)
- Automatic output channel display when toolbar buttons are clicked
- Integration with WinCC OA LogViewer extension
- Logging when opening VS Code Marketplace for extension installation
- Enhanced Makefile with test-local target for local development
- Version counter system in local builds (test-local-XX format)

### Changed
- Replaced console logging with unified ExtensionOutputChannel (matching ctrllang extension)
- Updated log level setting to use uppercase values for consistency
- Improved error reporting with structured log messages

## [0.1.0] - 2025-12-10

### Added
- Initial release
- System view for WinCC OA project monitoring
- Console view for manager monitoring and control
- Real-time status updates via REST API integration
- Manager control commands (Start, Stop, Restart)
- System control commands (Start, Stop, Restart)
- CTRL Library reload functionality
- Project information display
- Configuration file quick access

