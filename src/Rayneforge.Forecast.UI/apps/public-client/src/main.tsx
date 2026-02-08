import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, initializeAuth } from './auth';
import './style.scss';

initializeAuth().then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <AuthProvider>
                <App />
            </AuthProvider>
        </React.StrictMode>,
    );
});
