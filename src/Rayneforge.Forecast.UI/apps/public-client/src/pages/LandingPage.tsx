import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

/**
 * Public landing page shown to unauthenticated visitors.
 * Authenticated users are redirected straight to /home.
 */
export default function LandingPage() {
    const { isAuthenticated, login, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/home', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (isLoading) {
        return <div className="rf-loading">Loading…</div>;
    }

    return (
        <div className="rf-landing">
            <div className="rf-landing__hero">
                <h1 className="rf-landing__title">Rayneforge Forecast</h1>
                <p className="rf-landing__subtitle">
                    AI-powered news intelligence — surface narratives, track
                    entities, and explore the stories that shape tomorrow.
                </p>
                <button className="rf-landing__cta" onClick={login}>
                    Sign In
                </button>
            </div>
        </div>
    );
}
