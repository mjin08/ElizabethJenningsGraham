import React from 'react';
import './QuestionButton.css';

export default function QuestionButton({ text, onClick }) {
  return (
    <button className="question-button" onClick={onClick}>
      {text}
    </button>
  );
}
