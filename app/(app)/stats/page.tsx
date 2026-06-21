"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Flame, Zap, BookCheck, Layers } from "lucide-react";
import { StreakHeatmap } from "@/components/StreakHeatmap";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { useBooks, useProfile, useSessions } from "@/lib/queries";
import {
  currentStreak,
  longestStreak,
  series,
  readingSpeed,
  speedTrend,
  booksFinishedByMonth,
  genreBreakdown,
  ratingDistribution,
  topAuthors,
  totalPages,
  totalMinutes,
  type Granularity,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

const RISO = ["#0b63f6", "#ff4f9a", "#ffd23f", "#ff6f3c", "#7b5cff"];
const RANGES: { key: string; label: string; days: number; g: Granularity }[] = [
  { key: "d", label: "30 days", days: 30, g: "day" },
  { key: "w", label: "12 weeks", days: 84, g: "week" },
  { key: "m", label: "12 months", days: 365, g: "month" },
];

export default function StatsPage() {
  const { data: books = [] } = useBooks();
  const { data: sessions = [] } = useSessions();
  const { data: profile } = useProfile();
  const [range, setRange] = useState(RANGES[1]);

  const year = new Date().getFullYear();
  const booksThisYear = books.filter(
    (b) => b.read_status === "read" && b.finished_on?.startsWith(String(year)),
  ).length;
  const goal = profile?.goal_books_per_year ?? 24;

  const streak = currentStreak(sessions);
  const longest = longestStreak(sessions);
  const speed = readingSpeed(sessions);

  const pagesSeries = useMemo(
    () => series(sessions, range.days, range.g),
    [sessions, range],
  );
  const finished = useMemo(() => booksFinishedByMonth(books), [books]);
  const genres = useMemo(() => genreBreakdown(books).slice(0, 6), [books]);
  const ratings = useMemo(() => ratingDistribution(books), [books]);
  const authors = useMemo(() => topAuthors(books, 6), [books]);
  const speeds = useMemo(() => speedTrend(sessions), [sessions]);

  const hasSessions = sessions.length > 0;
  const totalMins = totalMinutes(sessions);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Your progress</h1>
        <p className="mt-1 text-text-muted">
          How the habit is coming along, in numbers.
        </p>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Flame className="h-5 w-5 text-riso-orange" />} value={`${streak}`} label="day streak" sub={`longest ${longest}`} />
        <StatCard icon={<BookCheck className="h-5 w-5 text-riso-blue" />} value={`${booksThisYear}`} label={`read in ${year}`} sub={`goal ${goal}`} />
        <StatCard icon={<Zap className="h-5 w-5 text-riso-pink" />} value={speed ? `${Math.round(speed)}` : "—"} label="pages/hour" sub="avg speed" />
        <StatCard icon={<Layers className="h-5 w-5 text-riso-purple" />} value={`${totalPages(sessions)}`} label="pages logged" sub={`${Math.round(totalMins / 60)} hrs`} />
      </div>

      {/* Year goal */}
      <section className="card p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-extrabold">{year} reading goal</h2>
          <span className="font-display text-lg font-extrabold text-riso-blue">
            {booksThisYear}/{goal}
          </span>
        </div>
        <ProgressBar percent={(booksThisYear / Math.max(1, goal)) * 100} height={16} />
        <p className="mt-2 text-sm text-text-muted">
          {booksThisYear >= goal
            ? "🎉 Goal smashed — wonderful!"
            : `${goal - booksThisYear} to go. You've got this.`}
        </p>
      </section>

      {/* Reading heatmap */}
      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold">Reading activity</h2>
        {hasSessions ? (
          <StreakHeatmap sessions={sessions} />
        ) : (
          <p className="text-sm text-text-muted">
            Log some reading and your activity grid will fill in here.
          </p>
        )}
      </section>

      {/* Pages over time */}
      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-extrabold">Pages over time</h2>
          <div className="inline-flex rounded-lg border-2 border-outline bg-surface-2 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-bold transition",
                  range.key === r.key ? "bg-riso-blue text-white" : "text-text-muted",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {pagesSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pagesSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={30} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "2px solid var(--outline)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="pages" fill="#0b63f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-text-muted">No reading logged in this range.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Reading speed trend */}
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Reading speed trend</h2>
          {speeds.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={speeds}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={30} unit="" />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "2px solid var(--outline)",
                    borderRadius: 12,
                  }}
                  formatter={(v) => [`${v} pp/hr`, "Speed"]}
                />
                <Line type="monotone" dataKey="speed" stroke="#ff4f9a" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted">
              Log sessions <b>with minutes</b> over a few weeks to see if you&apos;re
              speeding up.
            </p>
          )}
        </section>

        {/* Books finished per month */}
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Books finished</h2>
          {finished.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={finished}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={24} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "2px solid var(--outline)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" fill="#ff6f3c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted">
              Mark books as read (with a finish date) to chart them here.
            </p>
          )}
        </section>

        {/* Genre breakdown */}
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">By genre</h2>
          {genres.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={genres}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--outline)"
                  strokeWidth={2}
                >
                  {genres.map((_, i) => (
                    <Cell key={i} fill={RISO[i % RISO.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "2px solid var(--outline)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted">
              Tag your books with genres to see the breakdown.
            </p>
          )}
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map((g, i) => (
                <span key={g.name} className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISO[i % RISO.length] }} />
                  {g.name} ({g.value})
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Ratings distribution */}
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Your ratings</h2>
          {books.some((b) => b.rating) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratings}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={24} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "2px solid var(--outline)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" fill="#ffd23f" stroke="var(--outline)" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted">Rate some books to see this.</p>
          )}
        </section>
      </div>

      {/* Top authors */}
      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold">Most-shelved authors</h2>
        {authors.length > 0 ? (
          <ul className="space-y-2">
            {authors.map((a) => {
              const max = authors[0].count;
              return (
                <li key={a.name} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm font-semibold">{a.name}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-outline bg-surface-2">
                    <div
                      className="h-full rounded-full bg-riso-purple"
                      style={{ width: `${(a.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-bold">{a.count}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Layers} title="No authors yet" hint="Add books to see your most-collected authors." />
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 font-display text-3xl font-extrabold">
        {icon}
        {value}
      </div>
      <div className="mt-1 text-sm font-bold">{label}</div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
    </div>
  );
}
