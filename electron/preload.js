const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取设置
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // 保存设置
  setSettings: settings => ipcRenderer.invoke('set-settings', settings),

  // 重启窗口（用于切换边框模式）
  restartWindow: () => ipcRenderer.invoke('restart-window'),

  // 退出应用
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // WebDAV 请求代理（Electron 环境下绕过浏览器 CORS 限制）
  webdavRequest: (url, options) => ipcRenderer.invoke('webdav-request', { url, options })
})
