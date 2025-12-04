import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MenuScreen from './screens/MenuScreen';
import AvatarScreen from './screens/AvatarScreen';
import PlayerWindow from './screens/PlayerWindow';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuScreen />} />
        <Route path="/avatar" element={<AvatarScreen />} />
        <Route path="/player" element={<PlayerWindow />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
