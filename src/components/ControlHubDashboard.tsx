import { useState, useMemo, type CSSProperties } from 'react';
import type { DashboardData } from '../types';

// ── Sparkline generation ──
function generateSparkline(base: number, volatility: number, trend: number): number[] {
  const points: number[] = [];
  let val = base - trend * 15;
  for (let i = 0; i < 30; i++) {
    val += trend + (Math.random() - 0.45) * volatility;
    points.push(Math.max(0, val));
  }
  return points;
}

// ── Mock data ──
const MOCK_DATA: DashboardData = {
  mrr: 42350,
  mrrChange: 8.2,
  customers: 847,
  arpu: 50,
  netNewMrr: 3200,
  newThisPeriod: 23,
  churn: { count: 12, percentage: 1.4 },
  trialToPaidConversion: 34,
  monthlyExpenses: 8200,
  profit: 34150,
  teamSalaryTier: 2000,
  revenueByTier: [
    { tier: 'Starter', revenue: 4470, color: '#5490ff' },
    { tier: 'Growth', revenue: 12700, color: '#00c8ff' },
    { tier: 'Pro', revenue: 18680, color: '#00e676' },
    { tier: 'Enterprise', revenue: 6500, color: '#ffa500' },
  ],
  videosProcessed: 284391,
  totalLeadsGenerated: 15420,
  activeFunnels: 312,
  avgFunnelConversion: 12.4,
  uptime: 99.97,
  pointsEarned: 0,
  pointsTotal: 0,
  nextBusinessGoal: {
    name: '$50k MRR',
    target: 50000,
    current: 42350,
    deadline: '2026-03-31',
  },
  nextProductGoal: {
    name: '500k Videos Processed',
    target: '500,000',
    current: '284,391',
    deadline: '2026-06-30',
  },
  sparklines: {
    mrr: generateSparkline(42350, 800, 120),
    customers: generateSparkline(847, 8, 1.2),
    videosProcessed: generateSparkline(284391, 3000, 400),
  },
};

type DateFilter = 'today' | 'week' | 'month' | 'quarter' | 'all';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'all', label: 'All Time' },
];

interface ControlHubDashboardProps {
  onClose: () => void;
}

// ── SVG Sparkline ──
function Sparkline({ data, color, width = 120, height = 32 }: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block', marginTop: 8 }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Stacked Bar ──
function StackedBar({ segments, height = 28 }: {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let x = 0;

  return (
    <div>
      <svg width="100%" height={height} style={{ borderRadius: 6, overflow: 'hidden', display: 'block' }}>
        {segments.map((seg) => {
          const w = (seg.value / total) * 100;
          const bar = (
            <rect
              key={seg.label}
              x={`${x}%`} y="0"
              width={`${w}%`} height={height}
              fill={seg.color}
              opacity={0.85}
            />
          );
          x += w;
          return bar;
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
            <span style={{ fontSize: '0.7rem', color: '#999', fontFamily: 'Space Grotesk' }}>
              {seg.label}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#ccc', fontFamily: 'Space Grotesk', fontWeight: 600 }}>
              ${seg.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Milestone Card ──
function MilestoneCard({ name, target, current, deadline, color, isCurrency = false }: {
  name: string;
  target: number;
  current: number;
  deadline: string;
  color: string;
  isCurrency?: boolean;
}) {
  const progress = Math.min(current / target, 1);
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const prefix = isCurrency ? '$' : '';

  return (
    <div style={cardStyle({ border: `1px solid ${color}22` })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...labelStyle, color: color + 'bb' }}>{name}</span>
        <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'Space Grotesk' }}>
          {daysLeft}d left
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: '1rem', color: '#fff', fontWeight: 600 }}>
          {prefix}{current.toLocaleString()}
        </span>
        <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: '#666' }}>
          / {prefix}{target.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: 2,
          boxShadow: `0 0 8px ${color}44`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

// ── Shared styles ──
const labelStyle: CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '0.65rem',
  color: '#666',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const bigNumberStyle = (color: string): CSSProperties => ({
  fontFamily: 'Orbitron',
  fontSize: '1.8rem',
  color,
  fontWeight: 700,
  lineHeight: 1.1,
});

const numberStyle = (color: string): CSSProperties => ({
  fontFamily: 'Orbitron',
  fontSize: '1.25rem',
  color,
  fontWeight: 700,
  lineHeight: 1.1,
});

const cardStyle = (extra: CSSProperties = {}): CSSProperties => ({
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 14,
  padding: '16px 18px',
  border: '1px solid rgba(255,255,255,0.06)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ...extra,
});

const heroCardStyle = (extra: CSSProperties = {}): CSSProperties => ({
  ...cardStyle(extra),
  padding: '20px 22px',
});

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '0.7rem',
  color: '#555',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
  marginTop: 28,
};

const dateInputStyle: CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '0.75rem',
  padding: '5px 10px',
  borderRadius: 8,
  border: '1px solid #2a2a40',
  background: 'rgba(255,255,255,0.04)',
  color: '#aaa',
  outline: 'none',
  cursor: 'pointer',
  colorScheme: 'dark',
};

export function ControlHubDashboard({ onClose }: ControlHubDashboardProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const data = MOCK_DATA;

  const salaryTierLabel = useMemo(() => {
    const tier = Math.floor(data.mrr / 20000);
    const amount = tier * 1000;
    return amount > 0 ? `+$${amount.toLocaleString()}/mo per person` : 'Base tier';
  }, [data.mrr]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#12121e',
        borderRadius: 18,
        padding: '28px 32px 24px',
        width: '92%',
        maxWidth: 880,
        maxHeight: '92vh',
        overflowY: 'auto',
        border: '1px solid #1e1e33',
      }}>
        {/* Header */}
        <h2 style={{
          fontFamily: 'Orbitron',
          fontSize: '1.4rem',
          color: '#00c8ff',
          marginTop: 0,
          marginBottom: 12,
        }}>Control Hub</h2>

        {/* Date Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {DATE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setDateFilter(f.key); setShowCustomDates(false); setDateFrom(''); setDateTo(''); }}
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '5px 14px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: dateFilter === f.key && !showCustomDates ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.04)',
                color: dateFilter === f.key && !showCustomDates ? '#00c8ff' : '#666',
                boxShadow: dateFilter === f.key && !showCustomDates ? '0 0 12px rgba(0,200,255,0.15)' : 'none',
              }}
            >{f.label}</button>
          ))}

          <button
            onClick={() => setShowCustomDates(!showCustomDates)}
            style={{
              fontFamily: 'Space Grotesk',
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '5px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: showCustomDates ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.04)',
              color: showCustomDates ? '#00c8ff' : '#666',
              boxShadow: showCustomDates ? '0 0 12px rgba(0,200,255,0.15)' : 'none',
            }}
          >Custom</button>

          {showCustomDates && (
            <>
              <div style={{ width: 1, height: 20, background: '#2a2a40', marginLeft: 4, marginRight: 4 }} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={dateInputStyle}
              />
              <span style={{ color: '#444', fontSize: '0.7rem' }}>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={dateInputStyle}
              />
            </>
          )}
        </div>

        {/* ── SECTION 1: YOUR BUSINESS ── */}
        <div style={{ ...sectionTitleStyle, marginTop: 0 }}>Your Business</div>

        {/* Hero Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* MRR */}
          <div style={heroCardStyle({ border: '1px solid rgba(0,200,255,0.12)' })}>
            <div style={labelStyle}>MRR</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={bigNumberStyle('#00c8ff')}>${data.mrr.toLocaleString()}</span>
              <span style={{
                fontFamily: 'Space Grotesk',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: data.mrrChange >= 0 ? '#00e676' : '#ff4444',
                background: data.mrrChange >= 0 ? 'rgba(0,230,118,0.1)' : 'rgba(255,68,68,0.1)',
                padding: '2px 8px',
                borderRadius: 10,
              }}>
                {data.mrrChange >= 0 ? '+' : ''}{data.mrrChange}%
              </span>
            </div>
            <Sparkline data={data.sparklines.mrr} color="#00c8ff" width={200} height={36} />
          </div>

          {/* Profit */}
          <div style={heroCardStyle({ border: `1px solid ${data.profit >= 0 ? 'rgba(0,230,118,0.12)' : 'rgba(255,68,68,0.12)'}` })}>
            <div style={labelStyle}>Profit</div>
            <div style={{ marginTop: 4 }}>
              <span style={bigNumberStyle(data.profit >= 0 ? '#00e676' : '#ff4444')}>
                {data.profit >= 0 ? '' : '-'}${Math.abs(data.profit).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#555', fontFamily: 'Space Grotesk', marginTop: 8 }}>
              MRR minus expenses
            </div>
          </div>

          {/* Customers */}
          <div style={heroCardStyle({ border: '1px solid rgba(0,200,255,0.08)' })}>
            <div style={labelStyle}>Current Customers</div>
            <div style={{ marginTop: 4 }}>
              <span style={bigNumberStyle('#00c8ff')}>{data.customers.toLocaleString()}</span>
            </div>
            <Sparkline data={data.sparklines.customers} color="#00c8ff" width={200} height={36} />
          </div>
        </div>

        {/* Supporting Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {/* ARPU */}
          <div style={cardStyle()}>
            <div style={labelStyle}>ARPU</div>
            <div style={{ ...numberStyle('#7eb8ff'), marginTop: 6 }}>${data.arpu}</div>
          </div>

          {/* Net New MRR */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Net New MRR</div>
            <div style={{ ...numberStyle(data.netNewMrr >= 0 ? '#00e676' : '#ff4444'), marginTop: 6 }}>
              {data.netNewMrr >= 0 ? '+' : '-'}${Math.abs(data.netNewMrr).toLocaleString()}
            </div>
          </div>

          {/* New This Period */}
          <div style={cardStyle()}>
            <div style={labelStyle}>New This Period</div>
            <div style={{ ...numberStyle('#7eb8ff'), marginTop: 6 }}>{data.newThisPeriod}</div>
          </div>

          {/* Trial -> Paid */}
          <div style={cardStyle({ border: '1px solid rgba(0,200,255,0.12)' })}>
            <div style={{ ...labelStyle, color: '#00c8ff99' }}>Trial &rarr; Paid</div>
            <div style={{ ...numberStyle('#00c8ff'), marginTop: 6 }}>{data.trialToPaidConversion}%</div>
          </div>
        </div>

        {/* Financial Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {/* Churn */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Churn</div>
            <div style={{ ...numberStyle('#ff4444'), marginTop: 6 }}>
              {data.churn.count} <span style={{ fontSize: '0.8rem', color: '#ff444499' }}>({data.churn.percentage}%)</span>
            </div>
          </div>

          {/* Monthly Expenses */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Monthly Expenses</div>
            <div style={{ ...numberStyle('#ffa500'), marginTop: 6 }}>${data.monthlyExpenses.toLocaleString()}</div>
          </div>

          {/* Team Salary Tier */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Team Salary Tier</div>
            <div style={{ ...numberStyle('#ffb74d'), marginTop: 6, fontSize: '1rem' }}>{salaryTierLabel}</div>
          </div>
        </div>

        {/* Revenue by Tier */}
        <div style={cardStyle({ marginBottom: 0 })}>
          <div style={{ ...labelStyle, marginBottom: 10 }}>Revenue by Tier</div>
          <StackedBar
            segments={data.revenueByTier.map(t => ({ label: t.tier, value: t.revenue, color: t.color }))}
          />
        </div>

        {/* ── SECTION 2: YOUR PRODUCT ── */}
        <div style={sectionTitleStyle}>Your Product</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          {/* Videos Processed */}
          <div style={cardStyle({ border: '1px solid rgba(0,230,118,0.08)' })}>
            <div style={labelStyle}>Videos Processed</div>
            <div style={{ ...numberStyle('#00e676'), marginTop: 6 }}>{data.videosProcessed.toLocaleString()}</div>
            <Sparkline data={data.sparklines.videosProcessed} color="#00e676" width={160} height={28} />
          </div>

          {/* Total Leads */}
          <div style={cardStyle({ border: '1px solid rgba(0,230,118,0.08)' })}>
            <div style={labelStyle}>Leads Generated</div>
            <div style={{ ...numberStyle('#26c6da'), marginTop: 6 }}>{data.totalLeadsGenerated.toLocaleString()}</div>
          </div>

          {/* Active Funnels */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Active Funnels</div>
            <div style={{ ...numberStyle('#26c6da'), marginTop: 6 }}>{data.activeFunnels}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Avg Funnel Conversion */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Avg Funnel Conversion</div>
            <div style={{ ...numberStyle('#00e676'), marginTop: 6 }}>{data.avgFunnelConversion}%</div>
          </div>

          {/* Uptime */}
          <div style={cardStyle()}>
            <div style={labelStyle}>Uptime</div>
            <div style={{ ...numberStyle(data.uptime >= 99.9 ? '#00e676' : '#ffa500'), marginTop: 6 }}>
              {data.uptime}%
            </div>
          </div>
        </div>

        {/* ── SECTION 3: MILESTONES ── */}
        <div style={sectionTitleStyle}>Milestones</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <MilestoneCard
            name={data.nextBusinessGoal.name}
            target={data.nextBusinessGoal.target}
            current={data.nextBusinessGoal.current}
            deadline={data.nextBusinessGoal.deadline}
            color="#a855f7"
            isCurrency
          />
          <MilestoneCard
            name={data.nextProductGoal.name}
            target={parseNumber(data.nextProductGoal.target)}
            current={parseNumber(data.nextProductGoal.current)}
            deadline={data.nextProductGoal.deadline}
            color="#c084fc"
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: 8,
            color: '#666',
            cursor: 'pointer',
            fontSize: '1rem',
            fontFamily: 'Space Grotesk',
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function parseNumber(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}
