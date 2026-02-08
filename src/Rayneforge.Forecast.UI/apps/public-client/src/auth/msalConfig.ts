import { Configuration, LogLevel, PopupRequest } from '@azure/msal-browser';

/**
 * MSAL configuration for Entra External ID (CIAM).
 *
 * In development, set VITE_AUTH_MODE=dev to bypass MSAL entirely
 * and use synthetic dev-header authentication instead.
 */

export const isDev = import.meta.env.VITE_AUTH_MODE === 'dev';

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_ENTRA_CLIENT_ID ?? '',
        authority: import.meta.env.VITE_ENTRA_AUTHORITY ?? '',
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: 'localStorage',
    },
    system: {
        loggerOptions: {
            logLevel: LogLevel.Warning,
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                }
            },
        },
    },
};

/**
 * Scopes requested during login.
 * Add API-specific scopes here once the backend app registration
 * exposes them (e.g. `api://{clientId}/access_as_user`).
 */
export const loginRequest: PopupRequest = {
    scopes: ['openid', 'profile', 'email'],
};
