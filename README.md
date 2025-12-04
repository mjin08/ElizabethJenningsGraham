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
- Click "Open Player Window" to open the Player in a separate tab (or open /player manually).
- Click any question bubble — the Menu will send a message to the Player to play the corresponding answer (if available).
- Click the microphone icon and speak. If the spoken text matches a question, the Menu will instruct the Player to play the matched answer. If you say "Who are you?" the Player will play `src/assets/answers/who_are_you.mp4` if present.

Files & folders

- src/screens/MenuScreen.jsx — the three-column Menu UI and microphone logic.
- src/screens/PlayerWindow.jsx — runs in its own tab; rotates idle videos and listens for messages to play answers.
- src/screens/AvatarScreen.jsx — earlier single-window avatar screen (kept for compatibility) — not used when using the separate Player Window.
- src/assets/idle — put idle loops here (idle1.mp4 ... idle4.mp4).
- src/assets/answers — put answer videos here. Currently the project looks for `who_are_you.mp4` for the spoken Who are you query.

Notes & limitations

- The Player only plays answer videos that are present in `src/assets/answers`. If you want menu-click answers to play, upload files named to match question ids (e.g. `important.mp4`) and I can wire them into the mapping.
- Autoplay policies: some browsers block autoplay with audio. If videos do not start playing automatically, try clicking in the Player window once to allow playback, or consider muting idle videos until a user gesture occurs.
- BroadcastChannel is used for messaging; if not available the app falls back to writing to localStorage.

Development

- To add more advanced mapping (semantic matching) connect the menu to a backend or add a client-side embedding matcher.
- To add a persistent admin UI for logs, create endpoints in the backend to collect and expose match logs.

Contact

For help, copy errors from the browser console or terminal and share them with the developer.
