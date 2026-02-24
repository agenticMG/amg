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
  const seriesRef = useRef<unknown>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const { lastMessage } = useWs();

  useEffect(() => {
    fetch("/api/portfolio-history?hours=72")
      .then((r) => r.json())
      .then((data: Snapshot[]) => setSnapshots(data));
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "snapshot") {
      const s = lastMessage.data as unknown as Snapshot;
      setSnapshots((prev) => [...prev, s]);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!containerRef.current || snapshots.length === 0) return;

    let cancelled = false;
    import("lightweight-charts").then(({ createChart, ColorType, LineStyle }) => {
      if (cancelled || !containerRef.current) return;

      // Dispose old chart
      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#a1a1aa",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "#27272a" },
          horzLines: { color: "#27272a" },
        },
        timeScale: { timeVisible: true, secondsVisible: false },
        rightPriceScale: {
          borderColor: "#27272a",
        },
        crosshair: {
          horzLine: { style: LineStyle.Dashed },
          vertLine: { style: LineStyle.Dashed },
        },
      });

      const series = chart.addLineSeries({
        color: "#10b981",
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
      seriesRef.current = series;

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    });

    return () => {
      cancelled = true;
    };
  }, [snapshots]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <h2 className="text-sm font-medium text-zinc-400 mb-3">Portfolio Value</h2>
      <div ref={containerRef} />
      {snapshots.length === 0 && (
        <div className="h-[300px] flex items-center justify-center text-zinc-600 text-sm">
          No data yet
        </div>
      )}
    </div>
  );
}
