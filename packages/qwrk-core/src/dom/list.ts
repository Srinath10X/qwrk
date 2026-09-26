import { append, relocate } from "#qwrk/dom/children.js";
import { deep, toRaw } from "#qwrk/reactivity/deep.js";
import {
  computation,
  dispose,
  own,
  peek,
  retain,
  watch,
  type Computation,
  type State,
} from "#qwrk/reactivity/state.js";

/**
 * A rendered item: owns the derives and effects `fn` created for it. Its
 * nodes are the one node `fn` returned, or empty text markers around the rest.
 */
interface Row extends Computation {
  /** First node. */
  h: ChildNode;
  /** Last node. */
  t: ChildNode;
}

/**
 * A keyed list: owns its rows, which sit between its two markers, and the last
 * marker keeps it alive.
 */
interface List extends Row {
  /** The rows, in order. */
  c: Row[];
  /** Each row's item, unwrapped. */
  k: unknown[];
  /** The array's state. */
  g: State<unknown>;
}

/**
 * Renders `source`'s items with `fn` and keeps the rows in sync with it, see
 * {@link State.map}.
 */
export function list(source: State<unknown>, fn: (item: any) => unknown) {
  const nodes = document.createDocumentFragment();
  const self = computation(
    { o: new Set(), k: [], g: source, h: text(), t: text() },
    fn as () => unknown,
  ) as unknown as List;

  nodes.append(self.h, self.t);
  retain(self.t, self);
  update(self, 0, peek(source));
  watch(source, self, update);
  return nodes;
}

function text() {
  return document.createTextNode("");
}

/**
 * Diffs the items against the rows by identity. It skips the common start
 * and end and swaps the first and last rows. Then, when no row is left to
 * keep, it removes the rest at once and inserts the new rows at once.
 * Otherwise it removes the rows whose item is gone, and walks the items
 * backwards, creating rows and moving only the rows that are not in a longest
 * increasing subsequence of old positions.
 */
function update(self: List, _: unknown, value: unknown) {
  if (self.q == 3) return;

  const items: unknown[] = Array.isArray(value) ? value : [];
  const { k: a, c: rows, h: start, t: end } = self;
  const b = items.map(toRaw);
  const next: Row[] = Array(b.length);
  const old: (Row | 0)[] = rows;
  const positions = new Map<unknown, number>();
  const same = new Int32Array(a.length);
  const sources = new Int32Array(b.length);
  let s = 0;
  let aEnd = a.length;
  let bEnd = b.length;

  self.k = b;
  self.c = next;

  while (s < aEnd && s < bEnd) {
    if (a[s] === b[s]) {
      next[s] = rows[s++];
    } else if (a[aEnd - 1] === b[bEnd - 1]) {
      next[--bEnd] = rows[--aEnd];
    } else if (a[s] === b[bEnd - 1] && a[aEnd - 1] === b[s]) {
      const first = rows[s];
      const last = rows[--aEnd];
      const anchor = next[bEnd]?.h ?? end;
      relocate(last.h, last.t, first.h);
      if (first.t.nextSibling !== anchor) relocate(first.h, first.t, anchor);
      next[s++] = last;
      next[--bEnd] = first;
    } else {
      break;
    }
  }

  for (let i = aEnd; i-- > s;) {
    same[i] = positions.get(a[i]) ?? -1;
    positions.set(a[i], i);
  }

  for (let j = s; j < bEnd; j++) {
    const i = positions.get(b[j]) ?? -1;

    if (i >= 0) {
      positions.set(b[j], same[i]);
      sources[j] = i + 1;
      next[j] = rows[i];
      old[i] = 0;
    }
  }

  const kept = sequence(sources);

  if (kept.length) {
    for (let i = s; i < aEnd; i++) {
      if (old[i]) (dispose(rows[i]), relocate(rows[i].h, rows[i].t));
    }

    for (let j = bEnd, k = kept.length - 1; j-- > s;) {
      if (!sources[j]) insert(self, items, next, j, j + 1);
      else if (kept[k] === j) k--;
      else relocate(next[j].h, next[j].t, next[j + 1]?.h ?? end);
    }
  } else {
    if (s < aEnd) {
      const first = rows[s].h;
      const last = rows[aEnd - 1].t;
      const parent = end.parentNode!;

      for (let i = s; i < aEnd; i++) dispose(rows[i]);

      if (
        start.previousSibling ||
        end.nextSibling ||
        first.previousSibling !== start ||
        last.nextSibling !== end
      ) {
        relocate(first, last);
      } else {
        parent.textContent = "";
        parent.append(start, end);
      }
    }
    insert(self, items, next, s, bEnd);
  }
}

/**
 * Creates the rows of `items[from..to)` and inserts them at once. Each one
 * calls `fn` with its item as reading `.value[i]` would return it, untracked,
 * in a new scope that owns what `fn` creates.
 */
function insert(
  self: List,
  items: unknown[],
  next: Row[],
  from: number,
  to: number,
) {
  const nodes = document.createDocumentFragment();
  const source = self.g as any;

  for (let j = from; j < to; j++) {
    const row = { s: self.s, o: self.o, c: [], p: self, q: 0 } as any as Row;
    const item = source.f ? items[j] : deep(items[j], source);
    const result: any = own(row, self.f, item);

    if (result instanceof Node && result.nodeType != 11) {
      row.h = row.t = nodes.appendChild(result as ChildNode);
    } else {
      row.h = nodes.appendChild(text());
      append(nodes, result);
      row.t = nodes.appendChild(text());
    }
    next[j] = row;
  }
  (next[to]?.h ?? self.t).before(nodes);
}

/**
 * Returns the positions of a longest increasing subsequence of `values`,
 * skipping zeros.
 */
function sequence(values: Int32Array) {
  const previous = new Int32Array(values.length);
  const tails: number[] = [];

  values.forEach((value, i) => {
    if (value) {
      let low = 0;
      let high = tails.length;

      while (low < high) {
        const middle = (low + high) >> 1;
        if (values[tails[middle]] < value) low = middle + 1;
        else high = middle;
      }

      previous[i] = tails[low - 1];
      tails[low] = i;
    }
  });

  for (let i = tails.length, at = tails[i - 1]; i--; at = previous[at]) {
    tails[i] = at;
  }
  return tails;
}
