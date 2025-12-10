import * as vscode from 'vscode';
import * as fs from 'fs';
import { SystemTreeProvider } from './views/systemTreeProvider';
import { ConsoleTreeProvider } from './views/consoleTreeProvider';
import { ExtensionOutputChannel } from './extensionOutput';
import { ProjectInfoService } from './services/projectInfoService';

export function activate(context: vscode.ExtensionContext) {
    // Initialize output channel
    ExtensionOutputChannel.initialize();
    ExtensionOutputChannel.info('WinCC OA Sidepanel extension activated');

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
                    ExtensionOutputChannel.success('CTRL libraries reloaded successfully');
                    vscode.window.showInformationMessage('✓ CTRL libraries reloaded successfully');
                } else {
                    throw new Error(`API returned status ${response.status}`);
                }
            } catch (error) {
                ExtensionOutputChannel.error(`Failed to reload CTRL libraries: ${error}`);
                vscode.window.showErrorMessage('Failed to reload CTRL libraries. Check if API is running.');
            }
            consoleTreeProvider.refresh();
        })
    );

    // Open Config command
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.openConfig', async () => {
            const projectInfo = await ProjectInfoService.getProjectInfo();
            
            if (projectInfo && projectInfo.configPath) {
                if (fs.existsSync(projectInfo.configPath)) {
                    const configUri = vscode.Uri.file(projectInfo.configPath);
                    const document = await vscode.workspace.openTextDocument(configUri);
                    await vscode.window.showTextDocument(document);
                    ExtensionOutputChannel.info(`Opened config file: ${projectInfo.configPath}`);
                } else {
                    const errorMsg = `Config file not found: ${projectInfo.configPath}`;
                    ExtensionOutputChannel.error(errorMsg);
                    vscode.window.showErrorMessage(errorMsg);
                }
            } else {
                const errorMsg = 'Could not retrieve project info from WinCC OA API. Make sure the project is running.';
                ExtensionOutputChannel.error(errorMsg);
                vscode.window.showErrorMessage(errorMsg);
            }
        })
    );

    // Open Log Viewer command
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.openLogViewer', async () => {
            const logViewerExtension = vscode.extensions.getExtension('RichardJanisch.winccoa-logviewer');
            
            if (logViewerExtension) {
                // Log Viewer extension is installed, execute its command
                await vscode.commands.executeCommand('winccoa.logviewer.open');
                ExtensionOutputChannel.info('Opened Log Viewer');
            } else {
                // Extension not installed, show message with install link
                const selection = await vscode.window.showInformationMessage(
                    'WinCC OA Log Viewer extension is not installed.',
                    'Install Extension'
                );
                
                if (selection === 'Install Extension') {
                    vscode.env.openExternal(vscode.Uri.parse('vscode:extension/RichardJanisch.winccoa-logviewer'));
                }
            }
        })
    );

    // Manager control commands
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.startManager', async (item: any) => {
            if (item && item.managerIdx !== undefined) {
                ExtensionOutputChannel.info(`Starting manager with idx: ${item.managerIdx}`);
                await consoleTreeProvider.startManager(item.managerIdx);
            } else {
                vscode.window.showErrorMessage('No manager selected');
                ExtensionOutputChannel.error('startManager: No manager selected');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.stopManager', async (item: any) => {
            if (item && item.managerIdx !== undefined) {
                ExtensionOutputChannel.info(`Stopping manager with idx: ${item.managerIdx}`);
                await consoleTreeProvider.stopManager(item.managerIdx);
            } else {
                vscode.window.showErrorMessage('No manager selected');
                ExtensionOutputChannel.error('stopManager: No manager selected');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.restartManager', async (item: any) => {
            if (item && item.managerIdx !== undefined) {
                ExtensionOutputChannel.info(`Restarting manager with idx: ${item.managerIdx}`);
                await consoleTreeProvider.restartManager(item.managerIdx);
            } else {
                vscode.window.showErrorMessage('No manager selected');
                ExtensionOutputChannel.error('restartManager: No manager selected');
            }
        })
    );

    // System control commands
    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.startOASystem', async () => {
            ExtensionOutputChannel.info('Starting WinCC OA System');
            await systemTreeProvider.startOASystem();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.stopOASystem', async () => {
            ExtensionOutputChannel.info('Stopping WinCC OA System');
            await systemTreeProvider.stopOASystem();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('winccoa.restartOASystem', async () => {
            ExtensionOutputChannel.info('Restarting WinCC OA System');
            await systemTreeProvider.restartOASystem();
        })
    );

    ExtensionOutputChannel.success('All commands registered successfully');
}

export function deactivate() {
    ExtensionOutputChannel.info('WinCC OA Sidepanel extension deactivated');
}
