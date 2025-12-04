import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AvatarScreen.css';

const idleVideos = [
  '/assets/idle/idle1.mp4',
  '/assets/idle/idle2.mp4',
  '/assets/idle/idle3.mp4',
  '/assets/idle/idle4.mp4'
];

const answerVideos = {
  important: '/assets/answers/why-important.mp4',
  job: '/assets/answers/job.mp4',
  life: '/assets/answers/life.mp4',
  family: '/assets/answers/family.mp4',
  interests: '/assets/answers/interests.mp4',
  legacy: '/assets/answers/legacy.mp4',
  court: '/assets/answers/court.mp4',
  impact: '/assets/answers/impact.mp4',
  civic: '/assets/answers/civic.mp4',
  suffrage: '/assets/answers/suffrage.mp4'
};

export default function AvatarScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [isAnswerPlaying, setIsAnswerPlaying] = useState(false);

  const questionId = location.state?.questionId;

  useEffect(() => {
    // Pick a random idle video on mount
    const pickIdle = () => idleVideos[Math.floor(Math.random() * idleVideos.length)];
    setCurrentSrc(pickIdle());
    setIsAnswerPlaying(false);
  }, []);

  useEffect(() => {
    if (!questionId) return;

    // When a question is present, play the answer video
    const answer = answerVideos[questionId];
    if (!answer) {
      console.warn('No answer video for', questionId);
      return;
    }

    setCurrentSrc(answer);
    setIsAnswerPlaying(true);
  }, [questionId]);

  function handleEnded() {
    if (isAnswerPlaying) {
      // After the answer finishes, return to a random idle loop
      const randomIdle = idleVideos[Math.floor(Math.random() * idleVideos.length)];
      setCurrentSrc(randomIdle);
      setIsAnswerPlaying(false);

      // Optionally navigate back to menu after a delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      // idle loop: pick another idle and continue
      const randomIdle = idleVideos[Math.floor(Math.random() * idleVideos.length)];
      setCurrentSrc(randomIdle);
    }
  }

  return (
    <div className="avatar-screen">
      <div className="video-container">
        {currentSrc ? (
          <video
            ref={videoRef}
            key={currentSrc}
            src={currentSrc}
            autoPlay
            playsInline
            onEnded={handleEnded}
            muted={false}
            loop={!isAnswerPlaying}
            controls={false}
            className="avatar-video"
          />
        ) : (
          <div className="loading">Loading...</div>
        )}
      </div>
    </div>
  );
}
