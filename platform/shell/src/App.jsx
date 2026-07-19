import { useEffect, useRef, useState } from 'react';
import {
  Activity, Bot, ChevronRight, FlaskConical, Gauge, Globe2, LayoutDashboard,
  Play, Send, TimerReset, X, Zap
} from 'lucide-react';

const PRODUCTS = [
  {
    key: 'automation',
    name: 'Automation Portal',
    desc: 'Selenium suite execution, reports, screenshots & logs',
    href: '/automation/',
    icon: Play,
    health: '/health/automation'
  },
  {
    key: 'apitest',
    name: 'API Testing',
    desc: 'Collections, scheduling, environments & execution history',
    href: '/apitest/',
    icon: Globe2,
    health: '/health/apitest'
  },
  {
    key: 'perf',
    name: 'Performance Testing',
    desc: 'Load tests, response times & performance reports',
    href: null,
    icon: Gauge,
    health: null
  }
];

const fetchJson = async (url, headers) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

function HealthDot({ state }) {
  const cls = state === 'up' ? 'dot up' : state === 'down' ? 'dot down' : 'dot';
  const label = state === 'up' ? 'Online' : state === 'down' ? 'Offline' : 'Checking…';
  return <span className="health"><span className={cls} />{label}</span>;
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <div className={`stat-value ${tone || ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, from: 'bot', text: 'Hi! I am the Testrix AI assistant. Ask me anything about your testing platform.' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text }]);
    setBusy(true);
    try {
      const r = await fetch('/genai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: 'testrix-shell' })
      });
      const data = await r.json();
      setMessages((m) => [...m, { id: Date.now() + 1, from: 'bot', text: data.message || 'No response.' }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now() + 1, from: 'bot', text: 'AI service is unreachable right now. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <Bot size={18} />
        <span>Testrix AI Assistant</span>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.from === 'user' ? 'bubble-user' : ''}`}>{m.text}</div>
        ))}
        {busy && <div className="bubble">Thinking…</div>}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the AI assistant…"
        />
        <button className="send-btn" onClick={send} disabled={busy}><Send size={16} /></button>
      </div>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState({});
  const [autoSummary, setAutoSummary] = useState(null);
  const [apiSummary, setApiSummary] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const autoSession = JSON.parse(localStorage.getItem('automationPortalAuth') || 'null');

  useEffect(() => {
    PRODUCTS.filter((p) => p.health).forEach((p) => {
      fetchJson(p.health)
        .then(() => setHealth((h) => ({ ...h, [p.key]: 'up' })))
        .catch(() => setHealth((h) => ({ ...h, [p.key]: 'down' })));
    });
    fetch('/health/genai')
      .then((r) => setHealth((h) => ({ ...h, genai: r.ok ? 'up' : 'down' })))
      .catch(() => setHealth((h) => ({ ...h, genai: 'down' })));

    if (autoSession?.accessToken) {
      fetchJson('/automation/api/dashboard/summary', { Authorization: `Bearer ${autoSession.accessToken}` })
        .then(setAutoSummary)
        .catch(() => setAutoSummary(null));
    }
    fetchJson('/apitest/api/v1/dashboard/summary')
      .then(setApiSummary)
      .catch(() => setApiSummary(null));
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <FlaskConical size={22} />
          <span className="brand-name">TESTRIX</span>
          <span className="brand-sub">Unified Testing Platform</span>
        </div>
        <div className="topbar-right">
          <HealthDot state={health.genai} />
          <span className="topbar-label">AI Service</span>
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <h1><LayoutDashboard size={20} /> Platform Dashboard</h1>
          <p>One place for every testing product — automation, API and performance.</p>
        </section>

        <section className="cards">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.key} className={`card ${!p.href ? 'card-soon' : ''}`}>
                <div className="card-head">
                  <span className="card-icon"><Icon size={20} /></span>
                  {p.href ? <HealthDot state={health[p.key]} /> : <span className="soon">Coming soon</span>}
                </div>
                <h2>{p.name}</h2>
                <p>{p.desc}</p>
                {p.href && (
                  <a className="open-btn" href={p.href}>Open <ChevronRight size={15} /></a>
                )}
              </div>
            );
          })}
        </section>

        <section className="panels">
          <div className="panel">
            <div className="panel-title"><Play size={16} /> Automation</div>
            {autoSummary ? (
              <div className="stats">
                <Stat label="Total executions" value={autoSummary.totalExecutions ?? 0} />
                <Stat label="Pass rate" value={`${autoSummary.passRate ?? 0}%`} tone="good" />
                <Stat label="Fail rate" value={`${autoSummary.failRate ?? 0}%`} tone="bad" />
                <Stat label="Running" value={autoSummary.runningExecutions ?? 0} />
                <Stat label="Queued" value={autoSummary.queuedExecutions ?? 0} />
              </div>
            ) : (
              <p className="panel-empty">
                {autoSession?.accessToken
                  ? 'Stats unavailable — open the Automation Portal to check.'
                  : 'Sign in to the Automation Portal once to see live stats here.'}
              </p>
            )}
          </div>

          <div className="panel">
            <div className="panel-title"><Zap size={16} /> API Testing</div>
            {apiSummary ? (
              <div className="stats">
                <Stat label="Executions" value={apiSummary.totalExecutions ?? 0} />
                <Stat label="Success rate" value={`${Math.round(apiSummary.successRate ?? 0)}%`} tone="good" />
                <Stat label="APIs" value={apiSummary.totalRegularApis ?? 0} />
                <Stat label="Modules" value={apiSummary.totalModules ?? 0} />
                <Stat label="Active schedules" value={apiSummary.activeSchedules ?? 0} />
              </div>
            ) : (
              <p className="panel-empty">API Testing stats unavailable.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-title"><TimerReset size={16} /> Performance</div>
            <p className="panel-empty">Performance Testing joins Testrix soon.</p>
          </div>

          <div className="panel">
            <div className="panel-title"><Activity size={16} /> Platform</div>
            <div className="stats">
              <Stat label="Products live" value={['automation', 'apitest'].filter((k) => health[k] === 'up').length} />
              <Stat label="AI assistant" value={health.genai === 'up' ? 'Online' : 'Offline'} tone={health.genai === 'up' ? 'good' : 'bad'} />
            </div>
          </div>
        </section>
      </main>

      <button className={`chat-fab ${chatOpen ? 'active' : ''}`} onClick={() => setChatOpen((o) => !o)}>
        <Bot size={20} />
      </button>
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}
