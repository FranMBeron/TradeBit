import type { UserProfile } from "@/types/feed";

type Perf = NonNullable<UserProfile["performanceChange"]>;

const TILES: { key: keyof Perf; label: string }[] = [
  { key: "day", label: "1D" },
  { key: "week", label: "1W" },
  { key: "month", label: "1M" },
  { key: "year", label: "1Y" },
];

function formatPct(val: number | null) {
  if (val === null) return null;
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

interface Props {
  perf: Perf;
}

export function PerformanceCard({ perf }: Props) {
  const hasAny = TILES.some(({ key }) => perf[key] !== null);
  if (!hasAny) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 font-heading">
        Portfolio Performance
      </p>
      <div className="grid grid-cols-4 gap-3">
        {TILES.map(({ key, label }) => {
          const val = perf[key];
          const formatted = formatPct(val);
          const positive = val !== null && val >= 0;
          const negative = val !== null && val < 0;
          return (
            <div
              key={key}
              className="bg-background border border-border rounded-lg p-3 flex flex-col gap-1"
            >
              <span className="text-xs text-muted-foreground font-mono">{label}</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  positive
                    ? "text-[#63de77]"
                    : negative
                      ? "text-[#fe566b]"
                      : "text-muted-foreground"
                }`}
              >
                {formatted ?? "—"}
              </span>
              <span className="text-xs">
                {positive ? (
                  <span className="text-[#63de77]">↑</span>
                ) : negative ? (
                  <span className="text-[#fe566b]">↓</span>
                ) : (
                  <span className="text-muted-foreground">·</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
