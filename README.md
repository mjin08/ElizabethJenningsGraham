Graham Museum — Local Prototype

Overview

This React prototype implements a two-screen interactive exhibit for Elizabeth Jennings Graham. It includes:

- A Menu screen with a three-column layout of predefined question "chat bubbles" and a centered instruction card with a microphone button.
- A separate Player Window that runs in its own browser tab and continuously plays random idle video loops until it receives a command to play a specific answer video.
- Simple voice input: the microphone button on the Menu starts Web Speech recognition and will attempt to map spoken text to a question; certain spoken phrases (e.g. "Who are you?") trigger dedicated answer videos.
- Inter-window communication using BroadcastChannel (with a localStorage fallback) so the Menu can tell the Player Window which answer to play.

Quick start

1. Install dependencies

   npm install

2. Run the app

   npm start

3. Use the app

- Open http://localhost:3000 — this is the Menu.
- Click "Open Player Window" to open the Player in a separate tab (or open /player manually).
- Click any question bubble — the Menu will send a message to the Player to play the corresponding answer (if an answer file is available).
- Click the microphone icon and speak. If the spoken text matches a question, the Menu will instruct the Player to play the matched answer. Saying "Who are you?" will play `src/assets/answers/who_are_you.mp4` if present.

Files & folders

- src/screens/MenuScreen.jsx — the Menu UI, microphone logic, and the center instruction/answer card. When a question with a local answer is selected, the center card shows a titled "Read More About My <topic> Here:" section, bullet points, and a Back button.
- src/screens/PlayerWindow.jsx — runs in its own tab; rotates idle videos and listens for messages to play answers. Idle videos are chosen randomly from the idle assets.
- src/assets/background.png — used as the background image for the Menu screen only (other screens use the site background color).
- src/assets/idle — idle loops. Current project imports: idle1.mp4, idle2.mp4, idle3.mp4, idle4.mp4, idle5.mp4, `glance down.mp4`, `listening.mp4`. Add more idle loop files here to include them in rotation.
- src/assets/answers — answer videos. The project now supports these named answer files corresponding to question ids (if present):
  - who_are_you.mp4 (spoken match)
  - family.mp4
  - interests.mp4
  - job.mp4
  - life.mp4

Behavior notes

- Idle rotation: the Player picks a random idle clip from the `src/assets/idle` files listed above and rotates every ~7s. When an answer plays, the rotation pauses, the answer plays once, then the idle rotation resumes.
- Answer playback: the Menu broadcasts a `playAnswer` message containing a questionId (e.g. `job`, `family`). The Player maps that id to a file in `src/assets/answers` and plays it if present. There is also a `playAnswerSpoken` message used for microphone-driven/semantic flows.
- Center card content: many questions now populate the Menu's center card with curated bullet answers and a bolded title ("Read More About My <topic> Here:"). Use the Back button to return to the default instructions.
- Background image: `src/assets/background.png` is applied only to the Menu screen via a CSS pseudo-element, so other screens (Player) do not show it.


Development notes

- If you removed `node_modules` to free space, reinstall with `npm install` before running.
- To build a production bundle: `npm run build`.

Testing tips

- Run in Chrome app mode (macOS) — no tabs / no address bar / its own window (good for exhibit kiosk):

  1. Start the dev server (in one terminal):

     npm start

  2. In a new Terminal window, run this command (opens Chrome in a single-window app profile):

     /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
       --user-data-dir=/tmp/lizzie-kiosk-profile \
       --app=http://localhost:3000

     Notes:
     - Using `--app=` opens a chromeless window (no tabs or address bar) showing only the site.
     - `--user-data-dir` creates an isolated profile so you don't disturb your main Chrome session.
     - To open the Player page instead (for a second display), use `--app=http://localhost:3000/player`.
     - For full kiosk fullscreen (no window chrome at all), add `--kiosk` (Chromium/Chrome on macOS):

       /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
         --user-data-dir=/tmp/lizzie-kiosk-profile \
         --kiosk \
         http://localhost:3000/player

     - To restore normal Chrome afterwards, close the app-window and reopen Chrome normally.

Contact

For help, copy errors from the browser console or terminal and share them with the developer.
