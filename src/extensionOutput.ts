import * as vscode from 'vscode';

/**
 * Branded output channel for sidepanel extension
 */
export class ExtensionOutputChannel {
    private static channel: vscode.OutputChannel;

    static initialize(): vscode.OutputChannel {
        if (!this.channel) {
            this.channel = vscode.window.createOutputChannel('WinCC OA Sidepanel');
            this.info('Sidepanel extension initialized');
        }
        return this.channel;
    }

    static info(message: string): void {
        if (!this.channel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${timestamp}] ℹ️ ${message}`);
    }

    static success(message: string): void {
        if (!this.channel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${timestamp}] ✅ ${message}`);
    }

    static warning(message: string): void {
        if (!this.channel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${timestamp}] ⚠️ ${message}`);
    }

    static error(message: string): void {
        if (!this.channel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${timestamp}] ❌ ${message}`);
    }

    static debug(message: string): void {
        if (!this.channel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${timestamp}] 🔍 ${message}`);
    }

    static show(): void {
        if (this.channel) {
            this.channel.show(true);
        }
    }

    static getChannel(): vscode.OutputChannel {
        if (!this.channel) {
            this.initialize();
        }
        return this.channel;
    }
}
