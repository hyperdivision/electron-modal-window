const modal = require('../modal')

let n = 0

const m = modal.createModal(`file://${__dirname}/modal.html`, {
  height: 600,
  width: 300,
  webPreferences: {
    nodeIntegration: true
  },
  frame: true
})

// modal never answers
m.send('void', function (err) {
  console.log('reply', err)
})

m.on('increment', function (cb) {
  console.log('incrementing')
  cb(null, ++n)
})

m.on('decrement', function (cb) {
  console.log('decrementing')
  cb(null, --n)
})

m.window.on('closed', function () {
  console.log('modal closed')
})
