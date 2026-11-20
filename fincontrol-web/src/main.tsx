import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Savey e dark-only agora. Garante que html.dark esta sempre presente
// pras utilities `dark:` continuarem funcionando enquanto migramos.
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
