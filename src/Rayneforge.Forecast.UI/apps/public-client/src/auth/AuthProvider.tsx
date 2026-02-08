import React, {
    createContext,
    useContext,
    useMemo,
    useCallback,
    ReactNode,
} from 'react';
import {
    PublicClientApplication,
    InteractionStatus,
    EventType,
    AuthenticationResult,
} from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, loginRequest, isDev } from './msalConfig';

// ─── Auth context shape ─────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    roles: string[];
}

export interface AuthContextValue {
    isAuthenticated: boolean;
    user: AuthUser | null;
    login: () => void;
    logout: () => void;
    getAuthHeaders: () => Promise<Record<string, string>>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}

// ─── Dev-mode provider (no MSAL, synthetic user) ────────────────

function DevAuthProvider({ children }: { children: ReactNode }) {
    const value = useMemo<AuthContextValue>(
        () => ({
            isAuthenticated: true,
            user: {
                id: 'dev-user',
                name: 'Dev User',
                email: 'dev@localhost',
                roles: ['user', 'admin'],
            },
            login: () => {},
            logout: () => {},
            getAuthHeaders: async () => ({
                'X-Dev-User': 'dev@localhost',
                'X-Dev-Roles': 'user,admin',
            }),
            isLoading: false,
        }),
        [],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

// ─── MSAL inner provider (uses MSAL hooks) ──────────────────────

function MsalAuthInner({ children }: { children: ReactNode }) {
    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const account = accounts[0] ?? null;

    const user = useMemo<AuthUser | null>(() => {
        if (!account) return null;
        return {
            id: account.localAccountId,
            name: account.name ?? account.username,
            email: account.username,
            roles:
                (account.idTokenClaims?.roles as string[] | undefined) ?? [
                    'user',
                ],
        };
    }, [account]);

    const login = useCallback(() => {
        instance.loginRedirect(loginRequest);
    }, [instance]);

    const logout = useCallback(() => {
        instance.logoutRedirect();
    }, [instance]);

    const getAuthHeaders = useCallback(async (): Promise<
        Record<string, string>
    > => {
        if (!account) return {};
        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account,
            });
            return { Authorization: `Bearer ${response.accessToken}` };
        } catch {
            // Silent acquisition failed — trigger interactive login
            instance.loginRedirect(loginRequest);
            return {};
        }
    }, [instance, account]);

    const value = useMemo<AuthContextValue>(
        () => ({
            isAuthenticated,
            user,
            login,
            logout,
            getAuthHeaders,
            isLoading: inProgress !== InteractionStatus.None,
        }),
        [isAuthenticated, user, login, logout, getAuthHeaders, inProgress],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

// ─── MSAL instance (singleton, created once at module scope) ────

let msalInstance: PublicClientApplication | null = null;

/**
 * Must be called before rendering the React tree (in main.tsx).
 * Initialises the MSAL PublicClientApplication and handles any
 * pending redirect promise.
 */
export async function initializeAuth(): Promise<void> {
    if (isDev) return; // nothing to initialize in dev mode

    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();

    // Complete the redirect flow if returning from Entra
    const response = await msalInstance.handleRedirectPromise();
    if (response?.account) {
        msalInstance.setActiveAccount(response.account);
    }

    // Keep the active account in sync across tabs / token refreshes
    msalInstance.addEventCallback((event) => {
        if (
            event.eventType === EventType.LOGIN_SUCCESS &&
            (event.payload as AuthenticationResult)?.account
        ) {
            msalInstance!.setActiveAccount(
                (event.payload as AuthenticationResult).account,
            );
        }
    });
}

// ─── Public wrapper ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    if (isDev) {
        return <DevAuthProvider>{children}</DevAuthProvider>;
    }

    return (
        <MsalProvider instance={msalInstance!}>
            <MsalAuthInner>{children}</MsalAuthInner>
        </MsalProvider>
    );
}
