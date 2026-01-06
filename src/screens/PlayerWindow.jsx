import React, { useEffect, useRef, useState } from 'react';

// Import bundled idle assets (these files exist in the project)
import idle1 from '../assets/idle/idle1.mp4';
import idle2 from '../assets/idle/idle2.mp4';
import idle3 from '../assets/idle/idle3.mp4';
import idle4 from '../assets/idle/idle4.mp4';
import idle5 from '../assets/idle/idle5.mp4';
import glanceDown from '../assets/idle/glance down.mp4';
import listening from '../assets/idle/listening.mp4';

// Import only the answer file that was uploaded
import whoAreYou from '../assets/answers/who_are_you.mp4';
import familyAns from '../assets/answers/family.mp4';
import interestsAns from '../assets/answers/interests.mp4';
import jobAns from '../assets/answers/job.mp4';
import lifeAns from '../assets/answers/life.mp4';

const idleVideos = [idle1, idle2, idle3, idle4, idle5, glanceDown, listening].filter(Boolean);

// map question ids to answer files when available
const answerVideos = {
  who_are_you: whoAreYou,
  family: familyAns,
  interests: interestsAns,
  job: jobAns,
  life: lifeAns
};

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
    let storageHandler = null;
    if ('BroadcastChannel' in window) {
      ch = new BroadcastChannel('graham-player-channel');
      ch.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;

        if (data.type === 'playAnswer' && data.questionId) {
          const qid = data.questionId;
          const file = answerVideos[qid];
          if (file) {
            playAnswerOnce(file);
            return;
          }
          console.log('Received playAnswer for', qid, 'but no mapped answer file');
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
      storageHandler = (ev) => {
        if (ev.key === 'graham-player-msg' && ev.newValue) {
          try {
            const data = JSON.parse(ev.newValue);
            if (!data) return;
            if (data.type === 'playAnswer' && data.questionId) {
              const file = answerVideos[data.questionId];
              if (file) playAnswerOnce(file);
            }
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

    return () => { mounted = false; if (intervalRef.current) clearInterval(intervalRef.current); if (ch) ch.close(); if (storageHandler) window.removeEventListener('storage', storageHandler); };
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
