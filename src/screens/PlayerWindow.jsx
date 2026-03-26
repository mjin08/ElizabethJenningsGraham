import React, { useEffect, useRef } from 'react';

// Idle assets
import idle from '../assets/idle/idle.mp4';
import glanceDown from '../assets/idle/glance down.mp4';
import listening from '../assets/idle/listening.mp4';

// Answer assets
import legacyAns from '../assets/answers/1_legacy.mp4';
import jobAns from '../assets/answers/2_job.mp4';
import interestsAns from '../assets/answers/3_interests.mp4';
import segregationAns from '../assets/answers/4_segregation.mp4';
import childhoodAns from '../assets/answers/6_childhood.mp4';
import familyAns from '../assets/answers/7_family.mp4';
import courtAns from '../assets/answers/8_court_case.mp4';
import educationAns from '../assets/answers/9_kindegarten.mp4';
import nullAns from '../assets/answers/null.mp4';

const idleVideos = [idle, glanceDown, listening].filter(Boolean);

// Map logical question IDs to answer video files
const answerVideos = {
  important: legacyAns,
  job: jobAns,
  interests: interestsAns,
  hierarchies: segregationAns,
  childhood: childhoodAns,
  family: familyAns,
  court: courtAns,
  education: educationAns
};

// Fallback video if no answer matches
const fallbackAnswer = nullAns;

export default function PlayerWindow() {
  // Two persistent video elements for double buffering
  const v0 = useRef(null);
  const v1 = useRef(null);

  useEffect(() => {
    document.title = "Graham Player Window";
    // Pool of video elements (index 0 or 1)
    const pool = [v0.current, v1.current];
    // Index of currently visible video
    let active = 0;

    // State machine variables (not React state — fully deterministic)
    let currentPlayingId = null;
    let currentPlayingSrc = null;
    let pendingRequest = null; // { id, src, isAnswer }
    let isAnswerPlaying = false;
    let swapInProgress = false;

    // Interval for idle rotation
    let idleTimer = null;

    // Wait until a decoded AND painted frame exists
    function waitForFirstFrame(v) {
      return new Promise((resolve) => {
        // Modern browsers: wait for compositor frame callback
        if (typeof v.requestVideoFrameCallback === 'function') {
          v.requestVideoFrameCallback(() => resolve());
          return;
        }

        // Fallback: wait for "playing", then 2 RAFs to ensure paint
        const onPlaying = () => {
          v.removeEventListener('playing', onPlaying);
          requestAnimationFrame(() =>
            requestAnimationFrame(resolve)
          );
        };

        v.addEventListener('playing', onPlaying);
      });
    }

    // Prefer audible playback. Try multiple times with backoff; only mute as last resort.
    async function safePlay(v) {
      // Ensure we try to play with sound first
      v.muted = false;

      const maxAttempts = 6;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const p = v.play();
          if (p && p.then) await p; // resolves when playback starts
          return; // success with sound
        } catch (err) {
          // If autoplay was blocked, wait a bit and retry (backoff)
          await new Promise((r) => setTimeout(r, 120 * attempt));
        }
      }

      // Last resort: if playback still doesn't start, attempt muted playback so the player can continue.
      // Note: to guarantee audible playback in kiosk mode, run Chrome with
      // --autoplay-policy=no-user-gesture-required or use the provided launchChrome.command.
      try {
        v.muted = true;
        await v.play();
        console.warn('Autoplay with sound blocked; playing muted as a last resort. Start browser with --autoplay-policy=no-user-gesture-required to allow sound.');
      } catch (e) {
        console.error('Unable to start playback (even muted).', e);
      }
    }

    // Make a video visible
    function reveal(el) {
      if (!el) return;
      el.style.opacity = '1';
      el.style.zIndex = '2';
      el.style.visibility = 'visible';
    }

    // Hide a video (fade out first, then remove visibility)
    function hide(el) {
      if (!el) return;
      el.style.opacity = '0';
      el.style.zIndex = '1';
      // Wait for fade transition before hiding completely
      setTimeout(() => {
        el.style.visibility = 'hidden';
      }, 360);
    }

    // Core double-buffer swap logic with a simple swap lock
    async function swapTo(inactiveIndex) {
      if (swapInProgress) return; // safety: another swap is ongoing
      swapInProgress = true;

      const cur = pool[active];         // Currently visible
      const next = pool[inactiveIndex]; // Currently hidden

      // Start playback on the hidden element
      await safePlay(next);
      // Wait for first decoded + painted frame
      await waitForFirstFrame(next);

      reveal(next);

      // Slight overlap before pausing old video
      setTimeout(() => {
        if (cur) cur.pause();
        hide(cur);
      }, 120);

      // Update active index
      active = inactiveIndex;
      swapInProgress = false;

      // If there's a queued request that arrived during swap, handle it now
      if (pendingRequest) {
        const req = pendingRequest;
        pendingRequest = null;
        // If it's different from what's now playing, start it
        if (req.src !== currentPlayingSrc) {
          playSrc(req.src, req.id, req.isAnswer).catch(() => {});
        }
      }
    }

    // Main video play function (answers + idle)
    async function playSrc(src, logicalId, isAnswer) {
      // Basic dedupe: if the requested src is already the current playing src, ignore
      if (currentPlayingSrc === src && currentPlayingId === logicalId) {
        return;
      }

      // If an answer is already playing, queue new request
      if (isAnswer && isAnswerPlaying) {
        pendingRequest = { id: logicalId, src, isAnswer };
        return;
      }

      // If a swap is in progress, queue the request so it runs after the swap completes
      if (swapInProgress) {
        pendingRequest = { id: logicalId, src, isAnswer };
        return;
      }

      const inactive = 1 - active;
      const el = pool[inactive];

      if (!el) {
        console.warn('No video element available for playback');
        return;
      }

      // Reset previous handlers
      el.onended = null;

      // Assign source and restart from beginning
      el.dataset.src = src;
      el.dataset.logicalId = logicalId;
      el.src = src;
      el.muted = false; // ensure unmuted when activated
      el.currentTime = 0;
      el.load();

      // Handle when this video finishes — guard against stale events
      el.onended = () => {
        // If this ended event doesn't belong to the currently recorded playing src, ignore it
        if (currentPlayingSrc !== src) {
          // stale/duplicate ended event
          return;
        }

        // Clear playing flags
        if (isAnswer) isAnswerPlaying = false;
        currentPlayingId = null;
        currentPlayingSrc = null;

        // If another request came in while playing, handle it
        if (pendingRequest) {
          const nextReq = pendingRequest;
          pendingRequest = null;
          const mapped = answerVideos[nextReq.id] || fallbackAnswer;
          playSrc(mapped, nextReq.id, true).catch(() => {});
          return;
        }

        // Otherwise return to idle loop
        const nextIdle =
          idleVideos[Math.floor(Math.random() * idleVideos.length)];
        playSrc(nextIdle, 'idle', false).catch(() => {});
      };

      // Record current playing
      currentPlayingId = logicalId;
      currentPlayingSrc = src;

      // If this is an answer, stop idle rotation
      if (isAnswer) {
        isAnswerPlaying = true;
        stopIdleLoop();
      }

      // Perform buffer swap
      await swapTo(inactive);
    }

    // Idle rotation every 7 seconds
    function startIdleLoop() {
      clearInterval(idleTimer);
      idleTimer = setInterval(() => {
        if (isAnswerPlaying) return;
        const next =
          idleVideos[Math.floor(Math.random() * idleVideos.length)];
        // Avoid requesting the same idle that's currently playing
        if (next === currentPlayingSrc) return;
        playSrc(next, 'idle', false).catch(() => {});
      }, 7000);
    }

    function stopIdleLoop() {
      clearInterval(idleTimer);
    }

    // Initial boot of idle rotation every 7 seconds
    (async () => {
      const firstIdle =
        idleVideos[Math.floor(Math.random() * idleVideos.length)];

      const el = pool[active];
      if (!el) return;

      el.dataset.src = firstIdle;
      el.dataset.logicalId = 'idle';
      el.src = firstIdle;
      el.muted = false; // ensure first video is unmuted
      el.load();

      await safePlay(el);
      await waitForFirstFrame(el);

      reveal(el);

      currentPlayingId = 'idle';
      currentPlayingSrc = firstIdle;
      isAnswerPlaying = false;

      // If idle finishes naturally
      el.onended = () => {
        // Stale guard
        if (currentPlayingSrc !== firstIdle) return;

        if (pendingRequest) {
          const req = pendingRequest;
          pendingRequest = null;
          const mapped = answerVideos[req.id] || fallbackAnswer;
          playSrc(mapped, req.id, true).catch(() => {});
          return;
        }

        const next =
          idleVideos[Math.floor(Math.random() * idleVideos.length)];
        playSrc(next, 'idle', false).catch(() => {});
      };

      startIdleLoop();
    })();

    // BroadcastChannel + storage + WebSocket
    let ch = null;
    let ws = null;

    function handleCommand(data) {
      if (!data) return;

      if (data.type === 'playAnswer' && data.questionId) {
        stopIdleLoop();
        pendingRequest = { id: data.questionId, src: answerVideos[data.questionId] || fallbackAnswer, isAnswer: true };
        playSrc(pendingRequest.src, pendingRequest.id, true).catch(() => {});
      }

      if (data.type === 'playAnswerSpoken' && data.text) {
        const spoken = data.text.toLowerCase();
        if (
          spoken.includes('who are you') ||
          spoken.includes("who're") ||
          spoken.includes('who r')
        ) {
          pendingRequest = { id: 'important', src: answerVideos['important'], isAnswer: true };
          playSrc(pendingRequest.src, pendingRequest.id, true).catch(() => {});
        } else {
          pendingRequest = { id: 'fallback', src: fallbackAnswer, isAnswer: true };
          playSrc(pendingRequest.src, pendingRequest.id, true).catch(() => {});
        }
      }
    }

    if ('BroadcastChannel' in window) {
      ch = new BroadcastChannel('graham-player-channel');
      ch.onmessage = (ev) => handleCommand(ev.data);
    }

    // WebSocket relay connection
    function connectSocket() {
      ws = new WebSocket('ws://localhost:8080');
      ws.onmessage = (ev) => {
        console.log('WS message received:', ev.data);
        try {
          const data = JSON.parse(ev.data);
          handleCommand(data);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };
      ws.onclose = () => {
        console.warn('WS relay closed. Reconnecting...');
        setTimeout(connectSocket, 2000);
      };
      ws.onerror = (err) => {
        console.error('WS error', err);
        ws.close();
      };
    }
    
    connectSocket();

    // Cleanup
    return () => {
      clearInterval(idleTimer);
      if (ch) ch.close();
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  // Render two layered video elements
  // Only opacity + zIndex change during swaps
  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#000'
      }}
    >
      <video
        ref={v0}
        preload="auto"
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0,
          zIndex: 1,
          transition: 'opacity 360ms ease',
          visibility: 'hidden',
          background: '#000'
        }}
      />

      <video
        ref={v1}
        preload="auto"
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0,
          zIndex: 1,
          transition: 'opacity 360ms ease',
          visibility: 'hidden',
          background: '#000'
        }}
      />
    </div>
  );
}