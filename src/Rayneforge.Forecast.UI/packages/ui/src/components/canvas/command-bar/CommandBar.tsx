import React, { useState, useCallback, useRef, useEffect } from 'react';
import './command-bar.scss';

// ─── Types ──────────────────────────────────────────────────────

export interface Attachment {
    id: string;
    type: 'article' | 'narrative' | 'claim' | 'entity';
    label: string;
    icon: string;
}

export interface CommandBarProps {
    onSend?: (text: string, attachments: Attachment[]) => void;
}

interface Suggestion {
    type: 'article' | 'narrative' | 'claim' | 'entity';
    label: string;
    icon: string;
}

// Demo suggestions – will be replaced with real search results
const DEMO_SUGGESTIONS: Suggestion[] = [
    { type: 'article',   icon: '📰', label: 'Rising tensions in Eastern Europe' },
    { type: 'narrative', icon: '📖', label: 'NATO expansion influence' },
    { type: 'entity',    icon: '🏷', label: 'Ukraine' },
    { type: 'claim',     icon: '💬', label: 'Ceasefire negotiations stalled' },
    { type: 'article',   icon: '📰', label: 'Global supply chain disruptions' },
    { type: 'entity',    icon: '🏷', label: 'European Union' },
];

// ─── Component ──────────────────────────────────────────────────

export const CommandBar: React.FC<CommandBarProps> = ({ onSend }) => {
    const [value, setValue] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showFlyover, setShowFlyover] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const timerRef = useRef<number>(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const hasContent = value.trim().length > 0 || attachments.length > 0;

    // ── Debounced flyover on type ──
    useEffect(() => {
        if (timerRef.current) window.clearTimeout(timerRef.current);

        if (value.trim().length > 0) {
            timerRef.current = window.setTimeout(() => {
                const q = value.toLowerCase();
                const matches = DEMO_SUGGESTIONS.filter(
                    s => s.label.toLowerCase().includes(q) || s.type.includes(q),
                );
                setSuggestions(matches.length > 0 ? matches : DEMO_SUGGESTIONS.slice(0, 4));
                setShowFlyover(true);
            }, 300);
        } else {
            setShowFlyover(false);
            setSuggestions([]);
        }

        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [value]);

    // ── Send handler ──
    const handleSend = useCallback(() => {
        if (hasContent) {
            onSend?.(value.trim(), attachments);
            setValue('');
            setAttachments([]);
            setShowFlyover(false);
        }
    }, [value, attachments, hasContent, onSend]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend],
    );

    // ── Attach a suggestion ──
    const handleSuggestionClick = useCallback((s: Suggestion) => {
        const attachment: Attachment = {
            id: `${s.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: s.type,
            label: s.label,
            icon: s.icon,
        };
        setAttachments(prev => [...prev, attachment]);
        setShowFlyover(false);
        inputRef.current?.focus();
    }, []);

    const handleRemoveAttachment = useCallback((id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    }, []);

    return (
        <div className="rf-command-bar">
            {/* ── Flyover suggestions ── */}
            {showFlyover && suggestions.length > 0 && (
                <div className="rf-command-bar__flyover">
                    <div className="rf-command-bar__flyover-label">Suggestions</div>
                    <div className="rf-command-bar__flyover-list">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                className={`rf-command-bar__pill rf-command-bar__pill--${s.type}`}
                                onClick={() => handleSuggestionClick(s)}
                            >
                                <span className="rf-command-bar__pill-icon">{s.icon}</span>
                                <span className="rf-command-bar__pill-label">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Attachments ── */}
            {attachments.length > 0 && (
                <div className="rf-command-bar__attachments">
                    {attachments.map(a => (
                        <span key={a.id} className={`rf-command-bar__attachment rf-command-bar__attachment--${a.type}`}>
                            <span className="rf-command-bar__attachment-icon">{a.icon}</span>
                            <span className="rf-command-bar__attachment-label">{a.label}</span>
                            <button
                                className="rf-command-bar__attachment-remove"
                                onClick={() => handleRemoveAttachment(a.id)}
                            >✕</button>
                        </span>
                    ))}
                </div>
            )}

            {/* ── Input area ── */}
            <div className="rf-command-bar__input-area">
                <textarea
                    ref={inputRef}
                    className="rf-command-bar__input"
                    placeholder="Add a note or ask a question…"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    className={`rf-command-bar__send${hasContent ? ' rf-command-bar__send--active' : ''}`}
                    onClick={handleSend}
                    disabled={!hasContent}
                >
                    ⏎
                </button>
            </div>
        </div>
    );
};
