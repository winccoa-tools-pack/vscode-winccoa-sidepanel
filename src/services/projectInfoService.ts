import * as fs from 'fs';
import * as path from 'path';

export interface SubProject {
    name: string;
    path: string;
}

export interface ProjectInfo {
    projectPath: string;
    projectName: string;
    configPath: string;
    logPath: string;
    installPath: string;
    version: string;
    subProjects: string[];
}

export class ProjectInfoService {
    private static cachedInfo: ProjectInfo | null = null;
    private static apiEndpoint = 'http://localhost:3000';

    /**
     * Get project info from API with fallback to config file parsing
     */
    static async getProjectInfo(): Promise<ProjectInfo | null> {
        // Try to get from API first
        try {
            const response = await fetch(`${this.apiEndpoint}/api/getProjectInfo`);
            if (!response.ok) {
                console.warn('[ProjectInfo] API returned non-OK status:', response.status);
                return null;
            }

            const data = await response.json() as { success: boolean; projectInfo: ProjectInfo };
            if (data.success && data.projectInfo) {
                let projectInfo = data.projectInfo;

                // Normalize projectPath (fix potential duplicates from API)
                projectInfo.projectPath = path.normalize(projectInfo.projectPath);

                // Check if subProjects is empty but config file exists
                if ((!projectInfo.subProjects || projectInfo.subProjects.length === 0) && projectInfo.configPath) {
                    console.log('[ProjectInfo] SubProjects empty, parsing config file...');
                    const subProjects = this.parseSubProjectsFromConfig(
                        projectInfo.configPath, 
                        projectInfo.projectPath,
                        projectInfo.projectName
                    );
                    if (subProjects.length > 0) {
                        projectInfo.subProjects = subProjects.map(sp => sp.path);
                        console.log(`[ProjectInfo] Found ${subProjects.length} subprojects in config file`);
                        subProjects.forEach(sp => {
                            console.log(`  - ${sp.name}: ${sp.path}`);
                        });
                    } else {
                        console.log('[ProjectInfo] No subprojects found in config file');
                    }
                }

                this.cachedInfo = projectInfo;
                return projectInfo;
            }
        } catch (error) {
            console.error('[ProjectInfo] Error fetching from API:', error);
        }

        return null;
    }

    /**
     * Parse proj_path entries from config file
     * Filters out the main project path
     */
    private static parseSubProjectsFromConfig(
        configPath: string, 
        mainProjectPath: string, 
        mainProjectName?: string
    ): SubProject[] {
        const subProjects: SubProject[] = [];

        console.log('[ProjectInfo] Parsing config file:', configPath);
        console.log('[ProjectInfo] Main project path:', mainProjectPath);
        if (mainProjectName) {
            console.log('[ProjectInfo] Main project name:', mainProjectName);
        }

        if (!fs.existsSync(configPath)) {
            console.warn('[ProjectInfo] Config file not found:', configPath);
            return subProjects;
        }

        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const lines = configContent.split('\n');

            console.log(`[ProjectInfo] Config file has ${lines.length} lines`);

            // Normalize main project path for comparison
            const normalizedMainPath = path.normalize(mainProjectPath).toLowerCase();
            console.log('[ProjectInfo] Normalized main path:', normalizedMainPath);

            let foundProjPaths = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                
                // Match proj_path = "..." or proj_path = '...'
                const match = trimmed.match(/^proj_path\s*=\s*["']([^"']+)["']/);
                if (match) {
                    foundProjPaths++;
                    let projPath = match[1];
                    
                    console.log(`[ProjectInfo] Found proj_path #${foundProjPaths}: ${projPath}`);
                    
                    // Convert forward slashes to backslashes for Windows
                    projPath = projPath.replace(/\//g, '\\');
                    
                    // Normalize for comparison
                    const normalizedPath = path.normalize(projPath).toLowerCase();
                    
                    console.log(`[ProjectInfo] Normalized: ${normalizedPath}`);
                    
                    // Extract project name from path
                    const projectName = path.basename(projPath);
                    
                    // Skip if it's the main project (compare both path and name)
                    if (normalizedPath === normalizedMainPath) {
                        console.log('[ProjectInfo] Skipping - matches main project path');
                        continue;
                    }
                    
                    if (mainProjectName && projectName.toLowerCase() === mainProjectName.toLowerCase()) {
                        console.log('[ProjectInfo] Skipping - matches main project name');
                        continue;
                    }

                    console.log(`[ProjectInfo] Adding subproject: ${projectName}`);
                    
                    subProjects.push({
                        name: projectName,
                        path: projPath
                    });
                }
            }

            console.log(`[ProjectInfo] Total proj_path entries found: ${foundProjPaths}`);
            console.log(`[ProjectInfo] Subprojects after filtering: ${subProjects.length}`);

        } catch (error) {
            console.error('[ProjectInfo] Error parsing config file:', error);
        }

        return subProjects;
    }

    /**
     * Get cached project info (no API call)
     */
    static getCachedInfo(): ProjectInfo | null {
        return this.cachedInfo;
    }

    /**
     * Clear cache (force refresh on next getProjectInfo)
     */
    static clearCache(): void {
        this.cachedInfo = null;
    }
}
