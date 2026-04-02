import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Calculator, Zap, Trophy } from 'lucide-react'
import { useTokenTax, type FormatResult } from './hooks/useTokenTax'

// ── Per-format colour themes ────────────────────────────────────────────────
const FORMAT_THEME: Record<string, {
  banner: string        // banner background + border classes
  bannerHeading: string // large heading text colour
  accent: string        // small accent numbers colour
  tabActive: string     // active pill classes
}> = {
  'TOON':         {
    banner:        'bg-emerald-950 border-emerald-500',
    bannerHeading: 'text-emerald-300',
    accent:        'text-emerald-400',
    tabActive:     'bg-emerald-600 border-emerald-600 text-white',
  },
  'Compact JSON': {
    banner:        'bg-blue-950 border-blue-500',
    bannerHeading: 'text-blue-300',
    accent:        'text-blue-400',
    tabActive:     'bg-blue-600 border-blue-600 text-white',
  },
  'YAML':         {
    banner:        'bg-purple-950 border-purple-500',
    bannerHeading: 'text-purple-300',
    accent:        'text-purple-400',
    tabActive:     'bg-purple-600 border-purple-600 text-white',
  },
  'XML':          {
    banner:        'bg-orange-950 border-orange-500',
    bannerHeading: 'text-orange-300',
    accent:        'text-orange-400',
    tabActive:     'bg-orange-600 border-orange-600 text-white',
  },
}

const IDLE_BANNER = {
  banner:        'bg-zinc-900 border-zinc-700',
  bannerHeading: 'text-zinc-500',
  accent:        'text-zinc-400',
  tabActive:     'bg-zinc-700 border-zinc-700 text-white',
}

function theme(formatName: string | undefined) {
  if (!formatName) return IDLE_BANNER
  return FORMAT_THEME[formatName] ?? IDLE_BANNER
}

// ── Demo payload pre-loaded so the class can hit Calculate immediately ──────
const DEMO_JSON = `{
  "order": {
    "id": "ORD-20481",
    "status": "processing",
    "createdAt": "2026-04-02T09:15:00Z",
    "customer": {
      "id": "CUST-9921",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "tier": "premium"
    },
    "items": [
      { "sku": "WIDGET-A", "name": "Blue Widget", "qty": 3, "unitPrice": 12.99 },
      { "sku": "GADGET-X", "name": "Smart Gadget", "qty": 1, "unitPrice": 89.00 },
      { "sku": "CABLE-USB", "name": "USB-C Cable", "qty": 2, "unitPrice": 7.49 }
    ],
    "shipping": {
      "method": "express",
      "carrier": "FedEx",
      "estimatedDays": 2,
      "address": {
        "line1": "123 Main Street",
        "city": "Springfield",
        "state": "IL",
        "zip": "62701",
        "country": "US"
      }
    },
    "totals": {
      "subtotal": 136.94,
      "tax": 10.96,
      "shipping": 9.99,
      "grand": 157.89
    }
  }
}`

// ── Metric badge ─────────────────────────────────────────────────────────────
function MetricBadge({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm px-3 py-1.5 rounded-full border ${colour}`}>
      <span className="text-zinc-400 font-sans text-xs">{label}</span>
      {value}
    </span>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { error, baselineTokens, results, winner, calculate } = useTokenTax()

  const [input, setInput]               = useState(DEMO_JSON)
  const [activeFormat, setActiveFormat] = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)

  // When a new calculation completes, reset the active tab to show the winner.
  useEffect(() => { setActiveFormat(null) }, [winner])

  // The result displayed in the right panel — winner by default, or the tapped tab.
  const displayed: FormatResult | null =
    activeFormat ? (results.find(r => r.formatName === activeFormat) ?? winner) : winner

  const displayTheme = theme(displayed?.formatName)

  const handleCalculate = useCallback(() => { calculate(input) }, [calculate, input])

  const handleCopy = useCallback(() => {
    if (!displayed?.outputString) return
    navigator.clipboard.writeText(displayed.outputString).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [displayed])

  const handleTabClick = useCallback((formatName: string) => {
    setActiveFormat(prev => prev === formatName ? null : formatName)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">

      {/* ── App header ────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 shrink-0">
        <Zap size={26} className="text-yellow-400" />
        <span className="text-xl font-bold tracking-tight">Token Tax Calculator</span>
        <span className="ml-auto font-mono text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
          GPT-4 BPE tokenizer
        </span>
      </header>

      {/* ── Verdict banner ────────────────────────────────────────────── */}
      <div className={`border-b-2 px-6 py-5 shrink-0 transition-colors duration-300 ${displayTheme.banner}`}>
        {winner ? (
          <>
            <p className={`text-3xl font-extrabold flex items-center gap-3 ${displayTheme.bannerHeading}`}>
              <Trophy size={30} />
              {winner.formatName} Wins! Most token-efficient format.
            </p>
            <p className="text-lg text-zinc-300 mt-2">
              Saved{' '}
              <span className={`font-mono font-bold text-xl ${displayTheme.accent}`}>
                {winner.tokensSaved.toLocaleString()}
              </span>{' '}
              tokens{' '}
              <span className={`font-mono font-bold text-xl ${displayTheme.accent}`}>
                ({winner.percentageSaved}%)
              </span>{' '}
              compared to Pretty JSON.
            </p>
          </>
        ) : (
          <p className="text-2xl font-bold text-zinc-600">
            Paste your JSON on the left and hit{' '}
            <span className="text-yellow-500">Calculate Token Tax</span> to see the winner.
          </p>
        )}
      </div>

      {/* ── Split pane ────────────────────────────────────────────────── */}
      <main className="flex flex-col md:flex-row flex-1 divide-y md:divide-y-0 md:divide-x divide-zinc-800">

        {/* ── LEFT — Input panel ──────────────────────────────────────── */}
        <section className="flex flex-col flex-1 p-6 gap-4">

          {/* Panel header */}
          <div className="flex items-center justify-between min-h-9">
            <h2 className="text-base font-semibold text-zinc-300 uppercase tracking-widest">
              Input · Pretty JSON
            </h2>
            {baselineTokens !== null && (
              <MetricBadge
                label="baseline"
                value={`${baselineTokens.toLocaleString()} tokens`}
                colour="bg-zinc-800 border-zinc-700 text-yellow-400"
              />
            )}
          </div>

          {/* Textarea */}
          <textarea
            className="flex-1 min-h-72 bg-zinc-900 border border-zinc-700 rounded-xl p-4
                       font-mono text-sm text-zinc-100 resize-none leading-relaxed
                       focus:outline-none focus:border-zinc-500 transition-colors"
            placeholder="Paste your pretty-printed JSON here…"
            value={input}
            onChange={e => setInput(e.target.value)}
            spellCheck={false}
          />

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 bg-red-950/60 border border-red-700 rounded-xl px-4 py-3">
              <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
              <p className="font-mono text-sm text-red-300 leading-snug">{error}</p>
            </div>
          )}

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            className="flex items-center justify-center gap-2
                       bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600
                       text-zinc-950 font-bold text-lg px-6 py-3.5 rounded-xl
                       transition-colors cursor-pointer select-none shrink-0"
          >
            <Calculator size={22} />
            Calculate Token Tax
          </button>
        </section>

        {/* ── RIGHT — Output panel ────────────────────────────────────── */}
        <section className="flex flex-col flex-1 p-6 gap-4">

          {/* Panel header */}
          <div className="flex items-center justify-between min-h-9">
            <h2 className="text-base font-semibold text-zinc-300 uppercase tracking-widest">
              {displayed ? `Output · ${displayed.formatName}` : 'Output · Waiting'}
            </h2>
            {displayed && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600
                           border border-zinc-600 text-zinc-200 text-sm px-3 py-1.5 rounded-lg
                           transition-colors cursor-pointer select-none"
              >
                {copied
                  ? <><Check size={15} className="text-emerald-400" /> Copied!</>
                  : <><Copy size={15} /> Copy</>
                }
              </button>
            )}
          </div>

          {/* Metrics row */}
          {displayed && (
            <div className="flex flex-wrap gap-2">
              <MetricBadge
                label="tokens"
                value={displayed.tokenCount.toLocaleString()}
                colour="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
              <MetricBadge
                label={displayed.tokensSaved >= 0 ? 'saved' : 'extra'}
                value={`${displayed.tokensSaved >= 0 ? '▼' : '▲'} ${Math.abs(displayed.tokensSaved).toLocaleString()}`}
                colour={displayed.tokensSaved >= 0
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : 'bg-red-950 border-red-700 text-red-300'}
              />
              <MetricBadge
                label="vs baseline"
                value={`${displayed.percentageSaved >= 0 ? '-' : '+'}${Math.abs(displayed.percentageSaved)}%`}
                colour={displayed.percentageSaved >= 0
                  ? 'bg-blue-950 border-blue-700 text-blue-300'
                  : 'bg-red-950 border-red-700 text-red-300'}
              />
            </div>
          )}

          {/* Output display */}
          <pre
            className="flex-1 min-h-72 bg-zinc-900 border border-zinc-700 rounded-xl p-4
                       font-mono text-sm text-zinc-100 overflow-auto whitespace-pre-wrap
                       leading-relaxed"
          >
            {displayed
              ? displayed.outputString
              : <span className="text-zinc-600">Converted output will appear here…</span>
            }
          </pre>

          {/* Format comparison tabs */}
          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800">
              <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1">Compare:</span>
              {results.map(r => {
                const isActive =
                  activeFormat === r.formatName ||
                  (activeFormat === null && r.formatName === winner?.formatName)
                const t = FORMAT_THEME[r.formatName] ?? IDLE_BANNER
                return (
                  <button
                    key={r.formatName}
                    onClick={() => handleTabClick(r.formatName)}
                    title={`${r.tokenCount.toLocaleString()} tokens · ${r.tokensSaved >= 0 ? '-' : '+'}${Math.abs(r.percentageSaved)}% vs baseline`}
                    className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border
                                transition-colors cursor-pointer select-none
                                ${isActive
                                  ? t.tabActive
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                                }`}
                  >
                    {r.formatName === winner?.formatName && (
                      <Trophy size={11} className={isActive ? 'text-yellow-300' : 'text-yellow-500'} />
                    )}
                    {r.formatName}
                    <span className="opacity-70">· {r.tokenCount.toLocaleString()} tok</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
