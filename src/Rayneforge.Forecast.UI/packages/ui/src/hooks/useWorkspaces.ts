import { useState, useEffect, useCallback } from 'react';
import type {
    Workspace,
    WorkspaceLink,
    NewsClient,
    CreateWorkspaceRequest,
    AddLinkRequest,
} from '@rayneforge/logic';

export interface UseWorkspacesOptions {
    client: NewsClient;
}

export interface UseWorkspacesResult {
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    isLoading: boolean;
    error: string | null;

    /** Load all workspaces for the current user */
    refresh: () => Promise<void>;
    /** Select and load a workspace with its links & threads */
    selectWorkspace: (id: string) => Promise<void>;
    /** Create a new workspace and refresh the list */
    createWorkspace: (request: CreateWorkspaceRequest) => Promise<Workspace>;
    /** Delete a workspace */
    deleteWorkspace: (id: string) => Promise<void>;
    /** Link an item to the active workspace */
    addLink: (request: AddLinkRequest) => Promise<WorkspaceLink>;
    /** Remove a link from the active workspace */
    removeLink: (linkId: string) => Promise<void>;
}

export function useWorkspaces({ client }: UseWorkspacesOptions): UseWorkspacesResult {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await client.getWorkspaces();
            setWorkspaces(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    const selectWorkspace = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const ws = await client.getWorkspace(id);
            setActiveWorkspace(ws);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    const createWorkspace = useCallback(async (request: CreateWorkspaceRequest) => {
        const ws = await client.createWorkspace(request);
        await refresh();
        return ws;
    }, [client, refresh]);

    const deleteWorkspace = useCallback(async (id: string) => {
        await client.deleteWorkspace(id);
        if (activeWorkspace?.id === id) setActiveWorkspace(null);
        await refresh();
    }, [client, activeWorkspace, refresh]);

    const addLink = useCallback(async (request: AddLinkRequest) => {
        if (!activeWorkspace) throw new Error('No active workspace');
        const link = await client.addWorkspaceLink(activeWorkspace.id, request);
        // Refresh active workspace to get updated links
        await selectWorkspace(activeWorkspace.id);
        return link;
    }, [client, activeWorkspace, selectWorkspace]);

    const removeLink = useCallback(async (linkId: string) => {
        if (!activeWorkspace) throw new Error('No active workspace');
        await client.removeWorkspaceLink(activeWorkspace.id, linkId);
        await selectWorkspace(activeWorkspace.id);
    }, [client, activeWorkspace, selectWorkspace]);

    useEffect(() => { refresh(); }, [refresh]);

    return {
        workspaces,
        activeWorkspace,
        isLoading,
        error,
        refresh,
        selectWorkspace,
        createWorkspace,
        deleteWorkspace,
        addLink,
        removeLink,
    };
}
