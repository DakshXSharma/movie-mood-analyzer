import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Film, Bookmark, CheckCircle2, TrendingUp,
  BarChart2, Star, Calendar, ShieldCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

// ── Mood palette ──────────────────────────────────────────────────────────────
const MOOD_COLORS = {
  happy:     '#FAD02C',
  sad:       '#3A86C8',
  excited:   '#FF6B6B',
  scared:    '#7F5A83',
  romantic:  '#FF7597',
  bored:     '#8E9AAF',
  angry:     '#D90429',
  nostalgic: '#E29578',
};
const MOOD_EMOJIS = {
  happy: '😊', sad: '😢', excited: '⚡', scared: '😱',
  romantic: '💖', bored: '🥱', angry: '😠', nostalgic: '🕰️',
};
const GENRE_PALETTE = [
  '#6366F1','#8B5CF6','#EC4899','#F59E0B',
  '#10B981','#3B82F6','#EF4444','#14B8A6',
];

// ── Custom tooltip shared style ───────────────────────────────────────────────
const TooltipBox = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f2e] border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      {label && <p className="text-slate-400 mb-1 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-bold">
          {p.name}: {p.value}{unit}
        </p>
      ))}
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, icon: Icon, children }) => (
  <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 bg-[#0E121D]/90">
    <div className="mb-5">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-400" />
        {title}
      </h3>
      {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const Empty = ({ msg }) => (
  <div className="flex items-center justify-center h-40 text-slate-500 text-xs text-center px-4">
    {msg}
  </div>
);

export const Profile = ({ onShowToast }) => {
  const { user, authFetch } = useAuth();
  const [statsData, setStatsData]       = useState(null);
  const [chartData, setChartData]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  const fetchProfileStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/user/mood-activity');
      if (res.ok) setStatsData(await res.json());
    } catch (err) {
      console.error('Failed to load profile stats:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchChartData = useCallback(async () => {
    setChartsLoading(true);
    try {
      const res = await authFetch('/api/analytics/data');
      if (res.ok) setChartData(await res.json());
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setChartsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchProfileStats();
    fetchChartData();
  }, [fetchProfileStats, fetchChartData]);

  const totalMoodSessions = statsData?.mood_breakdown?.reduce((a, b) => a + b.count, 0) || 0;

  // Build donut data from mood_breakdown
  const donutData = statsData?.mood_breakdown?.map(item => ({
    name: item.mood,
    value: item.count,
    color: MOOD_COLORS[item.mood] || '#6366F1',
  })) || [];

  return (
    <div className="space-y-8 pb-16">

      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-[#121625] via-[#161C2E] to-[#121625]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-indigo-600/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border-2 border-[#161C2E] text-emerald-400">
              <ShieldCheck className="w-4 h-4 fill-emerald-500/20" />
            </div>
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
              <Film className="w-3 h-3" />
              <span>Member</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {user?.name || 'Film Enthusiast'}
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user?.email || 'user@example.com'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Member Since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats cards ────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Watched Films"  value={statsData?.watched_count ?? 0}     sub="Movies logged"            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Queue"          value={statsData?.watchlist_count ?? 0}   sub="Saved in watchlist"       icon={<Bookmark className="w-4 h-4 text-indigo-400" />} />
        <StatCard
          label="Top Mood"
          value={statsData?.top_mood ? `${MOOD_EMOJIS[statsData.top_mood] || ''} ${statsData.top_mood}` : '—'}
          sub="Most frequent"
          icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
          valueClass="text-xl sm:text-2xl capitalize"
        />
        <StatCard
          label="Avg Rating"
          value={statsData?.average_rating ? `${statsData.average_rating}` : '—'}
          sub={statsData?.average_rating ? '/ 10' : 'No data yet'}
          icon={<Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
        />
      </section>

      {/* ── Mood activity progress bars ─────────────────────────────────── */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#0E121D]/90">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <span>Mood Activity</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalMoodSessions} total mood sessions
            </p>
          </div>
        </div>

        {totalMoodSessions === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-sm text-slate-400">
              No mood sessions yet. Pick a mood on the home page to start tracking!
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {statsData?.mood_breakdown?.map((item) => {
              const pct   = totalMoodSessions > 0 ? Math.round((item.count / totalMoodSessions) * 100) : 0;
              const color = MOOD_COLORS[item.mood] || '#6366F1';
              const emoji = MOOD_EMOJIS[item.mood]  || '🎬';
              return (
                <div key={item.mood} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 capitalize flex items-center gap-1.5">
                      <span>{emoji}</span><span>{item.mood}</span>
                    </span>
                    <span className="text-slate-400 font-medium">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Analytics Charts ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-400" />
          Analytics
        </h2>

        {chartsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-64 rounded-2xl border border-slate-800 bg-[#0E121D]/80 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Chart 1: Top Genres */}
            <ChartCard
              title="Top Genres"
              subtitle="From your watched movies"
              icon={Film}
            >
              {chartData?.genre_breakdown?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData.genre_breakdown}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="genre" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: '#ffffff08' }} />
                    <Bar dataKey="count" name="Movies" radius={[0, 6, 6, 0]}>
                      {chartData.genre_breakdown.map((_, i) => (
                        <Cell key={i} fill={GENRE_PALETTE[i % GENRE_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty msg="Watch some movies to see your genre breakdown." />}
            </ChartCard>

            {/* Chart 2: Mood Donut */}
            <ChartCard
              title="Mood Distribution"
              subtitle="How you've been feeling"
              icon={TrendingUp}
            >
              {donutData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#1a1f2e] border border-slate-700 rounded-xl px-4 py-2.5 shadow-xl text-xs">
                            <p className="font-bold capitalize" style={{ color: d.color }}>
                              {MOOD_EMOJIS[d.name] || ''} {d.name}
                            </p>
                            <p className="text-slate-300">{d.value} sessions</p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-[10px] text-slate-400 capitalize">{value}</span>
                      )}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty msg="Pick a mood on the home screen to start tracking." />}
            </ChartCard>

            {/* Chart 3: Weekday usage */}
            <ChartCard
              title="Usage by Day"
              subtitle="When you use the app most"
              icon={Calendar}
            >
              {chartData?.weekday_usage?.some(d => d.sessions > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData.weekday_usage} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipBox unit=" sessions" />} cursor={{ fill: '#ffffff08' }} />
                    <Bar dataKey="sessions" name="Sessions" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty msg="Check back after a few sessions to see your usage pattern." />}
            </ChartCard>

            {/* Chart 4: Monthly watches */}
            <ChartCard
              title="Movies Watched"
              subtitle="Monthly watching trend"
              icon={Star}
            >
              {chartData?.monthly_watches?.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.monthly_watches} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipBox unit=" movies" />} cursor={{ stroke: '#6366F1', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Movies"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fill="url(#watchGrad)"
                      dot={{ fill: '#6366F1', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty msg="Mark some movies as watched to see your trend." />}
            </ChartCard>

          </div>
        )}
      </section>

    </div>
  );
};

// ── Tiny stat card component ──────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, valueClass = 'text-3xl' }) => (
  <div className="p-5 rounded-2xl glass-card border border-slate-800 bg-[#0E121E]">
    <div className="flex items-center justify-between text-slate-400 mb-2">
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className={`font-black text-white ${valueClass} truncate`}>{value}</div>
    <span className="text-[11px] text-slate-500 mt-1 block">{sub}</span>
  </div>
);
