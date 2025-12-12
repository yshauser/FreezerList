// src/components/SheetTable.tsx
import React, {useMemo, useState, useRef} from 'react';
import type { Entry } from '../types';
import { groupByCategory  } from '../lib/fetchSheet';
import { formatDateToDDMMYY } from '../lib/dateUtils';

interface Props {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onQuickAdjust: (entry: Entry, delta: number) => void;
}

/** Gesture tuning */
const SWIPE_THRESHOLD = 40;           // px finger travel to count as swipe
// const LONG_PRESS_MS   = 500;          // ms to trigger selection
const DELTA_INCREASE = 1;
const DELTA_DECREASE  = 1;            // can be changed if required

const headerHebrewMap: Record<string, string> = {
  product: 'מוצר',
  category: 'קטגוריה',
  amount: 'כמות',
  date: 'תאריך',
  units: 'יחידות',
  cleanState: 'נקי',
  skinState: 'עור',
  // comments: 'הערות',
}

// Which headers to show per category
function headersForCategory(category: string): string[] {
  // For 'בשר' show cleanState & skinState; otherwise omit them
  return category === 'בשר'
    ? ['product', 'date', 'amount', 'units', 'cleanState', 'skinState']
    : ['product', 'date', 'amount', 'units'];
}

// Sort state per category
type SortDir = 'asc' | 'desc';
type SortKey =   | 'product'  | 'date'  | 'amount'  | 'units'  | 'cleanState'  | 'skinState'  | 'comments';
// Comparators per column (type-aware)
const compare = (key: SortKey) => (a: Entry, b: Entry) => {
  switch (key) {
    case 'amount': {
      const av = isNaN(a.amount) ? -Infinity : a.amount;
      const bv = isNaN(b.amount) ? -Infinity : b.amount;
      return av - bv;
    }
    case 'date': {
      // a.date is ISO string (YYYY-MM-DD). Empty dates go last.
      const ad = a.date ? new Date(a.date).getTime() : -Infinity;
      const bd = b.date ? new Date(b.date).getTime() : -Infinity;
      return ad - bd;
    }
    case 'cleanState':
    case 'skinState': {
      // true > false, undefined goes last
      const av = a[key] === true ? 1 : a[key] === false ? 0 : -1;
      const bv = b[key] === true ? 1 : b[key] === false ? 0 : -1;
      return av - bv;
    }
    case 'product':
    case 'units':
    case 'comments': {
      const av = (a[key] ?? '').toString();
      const bv = (b[key] ?? '').toString();
      // localeCompare with Hebrew support
      return av.localeCompare(bv, 'he');
    }
    default:
      return 0;
  }
};
type RowProps = {
  row: Entry;
  headers: string[];
  isSelected: boolean;
  isExpanded: boolean;
  onRowTapSelect: (id: string, wasSelected: boolean) => void;
  onToggleExpandedExclusive: (id: string) => void;
  onQuickAdjust: (e: Entry, delta: number) => void;
};
const GestureRow: React.FC<RowProps> = ({ row, headers, isSelected, isExpanded, onRowTapSelect, onToggleExpandedExclusive ,onQuickAdjust }) => {
  const touchStartX = useRef<number>(0);
  const lastX = useRef<number>(0);
  const startTime   = useRef<number>(0);
  const moved       = useRef<boolean>(false);
  const lastToggleRef = useRef<{ id: string; t: number }>({ id: '', t: 0 });

  // const longTimer   = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);   // px, for visible swipe
  const [swiping, setSwiping] = useState(false);
  const [revealDir, setRevealDir] = useState<'left' | 'right' | null>(null);

  function toggleSelectOnce() {
  if (!row.id) return;
  const now = Date.now();
  // Skip if we just toggled this same row very recently (duplicate touch/click)
  if (lastToggleRef.current.id === row.id && now - lastToggleRef.current.t < 200) return;
  lastToggleRef.current = { id: row.id, t: now };
  onRowTapSelect(row.id, isSelected); // your exclusive selection handler
}

const onMouseUp = () => {
  // desktop click selection  // desktop click selection
  toggleSelectOnce();
};

  const onTouchStart = (ev: React.TouchEvent) => {
    const t = ev.touches[0];
    touchStartX.current = t.clientX;
    lastX.current = t.clientX;
    startTime.current   = Date.now();
    moved.current       = false;
    setSwiping(true);
    setRevealDir(null);

    // schedule long-press
    // longTimer.current = window.setTimeout(() => {
    //   if (!moved.current && row.id) onToggleSelected(row.id);
    // }, LONG_PRESS_MS);
  };

  const onTouchMove = (ev: React.TouchEvent) => {
    const t = ev.touches[0];
    lastX.current = t.clientX;

    const dxAbs = Math.abs(t.clientX - touchStartX.current);
    if (dxAbs > 6) moved.current = true;

    // show row displacement; clamp to [-60, +60]
    const dx = t.clientX - touchStartX.current;
    const clamped = Math.max(-60, Math.min(60, dx));
    setOffset(clamped);

    // Reveal icon direction: left (user swiping left) → increase; right → decrease
    setRevealDir(clamped < 0 ? 'left' : (clamped > 0 ? 'right' : null));

    // if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; }
  };
  const onTouchEnd = () => {
    // if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; }

    const dx  = lastX.current - touchStartX.current;
    const abs = Math.abs(dx);

    // Commit swipe if threshold crossed
  if (abs >= SWIPE_THRESHOLD) {
    if (dx < 0) onQuickAdjust(row, +DELTA_INCREASE);
    else        onQuickAdjust(row, -DELTA_DECREASE);
  } else {
    const dt = Date.now() - startTime.current;
    if (dt < 300) toggleSelectOnce();  // select/unselect only here on phones
  }

    // animate row back
    setSwiping(false);
    setOffset(0);
    setRevealDir(null);
  };

  const displayCell = (key: string) => {
    switch (key) {
      case 'date': return formatDateToDDMMYY(row.date);
      case 'amount': return <span dir="rtl">{isNaN(row.amount) ? '' : row.amount}</span>;
      case 'cleanState': return row.cleanState ? 'כן' : 'לא';
      case 'skinState':  return row.skinState  ? 'כן' : 'לא';
      default: return (row as any)[key] ?? '';
    }
  };

  // Compose row CSS classes based on swipe state/direction
  const rowClass =
    `${isSelected ? 'selected ' : ''}` +
    `${swiping ? 'swiping ' : ''}` +
    `${revealDir === 'left'  ? 'reveal-left '  : ''}` +
    `${revealDir === 'right' ? 'reveal-right ' : ''}`;

  const renderFirstCell = (firstKey: string) => (
    <td key={firstKey}>
      <div className="cell-inner" style={{ transform: `translateX(${offset}px)` }}>

      <button
        type="button"
        className="expand-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (row.id) onToggleExpandedExclusive(row.id);
        }}
        title={isExpanded ? 'סגור הערות' : 'פתח הערות'}
      >
        {isExpanded ? '▾' : '▸'}
      </button>

        {' '}
        {displayCell(firstKey)}
      </div>
    </td>
  );

  return (
    <>
      <tr
        className={rowClass.trim()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseUp={onMouseUp}          // keep desktop selection
          // onClick={() => { if (row.id) onRowTapSelect(row.id, isSelected); }} // desktop clicks also select
      >
       {/* first cell with chevron */}
        {renderFirstCell(headers[0])}

        {/* rest of the cells */}
        {headers.slice(1).map((h) => (
          <td key={h} className={h === 'amount' ? 'num' : undefined}>
            <div className="cell-inner" style={{ transform: `translateX(${offset}px)` }}>
              {displayCell(h)}
            </div>
          </td>
        ))}
        {/* {headers.map((h) => (
          <td key={h} className={h === 'amount' ? 'num' : undefined}>
            { This row should be commented -> Only cell-inner moves; icons stay static }
            <div className="cell-inner" style={{ transform: `translateX(${offset}px)` }}>
              {displayCell(h)}
            </div>
            </td>
        ))} */}
      </tr>
      
      {isExpanded && (
        <tr className="expanded">
          <td colSpan={headers.length}>
            {row.comments?.trim() ? row.comments : '—'}
          </td>
        </tr>
      )}
    </>
  );
};


export const SheetTable: React.FC<Props> = ({ entries, onEdit, onDelete, onQuickAdjust }) => {
  const grouped = useMemo(() => groupByCategory(entries), [entries]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});    
  const [sortState, setSortState] = useState<Record<string, { key: SortKey; dir: SortDir }>>({
    'בשר': { key: 'product', dir: 'desc' },
    // add others if you want defaults
  })
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  // Collapse all expanded comments
  const collapseAllExpanded = () => setExpanded(new Set());

  // Toggle selection with exclusivity:
  // - Tap a *different* row -> select only that row & collapse expansions
  // - Tap the *same* selected row -> unselect it
  const onRowTapSelect = (id: string, wasSelected: boolean) => {
    if (wasSelected) {
      // unselect if already selected
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      // select only this row and close expansions
      collapseAllExpanded();
      setSelected(new Set([id]));
    }
  };

  const toggleSection = (cat: string) =>
    setCollapsed(s => ({ ...s, [cat]: !(s[cat] ?? false) }));

  // Toggle sorting per category
  const onSortClick = (cat: string, key: SortKey) =>
    setSortState(prev => {
      const curr = prev[cat];
      if (!curr || curr.key !== key) return { ...prev, [cat]: { key, dir: 'asc' } };
      return { ...prev, [cat]: { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' } };
  });

  const sortRows = (cat: string, rows: Entry[]) => {
    const s = sortState[cat];
    if (!s) return rows;
    const sorted = [...rows].sort(compare(s.key));
    return s.dir === 'asc' ? sorted : sorted.reverse();
  };

  // Expand comments exclusively: expanding one row collapses all others
  const toggleExpandedExclusive = (id: string) => {
    setExpanded(prev => (prev.has(id) ? new Set() : new Set([id])));
  };

    // bulk actions: operate on selected ids
  const applyDeltaToSelected = (delta: number) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    entries.forEach(e => {
      if (e.id && selected.has(e.id)) onQuickAdjust(e, delta);
    });
  };
  const doDeleteSelected = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    entries.forEach(e => {
      if (e.id && selected.has(e.id)) onDelete(e);
    });
    setSelected(new Set());
  };
  const doEditSelected = () => {
    const ids = Array.from(selected);
    if (ids.length !== 1) { alert('עריכה נתמכת כשפריט אחד נבחר'); return; }
    const target = entries.find(e => e.id === ids[0]);
    if (target) onEdit(target);
  };


return (
    <div className="table-wrapper" style={{ direction: 'rtl' }}>
      {Object.entries(grouped).map(([category, rows]) => {
        const headers = headersForCategory(category);
        const catSort = sortState[category]; // current sort state for indicator
        const sortedRows = sortRows(category, rows);

        return (
          <section key={category} className="category">
            <header className="category-header" onClick={() => toggleSection(category)}>
              <span className="chevron">{collapsed[category] ? '▸' : '▾'}</span>
              <h3>{category} <small>({rows.length})</small></h3>
            </header>

            {!collapsed[category] && (
              <table className="nice-table">
                <thead>
                  <tr>
                    {headers.map((h) => {
                      const isSorted = catSort?.key === h;
                      const arrow = isSorted ? (catSort!.dir === 'asc' ? '▲' : '▼') : '';
                      return (
                        <th
                          key={h}
                          className="sortable"
                          onClick={() => onSortClick(category, h as SortKey)}
                          title="מיין לפי עמודה זו"
                        >
                          {headerHebrewMap[h] ?? h} {arrow && <span className="sort-arrow">{arrow}</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                  <GestureRow
                    key={row.id || row.product + row.date}
                    row={row}
                    headers={headers}
                    isSelected={row.id ? selected.has(row.id) : false}
                    isExpanded={row.id ? expanded.has(row.id) : false}
                    onRowTapSelect={onRowTapSelect}
                    onToggleExpandedExclusive={toggleExpandedExclusive}
                    onQuickAdjust={onQuickAdjust}
                  />
                 ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

 {/* Actions bar when at least one selected */}
      {selected.size > 0 && (
        <div className="actions-bar">
          <div className="bar">
            <button title="עריכה (פריט אחד)" onClick={doEditSelected}>✏️</button>
            <button title="מחיקה" className="danger" onClick={doDeleteSelected}>🗑️</button>
            <button title="הגדל" onClick={() => applyDeltaToSelected(+DELTA_INCREASE)}>➕</button>
            <button title="הקטן" onClick={() => applyDeltaToSelected(-DELTA_DECREASE)}>➖</button>
          </div>
        </div>
      )}

    </div>
  );
}