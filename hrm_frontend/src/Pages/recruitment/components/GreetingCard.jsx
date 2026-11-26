import React, { useMemo } from "react";
import { Clock3 } from "lucide-react";

/**
 * Dashboard greeting card ("Morning illustration").
 * Light sky card with soft rings and a sun that changes with the time of day:
 *   morning   -> low sun, rising in on load
 *   afternoon -> high sun
 *   evening   -> moon and twinkling stars
 * The yellow sun is decorative only; it is never used as a status colour.
 */
const getPeriod = (hour) => (hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening");

const GREETING = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" };

const SKY = {
  morning: "from-white via-primary-50 to-amber-50",
  afternoon: "from-white via-primary-50 to-primary-100",
  evening: "from-white via-primary-50 to-primary-200",
};

// Sun / moon height inside the 460x220 illustration (smaller y = higher in the sky)
const BODY_Y = { morning: 128, afternoon: 74, evening: 92 };

const Illustration = ({ period }) => {
  const y = BODY_Y[period];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 460 220"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[460px] max-w-[60%] sm:block"
    >
      {/* soft rings, they slowly breathe */}
      <g style={{ transformOrigin: `380px ${y}px` }} className="greeting-ring">
        <circle cx="380" cy={y} r="150" className="fill-primary-100/40 stroke-primary-200/60" strokeWidth="1" />
      </g>
      <g style={{ transformOrigin: `380px ${y}px`, animationDelay: "1.2s" }} className="greeting-ring">
        <circle cx="380" cy={y} r="108" className="fill-primary-100/50 stroke-primary-200/70" strokeWidth="1" />
      </g>
      <g style={{ transformOrigin: `380px ${y}px`, animationDelay: "2.4s" }} className="greeting-ring">
        <circle cx="380" cy={y} r="70" className="fill-primary-100/70 stroke-primary-200/80" strokeWidth="1" />
      </g>

      {/* sun or moon: rises in once, then floats */}
      <g key={period} className="greeting-rise">
        <g className="greeting-float">
          {period === "evening" ? (
            <>
              <circle cx="380" cy={y} r="30" className="fill-primary-200" />
              <circle cx="392" cy={y - 8} r="26" className="fill-primary-50" />
              {[
                [300, 40], [330, 150], [430, 40], [270, 100], [440, 150],
              ].map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="2"
                  className="greeting-twinkle fill-primary-400"
                  style={{ animationDelay: `${i * 0.6}s` }}
                />
              ))}
            </>
          ) : (
            <>
              <circle cx="380" cy={y} r="44" className="greeting-glow fill-amber-300/40" />
              <circle cx="380" cy={y} r="28" className="fill-amber-400" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
};

/**
 * Props
 *  name       first name to greet (optional)
 *  date       formatted date string
 *  attention  [{ label, value, filter }]
 *  onChipClick(item)  called when a chip is clicked
 *  controls   node rendered on the right (range toggle, refresh)
 */
const GreetingCard = ({ name, date, attention = [], onChipClick, controls }) => {
  const period = useMemo(() => getPeriod(new Date().getHours()), []);
  const items = attention.filter((a) => a.value > 0);
  const total = items.reduce((sum, a) => sum + a.value, 0);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${SKY[period]} p-5 shadow-sm sm:p-6 animate-slide-up`}
    >
      <Illustration period={period} />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="greeting-text text-2xl font-bold tracking-tight text-slate-900">
            {GREETING[period]}
            {name ? `, ${name}` : ""}
          </h2>
          <p className="greeting-text mt-1 text-sm text-slate-600" style={{ animationDelay: "120ms" }}>
            {date}
            {total > 0 && ` · ${total} ${total === 1 ? "thing needs" : "things need"} your attention today`}
          </p>

          {items.length > 0 && (
            <div className="greeting-text mt-4 flex flex-wrap items-center gap-2" style={{ animationDelay: "240ms" }}>
              <Clock3 size={16} className="text-primary-700" aria-hidden="true" />
              {items.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => onChipClick?.(a)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                >
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-600 px-1 text-[11px] font-bold text-white">
                    {a.value}
                  </span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {controls && <div className="relative flex items-center gap-2">{controls}</div>}
      </div>
    </section>
  );
};

export default GreetingCard;
