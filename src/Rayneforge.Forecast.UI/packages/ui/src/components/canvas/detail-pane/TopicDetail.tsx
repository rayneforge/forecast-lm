import React, { useMemo } from 'react';
import { ArticleNode, CanvasNode } from '../../../canvas/CanvasTypes';
import { ArticleTopic } from '@rayneforge/logic';
import { Chip } from '../../chip/Chip';

export interface TopicDetailProps {
    /** The topic being viewed */
    topicId: string;
    /** All canvas nodes — used to find articles sharing this topic */
    nodes: CanvasNode[];
    /** Navigate to an article detail */
    onSelectNode: (id: string) => void;
}

const renderDate = (d: string) => {
    try {
        return new Date(d).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    } catch { return d; }
};

export const TopicDetail: React.FC<TopicDetailProps> = ({
    topicId, nodes, onSelectNode,
}) => {
    // Find all articles that carry this topic
    const { topic, articles } = useMemo(() => {
        let matchedTopic: ArticleTopic | undefined;
        const matched: ArticleNode[] = [];

        for (const n of nodes) {
            if (n.type !== 'article') continue;
            const art = n as ArticleNode;
            const t = art.data.topics?.find(t => t.id === topicId);
            if (t) {
                matched.push(art);
                if (!matchedTopic) matchedTopic = t;
            }
        }

        // Sort newest first
        matched.sort((a, b) =>
            new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime(),
        );

        return {
            topic: matchedTopic ?? { id: topicId, label: topicId },
            articles: matched,
        };
    }, [topicId, nodes]);

    return (
        <>
            <div className="rf-detail-pane__topic-header">
                <Chip label={topic.label} variant="topic" />
                {topic.confidence != null && (
                    <span className="rf-detail-pane__topic-confidence">
                        {Math.round(topic.confidence * 100)}% relevance
                    </span>
                )}
            </div>

            <p className="rf-detail-pane__description">
                {articles.length} article{articles.length !== 1 ? 's' : ''} tagged with this topic.
            </p>

            {/* ── Article list ─────────────────── */}
            <div className="rf-detail-pane__section">
                <div className="rf-detail-pane__section-label">
                    Articles ({articles.length})
                </div>
                {articles.map(art => (
                    <div
                        key={art.id}
                        className="rf-detail-pane__relation"
                        onClick={() => onSelectNode(art.id)}
                    >
                        {art.data.imageUrl && (
                            <div
                                className="rf-detail-pane__relation__thumb"
                                style={{ backgroundImage: `url(${art.data.imageUrl})` }}
                            />
                        )}
                        <div className="rf-detail-pane__relation__content">
                            <div className="rf-detail-pane__relation__name">
                                {art.data.title}
                            </div>
                            <div className="rf-detail-pane__relation__sub">
                                {art.data.source.name} · {renderDate(art.data.publishedAt)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};
