import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA functionality
import { registerSW } from 'virtual:pwa-register'

// Register the service worker
registerSW({ 
  immediate: true,
  onNeedRefresh() {
    // You can add custom logic here if you want to prompt users to refresh
    console.log('New content available, please refresh.')
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
