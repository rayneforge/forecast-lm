import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Route guard that ensures the user is authenticated before
 * rendering children.
 *
 * - While MSAL is processing (redirect in-flight), shows a loader.
 * - If unauthenticated, triggers loginRedirect.
 * - Otherwise renders the protected content.
 */
export default function RequireAuth({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading, login } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="rf-loading">Authenticating…</div>;
    }

    if (!isAuthenticated) {
        // Trigger the redirect flow — the user will return to this
        // location after signing in thanks to the redirectUri config.
        login();
        return <div className="rf-loading">Redirecting to sign-in…</div>;
    }

    return <>{children}</>;
}
