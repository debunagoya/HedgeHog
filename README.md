# Make Environment
$ nodebrew install-binary latest
$ nodebrew use v13.10.1
$ echo 'export PATH=$PATH:$HOME/.nodebrew/current/bin' >> ~/.bashrc && source ~/.bashrc
$ sudo npm -d install electron-prebuilt

# References
ElectronでMacのデスクトップアプリ作成
[ https://qiita.com/sasayabaku/items/2b9bb646f1636528ff5b ]
Electronで1からデスクトップアプリを作り、electron-builderを使ってビルド・リリースするまで
[ https://qiita.com/saki-engineering/items/203892838e15b3dbd300 ]
