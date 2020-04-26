#!/bin/bash
rm src/bounds.json src/wp.txt 2>/dev/null
cp -f package.json src/
# npm start

node_modules/.bin/electron-builder --mac --x64
