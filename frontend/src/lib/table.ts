/** Table cards: typed columns, raw cell text, and a small formula language (=SUM(A1:A3)*2). */

export type ColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'checkbox';
export interface Column { name: string; type: ColumnType }
export interface Table { columns: Column[]; rows: string[][] }

export const COLUMN_TYPES: [ColumnType, string][] = [
  ['text', 'Text'], ['number', 'Number'], ['currency', 'Currency'], ['percent', 'Percent'], ['date', 'Date'], ['checkbox', 'Checkbox'],
];

export function emptyTable(): Table {
  return { columns: [{ name: 'Item', type: 'text' }, { name: 'Amount', type: 'number' }], rows: [['', ''], ['', ''], ['', '']] };
}

export function readTable(value: unknown): Table {
  const table = value as Partial<Table> | undefined;
  if (!table || !Array.isArray(table.columns) || !table.columns.length || !Array.isArray(table.rows)) return emptyTable();
  const columns = table.columns.map(c => ({ name: String(c?.name ?? ''), type: (COLUMN_TYPES.some(([t]) => t === c?.type) ? c.type : 'text') as ColumnType }));
  const rows = table.rows.map(row => columns.map((_, i) => String((Array.isArray(row) ? row[i] : '') ?? '')));
  return { columns, rows };
}

export const columnName = (index: number) => String.fromCharCode(65 + index);

/** Parse typed text into a number: "1,200", "$12.50", "12%" (0.12). Null when it is not a number. */
export function toNumber(text: string): number | null {
  const clean = text.trim().replace(/[,\s]/g, '').replace(/^[$€£¥]/, '');
  if (!clean) return null;
  const percent = clean.endsWith('%');
  const value = Number(percent ? clean.slice(0, -1) : clean);
  return Number.isFinite(value) ? (percent ? value / 100 : value) : null;
}

type Value = number | string | boolean | null;

/** Evaluate every cell once; formulas see other cells' values, cycles become #CYCLE, bad input #ERR. */
export function evaluate(table: Table): Value[][] {
  const cache = new Map<string, Value>();
  const visiting = new Set<string>();
  const cell = (r: number, c: number): Value => {
    const key = `${r},${c}`;
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) throw new Error('#CYCLE');
    const raw = table.rows[r]?.[c] ?? '';
    let value: Value;
    if (raw.startsWith('=')) {
      visiting.add(key);
      try { value = formula(raw.slice(1), cell, table); } catch (error) { value = error instanceof Error && error.message === '#CYCLE' ? '#CYCLE' : '#ERR'; }
      visiting.delete(key);
    } else if (table.columns[c]?.type === 'checkbox') value = raw === 'true';
    else if (['number', 'currency', 'percent'].includes(table.columns[c]?.type)) value = raw.trim() ? toNumber(raw) ?? raw : null;
    else value = raw;
    cache.set(key, value);
    return value;
  };
  return table.rows.map((row, r) => row.map((_, c) => cell(r, c)));
}

function formula(source: string, cell: (r: number, c: number) => Value, table: Table): number {
  const tokens = source.toUpperCase().match(/\s*([A-Z]+\d+:[A-Z]+\d+|[A-Z]+\d+|[A-Z]+(?=\()|\d+(?:\.\d+)?|[-+*/^(),])/g)?.map(t => t.trim()) || [];
  if (tokens.join('').replace(/\s/g, '') !== source.toUpperCase().replace(/\s/g, '')) throw new Error('#ERR');
  let at = 0;
  const peek = () => tokens[at];
  const take = (expected?: string) => { const token = tokens[at++]; if (expected && token !== expected) throw new Error('#ERR'); return token; };
  const ref = (text: string): [number, number] => {
    const match = /^([A-Z]+)(\d+)$/.exec(text)!;
    return [Number(match[2]) - 1, match[1].charCodeAt(0) - 65];
  };
  const num = (value: Value): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value === null || value === '') return 0;
    if (value === '#CYCLE') throw new Error('#CYCLE');
    const parsed = toNumber(String(value));
    if (parsed === null) throw new Error('#ERR');
    return parsed;
  };
  const range = (text: string): Value[] => {
    const [from, to] = text.split(':').map(ref);
    const values: Value[] = [];
    for (let r = Math.min(from[0], to[0]); r <= Math.max(from[0], to[0]); r++)
      for (let c = Math.min(from[1], to[1]); c <= Math.max(from[1], to[1]); c++)
        if (r < table.rows.length && c < table.columns.length) values.push(cell(r, c));
    return values;
  };
  const FUNCS: Record<string, (values: number[]) => number> = {
    SUM: v => v.reduce((a, b) => a + b, 0),
    AVERAGE: v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0),
    AVG: v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0),
    MIN: v => (v.length ? Math.min(...v) : 0),
    MAX: v => (v.length ? Math.max(...v) : 0),
    COUNT: v => v.length,
    ROUND: v => Number((v[0] ?? 0).toFixed(Math.max(0, Math.min(10, v[1] ?? 0)))),
    ABS: v => Math.abs(v[0] ?? 0),
  };
  const primary = (): number => {
    const token = take();
    if (token === undefined) throw new Error('#ERR');
    if (token === '-') return -primary();
    if (token === '(') { const value = expression(); take(')'); return value; }
    if (/^\d/.test(token)) return Number(token);
    if (FUNCS[token]) {
      take('(');
      const args: number[] = [];
      if (peek() !== ')') {
        do {
          const next = peek();
          if (next && next.includes(':')) {
            take();
            // COUNT counts filled cells; the others use the numbers among them.
            const values = range(next).filter(v => v !== null && v !== '');
            if (token === 'COUNT') args.push(...values.map(() => 1));
            else args.push(...values.map(num));
          } else args.push(expression());
        } while (peek() === ',' && take(','));
      }
      take(')');
      return FUNCS[token](args);
    }
    if (/^[A-Z]+\d+$/.test(token)) { const [r, c] = ref(token); return r < table.rows.length && c < table.columns.length ? num(cell(r, c)) : 0; }
    throw new Error('#ERR');
  };
  const power = (): number => { let value = primary(); while (peek() === '^') { take(); value = value ** primary(); } return value; };
  const term = (): number => {
    let value = power();
    while (peek() === '*' || peek() === '/') { const op = take(); const right = power(); if (op === '/' && right === 0) throw new Error('#ERR'); value = op === '*' ? value * right : value / right; }
    return value;
  };
  const expression = (): number => {
    let value = term();
    while (peek() === '+' || peek() === '-') { const op = take(); const right = term(); value = op === '+' ? value + right : value - right; }
    return value;
  };
  const result = expression();
  if (at !== tokens.length || !Number.isFinite(result)) throw new Error('#ERR');
  return result;
}

export function display(value: Value, type: ColumnType): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : '';
  if (typeof value === 'string') {
    if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00`);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return value;
  }
  if (type === 'currency') return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  if (type === 'percent') return value.toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
