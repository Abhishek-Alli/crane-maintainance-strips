import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Mouse wheel must not change the value of a focused number input (it should scroll the page instead)
document.addEventListener('wheel', () => {
  const el = document.activeElement;
  if (el && el.tagName === 'INPUT' && el.type === 'number') el.blur();
}, { passive: true });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter 
      future={{ 
        v7_relativeSplatPath: true, 
        v7_startTransition: true 
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);