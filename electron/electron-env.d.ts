/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    DIST: any
    /** /dist/ or /public/ */
    PUBLIC: any
  }
}

export interface IElectronAPI {
  getMachineId: () => Promise<string>;
  getDeviceInfo: () => Promise<string>;
  dbFindOne: (query:any) => Promise<string>;
  dbFindAll: (query:any) => Promise<string>;
  dbInsert: (data:any) => Promise<string>;
  dbRemove: (query:any) => Promise<string>;
  dbUpdateOne: (query:any, data:any) => Promise<string>;
  checkDir: (data:string) => Promise<string>;
  checkSsh: (data:any) => Promise<string>;
  checkForUpdates: () => Promise<string>;
  downloadUpdate: () => Promise<string>;
  onUpdateMessage: (callback:any) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}


// 手动声明 ElMessage
declare module 'element-plus' {
  export class ElMessage {
    static success(message: string): void;
    static warning(message: string): void;
    static info(message: string): void;
    static error(message: string): void;
  }
}