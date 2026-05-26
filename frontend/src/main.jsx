import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Determine API base URL dynamically: use Vite dev proxy in development, default Render URL in production
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const apiBaseUrl = import.meta.env.VITE_API_URL || (isLocalhost ? '' : 'https://ai-financial-advisor-api.onrender.com');

axios.defaults.baseURL = apiBaseUrl.replace(/\/+$/, '');
axios.defaults.timeout = 20000;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
