import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { Provider } from "react-redux"
import { store } from './app/store.js'
import { Toaster } from "react-hot-toast"
import { AttendanceProvider } from './context/AttendanceContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AttendanceProvider>
        <Toaster containerStyle={{ zIndex: 99999 }} />
        <App />
      </AttendanceProvider>
    </Provider>
  </StrictMode>,
)
