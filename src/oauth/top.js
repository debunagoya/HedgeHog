const { ipcRenderer, shell } = require('electron');

const __onload__ = () => {
  var service;
  ipcRenderer.send('auth-start');
};

window.onload = __onload__;
