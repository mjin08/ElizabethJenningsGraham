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
    // Pool of video elements (index 0 or 1)
    const pool = [v0.current, v1.current];
    // Index of currently visible video
    let active = 0;

    // State machine variables (not React state — fully deterministic)
    let currentPlayingId = null;
    let pendingRequestId = null;
    let isAnswerPlaying = false;

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

    // Safe play with muted fallback
    // Prevents autoplay rejection crashes
    async function safePlay(v) {
      try {
        const p = v.play();
        if (p && p.catch) {
          p.catch(() => {
            v.muted = true;
            v.play().catch(() => {});
          });
        }
      } catch {
        v.muted = true;
        v.play().catch(() => {});
      }
    }

    // Make a video visible
    function reveal(el) {
      el.style.opacity = '1';
      el.style.zIndex = '2';
      el.style.visibility = 'visible';
    }

    // Hide a video (fade out first, then remove visibility)
    function hide(el) {
      el.style.opacity = '0';
      el.style.zIndex = '1';
      // Wait for fade transition before hiding completely
      setTimeout(() => {
        el.style.visibility = 'hidden';
      }, 360);
    }

    // Core double-buffer swap logic
    async function swapTo(inactiveIndex) {
      const cur = pool[active];         // Currently visible
      const next = pool[inactiveIndex]; // Currently hidden

      // Start playback
      await safePlay(next);
      // Wait for first decoded + painted frame
      await waitForFirstFrame(next);

      reveal(next);

      // Slight overlap before pausing old video
      setTimeout(() => {
        cur.pause();
        hide(cur);
      }, 120);

      // Update active index
      active = inactiveIndex;
    }

    // Main video play function (answers + idle)
    async function playSrc(src, logicalId, isAnswer) {
      // If an answer is already playing, queue new request
      if (isAnswer && isAnswerPlaying) {
        pendingRequestId = logicalId;
        return;
      }

      const inactive = 1 - active;
      const el = pool[inactive];

      // Reset previous handlers
      el.onended = null;
      // Assign source and restart from beginning
      el.src = src;
      el.currentTime = 0;
      el.load();

      // Handle when this video finishes
      el.onended = () => {
        if (isAnswer) isAnswerPlaying = false;
        currentPlayingId = null;

        // If another request came in while playing
        if (pendingRequestId && pendingRequestId !== logicalId) {
          const nextId = pendingRequestId;
          pendingRequestId = null;
          const mapped = answerVideos[nextId] || fallbackAnswer;
          playSrc(mapped, nextId, true);
          return;
        }

        // Otherwise return to idle loop
        const nextIdle =
          idleVideos[Math.floor(Math.random() * idleVideos.length)];
        playSrc(nextIdle, 'idle', false);
      };

      currentPlayingId = logicalId;
      if (isAnswer) isAnswerPlaying = true;

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
        playSrc(next, 'idle', false);
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
      el.src = firstIdle;
      el.load();

      await safePlay(el);
      await waitForFirstFrame(el);

      reveal(el);

      currentPlayingId = 'idle';
      isAnswerPlaying = false;

      // If idle finishes naturally
      el.onended = () => {
        if (pendingRequestId) {
          const req = pendingRequestId;
          pendingRequestId = null;
          const mapped = answerVideos[req] || fallbackAnswer;
          playSrc(mapped, req, true);
          return;
        }

        const next =
          idleVideos[Math.floor(Math.random() * idleVideos.length)];
        playSrc(next, 'idle', false);
      };

      startIdleLoop();
    })();

    // BroadcastChannel + storage
    let ch = null;

    if ('BroadcastChannel' in window) {
      ch = new BroadcastChannel('graham-player-channel');
      ch.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;

        if (data.type === 'playAnswer' && data.questionId) {
          stopIdleLoop();
          pendingRequestId = data.questionId;
          const mapped =
            answerVideos[data.questionId] || fallbackAnswer;
          playSrc(mapped, data.questionId, true);
        }

        if (data.type === 'playAnswerSpoken' && data.text) {
          const spoken = data.text.toLowerCase();
          if (
            spoken.includes('who are you') ||
            spoken.includes("who're") ||
            spoken.includes('who r')
          ) {
            pendingRequestId = 'important';
            playSrc(answerVideos['important'], 'important', true);
          } else {
            playSrc(fallbackAnswer, 'fallback', true);
          }
        }
      };
    }

    // Cleanup
    return () => {
      clearInterval(idleTimer);
      if (ch) ch.close();
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