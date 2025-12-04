import React, { useEffect, useRef, useState } from 'react';

// Import bundled idle assets (these files exist in the project)
import idle1 from '../assets/idle/idle1.mp4';
import idle2 from '../assets/idle/idle2.mp4';
import idle3 from '../assets/idle/idle3.mp4';
import idle4 from '../assets/idle/idle4.mp4';

// Import only the answer file that was uploaded
import whoAreYou from '../assets/answers/who_are_you.mp4';

const idleVideos = [idle1, idle2, idle3, idle4].filter(Boolean);

export default function PlayerWindow() {
  const videoRef = useRef(null);
  const [src, setSrc] = useState(idleVideos.length ? idleVideos[Math.floor(Math.random() * idleVideos.length)] : '');
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    function startIdleRotation() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!idleVideos.length) return;
      intervalRef.current = setInterval(() => {
        if (!mounted) return;
        const next = idleVideos[Math.floor(Math.random() * idleVideos.length)];
        setSrc(next);
      }, 7000);
    }

    function stopIdleRotation() {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    // start rotation
    startIdleRotation();

    // Listen for broadcast messages to play answer
    let ch;
    if ('BroadcastChannel' in window) {
      ch = new BroadcastChannel('graham-player-channel');
      ch.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;

        if (data.type === 'playAnswer' && data.questionId) {
          // Only play if we have a file for that questionId; otherwise ignore
          // Currently, only `who_are_you` is available for spoken queries; click-based questionIds are not mapped here.
          // If you later upload answer files named to match question ids, add them here.
          console.log('Received playAnswer for', data.questionId);
          // No mapped click-answer files are present; ignore unknown IDs.
        }

        if (data.type === 'playAnswerSpoken' && data.text) {
          const text = (data.text || '').toLowerCase();
          if (text.includes('who are you') || text.includes("who're you") || text.includes("who r u")) {
            if (whoAreYou) playAnswerOnce(whoAreYou);
            return;
          }
          // fallback: no semantic matching implemented here
        }

        if (data.type === 'ping') {
          // no-op: ensure player is awake
        }
      };
    } else {
      // fallback: listen to storage events
      const storageHandler = (ev) => {
        if (ev.key === 'graham-player-msg' && ev.newValue) {
          try {
            const data = JSON.parse(ev.newValue);
            if (data.type === 'playAnswerSpoken' && data.text) {
              const text = (data.text || '').toLowerCase();
              if (text.includes('who are you')) {
                if (whoAreYou) playAnswerOnce(whoAreYou);
              }
            }
          } catch (e) {}
        }
      };
      window.addEventListener('storage', storageHandler);
    }

    function playAnswerOnce(answerSrc) {
      if (!answerSrc) return;
      stopIdleRotation();

      // set to answer and ensure it plays once (no loop)
      setSrc(answerSrc);

      // attach ended handler
      const onEnded = () => {
        // resume idle rotation after short delay
        setTimeout(() => {
          if (!mounted) return;
          const next = idleVideos.length ? idleVideos[Math.floor(Math.random() * idleVideos.length)] : '';
          setSrc(next);
          startIdleRotation();
        }, 800);

        if (videoRef.current) videoRef.current.removeEventListener('ended', onEnded);
      };

      // ensure handler is attached when video element updates
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.loop = false;
          videoRef.current.addEventListener('ended', onEnded);
          const p = videoRef.current.play();
          if (p && p.catch) p.catch(() => { /* autoplay blocked */ });
        }
      }, 200);
    }

    return () => { mounted = false; if (intervalRef.current) clearInterval(intervalRef.current); if (ch) ch.close(); };
  }, []);

  return (
    <div className="video-wrap" style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {src ? (
        <video src={src} autoPlay muted={false} ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} />
      ) : (
        <div style={{color:'#fff',padding:20}}>No video available — add idle and answer videos to src/assets/</div>
      )}
    </div>
  );
}
