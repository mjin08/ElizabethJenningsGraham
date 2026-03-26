#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")"

# Kill existing processes
killall "Google Chrome" 2>/dev/null
# Kill any existing relay server on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null
#killall "node" 2>/dev/null

# Start the application
npm start &
echo "Waiting for npm start to initialize..."
sleep 5

# Start the WebSocket relay server for cross-profile communication
#node relay.js &
# echo "WebSocket relay server started."

# Define separate user data directories to prevent profile locking
# and allow separate window positions/states.
USER_DATA_DIR_1="/tmp/ejg-chrome-profile-menu"
USER_DATA_DIR_2="/tmp/ejg-chrome-profile-player"
mkdir -p "$USER_DATA_DIR_1" "$USER_DATA_DIR_2"

# Common flags
FLAGS=" --autoplay-policy=no-user-gesture-required "
FLAGS+=" --start-fullscreen "
FLAGS+=" --use-fake-ui-for-media-stream "
FLAGS+=" --test-type "
FLAGS+=" --disable-infobars "
FLAGS+=" --no-first-run "
FLAGS+=" --no-default-browser-check "

# Launch Menu instance (Primary Monitor)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$USER_DATA_DIR_1" \
  --window-position=0,0 \
  $FLAGS \
  --app="http://localhost:3000" &

# Launch Player instance (Second Monitor)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$USER_DATA_DIR_2" \
  --window-position=1920,0 \
  $FLAGS \
  --app="http://localhost:3000/player" &

echo "Waiting for windows to load titles..."
#sleep 8

# Use AppleScript to move windows and trigger fullscreen
# Adjust 1920 if your second monitor starts at a different offset
osascript -e 'tell application "Google Chrome"
  activate
  set winList to windows
  repeat with win in winList
    set winTitle to title of win
    if winTitle contains "Menu Screen" then
      set bounds of win to {0, 0, 1920, 1080}
      tell application "System Events"
        set frontmost of process "Google Chrome" to true
        tell process "Google Chrome"
          set value of attribute "AXFullScreen" of win to true
        end tell
      end tell
    else if winTitle contains "Player Window" then
      set bounds of win to {1920, 0, 3840, 1080}
      tell application "System Events"
        set frontmost of process "Google Chrome" to true
        tell process "Google Chrome"
          set value of attribute "AXFullScreen" of win to true
        end tell
      end tell
    end if
  end repeat
end tell'
sleep 5

node relay.js &
echo "WebSocket relay server started."
echo "Launch sequence complete."
