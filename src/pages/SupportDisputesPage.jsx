import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, RefreshCw, Send, MessageSquare, Clock, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { exchangeApiOrigin } from '@/lib/apiBase';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

function token() {
  return localStorage.getItem('bitzx_ex_token') || '';
}

async function authJson(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.detail || `Request failed (${res.status})`);
  return body;
}

export default function SupportDisputesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', message: '' });
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await authJson('/api/support/tickets?limit=100');
      const rows = Array.isArray(data.items) ? data.items : [];
      setItems(rows);
      if (rows.length && !selected) setSelected(rows[0]);
    } catch (e) {
      setError(e.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createTicket(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      const created = await authJson('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: form.subject.trim(),
          category: form.category,
          priority: form.priority,
          message: form.message.trim(),
        }),
      });
      setForm({ subject: '', category: 'general', priority: 'normal', message: '' });
      setItems((prev) => [created, ...prev]);
      setSelected(created);
    } catch (e2) {
      setError(e2.message || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  }

  async function sendReply() {
    if (!selected?.id || !reply.trim()) return;
    setSaving(true);
    try {
      const updated = await authJson(`/api/support/tickets/${encodeURIComponent(selected.id)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim() }),
      });
      setReply('');
      setSelected(updated);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSaving(false);
    }
  }

  const openCount = useMemo(
    () => items.filter((x) => x.status !== 'resolved' && x.status !== 'closed').length,
    [items],
  );
  const inProgressCount = useMemo(() => items.filter((x) => x.status === 'in_progress').length, [items]);
  const resolvedCount = useMemo(() => items.filter((x) => x.status === 'resolved' || x.status === 'closed').length, [items]);
  const visibleItems = useMemo(
    () => (statusFilter === 'all' ? items : items.filter((x) => x.status === statusFilter)),
    [items, statusFilter],
  );

  return (
    <div className="w-full max-w-[1300px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bitzx-card p-5 rounded-xl border border-[#2B3139] bg-[#1E2329]">
        <h1 className="text-2xl font-bold text-white inline-flex items-center gap-2">
          <HelpCircle size={24} className="text-[#F0B90B]" />
          Support & Disputes
        </h1>
        <p className="mt-2 text-[#848E9C]">Raise support cases, track dispute progress, and chat with support team.</p>
        <p className="mt-1 text-sm text-[#F0B90B]">{user?.email || 'Logged in user'} • Open tickets: {openCount}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Open Tickets" value={openCount} icon={MessageSquare} color="yellow" />
        <StatCard title="In Progress" value={inProgressCount} icon={Clock} color="blue" />
        <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle} color="green" />
        <StatCard title="Avg Response Time" value="2.5h" icon={Zap} color="purple" />
      </div>

      {error ? <div className="rounded-lg border border-[#F6465D]/40 bg-[#F6465D]/10 p-3 text-sm text-[#F6465D]">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#2B3139] bg-[#1E2329] p-4 space-y-3">
          <form onSubmit={createTicket} className="space-y-2">
            <input className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2 text-white placeholder-[#5E6673]" placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <select className="bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2 text-white" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                <option value="general">General</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="trade">Trade</option>
                <option value="dispute">Dispute</option>
                <option value="security">Security</option>
              </select>
              <select className="bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2 text-white" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <textarea className="w-full min-h-[90px] bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2 text-white placeholder-[#5E6673]" placeholder="Describe your issue..." value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
            <button type="submit" disabled={saving} className="w-full px-4 py-2 rounded-lg bg-[#F0B90B] text-[#0B0E11] font-semibold">Create Ticket</button>
          </form>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-[#848E9C]">My Tickets</p>
            <button type="button" onClick={load} className="text-[#848E9C] hover:text-white inline-flex items-center gap-1"><RefreshCw size={14} /> Refresh</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in_progress', 'resolved'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === f ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-[#0B0E11] text-[#848E9C] hover:text-white'}`}
              >
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {!loading && visibleItems.length === 0 ? <p className="text-sm text-[#848E9C]">No tickets yet.</p> : null}
            {visibleItems.map((t) => (
              <button key={t.id} type="button" onClick={() => setSelected(t)} className={`w-full text-left rounded-lg border p-3 ${selected?.id === t.id ? 'border-[#F0B90B]/40 bg-[#F0B90B]/10' : 'border-[#2B3139] bg-[#0B0E11]/60'}`}>
                <p className="text-xs text-[#F0B90B] font-mono">{t.id}</p>
                <p className="text-sm font-semibold text-white mt-1">{t.subject}</p>
                <p className="text-xs text-[#848E9C] mt-1">{t.status} • {t.priority}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-xl border border-[#2B3139] bg-[#1E2329] p-4">
          {!selected ? <p className="text-[#848E9C]">Select a ticket to view conversation.</p> : (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{selected.subject}</h3>
                <p className="text-sm text-[#848E9C]">{selected.id} • {selected.category} • {selected.status}</p>
              </div>
              <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] p-3 space-y-2 max-h-[450px] overflow-auto">
                {(selected.messages || []).map((m) => (
                  <div key={m.id} className={`rounded-lg p-2 border ${m.from_type === 'admin' ? 'border-[#F0B90B]/30 bg-[#F0B90B]/15' : 'border-[#2B3139] bg-[#1E2329]'}`}>
                    <p className="text-xs text-[#848E9C]">{m.from_type === 'admin' ? 'Support Team' : 'You'} • {m.created_at}</p>
                    <p className="text-sm text-white whitespace-pre-wrap mt-1">{m.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea className="flex-1 min-h-[74px] bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2 text-white placeholder-[#5E6673]" placeholder="Write a message..." value={reply} onChange={(e) => setReply(e.target.value)} />
                <button type="button" disabled={saving || !reply.trim()} onClick={sendReply} className="px-4 py-2 h-fit rounded-lg bg-[#F0B90B] text-[#0B0E11] font-semibold inline-flex items-center gap-2">
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = 'yellow' }) {
  const map = {
    yellow: 'bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border-[#F0B90B]/30',
    blue: 'bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 border-[#3B82F6]/30',
    green: 'bg-gradient-to-br from-[#0ECB81]/20 to-[#0ECB81]/5 border-[#0ECB81]/30',
    purple: 'bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/5 border-[#8B5CF6]/30',
  };
  return (
    <div className={`rounded-xl border p-4 ${map[color] || map.yellow}`}>
      <div className="flex items-center justify-between">
        <p className="text-[#848E9C] text-sm">{title}</p>
        <Icon size={18} className="text-white/80" />
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}
