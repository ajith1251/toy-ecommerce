import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initGlobalErrorTracking } from './lib/errorTracking.ts'

// Catch errors outside React's boundary (uncaught exceptions, unhandled
// rejections) and route them through the error-tracking boundary.
initGlobalErrorTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
