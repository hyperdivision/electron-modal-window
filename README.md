# electron-modal-window

Easily create and use electron modal windows

```
npm install electron-modal-window
```

## Usage

In your "main" renderer process where you want to spawn a modal from do

``` js
const modal = require('electron-modal-window')

const m = modal.createModal(`file://${__dirname}/modal.html`, {
  width: 300,
  height: 300 // and pass any other electron BrowserWindow opts you want
})

m.window // this is the modal BrowserWindow

m.on('hello', function (cb) {
  // emitted when the modal sends 'hello'
  cb(null, 'world')
})
```

In the js for modal.html

``` js
const modal = require('electron-modal-window')

m.send('hello', function (err, val) {
  console.log('they said', val)
})

// m.window is the current window
```

## API

#### `m = modal.createModal([url, browserWindowOptions])`

Make a new module. Set `url` to the url the modal should load.
All `browserWindowOptions` are forwarded to the BrowserWindow constructor.

#### `m.window`

The attached BrowserWindow instance.

#### `m.on(name, args..., callback)`

Emitted when the modal sends a message. You can reply back by calling the calling cb.

#### `m.send(name, args..., [callback])`

Send a message to the modal. The optional callback is called with the reply.
If an error occured (i.e. the modal sent an error or the modal closed) it will
be passed to the callback.

#### `modal.on(name, args..., callback)`

Same as `m.on` but use this in the modal window to listen for messages from the modal creator.

#### `modal.send(name, args..., [callback])`

Same as `m.send` but use this in the modal window to message the modal creator.

#### `modal.window`

The modals own window instance.

## License

MIT
