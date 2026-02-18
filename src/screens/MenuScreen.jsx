import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MenuScreen.css';
import signatureBanner from '../assets/signature/EJG signature banner.png';

const leftQuestions = [
  { id: 'important', text: 'What are you remembered for?' },
  { id: 'job', text: 'What job did you have?' },
  { id: 'interests', text: 'What were your interests?' },
  { id: 'hierarchies', text: 'Describe the social hierarchies in New York in your time.' },
  { id: 'later_life', text: 'Tell me about your later life.' }
];

const rightQuestions = [
  { id: 'childhood', text: 'What was your childhood like?' },
  { id: 'family', text: 'Tell me about your own family.' },
  { id: 'court', text: 'Tell me about your court case.' },
  { id: 'education', text: 'Tell me the importance of education?' },
  { id: 'streetcar', text: 'Tell me about the streetcar incident.' }
];

// shared broadcast channel name
const CHANNEL_NAME = 'graham-player-channel';

export default function MenuScreen() {
  const navigate = useNavigate();
  const [playerWindow, setPlayerWindow] = useState(null);
  const [channel, setChannel] = useState(null);
  const [centerContent, setCenterContent] = useState(null);
  const [centerTopic, setCenterTopic] = useState(null);

  // Helper: highlight specific phrases (used for Family answers)
  function renderHighlighted(line) {
    // determine phrases to bold based on the current center topic (case-insensitive)
    let phrases = [];
    const lowerTopic = (centerTopic || '').toLowerCase();

    if (lowerTopic === 'family') {
      phrases = [
        'Thomas L. Jennings',
        'Elizabeth Jennings',
        'first Black American to hold a patent',
        'Charles Graham'
      ];
    } else if (lowerTopic === 'importance') {
      phrases = ['LRA (Legal Rights Association)', '1854 streetcar incident', 'wide attention'];
    } else if (lowerTopic === 'court case' || lowerTopic === 'courtcase') {
      phrases = ['ruled in her favor', 'right to ride', 'earliest successful legal challenges'];
    } else if (lowerTopic === 'job') {
      phrases = ['Teaching', 'church organist', 'African Free Schools'];
    } else if (lowerTopic === 'interests') {
      phrases = ['teaching', 'justice', 'equal rights', 'organ', 'church', 'civil rights'];
    } else if (lowerTopic.includes('social hier') || lowerTopic === 'hierarchies' || lowerTopic === 'social hierarches') {
      // accept 'Social Hierarchies', 'Social Hierarches', 'hierarchies', etc.
      phrases = ['De facto', 'school segregation', 'free state', 'Emancipation Act'];
    } else if (lowerTopic === 'childhood') {
      phrases = ['Literary circles', 'civil rights'];
    } else if (lowerTopic === 'education') {
      phrases = ['Early childhood education', 'accessible', 'Black and White benefactors'];
    }
    if (phrases.length === 0) return line;
     
     const lower = line.toLowerCase();
     let idx = 0;
     const nodes = [];

     while (idx < line.length) {
       // find earliest next phrase occurrence
       let nextPos = -1;
       let nextPhrase = null;
       for (const p of phrases) {
         const pos = lower.indexOf(p.toLowerCase(), idx);
         if (pos !== -1 && (nextPos === -1 || pos < nextPos)) {
           nextPos = pos;
           nextPhrase = p;
         }
       }

       if (nextPos === -1) {
         nodes.push(line.slice(idx));
         break;
       }

       if (nextPos > idx) {
         nodes.push(line.slice(idx, nextPos));
       }

       // push bolded match
       nodes.push(<strong key={idx + '-' + nextPos}>{line.substr(nextPos, nextPhrase.length)}</strong>);
       idx = nextPos + nextPhrase.length;
     }

     return nodes;
   }

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

    // Local UI: show detailed answer in center card for certain questions
    if (id === 'important') {
      setCenterContent([
        "Graham’s 1854 streetcar incident was the first case challenging public transportation to go to court.",
        "It received wide attention and helped win her lawsuit, desegregating that specific streetcar company.",
        "Graham’s streetcar incident led to the LRA (Legal Rights Association), which was one of the earliest civil rights groups organized in the U.S., formed after Graham's court case to fight against discrimination."
      ]);
      setCenterTopic('Importance');
    } else if (id === 'job') {
      setCenterContent([
        "I taught at the city’s African Free Schools and later helped operate schools for Black students.",
        "Teaching was one of the few professions open to Black women in the 1800s, and I used it to support and uplift my community.",
        "I also served as a church organist at my father’s congregation."
      ]);
      setCenterTopic('Job');
    } else if (id === 'life') {
      setCenterContent([
        'Segregation was common in schools, jobs, transportation, and housing.',
        'Black women faced both racial and gender discrimination, limiting their education and career options.',
        'New York City had an active Black community that organized for abolition, voting rights, and equal treatment.',
        'Daily life required resilience, community support, and determination to push back against discrimination.'
      ]);
      setCenterTopic('Life');
    } else if (id === 'family') {
      setCenterContent([
        'My parents were Thomas L. Jennings and Elizabeth Jennings, both leaders in New York’s Black community.',
        'My father was a successful tailor, abolitionist, and the first Black American to hold a patent.',
        'My family was involved in church leadership and anti-slavery organizing.',
        'I later married Charles Graham, and we had a son, though he tragically died young.'
      ]);
      setCenterTopic('Family');
    } else if (id === 'childhood') {
      setCenterContent([
        'Literary circles at a young age, strong public speaking and vocabulary skills acquired.',
        'Active in many community societies: Church-based organizing groups, Abolitionist circles, literary societies, etc.',
        'Surrounded by many famous leaders of civil rights (Frederick Douglass, Sojourner Truth, David Ruggles, and Henry Highland Garnet.)'
      ]);
      setCenterTopic('Childhood');
    } else if (id === 'interests') {
      setCenterContent([
        'I devoted my life to teaching and establishing schools for Black students.',
        'I was active in my church, where I played the organ and participated in community programs.',
        'I believed in justice and equal rights, which shaped my actions and my legacy.',
        'I supported efforts to expand literacy, moral instruction, and civil rights in New York City.'
      ]);
      setCenterTopic('Interests');
    } else if (id === 'hierarchies') {
      setCenterContent([
        'De facto (regardless of law) segregation: In housing, jobs and many aspects of daily life.',
        '1900: School segregation: Becomes illegal (one year before Graham’s death.)',
        'NY became a free state on July 4th, 1827, following the gradual Emancipation Act passed in 1799.',
        'Slavery remained legal in the Southern and border slave states, until 1865.'
      ]);
      setCenterTopic('Social Hierarches');
    } else if (id === 'education') {
      setCenterContent([
        'Early childhood education for Black students is now accessible.',
        'Operated under the support of Black and White benefactors including Jacob Riis, H. Cordelia Ray, and W.E.B. DuBois.'
      ]);
      setCenterTopic('Education');
    } else if (id === 'streetcar') {
      setCenterContent([
        'Private companies lacked government oversight and often refused Black people their right to ride, telling them to wait for the next public train car.',
        'All streetcars were subject to New York law even when operated by private companies.',
        'There was no exact New York statute in 1854 that explicitly prohibited race-based exclusion from streetcars, yet there was also no statute that expressly allowed such exclusion.'
      ]);
      setCenterTopic('Streetcar Incident');
    } else if (id === 'court') {
      setCenterContent([
        'The court ruled in her favor, awarding damages.',
        'The common carrier law protected Elizabeth Jennings Graham’s right to ride.',
        'One of the earliest successful legal challenges to segregated public transportation in the United States.',
        'Clarified that Black citizens had the legal right to ride public streetcars and black citizens could not legally be removed solely because of their race.'
      ]);
      setCenterTopic('Court Case');
     } else {
       // clear center content for other questions (keeps default instruction view)
       setCenterContent(null);
       setCenterTopic(null);
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
      // console.log({event});
      const text = event.results[0][0].transcript;
      // Basic mapping: try to find a question whose text includes some words from the transcript
      const allQuestions = [...leftQuestions, ...rightQuestions];
      // console.log({allQuestions});
      const lowered = text.toLowerCase();
      // Find the first question whose text words appear in the spoken text
      let matched = allQuestions.find(q => {
        console.log({q});
        const questionId = q.id.toLowerCase();
        // check any noun word appears
        //const tokens = t.split(/[^a-zA-Z0-9]+/).filter(Boolean);
        return text.includes(questionId);
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

  function resetCenter() {
    setCenterContent(null);
    setCenterTopic(null);
  }

  return (
    <div className="menu-screen">
      <header className="menu-header">
        <h1 className="title-script">
          <img src={signatureBanner} alt="Elizabeth Jennings Graham" className="title-script-img" />
        </h1>
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
            <div className={`instruction-card ${centerContent ? 'answered' : ''}`}>
              {centerContent ? (
                <div className="center-answer">
                  {/* Title with variable topic */}
                  <div className="center-title">{(centerTopic || '').toLowerCase() === 'education' ? 'Read More About Education Here' : `Read More About My ${centerTopic} Here`}</div>
                  <ul className="answer-list">
                    {centerContent.map((line, i) => (
                      <li key={i}>{renderHighlighted(line)}</li>
                    ))}
                  </ul>

                  <div className="card-actions">
                    <button className="back-btn" onClick={resetCenter}>← Back</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="instruction-title">Ask me a question! <strong className="mic" tabIndex={0} onClick={startRecognition}>🎤</strong></div>
                  <div className="instruction-sub">Choose a question or speak your own to hear about my story.</div>
                </>
              )}
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
