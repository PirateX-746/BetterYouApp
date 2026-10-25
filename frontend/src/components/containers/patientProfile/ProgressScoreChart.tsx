"use client";

import { useCallback, useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "@/lib/api";

interface Props {
  patientId: string;
}

interface DataPoint {
  date: string;
  score: number;
}

export default function ProgressScoreChart({ patientId }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/progress-notes", { params: { patientId } });
      const notes = Array.isArray(res.data) ? res.data : [];
      const points: DataPoint[] = notes
        .filter((n: { progressScore?: number }) => n.progressScore != null)
        .map((n: { sessionDate: string; progressScore: number }) => ({
          date: new Date(n.sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: n.progressScore,
        }))
        .reverse();
      setData(points);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || data.length < 2) return null;

  const latest = data[data.length - 1]?.score;
  const prev = data[data.length - 2]?.score;
  const trend = latest != null && prev != null ? latest - prev : 0;

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Progress Score</h3>
          <p className="text-xs text-text-secondary">Session-by-session trend</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary">{latest}<span className="text-sm font-normal text-text-secondary">/10</span></p>
          {trend !== 0 && (
            <p className={`text-xs font-medium ${trend > 0 ? "text-success-strong" : "text-danger-strong"}`}>
              {trend > 0 ? "+" : ""}{trend} from last session
            </p>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
