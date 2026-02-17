const DEFAULT_BASE_PATH = 'taoyuan'

export interface WebdavConfig {
  url: string
  username: string
  password: string
  basePath?: string
  enabled?: boolean
}

export interface WebdavBackupDescriptor {
  slot: number
  latestPath: string
  historyPath: string
}

type WebdavMethod = 'MKCOL' | 'PUT' | 'PROPFIND' | 'GET'

interface WebdavRequestInit extends RequestInit {
  method: WebdavMethod
}

interface WebdavProxyResponse {
  ok: boolean
  status: number
  statusText: string
  text: string
  headers?: Record<string, string>
}

const trimSlash = (value: string): string => value.replace(/^\/+|\/+$/g, '')

const toAuthHeader = (username: string, password: string) => {
  const source = `${username}:${password}`
  const token = btoa(unescape(encodeURIComponent(source)))
  return `Basic ${token}`
}

export const buildWebdavPaths = (slot: number, basePath = DEFAULT_BASE_PATH): WebdavBackupDescriptor => {
  const normalizedBase = trimSlash(basePath || DEFAULT_BASE_PATH)
  const slotDir = `${normalizedBase}/save-slot-${slot + 1}`
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return {
    slot,
    latestPath: `${slotDir}/latest.tyx`,
    historyPath: `${slotDir}/${stamp}.tyx`
  }
}

const toFriendlyNetworkError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('cors')) {
    return '网络请求失败，可能是 WebDAV 服务未开启 CORS。请检查服务器跨域设置，或在 Electron 中启用主进程代理。'
  }
  if (lower.includes('certificate') || lower.includes('ssl') || lower.includes('https')) {
    return 'HTTPS 证书校验失败，请确认 WebDAV 证书有效并被当前环境信任。'
  }
  return message
}

const normalizeRemoteUrl = (baseUrl: string, remotePath: string): string => {
  const normalizedUrl = baseUrl.replace(/\/+$/, '')
  const normalizedPath = trimSlash(remotePath)
  return `${normalizedUrl}/${normalizedPath}`
}

const maybeUseElectronProxy = async (url: string, init: WebdavRequestInit): Promise<WebdavProxyResponse | null> => {
  if (typeof window === 'undefined') return null
  const proxy = window.electronAPI?.webdavRequest
  if (!proxy) return null
  return proxy(url, {
    method: init.method,
    headers: init.headers as Record<string, string> | undefined,
    body: typeof init.body === 'string' ? init.body : undefined
  })
}

const requestWebdav = async (url: string, init: WebdavRequestInit): Promise<Response> => {
  const proxied = await maybeUseElectronProxy(url, init)
  if (proxied) {
    return new Response(proxied.text, {
      status: proxied.status,
      statusText: proxied.statusText,
      headers: proxied.headers
    })
  }
  return fetch(url, init)
}

const ensureCollection = async (config: WebdavConfig, remotePath: string, headers: Record<string, string>) => {
  const parts = trimSlash(remotePath).split('/')
  let current = ''
  for (const p of parts) {
    current = current ? `${current}/${p}` : p
    const dirUrl = normalizeRemoteUrl(config.url, current)
    const resp = await requestWebdav(dirUrl, { method: 'MKCOL', headers })
    if (!resp.ok && resp.status !== 405) {
      throw new Error(`MKCOL ${current} 失败: ${resp.status} ${resp.statusText}`)
    }
  }
}

const putFile = async (config: WebdavConfig, remotePath: string, content: string, headers: Record<string, string>) => {
  const resp = await requestWebdav(normalizeRemoteUrl(config.url, remotePath), {
    method: 'PUT',
    headers,
    body: content
  })
  if (!resp.ok) {
    throw new Error(`PUT ${remotePath} 失败: ${resp.status} ${resp.statusText}`)
  }
}

export const propfind = async (config: WebdavConfig, remotePath: string): Promise<string> => {
  const headers = {
    Authorization: toAuthHeader(config.username, config.password),
    Depth: '1'
  }
  const resp = await requestWebdav(normalizeRemoteUrl(config.url, remotePath), {
    method: 'PROPFIND',
    headers
  })
  if (!resp.ok) {
    throw new Error(`PROPFIND ${remotePath} 失败: ${resp.status} ${resp.statusText}`)
  }
  return resp.text()
}

export const getFile = async (config: WebdavConfig, remotePath: string): Promise<string> => {
  const headers = {
    Authorization: toAuthHeader(config.username, config.password)
  }
  const resp = await requestWebdav(normalizeRemoteUrl(config.url, remotePath), {
    method: 'GET',
    headers
  })
  if (!resp.ok) {
    throw new Error(`GET ${remotePath} 失败: ${resp.status} ${resp.statusText}`)
  }
  return resp.text()
}

export const backupCipherTextToWebdav = async (config: WebdavConfig, slot: number, rawCipherText: string): Promise<void> => {
  const headers = {
    Authorization: toAuthHeader(config.username, config.password),
    'Content-Type': 'application/octet-stream'
  }
  const { latestPath, historyPath } = buildWebdavPaths(slot, config.basePath)
  const slotDir = latestPath.split('/').slice(0, -1).join('/')

  try {
    await ensureCollection(config, slotDir, headers)
    await putFile(config, latestPath, rawCipherText, headers)
    await putFile(config, historyPath, rawCipherText, headers)
  } catch (error) {
    throw new Error(toFriendlyNetworkError(error))
  }
}

export const restoreLatestCipherTextFromWebdav = async (config: WebdavConfig, slot: number): Promise<string | null> => {
  const { latestPath } = buildWebdavPaths(slot, config.basePath)
  try {
    await propfind(config, latestPath.split('/').slice(0, -1).join('/'))
    return await getFile(config, latestPath)
  } catch (error) {
    throw new Error(toFriendlyNetworkError(error))
  }
}
