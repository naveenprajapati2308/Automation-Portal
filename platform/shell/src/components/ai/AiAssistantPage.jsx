import { useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, ChevronDown, ChevronUp,
  Gauge, Globe2, Loader2, Play, Search, Send, Timer, XCircle, Zap
} from 'lucide-react';
import { KpiTile } from '../shared/KpiTile.jsx';

// ── Product metadata shared by search-result and analytics rendering ──────────
const PRODUCT_META = {
  automation: { label: 'Automation', icon: Play },
  'api-testing': { label: 'API Testing', icon: Globe2 },
  performance: { label: 'Performance', icon: Gauge },
};
const ANALYTICS_KEY = { automation: 'automation', 'api-testing': 'apiTesting', performance: 'performance' };

// Field choices mirror the platform Dashboard's own KPI tiles for these exact
// endpoints (App.jsx autoSummary/apiSummary/perfSummary cards) — same icons/tones.
const ANALYTICS_FIELDS = {
  automation: [
    { key: 'totalExecutions', label: 'Total Executions', icon: Play, tone: 'accent' },
    { key: 'passRate', label: 'Pass Rate', icon: CheckCircle2, tone: 'success', suffix: '%' },
    { key: 'failRate', label: 'Fail Rate', icon: XCircle, tone: 'danger', suffix: '%' },
    { key: 'averageDuration', label: 'Avg Duration', icon: Timer, tone: 'accent', suffix: 's' },
  ],
  'api-testing': [
    { key: 'totalExecutions', label: 'Executions', icon: Zap, tone: 'accent' },
    { key: 'successRate', label: 'Success Rate', icon: CheckCircle2, tone: 'success', suffix: '%' },
    { key: 'failed', label: 'Failed', icon: XCircle, tone: 'danger' },
    { key: 'avgDurationMs', label: 'Avg Response', icon: Timer, tone: 'accent', suffix: 'ms' },
  ],
  performance: [
    { key: 'totalRuns', label: 'Total Runs', icon: Activity, tone: 'accent' },
    { key: 'passedRuns', label: 'Passed', icon: CheckCircle2, tone: 'success' },
    { key: 'failedRuns', label: 'Failed', icon: XCircle, tone: 'danger' },
    { key: 'runningRuns', label: 'Running', icon: Loader2, tone: 'info' },
  ],
};

// ── Lightweight markdown: **bold**, `code`, "- " bullet lists — enough for the
// kind of structured prose the assistant now produces, without a new dependency.
function renderInline(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
      return part;
    });
}

function MarkdownLite({ text }) {
  const blocks = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(<ul key={`ul-${blocks.length}`}>{listBuffer.map((li, i) => <li key={i}>{renderInline(li)}</li>)}</ul>);
      listBuffer = [];
    }
  };
  String(text || '').split('\n').forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
    } else {
      flushList();
      if (trimmed) blocks.push(<p key={idx}>{renderInline(trimmed)}</p>);
    }
  });
  flushList();
  return blocks;
}

// ── Insight blocks: one renderer per toolResults[].type ────────────────────────
function SearchResultCard({ item, onNavigate }) {
  const meta = PRODUCT_META[item.product];
  const Icon = meta?.icon || Search;
  return (
    <button type="button" className="ai-result-card" onClick={() => onNavigate(item.product, item.sub)}>
      <div className="ai-result-icon"><Icon size={16} /></div>
      <div className="ai-result-body">
        <div className="ai-result-title">{item.title}</div>
        {item.subtitle && <div className="ai-result-subtitle">{item.subtitle}</div>}
      </div>
      {item.status && <span className="ai-result-status">{item.status}</span>}
    </button>
  );
}

function SearchBlock({ data, onNavigate }) {
  if (!data?.items?.length) return <p className="ai-insight-empty">No matches found.</p>;
  return (
    <div className="ai-result-list">
      {data.items.map((item, i) => (
        <SearchResultCard key={`${item.product}-${item.entityType}-${item.id}-${i}`} item={item} onNavigate={onNavigate} />
      ))}
      {data.totalMatches > data.items.length && (
        <p className="ai-insight-note">Showing {data.items.length} of {data.totalMatches} matches.</p>
      )}
    </div>
  );
}

function AnalyticsBlock({ data }) {
  const sections = Object.keys(PRODUCT_META)
    .map((product) => ({ product, stats: data?.[ANALYTICS_KEY[product]] }))
    .filter((s) => s.stats);
  if (!sections.length) return <p className="ai-insight-empty">No analytics available for this project.</p>;
  return (
    <div className="ai-analytics-list">
      {sections.map(({ product, stats }) => (
        <div key={product} className="ai-analytics-section">
          <div className="ai-analytics-section-title">{PRODUCT_META[product].label}</div>
          <div className="ai-kpi-row">
            {ANALYTICS_FIELDS[product].map((f) => (
              <KpiTile
                key={f.key}
                icon={f.icon}
                tone={f.tone}
                value={stats[f.key] != null ? `${stats[f.key]}${f.suffix || ''}` : '—'}
                label={f.label}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FailureRow({ title, reason, trace }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ai-failure-row">
      <button type="button" className="ai-failure-toggle" onClick={() => trace && setOpen((o) => !o)}>
        <AlertTriangle size={14} />
        <div className="ai-failure-title">{title}</div>
        {trace && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>
      {reason && <div className="ai-failure-reason">{reason}</div>}
      {open && trace && <pre className="ai-failure-trace">{trace}</pre>}
    </div>
  );
}

function FailureBlock({ data }) {
  if (data?.recent) {
    if (!data.recent.length) return <p className="ai-insight-empty">No recent failures found.</p>;
    return (
      <div className="ai-failure-list">
        {data.recent.map((r, i) => (
          <FailureRow key={i} title={r.executionCode || r.testName || `#${r.id}`} reason={r.errorMessage || r.module} />
        ))}
      </div>
    );
  }
  if (data?.failures) {
    if (!data.failures.length) return <p className="ai-insight-empty">No failing test cases in this execution.</p>;
    return (
      <div className="ai-failure-list">
        {data.failures.map((f, i) => (
          <FailureRow key={i} title={f.name || 'Test case'} reason={f.failureReason} trace={f.stackTrace} />
        ))}
      </div>
    );
  }
  if (data && 'errorMessage' in data) {
    return (
      <div className="ai-failure-list">
        <FailureRow title={`#${data.id}`} reason={data.errorMessage || 'No error message recorded.'} trace={data.responseBody} />
      </div>
    );
  }
  return <p className="ai-insight-empty">No failure detail available.</p>;
}

const INSIGHT_BLOCK = {
  search: { icon: Search, label: 'Search results', render: SearchBlock },
  analytics: { icon: BarChart3, label: 'Analytics', render: AnalyticsBlock },
  failure: { icon: AlertTriangle, label: 'Failure detail', render: FailureBlock },
};

function InsightsPanel({ messages, onNavigate }) {
  const latest = [...messages].reverse().find((m) => m.from === 'bot' && m.toolResults?.length);
  if (!latest) {
    return (
      <div className="ai-insights-empty">
        <BarChart3 size={28} />
        <p>Ask me to search Testrix, get a report, or explain a failure — results will show up here.</p>
      </div>
    );
  }
  return (
    <div className="ai-insights-list">
      {latest.toolResults.map((tr, i) => {
        const block = INSIGHT_BLOCK[tr.type];
        if (!block) return null;
        const Block = block.render;
        return (
          <div key={i} className="ai-insight-block">
            <div className="ai-insight-block-title"><block.icon size={14} /> {block.label}</div>
            <Block data={tr.data} onNavigate={onNavigate} />
          </div>
        );
      })}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export function AiAssistantPage({ messages, input, setInput, busy, onSend, onNavigate }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="ai-assistant-page">
      <div className="ai-assistant-chat">
        <div className="ai-assistant-chat-messages" ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`ai-chat-bubble ai-chat-bubble-lg ${m.from === 'user' ? 'ai-chat-bubble-user' : ''}`}>
              {m.from === 'bot' ? <MarkdownLite text={m.text} /> : m.text}
            </div>
          ))}
          {busy && <div className="ai-chat-bubble ai-chat-bubble-lg">Thinking…</div>}
        </div>
        <form className="ai-chat-input-row" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your executions, reports, or failures…"
          />
          <button type="submit" className="tb-icon-btn" title="Send" disabled={busy}>
            <Send size={16} />
          </button>
        </form>
      </div>

      <div className="ai-assistant-insights">
        <div className="ai-assistant-insights-header"><Bot size={16} /> Insights</div>
        <InsightsPanel messages={messages} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
