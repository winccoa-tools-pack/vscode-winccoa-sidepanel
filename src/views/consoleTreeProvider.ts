import * as vscode from 'vscode';

interface ManagerData {
    idx: number;        // Manager index/ID from API
    type: string;       // Manager type/name (e.g. "WCCOActrl", "node")
    status: number;     // 0=stopped, 2=running
    pid: number | null;
    options?: string;   // Manager options (e.g. "vscode_integration_service/index.js")
}

interface ManagerApiResponse {
    success: boolean;
    managers: ManagerData[];
}

interface ManagerActionResponse {
    success: boolean;
    message?: string;
    manager?: {
        type: string;
        status: number;
        pid: number | null;
    };
}

export class ConsoleTreeProvider implements vscode.TreeDataProvider<ConsoleItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConsoleItem | undefined | null | void> = new vscode.EventEmitter<ConsoleItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConsoleItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private managers: ManagerData[] = [];
    private apiEndpoint: string = 'http://localhost:3000';
    private pollInterval: NodeJS.Timeout | undefined;

    constructor() {
        // Load configuration
        this.loadConfig();
        
        // Load managers on startup
        this.loadManagers();
        
        // Poll API for status updates
        this.startPolling();
    }

    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('winccoa.sidepanel');
        this.apiEndpoint = config.get<string>('apiEndpoint', 'http://localhost:3000');
        const pollInterval = config.get<number>('pollInterval', 3000);
        
        // Update polling interval if changed
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.startPolling();
        }
    }

    private startPolling(): void {
        const config = vscode.workspace.getConfiguration('winccoa.sidepanel');
        const pollInterval = config.get<number>('pollInterval', 3000);
        
        this.pollInterval = setInterval(() => {
            this.loadManagers();
        }, pollInterval);
    }

    dispose(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    private async loadManagers(): Promise<void> {
        try {
            const response = await fetch(`${this.apiEndpoint}/api/managers`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                const data = await response.json() as ManagerApiResponse;
                if (data.success && data.managers) {
                    this.managers = data.managers;
                    this._onDidChangeTreeData.fire();
                }
            }
        } catch (error) {
            console.log('Failed to load managers from API:', error);
            this.managers = [];
        }
    }

    refresh(): void {
        this.loadManagers();
    }

    getTreeItem(element: ConsoleItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ConsoleItem): Thenable<ConsoleItem[]> {
        if (!element) {
            // Root level - show Managers folder
            const managerCount = this.managers.length > 0 ? `${this.managers.length} managers` : 'Loading...';
            return Promise.resolve([
                new ConsoleItem('Managers', vscode.TreeItemCollapsibleState.Collapsed, 'folder', managerCount, undefined, undefined, undefined)
            ]);
        } else if (element.label === 'Managers' && element.itemType === 'folder') {
            // Show all managers from API
            if (this.managers.length === 0) {
                return Promise.resolve([
                    new ConsoleItem('No managers found', vscode.TreeItemCollapsibleState.None, 'info', 'Check API connection', undefined, undefined, undefined)
                ]);
            }
            
            return Promise.resolve(
                this.managers.map(mgr => 
                    new ConsoleItem(
                        mgr.type,
                        vscode.TreeItemCollapsibleState.None, 
                        'manager', 
                        this.getStatusText(mgr.status),
                        mgr.idx,
                        mgr.pid,
                        mgr.options
                    )
                )
            );
        }
        return Promise.resolve([]);
    }

    private getStatusText(status: number): string {
        return status === 2 ? 'running' : 'stopped';
    }

    async startManager(managerIdx: number): Promise<void> {
        try {
            const requestBody = { managerId: managerIdx };
            
            const response = await fetch(`${this.apiEndpoint}/api/manager/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const result = await response.json() as ManagerActionResponse;
                vscode.window.showInformationMessage(`✓ ${result.message || 'Manager started successfully'}`);
                await this.loadManagers();
            } else {
                const errorText = await response.text();
                vscode.window.showErrorMessage(`Failed to start manager: ${errorText}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to start manager: API not reachable');
        }
    }

    async stopManager(managerIdx: number): Promise<void> {
        try {
            const requestBody = { managerId: managerIdx };
            
            const response = await fetch(`${this.apiEndpoint}/api/manager/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const result = await response.json() as ManagerActionResponse;
                vscode.window.showInformationMessage(`✓ ${result.message || 'Manager stopped successfully'}`);
                await this.loadManagers();
            } else {
                const errorText = await response.text();
                vscode.window.showErrorMessage(`Failed to stop manager: ${errorText}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to stop manager: API not reachable');
        }
    }

    async restartManager(managerIdx: number): Promise<void> {
        try {
            const requestBody = { managerId: managerIdx };
            
            vscode.window.showInformationMessage('⟳ Restarting manager...');
            
            const response = await fetch(`${this.apiEndpoint}/api/manager/restart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                const result = await response.json() as ManagerActionResponse;
                vscode.window.showInformationMessage(`✓ ${result.message || 'Manager restarted successfully'}`);
                await this.loadManagers();
            } else {
                const errorText = await response.text();
                vscode.window.showErrorMessage(`Failed to restart manager: ${errorText}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to restart manager: API not reachable');
        }
    }
}

class ConsoleItem extends vscode.TreeItem {
    public readonly managerIdx?: number;
    
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'folder' | 'manager' | 'action' | 'info',
        public readonly status?: string,
        managerIdx?: number,
        public readonly pid?: number | null,
        public readonly options?: string
    ) {
        super(label, collapsibleState);
        
        this.managerIdx = managerIdx;
        
        if (itemType === 'manager' && managerIdx !== undefined) {
            this.id = `manager-${managerIdx}`;
        }
        
        if (itemType === 'folder') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'managerFolder';
            this.description = status;
        } else if (itemType === 'manager') {
            if (status === 'running') {
                this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconPassed'));
                if (options && options.trim()) {
                    this.description = `${options}${pid ? ` (PID: ${pid})` : ''}`;
                } else {
                    this.description = pid ? `(PID: ${pid})` : '';
                }
            } else if (status === 'stopped') {
                this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconFailed'));
                if (options && options.trim()) {
                    this.description = options;
                } else {
                    this.description = '';
                }
            }
            this.contextValue = 'manager';
            
            let tooltipText = `${this.label} - ${status}`;
            if (options && options.trim()) {
                tooltipText += `\nOptions: ${options}`;
            }
            if (pid) {
                tooltipText += `\nPID: ${pid}`;
            }
            this.tooltip = tooltipText;
        } else if (itemType === 'info') {
            this.iconPath = new vscode.ThemeIcon('info');
            this.description = status;
            this.contextValue = 'info';
        }
    }
}
