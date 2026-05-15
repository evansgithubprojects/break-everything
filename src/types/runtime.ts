export type RuntimeExecutionMode = "iframe" | "module";
export type RuntimeStoragePolicy = "memory" | "session" | "persistent";
export type RuntimeCapability =
  | "fileOpen"
  | "fileSave"
  | "share"
  | "copyToClipboard"
  | "openExternal";

export interface RuntimePermissions {
  network?: boolean;
  storage?: boolean;
  clipboard?: boolean;
  downloads?: boolean;
  popups?: boolean;
}

export interface RuntimeManifest {
  version: number;
  entry: string;
  executionMode: RuntimeExecutionMode;
  permissions: RuntimePermissions;
  allowedOrigins: string[];
  storagePolicy: RuntimeStoragePolicy;
  capabilities: RuntimeCapability[];
}
