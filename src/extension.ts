import * as vscode from 'vscode';
import { SystemTreeProvider } from './views/systemTreeProvider';
import { ConsoleTreeProvider } from './views/consoleTreeProvider';
import { ExtensionOutputChannel } from './extensionOutput';

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
        vscode.commands.registerCommand('winccoa.reloadCtrlLibs', () => {
            vscode.window.showInformationMessage('⟳ Reloading CTRL libraries...');
            consoleTreeProvider.refresh();
            ExtensionOutputChannel.info('CTRL libraries reloaded');
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
