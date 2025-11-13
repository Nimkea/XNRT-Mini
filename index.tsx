import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Buffer } from "buffer";

// FIX: Augment the Window interface to include the Buffer property for the polyfill.
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

// Polyfill Buffer for the browser environment
window.Buffer = Buffer;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);