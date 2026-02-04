import React, { useEffect, useRef, useState } from 'react';

// Import bundled idle assets (these files exist in the project)
import idle from '../assets/idle/idle.mp4';
import glanceDown from '../assets/idle/glance down.mp4';
import listening from '../assets/idle/listening.mp4';

// Import answer files
import whoAreYou from '../assets/answers/who_are_you.mp4';
import familyAns from '../assets/answers/family.mp4';
import interestsAns from '../assets/answers/interests.mp4';
import jobAns from '../assets/answers/job.mp4';
import lifeAns from '../assets/answers/life.mp4';

const idleVideos = [idle, glanceDown, listening].filter(Boolean);
const answerVideos = { who_are_you: whoAreYou, family: familyAns, interests: interestsAns, job: jobAns, life: lifeAns };

export default function PlayerWindow() {
  // two video elements for double-buffered playback
  const videoRefs = [useRef(null), useRef(null)];
  const [active, setActive] = useState(0); // which video is currently visible (0 or 1)
  const [srcs, setSrcs] = useState([
    idleVideos.length ? idleVideos[Math.floor(Math.random() * idleVideos.length)] : '',
    ''
  ]);
  const intervalRef = useRef(null);
  const rotationActiveRef = useRef(true);

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
      const inactive = 1 - active;

      // set the src on the inactive video element
      setSrcs((prev) => {
        const n = [...prev];
        n[inactive] = nextSrc;
        return n;
      });

      const inactiveEl = videoRefs[inactive].current;
      const activeEl = videoRefs[active].current;

      const onCanPlay = () => {
        try {
          if (!inactiveEl) return;
          inactiveEl.loop = !!opts.loop;
          inactiveEl.muted = opts.muted === undefined ? inactiveEl.muted : opts.muted;
          inactiveEl.playsInline = true;
          const p = inactiveEl.play();
          if (p && p.catch) p.catch(() => { /* autoplay blocked */ });
        } catch (e) {}

        // small timeout to ensure play has started before fade
        setTimeout(() => {
          setActive(inactive);

          // pause previous after fade completes
          setTimeout(() => {
            try { if (activeEl) { activeEl.pause(); } } catch (e) {}
          }, 360);
        }, 80);

        inactiveEl.removeEventListener('canplay', onCanPlay);
      };

      if (inactiveEl) {
        inactiveEl.addEventListener('canplay', onCanPlay);
        try { inactiveEl.load(); } catch (e) {}
        if (inactiveEl.readyState >= 3) onCanPlay();
      }
    }

    function playAnswerOnceBySrc(answerSrc) {
      if (!answerSrc) return;
      stopIdleRotation();
      crossfadeTo(answerSrc, { loop: false, muted: false });

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
      };

      // Try to attach after a short delay to allow the active index to update
      setTimeout(checkEndedAttach, 400);
    }

    // BroadcastChannel and storage handling — respond to playAnswer and playAnswerSpoken
    if ('BroadcastChannel' in window) {
      ch = new BroadcastChannel('graham-player-channel');
      ch.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;

        if (data.type === 'playAnswer' && data.questionId) {
          const file = answerVideos[data.questionId];
          if (file) {
            playAnswerOnceBySrc(file);
            return;
          }
          console.log('Received playAnswer for', data.questionId, 'but no mapped answer file');
        }

        if (data.type === 'playAnswerSpoken' && data.text) {
          const text = (data.text || '').toLowerCase();
          if (text.includes('who are you') || text.includes("who're you") || text.includes("who r u")) {
            if (whoAreYou) playAnswerOnceBySrc(whoAreYou);
            return;
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
              const file = answerVideos[data.questionId];
              if (file) playAnswerOnceBySrc(file);
            }
            if (data.type === 'playAnswerSpoken' && data.text) {
              const text = (data.text || '').toLowerCase();
              if (text.includes('who are you')) {
                if (whoAreYou) playAnswerOnceBySrc(whoAreYou);
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
    };
  }, [active]);

  return (
    <div className="video-wrap" style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
      {srcs[0] || srcs[1] ? (
        <>
          <video
            ref={videoRefs[0]}
            src={srcs[0]}
            preload="auto"
            playsInline
            muted={true}
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
            muted={true}
            style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
              transition: 'opacity 320ms ease',
              opacity: active === 1 ? 1 : 0,
              zIndex: active === 1 ? 2 : 1
            }}
          />
        </>
      ) : (
        <div style={{color:'#fff',padding:20}}>No video available — add idle and answer videos to src/assets/</div>
      )}
    </div>
  );
}
