import * as vscode from 'vscode';
import * as fs from 'fs';
import { SystemTreeProvider } from './views/systemTreeProvider';
import { ConsoleTreeProvider } from './views/consoleTreeProvider';
import { ExtensionOutputChannel } from './extensionOutput';
import { ProjectInfoService } from './services/projectInfoService';

export function activate(context: vscode.ExtensionContext) {
    // Initialize output channel
    ExtensionOutputChannel.initialize();
    ExtensionOutputChannel.info('Extension', 'WinCC OA Sidepanel extension activated');
    ExtensionOutputChannel.debug('Extension', `Extension Path: ${context.extensionPath}`);
    ExtensionOutputChannel.debug('Extension', `VS Code Version: ${vscode.version}`);

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('winccoaSidepanel.logLevel')) {
                ExtensionOutputChannel.updateLogLevel();
            }
        })
    );

    // Show activation popup
    vscode.window.showInformationMessage('WinCC OA Sidepanel extension activated!');

    // Register SystemTreeProvider
    const systemTreeProvider = new SystemTreeProvider();
    vscode.window.registerTreeDataProvider('winccoa.systemView', systemTreeProvider);
    
    context.subscriptions.push({
        dispose: () => systemTreeProvider.dispose()
    });

    // Register ConsoleTreeProvider
    const consoleTreeProvider = new ConsoleTreeProvider();
    vscode.window.registerTreeDataProvider('winccoa.consoleView', consoleTreeProvider);
    
    context.subscriptions.push({
        dispose: () => consoleTreeProvider.dispose()
    });

    // Register commands
    
    // Reload CTRL Libraries command
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.reloadCtrlLibs', async () => {
            try {
                const config = vscode.workspace.getConfiguration('winccoa.sidepanel');
                const apiEndpoint = config.get<string>('apiEndpoint', 'http://localhost:3000');
                
                const response = await fetch(`${apiEndpoint}/api/reloadCtrlLibs`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                
                if (response.ok) {
                    ExtensionOutputChannel.success('ReloadCtrlLibs', 'CTRL libraries reloaded successfully');
                    vscode.window.showInformationMessage('✓ CTRL libraries reloaded successfully');
                } else {
                    throw new Error(`API returned status ${response.status}`);
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                ExtensionOutputChannel.error('ReloadCtrlLibs', `Failed to reload CTRL libraries: ${err.message}`, err);
                vscode.window.showErrorMessage('Failed to reload CTRL libraries. Check if API is running.');
            }
            consoleTreeProvider.refresh();
        })
    );

    // Open Config command
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.openConfig', async () => {
            ExtensionOutputChannel.show();
            ExtensionOutputChannel.info('OpenConfig', 'Open Config command executed');
            const projectInfo = await ProjectInfoService.getProjectInfo();
            
            if (projectInfo && projectInfo.configPath) {
                if (fs.existsSync(projectInfo.configPath)) {
                    const configUri = vscode.Uri.file(projectInfo.configPath);
                    const document = await vscode.workspace.openTextDocument(configUri);
                    await vscode.window.showTextDocument(document);
                    ExtensionOutputChannel.info('OpenConfig', `Opened config file: ${projectInfo.configPath}`);
                } else {
                    const errorMsg = `Config file not found: ${projectInfo.configPath}`;
                    ExtensionOutputChannel.error('OpenConfig', errorMsg);
                    vscode.window.showErrorMessage(errorMsg);
                }
            } else {
                const errorMsg = 'Could not retrieve project info from WinCC OA API. Make sure the project is running.';
                ExtensionOutputChannel.error('OpenConfig', errorMsg);
                vscode.window.showErrorMessage(errorMsg);
            }
        })
    );

    // Open Log Viewer command
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.openLogViewer', async () => {
            ExtensionOutputChannel.show();
            ExtensionOutputChannel.info('OpenLogViewer', 'Open Log Viewer command executed');
            const logViewerExtension = vscode.extensions.getExtension('richardjanisch.winccoa-vscode-logviewer');
            
            if (logViewerExtension) {
                // Log Viewer extension is installed, execute its command
                ExtensionOutputChannel.info('OpenLogViewer', 'Log Viewer extension found, opening...');
                await vscode.commands.executeCommand('winccoa-logviewer.open');
                ExtensionOutputChannel.info('OpenLogViewer', 'Opened Log Viewer');
            } else {
                // Extension not installed, show message with install link
                ExtensionOutputChannel.warning('OpenLogViewer', 'Log Viewer extension not installed');
                const selection = await vscode.window.showInformationMessage(
                    'WinCC OA Log Viewer extension is not installed.',
                    'Install Extension'
                );
                
                if (selection === 'Install Extension') {
                    ExtensionOutputChannel.info('OpenLogViewer', 'Opening VS Code Marketplace to install Log Viewer extension...');
                    await vscode.env.openExternal(vscode.Uri.parse('vscode:extension/richardjanisch.winccoa-vscode-logviewer'));
                }
            }
        })
    );

    // Manager control commands
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.startManager', async (item: any) => {
            if (item && item.managerIdx !== undefined) {
                ExtensionOutputChannel.info('ManagerControl', `Starting manager with idx: ${item.managerIdx}`);
                await consoleTreeProvider.startManager(item.managerIdx);
            } else {
                vscode.window.showErrorMessage('No manager selected');
                ExtensionOutputChannel.error('ManagerControl', 'startManager: No manager selected');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.stopManager', async (item: any) => {
            if (item && item.managerIdx !== undefined) {
                ExtensionOutputChannel.info('ManagerControl', `Stopping manager with idx: ${item.managerIdx}`);
                await consoleTreeProvider.stopManager(item.managerIdx);
            } else {
                vscode.window.showErrorMessage('No manager selected');
                ExtensionOutputChannel.error('ManagerControl', 'stopManager: No manager selected');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.restartManager', async (item: any) => {
            if (item && item.managerIdx !== undefined) {
                ExtensionOutputChannel.info('ManagerControl', `Restarting manager with idx: ${item.managerIdx}`);
                await consoleTreeProvider.restartManager(item.managerIdx);
            } else {
                vscode.window.showErrorMessage('No manager selected');
                ExtensionOutputChannel.error('ManagerControl', 'restartManager: No manager selected');
            }
        })
    );

    // System control commands
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.startOASystem', async () => {
            ExtensionOutputChannel.info('SystemControl', 'Starting WinCC OA System');
            await systemTreeProvider.startOASystem();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.stopOASystem', async () => {
            ExtensionOutputChannel.info('SystemControl', 'Stopping WinCC OA System');
            await systemTreeProvider.stopOASystem();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.restartOASystem', async () => {
            ExtensionOutputChannel.info('SystemControl', 'Restarting WinCC OA System');
            await systemTreeProvider.restartOASystem();
        })
    );

    ExtensionOutputChannel.success('Extension', 'All commands registered successfully');
    ExtensionOutputChannel.info('Extension', 'Commands: reloadCtrlLibs, openConfig, openLogViewer, startManager, stopManager, restartManager, startOASystem, stopOASystem, restartOASystem');
}

export function deactivate() {
    ExtensionOutputChannel.info('Extension', 'WinCC OA Sidepanel extension deactivated');
}
