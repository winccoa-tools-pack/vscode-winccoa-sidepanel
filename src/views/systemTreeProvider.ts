import * as vscode from 'vscode';
import { ProjectInfoService } from '../services/projectInfoService';

export class SystemTreeProvider implements vscode.TreeDataProvider<SystemItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SystemItem | undefined | null | void> = new vscode.EventEmitter<SystemItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SystemItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private oaSystemRunning: boolean = false;
    private statusCheckInterval: NodeJS.Timeout | undefined;
    private projectInfo: {
        version: string;
        project: string;
        projectPath: string;
        apiEndpoint: string;
        subProjects: string[];
    } | null = null;

    constructor() {
        this.startStatusCheck();
    }

    private startStatusCheck(): void {
        this.checkSystemStatus();
        
        this.statusCheckInterval = setInterval(() => {
            this.checkSystemStatus();
        }, 30000);
    }

    private async checkSystemStatus(): Promise<void> {
        try {
            const projectInfo = await ProjectInfoService.getProjectInfo();
            
            if (projectInfo) {
                this.oaSystemRunning = true;
                this.projectInfo = {
                    version: projectInfo.version,
                    project: projectInfo.projectName,
                    projectPath: projectInfo.projectPath,
                    apiEndpoint: 'http://localhost:3000',
                    subProjects: projectInfo.subProjects || []
                };
            } else {
                this.oaSystemRunning = false;
                this.projectInfo = null;
            }
        } catch (error) {
            this.oaSystemRunning = false;
            this.projectInfo = null;
            console.error('[SystemTreeProvider] Error checking system status:', error);
        }
        this.refresh();
    }

    dispose(): void {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
    }

    getSystemStatus(): boolean {
        return this.oaSystemRunning;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SystemItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SystemItem): Thenable<SystemItem[]> {
        if (!element) {
            const statusLabel = this.oaSystemRunning ? 'WinCC OA System' : 'WinCC OA System';
            const statusDesc = this.oaSystemRunning ? '● Online' : '○ Offline';
            const statusTooltip = this.oaSystemRunning ? 'System is operational' : 'System is not running';
            
            return Promise.resolve([
                new SystemItem(
                    statusLabel, 
                    vscode.TreeItemCollapsibleState.None, 
                    'systemStatus', 
                    statusDesc,
                    statusTooltip,
                    this.oaSystemRunning
                ),
                new SystemItem(
                    'Project Information',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'projectInfo',
                    undefined,
                    'WinCC OA Project Details',
                    undefined
                ),
                new SystemItem(
                    'Projects',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'projects',
                    undefined,
                    'Main Project and Subprojects',
                    undefined
                )
            ]);
        } else if (element.itemType === 'projectInfo') {
            if (this.projectInfo) {
                return Promise.resolve([
                    new SystemItem('Project Name', vscode.TreeItemCollapsibleState.None, 'info', this.projectInfo.project, undefined, undefined),
                    new SystemItem('Version', vscode.TreeItemCollapsibleState.None, 'info', this.projectInfo.version, undefined, undefined),
                    new SystemItem('API Endpoint', vscode.TreeItemCollapsibleState.None, 'info', this.projectInfo.apiEndpoint, undefined, undefined)
                ]);
            } else {
                return Promise.resolve([
                    new SystemItem('Project Name', vscode.TreeItemCollapsibleState.None, 'info', 'Not available', undefined, undefined),
                    new SystemItem('Version', vscode.TreeItemCollapsibleState.None, 'info', 'Not available', undefined, undefined),
                    new SystemItem('API Endpoint', vscode.TreeItemCollapsibleState.None, 'info', 'Not available', undefined, undefined)
                ]);
            }
        } else if (element.itemType === 'projects') {
            if (this.projectInfo) {
                const items: SystemItem[] = [];
                
                items.push(new SystemItem(
                    this.projectInfo.project,
                    vscode.TreeItemCollapsibleState.None,
                    'projectPath',
                    '(Main Project)',
                    `Open in Explorer: ${this.projectInfo.projectPath}`,
                    undefined,
                    this.projectInfo.projectPath
                ));
                
                if (this.projectInfo.subProjects && this.projectInfo.subProjects.length > 0) {
                    this.projectInfo.subProjects.forEach(subProjectPath => {
                        const projectName = subProjectPath.split(/[/\\]/).pop() || subProjectPath;
                        items.push(new SystemItem(
                            projectName,
                            vscode.TreeItemCollapsibleState.None,
                            'projectPath',
                            '(Subproject)',
                            `Open in Explorer: ${subProjectPath}`,
                            undefined,
                            subProjectPath
                        ));
                    });
                }
                
                return Promise.resolve(items);
            } else {
                return Promise.resolve([
                    new SystemItem('No projects available', vscode.TreeItemCollapsibleState.None, 'info', undefined, undefined, undefined)
                ]);
            }
        }
        return Promise.resolve([]);
    }

    async startOASystem(): Promise<void> {
        vscode.window.showInformationMessage('⟳ Starting WinCC OA System...');
        
        setTimeout(() => {
            this.oaSystemRunning = true;
            this.refresh();
            vscode.window.showInformationMessage('✓ WinCC OA System started successfully');
        }, 2000);
    }

    async stopOASystem(): Promise<void> {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to stop the WinCC OA System?',
            'Yes',
            'No'
        );
        
        if (answer === 'Yes') {
            vscode.window.showInformationMessage('⏹ Stopping WinCC OA System...');
            
            setTimeout(() => {
                this.oaSystemRunning = false;
                this.refresh();
                vscode.window.showInformationMessage('✓ WinCC OA System stopped');
            }, 1000);
        }
    }

    async restartOASystem(): Promise<void> {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to restart the WinCC OA System?',
            'Yes',
            'No'
        );
        
        if (answer === 'Yes') {
            vscode.window.showInformationMessage('⟳ Restarting WinCC OA System...');
            
            setTimeout(() => {
                this.oaSystemRunning = true;
                this.refresh();
                vscode.window.showInformationMessage('✓ WinCC OA System restarted successfully');
            }, 2000);
        }
    }
}

class SystemItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'systemStatus' | 'projectInfo' | 'info' | 'projects' | 'projectPath',
        public readonly description?: string,
        public readonly tooltipText?: string,
        public readonly isRunning?: boolean,
        public readonly projectPath?: string
    ) {
        super(label, collapsibleState);
        
        if (itemType === 'systemStatus') {
            if (isRunning) {
                this.iconPath = new vscode.ThemeIcon('pulse', new vscode.ThemeColor('testing.iconPassed'));
            } else {
                this.iconPath = new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('testing.iconFailed'));
            }
            this.contextValue = 'systemStatus';
            this.tooltip = tooltipText;
            this.description = description;
        } else if (itemType === 'projectInfo') {
            this.iconPath = new vscode.ThemeIcon('info');
            this.contextValue = 'projectInfo';
            this.tooltip = tooltipText;
        } else if (itemType === 'projects') {
            this.iconPath = new vscode.ThemeIcon('folder-library');
            this.contextValue = 'projects';
            this.tooltip = tooltipText;
        } else if (itemType === 'projectPath') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'projectPath';
            this.tooltip = tooltipText;
            this.description = description;
            this.command = {
                command: 'revealFileInOS',
                title: 'Open in Explorer',
                arguments: [vscode.Uri.file(projectPath!)]
            };
        } else if (itemType === 'info') {
            this.iconPath = new vscode.ThemeIcon('symbol-property');
            this.contextValue = 'infoItem';
            this.description = description;
        }
    }
}
