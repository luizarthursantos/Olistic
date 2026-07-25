import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Send, Trash2, AlertCircle, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, sendChatMessage, buildDataSummary } from '../../utils/aiChat';
import { CLAUDE_MODEL_LABELS } from '../../types';
import './AiChatTab.css';

export function AiChatTab() {
  const {
    settings,
    bodyEntries,
    mealEntries,
    workoutSessions,
    workoutTemplates,
    exercises,
    macroTargets,
    chatMessages,
    setChatMessages,
  } = useStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const apiKey = settings.aiProvider === 'gemini' ? settings.geminiApiKey : settings.claudeApiKey;

  const dataSummary = useMemo(
    () => buildDataSummary(settings, bodyEntries, mealEntries, workoutSessions, workoutTemplates, exercises, macroTargets),
    [settings, bodyEntries, mealEntries, workoutSessions, workoutTemplates, exercises, macroTargets],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // Drop an in-flight request if the tab goes away, so the stream callbacks
  // don't fire against an unmounted component.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!apiKey) {
      setError(`No ${settings.aiProvider === 'gemini' ? 'Gemini' : 'Claude'} API key configured. Add it in Settings.`);
      return;
    }

    setError('');
    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setStreamingText('');

    const controller = new AbortController();
    abortRef.current = controller;

    // Mirrors what has streamed so far, so a failure partway through can
    // still keep the text the model already produced.
    let streamed = '';

    try {
      const reply = await sendChatMessage(
        apiKey,
        settings.aiProvider,
        updatedMessages,
        dataSummary,
        settings.claudeModel || 'claude-sonnet-4-6',
        {
          signal: controller.signal,
          onText: (chunk) => {
            streamed += chunk;
            setStreamingText(streamed);
          },
        },
      );
      setChatMessages([...updatedMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      if (streamed.trim()) {
        // Keep the partial answer rather than throwing it away.
        setChatMessages([...updatedMessages, { role: 'assistant', content: streamed }]);
      }
      setError(err?.message || 'Failed to get response');
    } finally {
      abortRef.current = null;
      setStreamingText('');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setError('');
  };

  const suggestions = [
    'How am I progressing towards my goals?',
    'Analyze my nutrition this week',
    'How can I improve my training?',
    'What should I focus on next?',
  ];

  return (
    <div className="ai-chat-tab fade-in">
      <div className="ai-chat-header">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>AI Assistant</h3>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            {settings.aiProvider === 'gemini' ? 'Gemini 2.0 Flash' : CLAUDE_MODEL_LABELS[settings.claudeModel || 'claude-sonnet-4-6']} · Aware of your logged data
          </p>
        </div>
        {chatMessages.length > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={clearChat}>
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <div className="ai-chat-messages">
        {chatMessages.length === 0 && !loading && (
          <div className="ai-chat-empty">
            <Bot size={40} strokeWidth={1.5} />
            <p>Ask me anything about your fitness data, get insights, or just chat.</p>
            <div className="ai-chat-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="ai-suggestion-btn"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={i} className={`ai-chat-msg ${msg.role}`}>
            <div className="ai-chat-msg-icon">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="ai-chat-msg-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              ) : (
                msg.content.split('\n').map((line, j) => (
                  <p key={j}>{line || ' '}</p>
                ))
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-chat-msg assistant">
            <div className="ai-chat-msg-icon"><Bot size={16} /></div>
            <div className="ai-chat-msg-content">
              {streamingText ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                  <span className="ai-stream-caret" />
                </>
              ) : (
                <div className="ai-typing">
                  <span /><span /><span />
                  <span className="ai-typing-label">Thinking…</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="ai-chat-error">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="ai-chat-input-row">
        <textarea
          ref={inputRef}
          className="ai-chat-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="btn btn-primary btn-icon ai-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
