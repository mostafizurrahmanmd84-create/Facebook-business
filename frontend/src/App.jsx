import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiMoon, FiSun, FiSend, FiCopy, FiCheckCircle, FiPlus, FiBarChart2, FiMessageSquare, FiUsers, FiShield, FiSettings, FiBell, FiBookOpen, FiActivity, FiArrowRight, FiLock, FiSearch, FiCheck, FiRefreshCw } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';

const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-120b'];
const welcomeContent = `Hello! I am your AI assistant of Mostafizur Rahman. Ask me anything! 🙂

I'm here to help you with:
• Answering questions
• Writing content
• And much more.

Feel free to ask me anything!`;

const ADMIN_TOKEN_STORAGE_KEY = 'nova-admin-token';

function AiLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id="ai-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#ai-gradient)" />
      <path d="M22 40L30 24L38 40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 34H36" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="30" cy="20" r="3" fill="white" />
      <circle cx="30" cy="20" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, accent, tone = 'dark' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'dark' ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="text-lg text-white" />
        </div>
      </div>
    </div>
  );
}

function CustomerChatApp() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [model, setModel] = useState(models[0]);
  const [history, setHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [toast, setToast] = useState('');
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('nova-chat-history');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHistory(parsed);
      if (parsed.length) {
        setActiveChatId(parsed[0].id);
        setMessages(parsed[0].messages);
        setShowWelcome(false);
      } else {
        setShowWelcome(true);
      }
    } else {
      setShowWelcome(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [draft]);

  const saveHistory = (nextHistory) => {
    setHistory(nextHistory);
    localStorage.setItem('nova-chat-history', JSON.stringify(nextHistory));
  };

  const createNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setDraft('');
    setShowWelcome(true);
    setToast('Started a new conversation');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const saveCurrentChat = (nextMessages, chatId = activeChatId) => {
    if (!nextMessages.length) return;
    const title = nextMessages[0]?.content?.slice(0, 28) || 'New Chat';
    if (!chatId) {
      const newChat = { id: Date.now().toString(), title, messages: nextMessages };
      const nextHistory = [newChat, ...history];
      saveHistory(nextHistory);
      setActiveChatId(newChat.id);
      return;
    }
    const nextHistory = history.map((chat) => (chat.id === chatId ? { ...chat, title, messages: nextMessages } : chat));
    saveHistory(nextHistory);
  };

  const handleSend = async () => {
    if (!draft.trim() || loading) return;
    setShowWelcome(false);
    const userMessage = { id: Date.now().toString(), role: 'user', content: draft.trim(), timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    const chatId = activeChatId || Date.now().toString();
    setMessages(nextMessages);
    setActiveChatId(chatId);
    setDraft('');
    setLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        messages: [{ role: 'user', content: userMessage.content }],
        conversationId: chatId,
        model
      });
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.reply,
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      saveCurrentChat(finalMessages, chatId);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Unexpected issue. Please try again.';
      const assistantMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toISOString()
      };
      setMessages([...nextMessages, assistantMessage]);
      saveCurrentChat([...nextMessages, assistantMessage], chatId);
      setToast('The assistant hit an error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    setLoading(false);
    setToast('Generation stopped');
  };

  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setToast('Message copied');
    } catch {
      setToast('Unable to copy');
    }
  };

  const shell = darkMode ? 'bg-[#111827] text-white' : 'bg-[#f8fafc] text-slate-900';
  const muted = darkMode ? 'text-[#9ca3af]' : 'text-slate-500';
  const bubbleUser = 'bg-[#2563eb] text-white';
  const bubbleAi = darkMode ? 'bg-[#f3f4f6] text-slate-800' : 'bg-[#f1f5f9] text-slate-800';

  return (
    <div className={`min-h-screen ${shell}`}>
      {toast && (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-lg ${darkMode ? 'border-white/10 bg-[#1f2937]' : 'border-slate-200 bg-white'}`}>
          <FiCheckCircle className="text-[#2563eb]" /> {toast}
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[900px] flex-col px-3 py-4 sm:px-6 sm:py-6">
        <header className={`rounded-full border px-4 py-3 ${darkMode ? 'border-white/10 bg-[#1f2937]/80' : 'border-slate-200 bg-white/90'} shadow-sm backdrop-blur`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#60A5FA] to-[#8B5CF6] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <AiLogo className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">AI ASSISTANT</p>
                <p className={`text-xs ${muted}`}>Make Life Easier with AI 😊</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={createNewChat}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#60A5FA] to-[#8B5CF6] px-3.5 py-2 text-sm font-medium text-white shadow-sm"
              >
                <FiPlus className="text-sm" />
                <span>New Chat</span>
              </motion.button>
              <button onClick={() => setDarkMode((prev) => !prev)} className={`rounded-full p-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                {darkMode ? <FiSun /> : <FiMoon />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-1 pb-32 pt-6 sm:px-2">
          <div className="mx-auto flex w-full max-w-[850px] flex-1 flex-col gap-3">
            {showWelcome && messages.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="flex max-w-[90%] items-start gap-3 sm:max-w-[82%]">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#60A5FA] to-[#8B5CF6] p-[2px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10 backdrop-blur">
                      <AiLogo className="h-5 w-5" />
                    </div>
                  </div>
                  <div className={`rounded-[22px] px-4 py-3 ${bubbleAi}`}>
                    <div className="text-sm leading-7">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
                        }}
                      >
                        {welcomeContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : messages.length > 0 ? (
              messages.map((message) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' ? (
                    <div className="flex max-w-[90%] items-start gap-3 sm:max-w-[82%]">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#60A5FA] to-[#8B5CF6] p-[2px]">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10 backdrop-blur">
                          <AiLogo className="h-5 w-5" />
                        </div>
                      </div>
                      <div className={`rounded-[22px] px-4 py-3 ${bubbleAi}`}>
                        <div className="text-sm leading-7">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
                              code({ inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <div className={`my-3 overflow-hidden rounded-xl border ${darkMode ? 'border-slate-200/20 bg-[#111827]' : 'border-slate-200 bg-[#f8fafc]'}`}>
                                    <div className={`flex items-center justify-between px-3 py-2 text-xs ${muted}`}>
                                      <span>{match[1]}</span>
                                      <button onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))} className="rounded-lg px-2 py-1 hover:bg-black/5">Copy</button>
                                    </div>
                                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                                  </div>
                                ) : (
                                  <code className={`rounded px-1.5 py-0.5 ${darkMode ? 'bg-slate-200/20 text-cyan-600' : 'bg-slate-200 text-slate-700'}`} {...props}>{children}</code>
                                );
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <div className={`mt-2 flex items-center justify-between gap-3 text-[11px] ${muted}`}>
                          <span>{message.timestamp ? new Date(message.timestamp).toLocaleString() : ''}</span>
                          <button onClick={() => copyText(message.content, message.id)} className="rounded-full p-1 hover:bg-black/5">
                            <FiCopy />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`max-w-[80%] rounded-[22px] px-4 py-3 sm:max-w-[70%] ${bubbleUser}`}>
                      <div className="text-sm leading-7">{message.content}</div>
                    </div>
                  )}
                </motion.div>
              ))
            ) : null}
            {loading && (
              <div className="flex justify-start">
                <div className="flex max-w-[90%] items-start gap-3 sm:max-w-[82%]">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#60A5FA] to-[#8B5CF6] p-[2px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10 backdrop-blur">
                      <AiLogo className="h-5 w-5" />
                    </div>
                  </div>
                  <div className={`rounded-[22px] px-4 py-3 ${bubbleAi}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className={`fixed inset-x-0 bottom-0 border-t px-3 py-3 sm:px-6 ${darkMode ? 'border-white/10 bg-[#111827]/95' : 'border-slate-200 bg-[#f8fafc]/95'} backdrop-blur`}>
          <div className={`mx-auto max-w-[850px] rounded-[24px] border p-2 ${darkMode ? 'border-white/10 bg-[#1f2937]' : 'border-slate-200 bg-white'} shadow-sm`}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask me anything..."
              className={`max-h-[180px] min-h-[50px] w-full resize-none overflow-hidden bg-transparent px-3 py-3 text-sm outline-none ${darkMode ? 'text-white' : 'text-slate-900'}`}
            />
            <div className="mt-2 flex items-center justify-end px-2 pb-2">
              {loading ? (
                <button onClick={handleStop} className={`rounded-full px-3 py-2 text-sm ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}>Stop</button>
              ) : (
                <button onClick={handleSend} disabled={loading || !draft.trim()} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#60A5FA] to-[#8B5CF6] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <FiSend /> Send
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SettingToggle({ label, description, enabled, saving, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div>
        <p className="font-medium text-slate-100">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${label}: ${enabled ? 'On' : 'Off'}`}
        disabled={saving}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-slate-700'} ${saving ? 'cursor-wait opacity-60' : ''}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '');
  const [tokenInput, setTokenInput] = useState(token);
  const [authorized, setAuthorized] = useState(Boolean(token));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    stats: {
      totalConversations: 0,
      todaysConversations: 0,
      activeCustomers: 0,
      aiResponses: 0,
      humanHandled: 0,
      unansweredQuestions: 0,
      handoffRequests: 0,
      salesLeads: 0
    },
    conversations: [],
    unansweredQuestions: [],
    systemHealth: {
      ai: { status: 'offline', provider: 'unknown' },
      googleSheets: { status: 'warning', configured: false },
      facebookMessenger: { status: 'warning', configured: false },
      storage: { status: 'connected', type: 'in-memory' },
      lastCheckedAt: null
    },
    settings: {}
  });
  const [search, setSearch] = useState('');

  const authHeader = token ? `Bearer ${token}` : '';
  const [savingSetting, setSavingSetting] = useState('');

  const fetchAdminOverview = useCallback(async (withToken = token) => {
    if (!withToken) return;
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/overview', {
        headers: { Authorization: `Bearer ${withToken}` }
      });
      setData((currentData) => response.data || currentData);
    } catch (error) {
      const message = error.response?.data?.error || 'Unable to load admin data.';
      setAuthorized(false);
      setToken('');
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchAdminOverview(token);
  }, [fetchAdminOverview, token]);

  const connectAdmin = () => {
    const nextToken = tokenInput.trim();
    if (!nextToken) {
      window.alert('Please enter the admin token.');
      return;
    }
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setAuthorized(true);
    fetchAdminOverview(nextToken);
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setToken('');
    setTokenInput('');
    setAuthorized(false);
  };

  const updateSetting = async (key, value) => {
    setSavingSetting(key);
    try {
      const response = await axios.patch('/api/admin/settings', { [key]: value }, { headers: { Authorization: authHeader } });
      setData((currentData) => ({ ...currentData, settings: response.data.settings }));
    } catch (error) {
      window.alert(error.response?.data?.error || 'Unable to update this setting.');
    } finally {
      setSavingSetting('');
    }
  };

  const filteredQuestions = (data.unansweredQuestions || []).filter((item) => {
    const query = search.toLowerCase();
    if (!query) return true;
    const text = `${item.question || ''} ${item.response || ''} ${item.intent || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(query);
  });

  const filteredConversations = (data.conversations || []).filter((item) => {
    const query = search.toLowerCase();
    if (!query) return true;
    const text = `${item.sessionId || ''} ${item.channel || ''} ${item.status || ''} ${item.lastMessage || ''}`.toLowerCase();
    return text.includes(query);
  });

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <FiLock className="text-2xl text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Secure Access</p>
              <h1 className="text-2xl font-semibold text-white">Admin Portal</h1>
            </div>
          </div>
          <label className="mb-2 block text-sm text-slate-300">Dashboard access key</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Enter INGEST_KEY"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none ring-0 transition focus:border-indigo-500"
          />
          <button
            onClick={connectAdmin}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
          >
            <FiShield /> Access Dashboard
          </button>
          <p className="mt-4 text-sm text-slate-400">This token is stored only in local storage for the browser session and is never sent to the frontend app code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/40 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-indigo-400">AI BUSINESS CONTROL CENTER</p>
            <h1 className="mt-2 text-3xl font-semibold">Operations Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2">
              <FiSearch className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations or issues"
                className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <button onClick={() => fetchAdminOverview()} className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={logout} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">Logout</button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FiMessageSquare} label="Total conversations" value={data.stats?.totalConversations ?? 0} accent="bg-indigo-500" />
          <StatCard icon={FiUsers} label="Active customers" value={data.stats?.activeCustomers ?? 0} accent="bg-cyan-500" />
          <StatCard icon={FiBookOpen} label="Unanswered" value={data.stats?.unansweredQuestions ?? 0} accent="bg-amber-500" />
          <StatCard icon={FiShield} label="Handoff requests" value={data.stats?.handoffRequests ?? 0} accent="bg-emerald-500" />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live overview</p>
                <h2 className="mt-2 text-xl font-semibold">Recent conversations</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">{data.systemHealth?.ai?.status || 'offline'}</span>
            </div>

            <div className="space-y-3">
              {filteredConversations.length ? filteredConversations.slice(0, 6).map((conversation) => (
                <div key={conversation.sessionId} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{conversation.customerId || conversation.sessionId}</p>
                      <p className="text-xs text-slate-400">{conversation.channel} • {conversation.messageCount ?? 0} messages</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${conversation.humanMode ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {conversation.humanMode ? 'Human' : 'AI'}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-300">{conversation.lastMessage || 'No message recorded yet.'}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No conversations match your current filter.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">System health</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>AI provider</span>
                  <span className="text-indigo-300">{data.systemHealth?.ai?.provider || 'unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Google Sheets</span>
                  <span className={data.systemHealth?.googleSheets?.configured ? 'text-emerald-300' : 'text-amber-300'}>
                    {data.systemHealth?.googleSheets?.configured ? 'Connected' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Messenger</span>
                  <span className={data.systemHealth?.facebookMessenger?.configured ? 'text-emerald-300' : 'text-amber-300'}>
                    {data.systemHealth?.facebookMessenger?.configured ? 'Connected' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage</span>
                  <span className="text-sky-300">In-memory</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Quick actions</p>
              <div className="mt-4 grid gap-3">
                <SettingToggle label="AI responses" description="Allow the assistant to answer customers" enabled={Boolean(data.settings?.aiEnabled)} saving={savingSetting === 'aiEnabled'} onChange={(value) => updateSetting('aiEnabled', value)} />
                <SettingToggle label="Human handoff" description="Allow customers to request a human agent" enabled={Boolean(data.settings?.humanHandoffEnabled)} saving={savingSetting === 'humanHandoffEnabled'} onChange={(value) => updateSetting('humanHandoffEnabled', value)} />
                <SettingToggle label="Conversation memory" description="Keep recent messages for better context" enabled={Boolean(data.settings?.conversationMemoryEnabled)} saving={savingSetting === 'conversationMemoryEnabled'} onChange={(value) => updateSetting('conversationMemoryEnabled', value)} />
                <SettingToggle label="FAQ search" description="Use the FAQ knowledge base for answers" enabled={Boolean(data.settings?.faqSearchEnabled)} saving={savingSetting === 'faqSearchEnabled'} onChange={(value) => updateSetting('faqSearchEnabled', value)} />
                <SettingToggle label="Product search" description="Use the product database for stock and price" enabled={Boolean(data.settings?.productSearchEnabled)} saving={savingSetting === 'productSearchEnabled'} onChange={(value) => updateSetting('productSearchEnabled', value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Unanswered questions</h3>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">{filteredQuestions.length}</span>
            </div>
            <div className="space-y-3">
              {filteredQuestions.length ? filteredQuestions.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium text-slate-100">{item.question}</p>
                  <p className="mt-2 text-xs text-slate-400">{item.intent || 'general'} • {item.channel || 'web'}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">No unanswered questions found.</div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Control center</h3>
              <FiActivity className="text-indigo-300" />
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <span>AI enabled</span>
                <span className="text-emerald-300">{data.settings?.aiEnabled ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <span>Human handoff</span>
                <span className="text-emerald-300">{data.settings?.humanHandoffEnabled ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <span>FAQ search</span>
                <span className="text-emerald-300">{data.settings?.faqSearchEnabled ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <span>Product search</span>
                <span className="text-emerald-300">{data.settings?.productSearchEnabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState('chat');
  const [showAdminShortcut, setShowAdminShortcut] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    setShowAdminShortcut(Boolean(savedToken));
  }, []);

  return (
    <div>
      <div className="fixed right-6 top-6 z-50 flex gap-2">
        <button
          onClick={() => setView('chat')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}
        >
          Customer Chat
        </button>
        <button
          onClick={() => setView('admin')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${view === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}
        >
          Admin Dashboard
        </button>
      </div>
      {view === 'admin' ? <AdminDashboard /> : <CustomerChatApp />}
    </div>
  );
}

export default App;
