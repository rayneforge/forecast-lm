import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Badge, Button, FeatureCard } from '@rayneforge/ui';
import './landing-page.scss';

const FEATURES = [
    {
        icon: '◈',
        title: 'Narrative Intelligence',
        description:
            'Automatically surface emerging narratives from thousands of sources. See the story behind the stories.',
    },
    {
        icon: '⬡',
        title: 'Entity Tracking',
        description:
            'Follow people, organizations, and concepts across the news cycle with persistent, linked profiles.',
    },
    {
        icon: '◉',
        title: 'Spatial Canvas',
        description:
            'Arrange, connect, and annotate articles on a freeform workspace — think Figma for news research.',
    },
    {
        icon: '△',
        title: 'Claim Analysis',
        description:
            'Extract and cross-reference claims across sources to separate signal from noise.',
    },
] as const;

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
            {/* ── Ambient background glow ── */}
            <div className="rf-landing__glow" aria-hidden />

            {/* ── Hero ── */}
            <header className="rf-landing__hero">
                <Badge label="AI-Powered News Intelligence" />
                <h1 className="rf-landing__title">
                    Forecast
                </h1>
                <p className="rf-landing__subtitle">
                    Surface narratives, track entities, and explore the forces
                    shaping tomorrow — all on a spatial research canvas.
                </p>
                <div className="rf-landing__actions">
                    <Button size="lg" onClick={login}>
                        Get Started
                    </Button>
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Learn More
                    </Button>
                </div>
            </header>

            {/* ── Features ── */}
            <section id="features" className="rf-landing__features">
                <h2 className="rf-landing__section-title">How it works</h2>
                <div className="rf-landing__grid">
                    {FEATURES.map((f) => (
                        <FeatureCard
                            key={f.title}
                            icon={f.icon}
                            title={f.title}
                            description={f.description}
                        />
                    ))}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="rf-landing__footer">
                <p>&copy; {new Date().getFullYear()} Forecast</p>
            </footer>
        </div>
    );
}
