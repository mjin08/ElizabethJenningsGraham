import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MenuScreen.css';

const leftQuestions = [
  { id: 'important', text: 'Why are you important? What are you remembered for?' },
  { id: 'job', text: 'What job did you have?' },
  { id: 'life', text: 'What was your life like in your times?' },
  { id: 'family', text: 'Tell me about your family.' },
  { id: 'interests', text: 'What were your interests?' }
];

const rightQuestions = [
  { id: 'legacy', text: 'What is your legacy?' },
  { id: 'court', text: 'Tell me about your court case.' },
  { id: 'impact', text: 'How did your experience impact civil rights?' },
  { id: 'civic', text: 'What civic role did Black Americans play in your times?' },
  { id: 'suffrage', text: "Were you an advocate for Women's Suffrage?" }
];

// shared broadcast channel name
const CHANNEL_NAME = 'graham-player-channel';

export default function MenuScreen() {
  const navigate = useNavigate();
  const [playerWindow, setPlayerWindow] = useState(null);
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    // create a BroadcastChannel for sending messages even if player opened separately
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      setChannel(ch);
      return () => ch.close();
    }
    return undefined;
  }, []);

  function openPlayerWindow() {
    // open a new tab pointing to /player; try to reuse existing name
    const w = window.open('/player', 'graham-player');
    if (w) {
      setPlayerWindow(w);
      // focus the player tab
      try { w.focus(); } catch (e) { /* ignore */ }
      // send an initial ping to tell player to start idle
      if (channel) channel.postMessage({ type: 'ping' });
    } else {
      alert('Popup blocked. Please allow popups for this site or open the /player route in a separate tab.');
    }
  }

  function askQuestion(id) {
    // broadcast the selected question to the player window
    const payload = { type: 'playAnswer', questionId: id };
    if (channel) {
      channel.postMessage(payload);
    } else {
      // fallback: try using localStorage event
      try {
        localStorage.setItem('graham-player-msg', JSON.stringify(payload));
        // remove to avoid clutter
        localStorage.removeItem('graham-player-msg');
      } catch (e) {
        console.error('Failed to send message to player', e);
      }
    }
  }

  // Simple speech recognition starter for the microphone button
  function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      // Basic mapping: try to find a question whose text includes some words from the transcript
      const allQuestions = [...leftQuestions, ...rightQuestions];
      const lowered = text.toLowerCase();
      // Find the first question whose text words appear in the spoken text
      let matched = allQuestions.find(q => {
        const t = q.text.toLowerCase();
        // check any noun word appears
        const tokens = t.split(/[^a-zA-Z0-9]+/).filter(Boolean);
        return tokens.some(tok => lowered.includes(tok) && tok.length > 3);
      });

      if (matched) {
        askQuestion(matched.id);
      } else {
        // broadcast free-form speech for the player (player can decide behavior)
        const payload = { type: 'playAnswerSpoken', text };
        if (channel) channel.postMessage(payload);
        else {
          localStorage.setItem('graham-player-msg', JSON.stringify(payload));
          localStorage.removeItem('graham-player-msg');
        }
      }
    };

    recognition.onerror = (e) => {
      console.error('Recognition error', e);
      alert('Speech recognition error: ' + (e.error || 'unknown'));
    };

    recognition.start();
  }

  return (
    <div className="menu-screen">
      <header className="menu-header">
        <h1 className="title-script">Elizabeth Jennings Graham</h1>
      </header>

      <main>
        <div className="columns">
          <div className="col left-col">
            {leftQuestions.map(q => (
              <button
                key={q.id}
                className="chat-bubble user-bubble"
                onClick={() => askQuestion(q.id)}
                aria-label={q.text}
              >
                {q.text}
              </button>
            ))}
          </div>

          <div className="col center-col">
            <div className="instruction-card">
              <div className="instruction-title">Ask me a question! <strong className="mic" tabIndex={0} onClick={startRecognition}>🎤</strong></div>
              <div className="instruction-sub">Choose a question or speak your own to hear about my story.</div>
              <div style={{marginTop:12}}>
                <button className="open-player-btn" onClick={openPlayerWindow}>Open Player Window</button>
              </div>
            </div>
          </div>

          <div className="col right-col">
            {rightQuestions.map(q => (
              <button
                key={q.id}
                className="chat-bubble user-bubble"
                onClick={() => askQuestion(q.id)}
                aria-label={q.text}
              >
                {q.text}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
