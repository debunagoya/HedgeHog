const { ipcRenderer } = require('electron');
const { webFrame } = require('electron');

process.once('loaded', () => {
  global.native = {
    ipcRenderer: ipcRenderer,
    webFrame: webFrame,
  };
});
