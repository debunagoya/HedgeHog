// Electronの読み込み
var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

// mainWindow変数の初期化
var mainWindow = null;

// MacOS(darwin)でない場合にはアプリを終了する
// app.on('window-all-closed', function() {
//   if(process.platform != 'darwin')
//   app.quit();
// });

// 画面を表示．index.htmlを読み込む
// Close処理を行う
app.on('ready', function() {
  // 画面表示
  const Screen = electron.screen
  const size = Screen.getPrimaryDisplay().size
  mainWindow = new BrowserWindow({width: size.width, height: size.height, frame: false});
  mainWindow.loadURL("https://debunagoya.github.io/weather/");
  // mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
