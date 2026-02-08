import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './auth';

// Lazy-load pages so the initial bundle stays small
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));

function App() {
    return (
        <BrowserRouter>
            <div className="rf-app">
                <Suspense fallback={<div className="rf-loading">Loading...</div>}>
                    <Routes>
                        {/* Public */}
                        <Route path="/" element={<LandingPage />} />

                        {/* Protected */}
                        <Route
                            path="/home"
                            element={
                                <RequireAuth>
                                    <HomePage />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/workspace"
                            element={
                                <RequireAuth>
                                    <WorkspacePage />
                                </RequireAuth>
                            }
                        />
                    </Routes>
                </Suspense>
            </div>
        </BrowserRouter>
    );
}

export default App;
