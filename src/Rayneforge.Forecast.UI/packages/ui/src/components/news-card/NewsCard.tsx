import React from 'react';
import { NewsArticle } from '@rayneforge/logic';
import './news-card.scss';

export interface NewsCardProps {
    article: NewsArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
    const renderDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <article className="rf-news-card">
            {article.imageUrl && (
                <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="rf-news-card__image" 
                    loading="lazy" 
                />
            )}
            <div className="rf-news-card__content">
                <div className="rf-news-card__meta">
                    <span>{article.source.name}</span>
                    <span>{renderDate(article.publishedAt)}</span>
                </div>
                <h3 className="rf-news-card__title">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                        {article.title}
                    </a>
                </h3>
                {article.description && (
                    <p className="rf-news-card__description">{article.description}</p>
                )}
            </div>
        </article>
    );
};
