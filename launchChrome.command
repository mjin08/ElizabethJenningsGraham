#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")"
killall "Google Chrome"
killall "node"
npm start &
sleep 2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  --kiosk  http://localhost:3000
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  --kiosk  --window-position="0000,1000" http://localhost:3000/player