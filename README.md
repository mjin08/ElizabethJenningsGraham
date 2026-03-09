Graham Museum — Local Prototype

Overview

This React prototype implements a two-screen interactive exhibit for Elizabeth Jennings Graham. It includes:

- A Menu screen with a three-column layout of predefined question "chat bubbles" and a centered instruction card with a microphone button.
- A separate Player Window that runs in its own browser tab and continuously plays random idle video loops until it receives a command to play a specific answer video.
- Simple voice input: the microphone button on the Menu starts Web Speech recognition and will attempt to map spoken text to a question or, for "Who are you?", play a dedicated video.
- Inter-window communication using BroadcastChannel (with a localStorage fallback) so the Menu can tell the Player Window which answer to play.

Quick start

1. Install dependencies

   npm install

2. Run the app

   npm start

3. Use the app

- Open http://localhost:3000 — this is the Menu.
- Open http://localhost:3000/player — this is the Player Window.
- Click any question bubble — the Menu will send a message to the Player to play the corresponding answer (if available).
- Ask Lizzie a question! (Make sure to say her name at the end of the question) If the spoken text matches a question, the Menu will instruct the Player to play the matched answer. If you say "Who are you?" the Player will play `src/assets/answers/who_are_you.mp4` if present.

Files & folders

- src/screens/MenuScreen.jsx — the three-column Menu UI and microphone logic.
- src/screens/PlayerWindow.jsx — runs in its own tab; rotates idle videos and listens for messages to play answers.
- src/assets/idle — idle loops here (idle1.mp4 ... idle4.mp4).
- src/assets/answers — answer videos here. 

Notes & limitations

- The Player only plays answer videos that are present in `src/assets/answers`. 
- Autoplay policies: some browsers block autoplay with audio. If videos do not start playing automatically, try clicking in the Player window once to allow playback, or consider muting idle videos until a user gesture occurs.
- BroadcastChannel is used for messaging; if not available the app falls back to writing to localStorage.

Kiosk launch (launchChrome.command)

If you want to run the Menu and Player windows in separate Chrome instances (useful for a kiosk/exhibit), there is a helper script included: `launchChrome.command`.

What it does

- Starts the dev server (npm start) and then launches two independent Chrome instances using separate temporary profiles.
- Opens the Menu at http://localhost:3000 in the first window and the Player at http://localhost:3000/player in the second window.
- Passes several Chrome flags that make autoplay reliable for audio/video and relax some security prompts so the kiosk can run without manual interaction.

How to use

1. Make the script executable (if necessary):

   chmod +x launchChrome.command

2. Run it from the project root (it will start the dev server and open the two Chrome windows):

   ./launchChrome.command

Important note about the microphone

- With the current flags used by `launchChrome.command` (separate user profiles, `--use-fake-ui-for-media-stream`, and other kiosk flags), the Web Speech / microphone-based recognition on the Menu no longer functions in practice. The script is tuned to guarantee autoplay with sound for the Player window, but those same flags and the two-instance setup interfere with or bypass access to the real system microphone.

- Consequences: the microphone button on the Menu may not start real speech recognition when Chrome is launched via the script. Clicking question bubbles in the Menu will still work and will instruct the Player to play answers.

- To re-enable microphone input during development or testing, launch Chrome normally (without the kiosk flags), open the Menu page, and accept the microphone permission prompt when requested. Alternatively, run the app without using `launchChrome.command` so a single regular Chrome profile controls media permissions.

Troubleshooting

- If audio still does not autoplay in your environment, confirm you're using the included `launchChrome.command` (it passes `--autoplay-policy=no-user-gesture-required`). If you prefer to manage permissions manually, remove that flag and allow the browser to prompt for audio/video permissions.

Development

- To add a persistent admin UI for logs, create endpoints in the backend to collect and expose match logs.
