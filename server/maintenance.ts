// Maintenance mode utilities for InsideMeter
export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimatedDuration: string;
  allowedRoutes: string[];
}

const defaultConfig: MaintenanceConfig = {
  enabled: false,
  message: "We're currently enhancing your InsideMeter experience with exciting new features and improvements.",
  estimatedDuration: "Shortly",
  allowedRoutes: ['/api/health', '/maintenance', '/api/maintenance/status']
};

// In-memory maintenance config (could be moved to database later)
let maintenanceConfig: MaintenanceConfig = { ...defaultConfig };

export function isMaintenanceMode(): boolean {
  return maintenanceConfig.enabled;
}

export function getMaintenanceConfig(): MaintenanceConfig {
  return { ...maintenanceConfig };
}

export function setMaintenanceMode(enabled: boolean, config?: Partial<MaintenanceConfig>): void {
  maintenanceConfig = {
    ...maintenanceConfig,
    enabled,
    ...config
  };
}

export function isRouteAllowed(path: string): boolean {
  return maintenanceConfig.allowedRoutes.some(route => path.startsWith(route));
}

export function resetMaintenanceConfig(): void {
  maintenanceConfig = { ...defaultConfig };
}