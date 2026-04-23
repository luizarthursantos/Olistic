import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Send, Trash2, AlertCircle, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, sendChatMessage, buildDataSummary } from '../../utils/aiChat';
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
  } = useStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = settings.aiProvider === 'gemini' ? settings.geminiApiKey : settings.claudeApiKey;

  const dataSummary = useMemo(
    () => buildDataSummary(settings, bodyEntries, mealEntries, workoutSessions, workoutTemplates, exercises, macroTargets),
    [settings, bodyEntries, mealEntries, workoutSessions, workoutTemplates, exercises, macroTargets],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!apiKey) {
      setError(`No ${settings.aiProvider === 'gemini' ? 'Gemini' : 'Claude'} API key configured. Add it in Settings.`);
      return;
    }

    setError('');
    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(apiKey, settings.aiProvider, updatedMessages, dataSummary);
      setMessages([...updatedMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
    } finally {
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
    setMessages([]);
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
            {settings.aiProvider === 'gemini' ? 'Gemini 2.0 Flash' : 'Claude Sonnet 4.6'} · Aware of your logged data
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={clearChat}>
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && !loading && (
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

        {messages.map((msg, i) => (
          <div key={i} className={`ai-chat-msg ${msg.role}`}>
            <div className="ai-chat-msg-icon">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="ai-chat-msg-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content.split('\n').map((line, j) => (
                  <p key={j}>{line || ' '}</p>
                ))
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-chat-msg assistant">
            <div className="ai-chat-msg-icon"><Bot size={16} /></div>
            <div className="ai-chat-msg-content">
              <div className="ai-typing">
                <span /><span /><span />
              </div>
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
