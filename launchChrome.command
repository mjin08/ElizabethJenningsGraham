#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")"
killall "Google Chrome"
killall "node"
npm start &
sleep 2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  --kiosk --autoplay-policy=no-user-gesture-required http://localhost:3000
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  --kiosk --window-position="0000,1000" --autoplay-policy=no-user-gesture-required http://localhost:3000/player