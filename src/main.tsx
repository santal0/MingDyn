import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserApp } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserApp />
  </StrictMode>,
)
