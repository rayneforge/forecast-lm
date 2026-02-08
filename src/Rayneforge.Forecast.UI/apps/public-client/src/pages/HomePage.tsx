import React, { useEffect, useState, useMemo } from 'react';
import { NewsClient, NewsArticle } from '@rayneforge/logic';
import {
    TopBar,
    LensPanel,
    PinnedBoard,
    NewsCard,
    PinnedItemProps,
    FloatingSearchBar,
} from '@rayneforge/ui';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

// Vite exposes env vars on import.meta.env
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function HomePage() {
    const navigate = useNavigate();
    const { getAuthHeaders, logout, user } = useAuth();
    const client = useMemo(
        () => new NewsClient(apiBaseUrl, getAuthHeaders),
        [getAuthHeaders],
    );
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLensOpen, setLensOpen] = useState(true);

    const loadLatest = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await client.getNews();
            setArticles(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) return loadLatest();

        setLoading(true);
        setError(null);
        try {
            const data = await client.searchNews(query, 'hybrid');
            setArticles(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLatest();
    }, []);

    const pinnedItems: { group?: string; item: PinnedItemProps }[] = [];

    return (
        <>
            <TopBar showSearch={false}>
                <button
                    onClick={() => navigate('/workspace')}
                    style={{
                        background: '#00D2FF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 16px',
                        color: '#0B0E14',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginRight: '12px'
                    }}
                >
                    Open Newsspace ↗
                </button>
            </TopBar>

            <main className="rf-layout">
                <LensPanel
                    isOpen={isLensOpen}
                    onToggle={() => setLensOpen(!isLensOpen)}
                    filters={[
                        {
                            title: 'Sources',
                            type: 'checkbox',
                            options: [
                                { label: 'Reuters', count: 12 },
                                { label: 'Bloomberg', count: 8 },
                            ],
                        },
                    ]}
                />

                <section className="rf-feed">
                    {loading && <div className="rf-loading">Loading...</div>}
                    {error && <div className="rf-error">{error}</div>}

                    {!loading && !error && (
                        <div className="rf-feed__grid">
                            {articles.map(article => (
                                <NewsCard key={article.url} article={article} />
                            ))}
                        </div>
                    )}
                </section>

                <FloatingSearchBar onSearch={handleSearch} />

                <PinnedBoard items={pinnedItems} />
            </main>
        </>
    );
}
