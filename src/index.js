import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Components
export { default as Message } from './components/Message';
export { default as ChatContainer } from './components/ChatContainer';
export { default as Header } from './components/Header';
export { default as InputArea } from './components/InputArea';
export { default as TypingIndicator } from './components/TypingIndicator';

// Hooks
export { default as useChatbotLogic } from './hooks/useChatbotLogic';

// Services
export { getChatbotResponse } from './services/chatbotService';

// Styles
export { default as AppCSS } from './App.css';
export { default as IndexCSS } from './index.css';

// Main App Component
export { default as App } from './App';
