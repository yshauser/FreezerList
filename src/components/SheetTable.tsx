
// src/components/SheetTable.tsx
import React, {useMemo, useState} from 'react';
import type { Entry } from '../types';
import { groupByCategory  } from '../lib/fetchSheet';

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

export const SheetTable: React.FC<Props> = ({ entries, onEdit, onDelete }) => {
  const grouped = useMemo(() => groupByCategory(entries), [entries]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (cat: string) => setCollapsed(s => ({ ...s, [cat]: !(s[cat] ?? false) }));


  const headers = ['product', 'category', 'date', 'amount', 'units', 'cleanState', 'skinState', 'comments'];
  const rtl = { direction: 'rtl' as const };


  return (
    <div className="table-wrapper" style={rtl}>
      {Object.entries(grouped).map(([category, rows]) => (
               <section key={category} className="category">
          <header className="category-header" onClick={() => toggle(category)}>
            <span className="chevron">{collapsed[category] ? '▸' : '▾'}</span>
            <h3>{category} <small>({rows.length})</small></h3>
          </header>

          {!collapsed[category] && (
            <table className="nice-table">
              <thead>
                <tr>
                  {headers.filter(h => h !== 'category').map(h => <th key={h}>{headerHebrewMap[h]?? h}</th>)}
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id || row.product + row.category + row.date}>
                    <td>{row.product}</td>
                    <td>{row.date}</td>
                    <td className="num">{isNaN(row.amount) ? '' : row.amount}</td>
                    <td>{row.units}</td>
                    <td>{row.cleanState ? 'כן' : 'לא'}</td>
                    <td>{row.skinState ? 'כן' : 'לא'}</td>
                    <td className="comments">{row.comments}</td>
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
      ))}
    </div>
  );

}