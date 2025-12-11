
// src/components/SheetTable.tsx
import React, {useMemo, useState} from 'react';
import type { Entry } from '../types';
import { groupByCategory  } from '../lib/fetchSheet';
import { formatDateToDDMMYY } from '../lib/dateUtils';

interface Props {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

const headerHebrewMap: Record<string, string> = {
  product: 'מוצר',
  category: 'קטגוריה',
  amount: 'כמות',
  date: 'תאריך',
  cleanState: 'נקי',
  skinState: 'עור',
  comments: 'הערות',
  units: 'יחידות',
}


// Which headers to show per category
function headersForCategory(category: string): string[] {
  // For 'בשר' show cleanState & skinState; otherwise omit them
  return category === 'בשר'
    ? ['product', 'date', 'amount', 'units', 'cleanState', 'skinState', 'comments']
    : ['product', 'date', 'amount', 'units', 'comments'];
}


// Sort state per category
type SortDir = 'asc' | 'desc';
type SortKey =
  | 'product'
  | 'date'
  | 'amount'
  | 'units'
  | 'cleanState'
  | 'skinState'
  | 'comments';


export const SheetTable: React.FC<Props> = ({ entries, onEdit, onDelete }) => {
  const grouped = useMemo(() => groupByCategory(entries), [entries]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});    
  const [sortState, setSortState] = useState<Record<string, { key: SortKey; dir: SortDir }>>({
    'בשר': { key: 'product', dir: 'desc' },
    // add others if you want defaults
  })



  const toggle = (cat: string) =>
    setCollapsed(s => ({ ...s, [cat]: !(s[cat] ?? false) }));

  // Toggle sorting per category
  const onSortClick = (cat: string, key: SortKey) => {
    setSortState(prev => {
      const curr = prev[cat];
      if (!curr || curr.key !== key) {
        return { ...prev, [cat]: { key, dir: 'asc' } };
      }
      // toggle dir
      const newDir: SortDir = curr.dir === 'asc' ? 'desc' : 'asc';
      return { ...prev, [cat]: { key, dir: newDir } };
    });
  };

  // Comparators per column (type-aware)
  const cmp = (key: SortKey) => (a: Entry, b: Entry) => {
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

  // Sort rows for a given category with current state
  const sortRows = (cat: string, rows: Entry[]): Entry[] => {
    const s = sortState[cat];
    if (!s) return rows;
    const sorted = [...rows].sort(cmp(s.key));
    return s.dir === 'asc' ? sorted : sorted.reverse();
  };

  // Display helpers
  const displayValue = (row: Entry, key: string): React.ReactNode => {
    switch (key) {
      case 'date':
        return formatDateToDDMMYY(row.date);
      case 'amount':
        return <span dir="rtl">{isNaN(row.amount) ? '' : row.amount}</span>;
      case 'cleanState':
        return row.cleanState ? 'כן' : 'לא';
      case 'skinState':
        return row.skinState ? 'כן' : 'לא';
      default:
        return (row as any)[key] ?? '';
    }
  };


  // const headers = ['product', 'category', 'date', 'amount', 'units', 'cleanState', 'skinState', 'comments'];
  // const rtl = { direction: 'rtl' as const };



return (
    <div className="table-wrapper" style={{ direction: 'rtl' }}>
      {Object.entries(grouped).map(([category, rows]) => {
        const headers = headersForCategory(category);
        const catSort = sortState[category]; // current sort state for indicator
        const sortedRows = sortRows(category, rows);

        return (
          <section key={category} className="category">
            <header className="category-header" onClick={() => toggle(category)}>
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
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.id || row.product + row.date}>
                      {/* Render cells based on headers for this category */}
                      {headers.map((h) => (
                        <td key={h} className={h === 'amount' ? 'num' : undefined}>
                          {displayValue(row, h)}
                        </td>
                      ))}
                      <td className="actions">
                        <button title="עריכה" className="icon-btn" onClick={() => onEdit(row)}>✏️</button>
                        <button title="מחיקה" className="icon-btn danger" onClick={() => onDelete(row)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );


}