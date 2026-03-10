// src/components/MobileCardView.tsx
import React, { useMemo, useState, useRef } from 'react';
import type { Entry } from '../types';
import { groupByCategory } from '../lib/fetchSheet';
import { formatDateToDDMMYY } from '../lib/dateUtils';
import { useVibration } from '../contexts/VibrationContext';
import { vibrateShort } from '../lib/vibration';

interface Props {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onQuickAdjust: (entry: Entry, delta: number) => void;
}

/** Gesture tuning */
const SWIPE_THRESHOLD = 60;
const REVEAL_FACTOR = 3;
const REVEAL_MAX = SWIPE_THRESHOLD * REVEAL_FACTOR;
const DELTA_INCREASE = 1;
const DELTA_DECREASE = 1;

type CardProps = {
  row: Entry;
  isSelected: boolean;
  isExpanded: boolean;
  onRowTapSelect: (id: string, wasSelected: boolean) => void;
  onToggleExpandedExclusive: (id: string) => void;
  onQuickAdjust: (e: Entry, delta: number) => void;
};

const GestureCard: React.FC<CardProps> = ({
  row,
  isSelected,
  isExpanded,
  onRowTapSelect,
  onToggleExpandedExclusive,
  onQuickAdjust,
}) => {
  const { vibrationEnabled } = useVibration();
  const touchStartX = useRef<number>(0);
  const lastX = useRef<number>(0);
  const startTime = useRef<number>(0);
  const moved = useRef<boolean>(false);
  const lastToggleRef = useRef<{ id: string; t: number }>({ id: '', t: 0 });
  const isMeat = row.category === 'בשר';
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [revealDir, setRevealDir] = useState<'left' | 'right' | null>(null);
  const [pendingDelta, setPendingDelta] = useState<number | null>(null);

  function toggleSelectOnce() {
    if (!row.id) return;
    const now = Date.now();
    if (lastToggleRef.current.id === row.id && now - lastToggleRef.current.t < 200) return;
    lastToggleRef.current = { id: row.id, t: now };
    onRowTapSelect(row.id, isSelected);
  }

  const onMouseUp = () => {
    toggleSelectOnce();
  };

  const onTouchStart = (ev: React.TouchEvent) => {
    const t = ev.touches[0];
    touchStartX.current = t.clientX;
    lastX.current = t.clientX;
    startTime.current = Date.now();
    moved.current = false;
    setSwiping(!isMeat);
    setRevealDir(null);
  };

  const onTouchMove = (ev: React.TouchEvent) => {
    const t = ev.touches[0];
    lastX.current = t.clientX;

    const dxAbs = Math.abs(t.clientX - touchStartX.current);
    if (dxAbs > 6) moved.current = true;

    if (isMeat) {
      setOffset(0);
      setRevealDir(null);
      return;
    }

    const dx = t.clientX - touchStartX.current;
    const clamped = Math.max(-REVEAL_MAX, Math.min(REVEAL_MAX, dx));
    setOffset(clamped);

    setRevealDir(clamped < 0 ? 'left' : clamped > 0 ? 'right' : null);
  };

  const onTouchEnd = () => {
    const dx = lastX.current - touchStartX.current;
    const abs = Math.abs(dx);

    if (!isMeat && abs >= SWIPE_THRESHOLD) {
      if (vibrationEnabled) vibrateShort();
      const delta = dx < 0 ? +DELTA_INCREASE : -DELTA_DECREASE;
      setPendingDelta(delta);
    } else {
      const dt = Date.now() - startTime.current;
      if (dt < 300) toggleSelectOnce();
    }

    setSwiping(false);
    setOffset(0);
    setRevealDir(null);
  };

  const confirmSwipe = () => {
    if (pendingDelta !== null) {
      onQuickAdjust(row, pendingDelta);
      setPendingDelta(null);
    }
  };

  const cancelSwipe = () => {
    setPendingDelta(null);
  };

  const cardClass =
    `mobile-card ${isSelected ? 'selected ' : ''}` +
    `${swiping ? 'swiping ' : ''}` +
    `${!isMeat && revealDir === 'left' ? 'reveal-left ' : ''}` +
    `${!isMeat && revealDir === 'right' ? 'reveal-right ' : ''}`;

  return (
    <>
      <div
        className={cardClass.trim()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseUp={onMouseUp}
      >
        <div className="mobile-card-content" style={{ transform: `translateX(${isMeat ? 0 : offset}px)` }}>
          <div className="mobile-card-header">
            {row.comments?.trim() && (
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
            )}
            <span className="product-name">{row.product}</span>
          </div>

          <div className="mobile-card-info">
            <span className="amount-units">
              {isNaN(row.amount) ? '' : row.amount} {row.units}
            </span>
            <span className="date">{formatDateToDDMMYY(row.date)}</span>
          </div>

          {isMeat && (
            <div className="mobile-card-badges">
              <span className={`badge ${row.cleanState ? 'active' : ''}`}>
                {row.cleanState ? '✓' : '✗'} נקי
              </span>
              <span className={`badge ${row.skinState ? 'active' : ''}`}>
                {row.skinState ? '✓' : '✗'} עור
              </span>
            </div>
          )}
        </div>

        {isExpanded && row.comments?.trim() && (
          <div className="mobile-card-comments">{row.comments}</div>
        )}
      </div>

      {pendingDelta !== null && (
        <div className="modal-backdrop" onClick={cancelSwipe}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>אישור שינוי</h3>
            <p>
              {pendingDelta > 0 ? 'להגדיל ב-' : 'להקטין ב-'}
              {Math.abs(pendingDelta)}?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelSwipe}>
                ביטול
              </button>
              <button className="btn-primary" onClick={confirmSwipe}>
                אישור
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const MobileCardView: React.FC<Props> = ({ entries, onEdit, onDelete, onQuickAdjust }) => {
  const grouped = useMemo(() => groupByCategory(entries), [entries]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initialCollapsed: Record<string, boolean> = {};
    Object.keys(grouped).forEach((category) => {
      initialCollapsed[category] = true;
    });
    return initialCollapsed;
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const collapseAllExpanded = () => setExpanded(new Set());

  const onRowTapSelect = (id: string, wasSelected: boolean) => {
    if (wasSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      collapseAllExpanded();
      setSelected(new Set([id]));
    }
  };

  const toggleSection = (cat: string) => setCollapsed((s) => ({ ...s, [cat]: !s[cat] }));

  const toggleExpandedExclusive = (id: string) => {
    setExpanded((prev) => (prev.has(id) ? new Set() : new Set([id])));
  };

  const sortByProductName = (rows: Entry[]) => {
    return [...rows].sort((a, b) => {
      const av = (a.product ?? '').toString();
      const bv = (b.product ?? '').toString();
      return av.localeCompare(bv, 'he');
    });
  };

  const applyDeltaToSelected = (delta: number) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    entries.forEach((e) => {
      if (e.id && selected.has(e.id)) onQuickAdjust(e, delta);
    });
  };

  const doDeleteSelected = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    entries.forEach((e) => {
      if (e.id && selected.has(e.id)) onDelete(e);
    });
    setSelected(new Set());
  };

  const doEditSelected = () => {
    const ids = Array.from(selected);
    if (ids.length !== 1) {
      alert('עריכה נתמכת כשפריט אחד נבחר');
      return;
    }
    const target = entries.find((e) => e.id === ids[0]);
    if (target) onEdit(target);
  };

  return (
    <div className="mobile-card-view" style={{ direction: 'rtl' }}>
      {Object.entries(grouped).map(([category, rows]) => {
        const sortedRows = sortByProductName(rows);
        
        return (
        <section key={category} className="category">
          <header className="category-header" onClick={() => toggleSection(category)}>
            <span className="chevron">{collapsed[category] ? '▸' : '▾'}</span>
            <h3>
              {category} <small>({rows.length})</small>
            </h3>
          </header>

          {!collapsed[category] && (
            <div className="mobile-cards-container">
              {sortedRows.map((row) => (
                <GestureCard
                  key={row.id || row.product + row.date}
                  row={row}
                  isSelected={row.id ? selected.has(row.id) : false}
                  isExpanded={row.id ? expanded.has(row.id) : false}
                  onRowTapSelect={onRowTapSelect}
                  onToggleExpandedExclusive={toggleExpandedExclusive}
                  onQuickAdjust={onQuickAdjust}
                />
              ))}
            </div>
          )}
        </section>
        );
      })}

      {selected.size > 0 && (
        <div className="actions-bar">
          <div className="bar">
            <button title="עריכה (פריט אחד)" onClick={doEditSelected}>
              ✏️
            </button>
            <button title="מחיקה" className="danger" onClick={doDeleteSelected}>
              🗑️
            </button>
            <button title="הגדל" onClick={() => applyDeltaToSelected(+DELTA_INCREASE)}>
              ➕
            </button>
            <button title="הקטן" onClick={() => applyDeltaToSelected(-DELTA_DECREASE)}>
              ➖
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
