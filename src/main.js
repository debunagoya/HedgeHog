// Electronの読み込み
var electron = require('electron');
var app = electron.app;
var path = require('path');
var fs = require('fs');
var shell = electron.shell;
var ipcMain = require('electron').ipcMain;
var BrowserWindow = electron.BrowserWindow;
var Menu = electron.Menu;
var http = require('http');
var location = "tokushima";
var APIKEY = "a208ee507584354ab2d30ede0abe8f0d";
var URL = 'http://api.openweathermap.org/data/2.5/forecast?&units=metric&q=' + location + ',jp' + '&appid=' + APIKEY;
var exec = require('child_process').exec;
var execFile = require('child_process').execFile;
var { OAuth2Client } = require('google-auth-library');
var { OAUTH_CLIENT } = require('./oauth/secrets');
var URL = require('url').URL;
var Store = require('electron-store')
var store = new Store({ name: 'config' });
var store2 = new Store({ cwd: __dirname, name: 'package' });
var log = require('electron-log');
var dialog = require('electron').dialog;
var cnt = 0;

process.on('uncaughtException', function (err) {
  log.error('electron:event:uncaughtException');
  log.error(err);
  log.error(err.stack);
  app.quit();
});

app.on('window-all-closed', function () {
  if (process.platform != 'darwin')
    app.quit();
});

app.on('ready', function () {
  size = electron.screen.getAllDisplays();
  var mainW = store.get("mainWindow");
  if (typeof mainW != "undefined") {
    var posx = mainW[0];
    var posy = mainW[1];
    var dw = mainW[2];
    var dh = mainW[3];
  } else {
    for (var i in size) {
      if (size[i].bounds.x != 0 || size[i].bounds.y != 0) {
        externalDisplay = size[i];
        cnt = i;
        break;
      } else {
        externalDisplay = size[0];
      }
    }
    var posx = externalDisplay.bounds.x;
    var posy = externalDisplay.bounds.y;
    var dw = externalDisplay.bounds.width;
    var dh = externalDisplay.bounds.height;
  }

  function makeid() {
    var dt = new Date();
    var year = dt.getFullYear();
    var month = dt.getMonth() + 1;
    var day = dt.getDate();
    var hour = dt.getHours();
    var min = dt.getMinutes()
    var sec = dt.getSeconds();
    var msec = dt.getMilliseconds();
    if (month < 10) { month = '0' + month; }
    if (day < 10) { day = '0' + day }
    if (hour < 10) { hour = '0' + hour; }
    if (min < 10) { min = '0' + min; }
    return String(year) + String(month) + String(day) + String(hour) + String(min) + String(sec) + String(msec);
  }

  // メインウィンドウ
  var mainWindow = null;
  mainWindow = new BrowserWindow({ width: dw, height: dh, movable: false, frame: false, resizable: false, minimizable: false, maximizable: false, x: posx, y: posy, backgroundColor: '#98FB98', webPreferences: { preload: __dirname + '/preload.js' } });
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  var wp = store.get("wp");
  if (typeof wp != "undefined") {
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.webContents.on('did-finish-load', function () {
      mainWindow.webContents.send('settingrenderer2', wp);
    });
  }
  var bounds = store.get("bounds", []);
  if (bounds.length == 0) {
    bounds = [];
  }
  var welcomelock = false;
  var welcomeWindow = null;
  if (bounds.length == '0') {
    welcomeWindow = new BrowserWindow({ parent: mainWindow, width: 800, height: 600, x: posx + (dw - 800) / 2, y: posy + (dh - 600) / 2, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { preload: __dirname + '/welcome/preload.js' } });
    welcomeWindow.loadURL('file://' + __dirname + '/welcome/index.html');
    welcomeWindow.webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
    ipcMain.on('welcomerequest1', (event, arg) => {
      if (!welcomelock) {
        welcomelock = true;
        if (welcomeWindow != null) {
          if (!welcomeWindow.isDestroyed()) {
            welcomeWindow.close();
          }
        }
        menuaction();
        setTimeout(() => {
          welcomelock = false;
        }, 1000);
      }
    });
  }

  // サブウィンドウ
  var exec = null;
  var subWindow = Array(bounds.length);
  var subnum = bounds.length;
  var sysloglock = false;
  var oauthlock = [false, false, false, false];
  function SubWindowOpen(i) {
    try {
      if (bounds[i].name == 'syslog') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, backgroundColor: '#FFF', webPreferences: { preload: __dirname + '/syslog/preload.js' } });
        subWindow[i].loadURL(bounds[i].url);
        subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        subWindow[i].webContents.on('did-finish-load', function () {
          subWindow[i].webContents.send('tab2renderer2', bounds[i].sum);
        });
        subWindow[i].on('closed', () => {
          bounds[i].lock = true;
        });
        ipcMain.on('tab2request3', (event, arg) => {
          if (!bounds[i].lock) {
            switch (bounds[i].sum) {
              case '0001': execFile(__dirname + '/syslog/syslog.sh', ['1'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '0010': execFile(__dirname + '/syslog/syslog.sh', ['2'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '0011': execFile(__dirname + '/syslog/syslog.sh', ['3'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '0100': execFile(__dirname + '/syslog/syslog.sh', ['4'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '0101': execFile(__dirname + '/syslog/syslog.sh', ['5'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '0110': execFile(__dirname + '/syslog/syslog.sh', ['6'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '0111': execFile(__dirname + '/syslog/syslog.sh', ['7'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1000': execFile(__dirname + '/syslog/syslog.sh', ['8'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1001': execFile(__dirname + '/syslog/syslog.sh', ['9'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1010': execFile(__dirname + '/syslog/syslog.sh', ['10'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1011': execFile(__dirname + '/syslog/syslog.sh', ['11'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1100': execFile(__dirname + '/syslog/syslog.sh', ['12'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1101': execFile(__dirname + '/syslog/syslog.sh', ['13'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1110': execFile(__dirname + '/syslog/syslog.sh', ['14'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
              case '1111': execFile(__dirname + '/syslog/syslog.sh', ['15'], (err, stdout, stderr) => { subWindow[i].webContents.send('tab2renderer3', stdout); }); break;
            }
          }
        });
      } else if (bounds[i].name == 'github') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, backgroundColor: '#FFF' });
        subWindow[i].loadURL(bounds[i].url);
        subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        subWindow[i].webContents.on('did-finish-load', function () {
          subWindow[i].webContents.send('tab3renderer2', bounds[i].user);
        });
      } else if (bounds[i].name == 'weather') {
        var weather = null;
        function ReloadJSON() {
          http.get(bounds[i].url2, (response) => {
            var buffer = '';
            response.setEncoding('utf8').on('data', (chunk) => { buffer += chunk; });
            response.on('end', () => {
              var forecast = JSON.parse(buffer);
              store.set(bounds[i].place, forecast);
            });
          });
          weather = store.get(bounds[i].place, []);
        }
        weather = store.get(bounds[i].place, []);
        if (weather.length == 0) {
          ReloadJSON();
        }
        var now = new Date();
        var dt = new Date(weather.list[0].dt_txt + '+00:00');
        if (now > dt) {
          ReloadJSON();
        }
        var text = '';
        for (var k = 0; k < weather.cnt; k++) {
          var dt = new Date(weather.list[k].dt_txt + '+00:00');
          text += dt.getDate() + ',';
        }
        for (var k = 0; k < weather.cnt; k++) {
          var dt = new Date(weather.list[k].dt_txt + '+00:00');
          text += dt.getHours() + ',';
        }
        for (var k = 0; k < weather.cnt; k++) {
          text += '<img src=\'http://openweathermap.org/img/w/' + weather.list[k].weather[0].icon + '.png\'>,';
        }
        for (var k = 0; k < weather.cnt; k++) {
          text += Math.round(weather.list[k].main.temp) + '℃';
          if (k != weather.cnt - 1) {
            text += ',';
          }
        }
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, backgroundColor: '#FFF', webPreferences: { preload: __dirname + '/weather/preload.js' } });
        subWindow[i].loadURL(bounds[i].url);
        subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        subWindow[i].webContents.on('did-finish-load', function () {
          subWindow[i].webContents.send('tab4renderer2', text);
        });
      } else if (bounds[i].name == 'clock') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, backgroundColor: '#FFF', webPreferences: { preload: __dirname + '/clock/preload.js' } });
        subWindow[i].loadURL(bounds[i].url);
        subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        subWindow[i].webContents.on('did-finish-load', function () {
          subWindow[i].webContents.send('tab5renderer2', bounds[i].res);
        });
      } else if (bounds[i].name == 'postit') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, backgroundColor: '#FFF', webPreferences: { preload: __dirname + '/postit/preload.js' } });
        subWindow[i].loadURL(bounds[i].url);
        subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        subWindow[i].webContents.on('did-finish-load', function () {
          subWindow[i].webContents.send('tab6renderer2', bounds[i].res);
        });
      } else if (bounds[i].name == 'youtube') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { nodeIntegration: true } });
        if (!bounds[i].oauth) {
          subWindow[i].hide();
          subWindow[i].loadURL('file://' + __dirname + '/oauth/top.html');
          ipcMain.on('auth-start', async () => {
            if (!oauthlock[0]) {
              oauthlock[0] = true;
              let client0 = initOAuthClient();
              let url0 = client0.generateAuthUrl({ scope: ['https://www.googleapis.com/auth/youtube'] });
              let auth0 = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true });
              let code0 = await getOAuthCodeByInteraction(auth0, url0, 0);
              let response0 = await client0.getToken(code0);
              bounds[i].oauth = true;
              subWindow[i].loadURL(bounds[i].url);
              subWindow[i].show();
              if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
              subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
            }
          });
        } else {
          subWindow[i].loadURL(bounds[i].url);
          subWindow[i].show();
          if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
          subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        }
      } else if (bounds[i].name == 'gmail') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { nodeIntegration: true } });
        if (!bounds[i].oauth) {
          subWindow[i].hide();
          subWindow[i].loadURL('file://' + __dirname + '/oauth/top.html');
          ipcMain.on('auth-start', async () => {
            if (!oauthlock[1]) {
              oauthlock[1] = true;
              let client1 = initOAuthClient();
              let url1 = client1.generateAuthUrl({ scope: ['https://mail.google.com/'] });
              let auth1 = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true });
              let code1 = await getOAuthCodeByInteraction(auth1, url1, 1);
              let response1 = await client1.getToken(code1);
              bounds[i].oauth = true;
              subWindow[i].loadURL(bounds[i].url);
              subWindow[i].show();
              if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
              subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
            }
          });
        } else {
          subWindow[i].loadURL(bounds[i].url);
          subWindow[i].show();
          if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
          subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        }
      } else if (bounds[i].name == 'gcalendar') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { nodeIntegration: true } });
        if (!bounds[i].oauth) {
          subWindow[i].hide();
          subWindow[i].loadURL('file://' + __dirname + '/oauth/top.html');
          ipcMain.on('auth-start', async () => {
            if (!oauthlock[2]) {
              oauthlock[2] = true;
              let client2 = initOAuthClient();
              let url2 = client2.generateAuthUrl({ scope: ['https://www.googleapis.com/auth/calendar'] });
              let auth2 = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true });
              let code2 = await getOAuthCodeByInteraction(auth2, url2, 2);
              let response2 = await client2.getToken(code2);
              bounds[i].oauth = true;
              subWindow[i].loadURL(bounds[i].url);
              subWindow[i].show();
              if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
              subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
            }
          });
        } else {
          subWindow[i].loadURL(bounds[i].url);
          subWindow[i].show();
          if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
          subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        }
      } else if (bounds[i].name == 'gdrive' || bounds[i].name == 'gsheet' || bounds[i].name == 'gdocs' || bounds[i].name == 'gform' || bounds[i].name == 'gslide') {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { nodeIntegration: true } });
        if (!bounds[i].oauth) {
          subWindow[i].hide();
          subWindow[i].loadURL('file://' + __dirname + '/oauth/top.html');
          ipcMain.on('auth-start', async () => {
            if (!oauthlock[3]) {
              oauthlock[3] = true;
              let client3 = initOAuthClient();
              let url3 = client3.generateAuthUrl({ scope: ['https://www.googleapis.com/auth/drive'] });
              let auth3 = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true });
              let code3 = await getOAuthCodeByInteraction(auth3, url3, 3);
              let response3 = await client3.getToken(code3);
              bounds[i].oauth = true;
              subWindow[i].loadURL(bounds[i].url);
              subWindow[i].show();
              if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
              subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
            }
          });
        } else {
          subWindow[i].loadURL(bounds[i].url);
          subWindow[i].show();
          if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
          subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
        }
      } else {
        subWindow[i] = new BrowserWindow({ parent: mainWindow, width: bounds[i].width, height: bounds[i].height, x: posx + bounds[i].x, y: posy + bounds[i].y, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', backgroundColor: '#FFFFFF', minimizable: false, useContentSize: true });
        subWindow[i].loadURL(bounds[i].url);
        if (bounds[i].mute == 'true') { subWindow[i].webContents.setAudioMuted(true); }
        subWindow[i].webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
      }
    } catch (e) {
      console.log(e);
    }
  }

  // 初期サブウィンドウ展開
  for (var i = 0; i < bounds.length; i++) {
    SubWindowOpen(i);
  }

  // Menu
  var newWindow = null;
  var aboutWindowStatus = false;
  var settingWindowStatus = false;
  var newWindowStatus = false;
  var reslock = [false, false, false, false, false, false, false, false];
  function menuaction() {
    if (!newWindowStatus) {
      if (welcomeWindow != null) {
        if (!welcomeWindow.isDestroyed()) {
          welcomeWindow.close();
        }
      }
      newWindowStatus = true;
      newWindow = new BrowserWindow({ parent: mainWindow, width: 720, height: 750, x: posx + (dw - 720) / 2, y: posy + (dh - 750) / 2, movable: true, resizable: true, transparent: true, hasShadow: false, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { preload: __dirname + '/createnew/preload.js' } });
      newWindow.loadURL('file://' + __dirname + '/createnew/index.html');
      newWindow.webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
      newWindow.on('closed', (event) => {
        newWindowStatus = false;
      });
      ipcMain.on('tab1request1', (event, arg) => {
        if (!reslock[0]) {
          var res = arg.split(",");
          if (res[1] != '' && res[2] != '') {
            reslock[0] = true;
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            bounds.push({ "name": res[0], 'id': makeid(), "url": res[1], "mute": res[2], 'oauth': false, "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(dw / 2), "height": Math.floor(dh / 2) });
            SubWindowOpen(subnum++);
            setTimeout(() => {
              reslock[0] = false;
            }, 1000);
          }
        }
      });
      ipcMain.on('tab2request1', (event, arg) => {
        if (!reslock[1]) {
          var res = arg.split(",");
          var sum = '';
          if (res[0] != '' && res[1] != '' && res[2] != '' && res[3] != '') {
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            reslock[1] = true;
            if (res[0] == 'true') { sum += '1' } else { sum += '0' }
            if (res[1] == 'true') { sum += '1' } else { sum += '0' }
            if (res[2] == 'true') { sum += '1' } else { sum += '0' }
            if (res[3] == 'true') { sum += '1' } else { sum += '0' }
            if (sum == '0001' || sum == '0010' || sum == '0100' || sum == '1000') {
              bounds.push({ "name": 'syslog', 'id': makeid(), "url": 'file://' + __dirname + '/syslog/index.html', "mute": 'false', "sum": sum, 'lock': false, "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(115), "height": Math.floor(120) });
            } else if (sum == '0011' || sum == '0101' || sum == '0110' || sum == '1001' || sum == '1010' || sum == '1100') {
              bounds.push({ "name": 'syslog', 'id': makeid(), "url": 'file://' + __dirname + '/syslog/index.html', "mute": 'false', "sum": sum, 'lock': false, "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(220), "height": Math.floor(120) });
            } else if (sum == '0111' || sum == '1011' || sum == '1101' || sum == '1110') {
              bounds.push({ "name": 'syslog', 'id': makeid(), "url": 'file://' + __dirname + '/syslog/index.html', "mute": 'false', "sum": sum, 'lock': false, "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(330), "height": Math.floor(120) });
            } else if (sum == '1111') {
              bounds.push({ "name": 'syslog', 'id': makeid(), "url": 'file://' + __dirname + '/syslog/index.html', "mute": 'false', "sum": sum, 'lock': false, "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(430), "height": Math.floor(120) });
            }
            SubWindowOpen(subnum++);
            setTimeout(() => {
              reslock[1] = false;
            }, 1000);
          }
        }
      });
      ipcMain.on('tab3request1', (event, arg) => {
        if (!reslock[2]) {
          var res = arg.split(",");
          if (res[0] != '') {
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            reslock[2] = true;
            bounds.push({ "name": 'github', 'id': makeid(), "url": 'file://' + __dirname + '/github/index.html', "mute": 'false', "user": res[0], "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(525), "height": Math.floor(100) });
            SubWindowOpen(subnum++);
            setTimeout(() => {
              reslock[2] = false;
            }, 1000);
          }
        }
      });
      ipcMain.on('tab4request1', (event, arg) => {
        if (!reslock[3]) {
          var res = arg.split(",");
          if (res[0] != '') {
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            reslock[3] = true;
            var APIKEY = "a208ee507584354ab2d30ede0abe8f0d";
            var URL = 'http://api.openweathermap.org/data/2.5/forecast?&units=metric&q=' + res[0] + ',jp' + '&appid=' + APIKEY;
            bounds.push({ "name": 'weather', 'id': makeid(), "url": 'file://' + __dirname + '/weather/index.html', "url2": URL, "place": res[0], "mute": 'false', "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(540), "height": Math.floor(125) });
            SubWindowOpen(subnum++);
            setTimeout(() => {
              reslock[3] = false;
            }, 1000);
          }
        }
      });
      ipcMain.on('tab5request1', (event, arg) => {
        if (!reslock[4]) {
          var res = arg.split(",");
          if (res[0] != '' && res[1] != '' && res[2] != '' && res[3] != '' && res[4] != '' && res[5] != '' && res[6] != '' && res[7] != '' && res[8] != '') {
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            reslock[4] = true;
            if (res[0] == '1') {
              bounds.push({ "name": 'clock', 'id': makeid(), "url": 'file://' + __dirname + '/clock/index.html', "mute": 'false', 'res': res[0] + res[1] + res[2] + res[3] + res[4] + res[5] + res[6] + res[7] + res[8], "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(160), "height": Math.floor(165) });
            } else if (res[0] == '2') {
              bounds.push({ "name": 'clock', 'id': makeid(), "url": 'file://' + __dirname + '/clock/index.html', "mute": 'false', 'res': res[0] + res[1] + res[2] + res[3] + res[4] + res[5] + res[6] + res[7] + res[8], "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(400), "height": Math.floor(50) });
            }
            SubWindowOpen(subnum++);
            setTimeout(() => {
              reslock[4] = false;
            }, 1000);
          }
        }
      });
      ipcMain.on('tab6request1', (event, arg) => {
        if (!reslock[5]) {
          var res = arg.split(",");
          if (res[0] != '' && res[1] != '' && res[2] != '' && res[3] != '' && res[4] != '') {
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            reslock[5] = true;
            bounds.push({ "name": 'postit', 'id': makeid(), "url": 'file://' + __dirname + '/postit/index.html', "mute": 'false', 'res': arg, "x": Math.floor(0), "y": Math.floor(0), "width": Math.floor(300), "height": Math.floor(250) });
            SubWindowOpen(subnum++);
            setTimeout(() => {
              reslock[5] = false;
            }, 1000);
          }
        }
      });
    }
  }
  var aboutWindow = null;
  var settingWindow = null;
  var template = [{
    label: 'Menu',
    submenu: [{
      label: 'About',
      click() {
        if (!aboutWindowStatus) {
          aboutWindowStatus = true;
          if (welcomeWindow != null) {
            if (!welcomeWindow.isDestroyed()) {
              welcomeWindow.close();
            }
          }
          aboutWindow = new BrowserWindow({ parent: mainWindow, width: 400, height: 400, x: posx + (dw - 400) / 2, y: posy + (dh - 400) / 2, movable: true, resizable: true, transparent: true, hasShadow: false, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { preload: __dirname + '/createnew/preload.js' } });
          aboutWindow.loadURL('file://' + __dirname + '/about/index.html');
          aboutWindow.webContents.on('did-finish-load', function () {
            aboutWindow.webContents.send('aboutrenderer2', store2.get("name") + ',' + store2.get("version") + ',' + store2.get("author") + ',' + store2.get("devDependencies").electron);
          });
          aboutWindow.webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
          aboutWindowStatus = true;
          aboutWindow.on('close', (event) => {
            aboutWindowStatus = false;
          });
        }
      }
    }, {
      label: 'New Window', accelerator: "CmdOrCtrl+N",
      click() {
        menuaction();
      }
    }, {
      label: 'Setting', accelerator: "CmdOrCtrl+,",
      click() {
        if (!settingWindowStatus) {
          if (welcomeWindow != null) {
            if (!welcomeWindow.isDestroyed()) {
              welcomeWindow.close();
            }
          }
          settingWindow = new BrowserWindow({ parent: mainWindow, width: 720, height: 750, x: posx + (dw - 720) / 2, y: posy + (dh - 750) / 2, movable: true, resizable: true, transparent: true, hasShadow: false, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { preload: __dirname + '/setting/preload.js' } });
          settingWindow.loadURL('file://' + __dirname + '/setting/index.html');
          settingWindow.webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
          ipcMain.on('settingrequest1', (event, arg) => {
            var res = arg.split(",");
            if (res[0] != '') {
              store.set("wp", res[0]);
              mainWindow.loadURL('file://' + __dirname + '/index.html');
              mainWindow.webContents.on('did-finish-load', function () {
                mainWindow.webContents.send('settingrenderer2', res[0]);
              });
            }
          });
          settingWindowStatus = true;
          settingWindow.on('close', (event) => {
            settingWindowStatus = false;
          });
        }
      }
    }, {
      label: 'Display',
      accelerator: "CmdOrCtrl+ESC",
      click() {
        while (true) {
          externalDisplay = size[cnt];
          if (externalDisplay.bounds.x != posx || externalDisplay.bounds.y != posy || externalDisplay.bounds.width != dw || externalDisplay.bounds.height != dh) {
            posx = externalDisplay.bounds.x;
            posy = externalDisplay.bounds.y;
            dw = externalDisplay.bounds.width;
            dh = externalDisplay.bounds.height;
            break;
          }
          cnt++; if (cnt == size.length) { cnt = 0 };
        }
        mainWindow.setPosition(posx, posy);
        mainWindow.setBounds(dw, dh);
      }
    }, {
      label: 'Reset',
      accelerator: "CmdOrCtrl+ESC",
      click() {
        var option = {
          type: "info",
          buttons: ["CANCEL", "OK"],
          title: "CAUTION",
          message: "Can I Reset ?"
        };
        var promise = dialog.showMessageBox(mainWindow, option);
        promise.then((value) => {
          if (value.response == 1) {
            store.clear();
            for (var i = 0; i < bounds.length; i++) {
              if (subWindow[i] != null) {
                if (!subWindow[i].isDestroyed()) {
                  subWindow[i].close();
                }
              }
            }
            if (welcomeWindow != null) {
              if (!welcomeWindow.isDestroyed()) {
                welcomeWindow.close();
              }
            }
            if (aboutWindow != null) {
              if (!aboutWindow.isDestroyed()) {
                aboutWindow.close();
              }
            }
            if (newWindow != null) {
              if (!newWindow.isDestroyed()) {
                newWindow.close();
              }
            }
            if (settingWindow != null) {
              if (!settingWindow.isDestroyed()) {
                settingWindow.close();
              }
            }
            bounds = [];
            welcomeWindow = new BrowserWindow({ parent: mainWindow, width: 800, height: 600, x: posx + (dw - 800) / 2, y: posy + (dh - 600) / 2, movable: true, resizable: true, transparent: true, hasShadow: true, titleBarStyle: 'customButtonsOnHover', minimizable: false, useContentSize: true, webPreferences: { preload: __dirname + '/welcome/preload.js' } });
            welcomeWindow.loadURL('file://' + __dirname + '/welcome/index.html');
            welcomeWindow.webContents.on('new-window', function (e, url) { e.preventDefault(); shell.openExternal(url); });
            ipcMain.on('welcomerequest1', (event, arg) => {
              if (!welcomelock) {
                welcomelock = true;
                if (welcomeWindow != null) {
                  if (!welcomeWindow.isDestroyed()) {
                    welcomeWindow.close();
                  }
                }
                menuaction();
                setTimeout(() => {
                  welcomelock = false;
                }, 1000);
              }
            });
          }
        }, (error) => { });
      }
    }, {
      label: 'Quit',
      role: 'quit',
    }]
  }, {
    label: "Edit",
    submenu: [
      { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
      { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
      { type: "separator" },
      { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
      { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
      { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
      { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]
  }, {
    label: 'View',
    submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click(item, focusedWindow) { if (focusedWindow) { focusedWindow.reload(); } } },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' }
    ]
  }
  ];
  var menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  const initOAuthClient = () => {
    return new OAuth2Client({
      clientId: OAUTH_CLIENT.client_id,
      clientSecret: OAUTH_CLIENT.client_secret,
      redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
    });
  };

  var getOAuthCodeByInteraction = (interactionWindow, authPageURL, i) => {
    interactionWindow.loadURL(authPageURL);
    return new Promise((resolve, reject) => {
      var onclosed = () => {
        reject('Interaction ended intentionally ;(');
        oauthlock[i] = false;
      };
      interactionWindow.on('closed', onclosed);
      interactionWindow.on('page-title-updated', (ev) => {
        var url = new URL(ev.sender.getURL());
        if (url.searchParams.get('approvalCode')) {
          interactionWindow.removeListener('closed', onclosed);
          if (!interactionWindow.isDestroyed()) {
            interactionWindow.close();
          }
          return resolve(url.searchParams.get('approvalCode'));
        }
        if ((url.searchParams.get('response') || '').startsWith('error=')) {
          interactionWindow.removeListener('closed', onclosed);
          if (!interactionWindow.isDestroyed()) {
            interactionWindow.close();
          }
          return reject(url.searchParams.get('response'));
        }
      });
    });
  };

  // 終了処理
  electron.app.on('before-quit', function () {
    for (var i = 0; i < subnum; i++) {
      if (typeof subWindow[i] != "undefined") {
        if (subWindow[i].isDestroyed()) {
          delete bounds[i];
        } else if (bounds[i].name == 'youtube' || bounds[i].name == 'gmail' || bounds[i].name == 'gcalendar' || bounds[i].name == 'gdrive' || bounds[i].name == 'gsheet' || bounds[i].name == 'gdocs' || bounds[i].name == 'gform' || bounds[i].name == 'gslide') {
          if (!bounds[i].oauth) {
            delete bounds[i];
          } else {
            bounds[i].x = Math.floor(subWindow[i].getBounds().x - posx);
            bounds[i].y = Math.floor(subWindow[i].getBounds().y - posy);
            bounds[i].width = Math.floor(subWindow[i].getBounds().width);
            bounds[i].height = Math.floor(subWindow[i].getBounds().height);
          }
        } else {
          bounds[i].x = Math.floor(subWindow[i].getBounds().x - posx);
          bounds[i].y = Math.floor(subWindow[i].getBounds().y - posy);
          bounds[i].width = Math.floor(subWindow[i].getBounds().width);
          bounds[i].height = Math.floor(subWindow[i].getBounds().height);
        }
      }
    }
    var array = [];
    for (var i = 0; i < subnum; i++) {
      if (bounds[i]) {
        array.push(bounds[i]);
      }
    }
    store.set("bounds", array);
    store.set("mainWindow", [posx, posy, dw, dh]);
  });

  electron.app.on('quit', function () {
    mainWindow = null;
  });
})
