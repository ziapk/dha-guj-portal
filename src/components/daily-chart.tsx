"use client";

import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";

export type DailyPoint = { date: string; value: number };

const PAD = { top: 12, right: 8, bottom: 26, left: 40 };

/** A round axis maximum (1, 2, 5 × 10ⁿ) so the gridlines land on readable numbers. */
function niceMax(value: number): number {
  if (value <= 4) {
    return 4;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));

  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) {
      return step * magnitude;
    }
  }

  return 10 * magnitude;
}

const compact = (value: number) => (value >= 10_000 ? `${Math.round(value / 1000)}k` : value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(value));

/** Column path with 4px rounded top corners, flat on the baseline. */
function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);

  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

/** One series of daily counts as columns, with gridlines, date labels and a hover tooltip. Drawn in SVG (no chart library). */
export function DailyChart({ data, label, height = 240 }: { data: DailyPoint[]; label: string; height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(0, ...data.map((point) => point.value)));
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const slot = data.length > 0 ? plotWidth / data.length : 0;
  // Keep a 2px gap between columns while they are wide enough to afford it.
  const gap = slot >= 6 ? 2 : 0;
  const columnWidth = Math.max(1, Math.min(32, slot - gap));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio));
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotWidth / 64))));
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const active = hovered !== null ? data[hovered] : null;

  return (
    <div ref={wrapRef} className="daily-chart" style={{ height }} onMouseLeave={() => setHovered(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${label} per day: ${total.toLocaleString("en-PK")} in total over ${data.length} days`}>
          {ticks.map((tick) => {
            const y = PAD.top + plotHeight - (tick / max) * plotHeight;

            return (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} className={tick === 0 ? "daily-chart-baseline" : "daily-chart-grid"} />
                <text x={PAD.left - 8} y={y} dy="0.32em" textAnchor="end" className="daily-chart-axis">
                  {compact(tick)}
                </text>
              </g>
            );
          })}

          {data.map((point, index) => {
            const x = PAD.left + index * slot + (slot - columnWidth) / 2;
            const barHeight = (point.value / max) * plotHeight;
            const y = PAD.top + plotHeight - barHeight;

            return (
              <g key={point.date}>
                {point.value > 0 && <path d={columnPath(x, y, columnWidth, barHeight)} className={`daily-chart-column${hovered === index ? " active" : ""}`} />}
                {index % labelEvery === 0 && (
                  <text x={PAD.left + index * slot + slot / 2} y={height - 8} textAnchor="middle" className="daily-chart-axis">
                    {dayjs(point.date).format("DD MMM")}
                  </text>
                )}
                {/* Hit target: the whole day slot, taller and wider than the column. */}
                <rect x={PAD.left + index * slot} y={PAD.top} width={slot} height={plotHeight} fill="transparent" onMouseEnter={() => setHovered(index)} />
              </g>
            );
          })}
        </svg>
      )}

      {active && hovered !== null && (
        <div
          className="daily-chart-tooltip"
          style={{
            left: Math.min(Math.max(PAD.left + hovered * slot + slot / 2, 70), width - 70),
            top: PAD.top + plotHeight - (active.value / max) * plotHeight,
          }}
        >
          <div className="daily-chart-tooltip-date">{dayjs(active.date).format("ddd, DD MMM YYYY")}</div>
          <div>
            <strong>{active.value.toLocaleString("en-PK")}</strong> {label.toLowerCase()}
          </div>
        </div>
      )}
    </div>
  );
}
