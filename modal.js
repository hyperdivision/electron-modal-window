const { remote, ipcRenderer } = require('electron')
const { EventEmitter } = require('events')

const { BrowserWindow } = remote
const parent = remote.getCurrentWindow()

// clean up lingering windows
for (const win of parent.getChildWindows()) {
  win.removeAllListeners('closed')
  win.destroy()
}

let isSetup = false

const client = module.exports = new EventEmitter()

client.once('newListener', setupClient)

client.send = function (name, ...values) {
  setupClient()
  const req = client.queue.request(name, ...values)
  if (req) ipcRenderer.send('--modal-window-request', req)
}

client.modals = []
client.createModal = createModal
client.get = get
client.id = 0
client.window = null
client.queue = null

function get (id) {
  for (let i = 0; i < client.modals.length; i++) {
    if (client.modals[i].id === id) return client.modals[i]
  }
  return null
}

function setupClient () {
  if (isSetup) return
  isSetup = true

  client.window = remote.getCurrentWindow()
  client.id = client.window.id
  client.queue = new RequestQueue(client.id)

  ipcRenderer.on('--modal-window-response', function (e, data) {
    client.queue.callback(data)
  })

  ipcRenderer.on('--modal-window-request', function (e, data) {
    const values = data.values.concat(reply)
    client.emit(data.name, ...values)

    function reply (err, ...values) {
      ipcRenderer.send('--modal-window-response', client.queue.response(data, err, ...values))
    }
  })
}

function setupMain () {
  if (isSetup) return
  isSetup = true

  const { ipcMain } = remote

  ipcMain.removeAllListeners('--modal-window-response')
  ipcMain.on('--modal-window-response', function (e, data) {
    const { queue } = client.get(data.windowId)
    queue.callback(data)
  })

  ipcMain.removeAllListeners('--modal-window-request')
  ipcMain.on('--modal-window-request', function (e, data) {
    const modal = client.get(data.windowId)
    const values = data.values.concat(reply)
    modal.emit(data.name, ...values)

    function reply (err, ...values) {
      modal.window.webContents.send('--modal-window-response', modal.queue.response(data, err, ...values))
    }
  })
}

function noop () {}

function createModal (url, opts) {
  setupMain()

  const parent = remote.getCurrentWindow()

  const win = new BrowserWindow({
    parent,
    ...opts
  })

  const queue = new RequestQueue(win.id)

  if (url) win.loadURL(url)

  const modal = new EventEmitter()
  client.modals.push(modal)

  modal.id = win.id
  modal.window = win
  modal.queue = queue

  modal.send = function (name, ...values) {
    const req = queue.request(name, ...values)
    if (req) win.webContents.send('--modal-window-request', req)
  }

  win.on('closed', function () {
    const i = client.modals.indexOf(modal)
    if (i > -1) client.modals.splice(i, 1)
    queue.destroy()
  })

  return modal
}

class RequestQueue {
  constructor (windowId) {
    this.windowId = windowId
    this.inflight = []
  }

  callback (response) {
    if (!this.inflight) return
    const req = this.inflight[response.requestId - 1]
    this.inflight[response.requestId - 1] = null
    while (this.inflight.length && !this.inflight[this.inflight.length - 1]) this.inflight.pop()
    req.callback(response.error ? new Error(response.error) : null, ...response.values)
  }

  response (request, err, ...values) {
    return {
      requestId: request.requestId,
      error: err ? err.message : null,
      values
    }
  }

  request (name, ...values) {
    const requestId = this.inflight.length + 1

    const callback = typeof values[values.length - 1] === 'function'
      ? values.pop()
      : noop

    if (!this.inflight) {
      process.nextTick(callback, new Error('Modal closed'))
      return null
    }

    this.inflight.push({
      requestId,
      name,
      values,
      callback
    })

    return {
      windowId: this.windowId,
      requestId,
      name,
      values
    }
  }

  destroy () {
    if (!this.inflight) return
    for (const req of this.inflight) {
      if (req) process.nextTick(req.callback, new Error('Modal closed'))
    }
    this.inflight = null
  }
}
