interface ElectronWebdavRequestOptions {
  method: 'MKCOL' | 'PUT' | 'PROPFIND' | 'GET'
  headers?: Record<string, string>
  body?: string
}

interface ElectronWebdavResponse {
  ok: boolean
  status: number
  statusText: string
  text: string
  headers?: Record<string, string>
}

interface Window {
  __WEBVIEW__?: boolean
  electronAPI?: {
    getSettings?: () => Promise<any>
    setSettings?: (settings: Record<string, any>) => Promise<{ needRestart: boolean }>
    restartWindow?: () => Promise<void>
    quitApp?: () => Promise<void>
    webdavRequest?: (url: string, options: ElectronWebdavRequestOptions) => Promise<ElectronWebdavResponse>
  }
}
