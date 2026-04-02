import { useState, useCallback } from 'react';
import { countTokens } from 'gpt-tokenizer';
import { encode as toonEncode } from '@toon-format/toon';
import yaml from 'js-yaml';
import { js2xml } from 'xml-js';

export interface FormatResult {
  formatName: string;
  outputString: string;
  tokenCount: number;
  tokensSaved: number;
  percentageSaved: number;
}

export interface TokenTaxResult {
  error: string | null;
  baselineTokens: number | null;
  results: FormatResult[];
  winner: FormatResult | null;
  calculate: (input: string) => void;
}

function toXml(data: unknown): string {
  // xml-js compact mode expects a plain object where keys become element names.
  // Wrap the payload in a <root> element so the output is always valid XML.
  const wrapped = { root: data };
  return js2xml(wrapped as Parameters<typeof js2xml>[0], { compact: true, spaces: 0 });
}

export function useTokenTax(): TokenTaxResult {
  const [error, setError] = useState<string | null>(null);
  const [baselineTokens, setBaselineTokens] = useState<number | null>(null);
  const [results, setResults] = useState<FormatResult[]>([]);
  const [winner, setWinner] = useState<FormatResult | null>(null);

  const calculate = useCallback((input: string) => {
    // Reset all state before each run so stale data never leaks into the UI.
    setError(null);
    setBaselineTokens(null);
    setResults([]);
    setWinner(null);

    // ── Step 1: Validate ──────────────────────────────────────────────────────
    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not parse input.';
      setError(`Invalid JSON — ${message}`);
      return;
    }

    // ── Step 2: Baseline token count (the raw pretty-printed input) ───────────
    const baseline = countTokens(input);
    setBaselineTokens(baseline);

    // ── Step 3: Convert & count each format ───────────────────────────────────
    const candidates: Array<{ name: string; output: string }> = [];

    // 3a. Compact JSON
    candidates.push({
      name: 'Compact JSON',
      output: JSON.stringify(data),
    });

    // 3b. TOON
    try {
      candidates.push({ name: 'TOON', output: toonEncode(data) });
    } catch {
      candidates.push({ name: 'TOON', output: '[TOON encoding failed for this input]' });
    }

    // 3c. YAML
    try {
      candidates.push({ name: 'YAML', output: yaml.dump(data) });
    } catch {
      candidates.push({ name: 'YAML', output: '[YAML encoding failed for this input]' });
    }

    // 3d. XML
    try {
      candidates.push({ name: 'XML', output: toXml(data) });
    } catch {
      candidates.push({ name: 'XML', output: '[XML encoding failed for this input]' });
    }

    // ── Step 4: Build result objects with metrics ─────────────────────────────
    const computed: FormatResult[] = candidates.map(({ name, output }) => {
      const tokenCount = countTokens(output);
      const tokensSaved = baseline - tokenCount;
      const percentageSaved = baseline > 0 ? Math.round((tokensSaved / baseline) * 100) : 0;
      return { formatName: name, outputString: output, tokenCount, tokensSaved, percentageSaved };
    });

    // ── Step 5: Determine winner (lowest token count) ─────────────────────────
    const winnerResult = computed.reduce((best, r) =>
      r.tokenCount < best.tokenCount ? r : best
    );

    setResults(computed);
    setWinner(winnerResult);
  }, []);

  return { error, baselineTokens, results, winner, calculate };
}
