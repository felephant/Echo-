import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const startApp = () => {
  const rootElement = document.getElementById('root');

  // Safety check: ensure the root element exists in the DOM
  if (!rootElement) {
    console.warn("Root element 'root' not found. App initialization aborted.");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Check if the DOM is already ready (interactive or complete)
// If so, mount immediately. Otherwise, wait for the event.
if (document.readyState !== 'loading') {
  startApp();
} else {
  document.addEventListener('DOMContentLoaded', startApp);
}