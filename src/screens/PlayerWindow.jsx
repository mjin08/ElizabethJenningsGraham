import React, { useEffect, useRef, useState } from 'react';

// Import bundled idle assets (these files exist in the project)
import idle from '../assets/idle/idle.mp4';
import glanceDown from '../assets/idle/glance down.mp4';
import listening from '../assets/idle/listening.mp4';

// Import answer files (updated to match new asset filenames)
import legacyAns from '../assets/answers/1_legacy.mp4';
import jobAns from '../assets/answers/2_job.mp4';
import interestsAns from '../assets/answers/3_interests.mp4';
import segregationAns from '../assets/answers/4_segregation.mp4';
import childhoodAns from '../assets/answers/6_childhood.mp4';
import familyAns from '../assets/answers/7_family.mp4';
import courtAns from '../assets/answers/8_court_case.mp4';
import educationAns from '../assets/answers/9_kindegarten.mp4';
// Fallback/null response when a questionId has no mapped answer
import nullAns from '../assets/answers/null.mp4';

const idleVideos = [idle, glanceDown, listening].filter(Boolean);
// Map question IDs used by MenuScreen to their corresponding answer video files
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
const fallbackAnswer = nullAns;

export default function PlayerWindow() {
  // two video elements for double-buffered playback
  const videoRefs = [useRef(null), useRef(null)];
  const [active, setActive] = useState(0); // which video is currently visible (0 or 1)
  const [srcs, setSrcs] = useState([
    idleVideos.length ? idleVideos[Math.floor(Math.random() * idleVideos.length)] : '',
    ''
  ]);
  // audio control: start muted so autoplay is allowed; allow user to enable audio by tapping/clicking the player
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(audioEnabled);
  // keep ref in sync
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  const intervalRef = useRef(null);
  const rotationActiveRef = useRef(true);
  // prevent concurrent swaps which can produce double flicker
  const swapInProgressRef = useRef(false);

  // Try to start playback immediately when a source is assigned to the active video.
  useEffect(() => {
    // Run on next tick so refs are mounted
    const tryPlay = () => {
      try {
        const el = videoRefs[active].current;
        if (el && srcs[active]) {
          el.muted = true;
          el.playsInline = true;
          // ensure the element loads the current src
          try { el.load(); } catch (e) {}
          const p = el.play();
          if (p && p.catch) p.catch(() => { /* autoplay may still be blocked */ });
        }
      } catch (e) {}
    };

    // Try immediately, and once more after a short delay in case the element wasn't ready.
    tryPlay();
    const t = setTimeout(tryPlay, 120);
    return () => clearTimeout(t);
  }, [srcs, active]);

  useEffect(() => {
    let mounted = true;
    let ch = null;
    let storageHandler = null;

    function startIdleRotation() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!idleVideos.length) return;
      rotationActiveRef.current = true;
      intervalRef.current = setInterval(() => {
        if (!mounted) return;
        if (!rotationActiveRef.current) return;
        const next = idleVideos[Math.floor(Math.random() * idleVideos.length)];
        crossfadeTo(next, { loop: true, muted: true });
      }, 7000);
    }

    function stopIdleRotation() {
      rotationActiveRef.current = false;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    startIdleRotation();

    function crossfadeTo(nextSrc, opts = {}) {
      if (!nextSrc) return;
      if (swapInProgressRef.current) return; // another swap is running
      swapInProgressRef.current = true;
       const inactive = 1 - active;

      // determine if this is an idle-to-idle rotation; if so we will disable the opacity fade
      const wasIdle = idleVideos.includes(srcs[active]);
      const willIdle = idleVideos.includes(nextSrc);
      const disableFade = wasIdle && willIdle;

      // set the src on the inactive video element
      setSrcs((prev) => {
        const n = [...prev];
        n[inactive] = nextSrc;
        return n;
      });

      const inactiveEl = videoRefs[inactive].current;
      const activeEl = videoRefs[active].current;

      // temporarily disable CSS transition for idle-to-idle swaps
      if (disableFade) {
        try {
          if (inactiveEl) inactiveEl.style.transition = 'none';
          if (activeEl) activeEl.style.transition = 'none';
        } catch (e) {}
      }

      // Helper to perform a direct, instant swap on the DOM to avoid Chrome repaint/fade issues
      const instantDomSwap = () => {
        try {
          if (!inactiveEl || !activeEl) return;
          // make sure inactive is on top and visible immediately
          inactiveEl.style.transition = 'none';
          activeEl.style.transition = 'none';
          inactiveEl.style.opacity = '1';
          inactiveEl.style.zIndex = '2';
          activeEl.style.opacity = '0';
          activeEl.style.zIndex = '1';
          // pause previous frame to free resources
          try { activeEl.pause(); } catch (e) {}
          // restore transitions after a tick so future non-idle swaps still animate
          setTimeout(() => {
            try {
              if (inactiveEl) inactiveEl.style.transition = 'opacity 320ms ease';
              if (activeEl) activeEl.style.transition = 'opacity 320ms ease';
            } catch (e) {}
            // keep React state consistent
            setActive(inactive);
            // release swap lock
            swapInProgressRef.current = false;
          }, 40);
        } catch (e) {}
      };

      const cleanup = (handlers) => {
        try {
          if (!handlers) return;
          if (handlers.onPlaying && inactiveEl) inactiveEl.removeEventListener('playing', handlers.onPlaying);
          if (handlers.onCanPlay && inactiveEl) inactiveEl.removeEventListener('canplay', handlers.onCanPlay);
        } catch (e) {}
        // release swap lock
        swapInProgressRef.current = false;
      };

      const performSwap = () => {
        try {
          // For idle->idle swaps, do an instant DOM-level swap to avoid Chrome repaint/flicker,
          // otherwise update state so the normal fade behavior can occur.
          if (disableFade) {
            instantDomSwap();
            return; // instantDomSwap will setActive and clear lock
          }

          setActive(inactive);
          try { if (activeEl) activeEl.pause(); } catch (e) {}
          // restore transition styles if we disabled them for an idle swap
          if (disableFade) {
            try {
              if (inactiveEl) inactiveEl.style.transition = 'opacity 320ms ease';
              if (activeEl) activeEl.style.transition = 'opacity 320ms ease';
            } catch (e) {}
          }
        } catch (e) {}
        finally {
          // ensure lock cleared if we reached here
          swapInProgressRef.current = false;
        }
      };

      const onCanPlay = () => {
        try {
          if (!inactiveEl) return;
          inactiveEl.loop = !!opts.loop;
          inactiveEl.muted = opts.muted === undefined ? true : opts.muted;
          inactiveEl.playsInline = true;
          const p = inactiveEl.play();
          if (p && p.catch) p.catch(() => {});

          // Wait for an actual rendered frame before swapping to avoid double flashes
          if (typeof inactiveEl.requestVideoFrameCallback === 'function') {
            inactiveEl.requestVideoFrameCallback(() => {
              performSwap();
              cleanup({ onCanPlay });
            });
            return;
          }

          // Fallback: wait for 'playing' event
          const onPlaying = () => {
            performSwap();
            cleanup({ onPlaying, onCanPlay });
          };
          inactiveEl.addEventListener('playing', onPlaying);

          // final fallback: if already ready, swap soon
          setTimeout(() => {
            if (inactiveEl && inactiveEl.readyState >= 3) {
              performSwap();
              cleanup({ onPlaying, onCanPlay });
            }
          }, 50);
        } catch (e) {}
      };

      if (inactiveEl) {
        inactiveEl.addEventListener('canplay', onCanPlay);
        try { inactiveEl.load(); } catch (e) {}
        if (inactiveEl.readyState >= 3) onCanPlay();
      } else {
        // nothing to do, release lock
        swapInProgressRef.current = false;
      }
    }

    function unmuteActiveVideo() {
      try {
        const cur = videoRefs[active].current;
        if (cur) {
          cur.muted = false;
          try { cur.volume = 1.0; } catch (e) {}
          const p = cur.play();
          if (p && p.catch) p.catch(() => {});
        }
      } catch (e) {}
    }

    function playAnswerOnceBySrc(answerSrc) {
      if (!answerSrc) return;
      stopIdleRotation();
      // start answer playback muted so autoplay isn't blocked
      crossfadeTo(answerSrc, { loop: false, muted: true });

      // Attach an ended handler to whichever video becomes active
      const checkEndedAttach = () => {
        const cur = videoRefs[active].current;
        if (!cur) return;
        const onEnded = () => {
          setTimeout(() => {
            if (!mounted) return;
            const next = idleVideos.length ? idleVideos[Math.floor(Math.random() * idleVideos.length)] : '';
            crossfadeTo(next, { loop: true, muted: true });
            startIdleRotation();
          }, 800);
          cur.removeEventListener('ended', onEnded);
        };
        cur.addEventListener('ended', onEnded);

        // If audio already enabled by a prior user gesture, unmute now
        if (audioEnabledRef.current) {
          try {
            cur.muted = false;
            try { cur.volume = 1.0; } catch (e) {}
          } catch (e) {}
        }
      };

      // Try to attach after a short delay to allow the active index to update
      setTimeout(checkEndedAttach, 400);
    }

    // User gesture handler: clicking/tapping the player enables audio for future plays and unmutes current video
    const gestureHandler = () => {
      if (!audioEnabledRef.current) {
        setAudioEnabled(true);
        audioEnabledRef.current = true;
        // unmute the active video and ensure the other is muted to avoid doubled audio
        try {
          const cur = videoRefs[active].current;
          const other = videoRefs[1 - active].current;
          if (cur) {
            cur.muted = false;
            try { cur.volume = 1.0; } catch (e) {}
            const p = cur.play(); if (p && p.catch) p.catch(() => {});
          }
          if (other) {
            other.muted = true;
          }
        } catch (e) {}
      }
    };
    window.addEventListener('click', gestureHandler);

    // BroadcastChannel and storage handling — respond to playAnswer and playAnswerSpoken
    if ('BroadcastChannel' in window) {
      ch = new BroadcastChannel('graham-player-channel');
      ch.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;

        if (data.type === 'playAnswer' && data.questionId) {
          const file = answerVideos[data.questionId] || fallbackAnswer;
          if (file) {
            playAnswerOnceBySrc(file);
            return;
          }
          console.log('Received playAnswer for', data.questionId, 'but no mapped answer file and no fallback available');
        }

        if (data.type === 'playAnswerSpoken' && data.text) {
          const text = (data.text || '').toLowerCase();
          // handle some common spoken queries
          if (text.includes('who are you') || text.includes("who're you") || text.includes("who r u")) {
            const file = answerVideos['important'] || fallbackAnswer;
            if (file) { playAnswerOnceBySrc(file); return; }
          }
          // If spoken text doesn't match a known topic, play the fallback response
          if (fallbackAnswer) {
            playAnswerOnceBySrc(fallbackAnswer);
          }
        }
      };
    } else {
      storageHandler = (ev) => {
        if (ev.key === 'graham-player-msg' && ev.newValue) {
          try {
            const data = JSON.parse(ev.newValue);
            if (!data) return;
            if (data.type === 'playAnswer' && data.questionId) {
              const file = answerVideos[data.questionId] || fallbackAnswer;
              if (file) playAnswerOnceBySrc(file);
            } else if (data.type === 'playAnswerSpoken' && data.text) {
              const text = (data.text || '').toLowerCase();
              if (text.includes('who are you') || text.includes("who're you") || text.includes("who r u")) {
                const file = answerVideos['important'] || fallbackAnswer;
                if (file) playAnswerOnceBySrc(file);
              } else if (fallbackAnswer) {
                playAnswerOnceBySrc(fallbackAnswer);
              }
            }
          } catch (e) {}
        }
      };
      window.addEventListener('storage', storageHandler);
    }

    return () => {
      mounted = false;
      rotationActiveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ch) ch.close && ch.close();
      if (storageHandler) window.removeEventListener('storage', storageHandler);
      window.removeEventListener('click', gestureHandler);
    };
  }, [active]);

  return (
    <div className="video-wrap" onClick={() => { /* clicking also enables audio via global listener */ }} style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
      {srcs[0] || srcs[1] ? (
        <>
          <video
            ref={videoRefs[0]}
            src={srcs[0]}
            preload="auto"
            playsInline
            muted={!(audioEnabled && active === 0)}
            style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
              transition: 'opacity 320ms ease',
              opacity: active === 0 ? 1 : 0,
              zIndex: active === 0 ? 2 : 1
            }}
          />

          <video
            ref={videoRefs[1]}
            src={srcs[1]}
            preload="auto"
            playsInline
            muted={!(audioEnabled && active === 1)}
            style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
              transition: 'opacity 320ms ease',
              opacity: active === 1 ? 1 : 0,
              zIndex: active === 1 ? 2 : 1
            }}
          />
         {/* Audio enable hint */}
         {!audioEnabled && (
           <div style={{position:'absolute',bottom:20,left:20,padding:'8px 12px',background:'rgba(0,0,0,0.6)',color:'#fff',borderRadius:6,fontSize:14}}>Tap to enable audio</div>
         )}
        </>
      ) : (
        <div style={{color:'#fff',padding:20}}>No video available — add idle and answer videos to src/assets/</div>
      )}
    </div>
  );
}
