"use client";

import { useEffect, useRef, useState } from "react";
import { useWs } from "./ws-provider";

type Snapshot = {
  timestamp: string;
  total_portfolio_value: number;
};

export function PortfolioChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const { update } = useWs();

  useEffect(() => {
    fetch("/api/portfolio-history?hours=72")
      .then((r) => r.json())
      .then((data: Snapshot[]) => setSnapshots(data));
  }, []);

  useEffect(() => {
    if (update?.snapshots.length) {
      // Reverse: API returns newest-first, chart needs chronological order
      const newest = [...(update.snapshots as unknown as Snapshot[])].reverse();
      setSnapshots((prev) => [...prev, ...newest]);
    }
  }, [update]);

  useEffect(() => {
    if (!containerRef.current || snapshots.length === 0) return;

    let cancelled = false;
    import("lightweight-charts").then(({ createChart, ColorType, LineStyle }) => {
      if (cancelled || !containerRef.current) return;

      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#888",
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: "#e5e5e5", style: LineStyle.Dashed },
          horzLines: { color: "#e5e5e5", style: LineStyle.Dashed },
        },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#ccc" },
        rightPriceScale: { borderColor: "#ccc" },
        crosshair: {
          horzLine: { style: LineStyle.Dashed, color: "#888" },
          vertLine: { style: LineStyle.Dashed, color: "#888" },
        },
      });

      const series = chart.addLineSeries({
        color: "#1a1a1a",
        lineWidth: 2,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });

      const chartData = snapshots.map((s) => ({
        time: Math.floor(new Date(s.timestamp).getTime() / 1000) as import("lightweight-charts").UTCTimestamp,
        value: s.total_portfolio_value,
      }));

      series.setData(chartData);
      chart.timeScale().fitContent();
      chartRef.current = chart;

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    });

    return () => { cancelled = true; };
  }, [snapshots]);

  return (
    <div className="sketch-card bg-paper p-5">
      <h2 className="font-hand text-xl font-semibold mb-3">Portfolio Value</h2>
      <div ref={containerRef} />
      {snapshots.length === 0 && (
        <div className="h-[300px] flex items-center justify-center text-ink-lighter text-sm font-hand text-lg">
          No data yet...
        </div>
      )}
    </div>
  );
}
