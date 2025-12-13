// src/components/AddProductWizard.tsx
import React, { useEffect, useState, useRef } from 'react';
import type { EntryDraft } from '../types';
import { CATEGORIES, PRODUCTS_BY_CATEGORY, defaultAmountFor, defaultUnitsFor } from '../types';
import { formatDateToDDMMYY, parseDateFromDDMMYY, todayISO } from '../lib/dateUtils';


interface Props {
  open: boolean;
  onCancel: () => void;
  onComplete: (data: EntryDraft) => Promise<void> | void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export const AddProductWizard: React.FC<Props> = ({ open, onCancel, onComplete }) => {
  const [step, setStep] = useState<Step>(1);

  const [draft, setDraft] = useState<EntryDraft>({
    product: '',
    category: 'אחר',  // will be set in step 1
    date: todayISO(),
    amount: 0,
    units: '',
    cleanState: false,
    skinState: false,
    comments: '',
  });

  // DD/MM/YY mirrored field (for step 2 date)
  const [dateDisplay, setDateDisplay] = useState<string>(formatDateToDDMMYY(draft.date));
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // reset wizard each time it opens
    setStep(1);
    const iso = todayISO();
    setDraft(d => ({ ...d, date: iso, product: '', amount: 0, units: '', cleanState: false, skinState: false, comments: '' }));
    setDateDisplay(formatDateToDDMMYY(iso));
  }, [open]);

  if (!open) return null;

  const isMeat = draft.category === 'בשר';

  const next = () => setStep(s => (s < 4 ? ((s + 1) as Step) : s));
  const prev = () => setStep(s => (s > 1 ? ((s - 1) as Step) : s));

  // --- Step 1: category selection ---
  const chooseCategory = (cat: EntryDraft['category']) => {
    setDraft(d => ({ ...d, category: cat, product: '', amount: 0, units: '' }));
    setStep(2);
  };

    /** Step 2: choose predefined product for the chosen category */
  const chooseProduct = (prod: string) => {
    const category = draft.category;

    const defAmount = defaultAmountFor(category, prod);
    const defUnits = defaultUnitsFor(category, prod);

    setDraft(d => ({
      ...d,
      product: prod === 'אחר' ? '' : prod,  // let user type custom name if "אחר"
      amount: defAmount ?? d.amount,        // meat: keep current (0) unless you want another default
      units: defUnits,
    }));

    // proceed to core details
    setStep(3);
  };

  // --- Step 3: core details handlers ---
  const onCoreChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as any;
    setDraft(d => ({
      ...d,
      [name]: name === 'amount' ? Math.max(0, Number(value)) : value,
    }));

    if (name === 'date') {
      setDateDisplay(formatDateToDDMMYY(value));
    }
  };
  const onDateDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateDisplay(val);
    const iso = parseDateFromDDMMYY(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setDraft(d => ({ ...d, date: iso }));
    }
  };
  const openPicker = () => {
    const el = dateInputRef.current;
    if (el?.showPicker) el.showPicker();
    else el?.focus();
  };

  // --- Step 4: meat-only change ---
  const onMeatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setDraft(d => ({ ...d, [name]: checked }));
  };

  // --- Step 5: comments ---
  const onCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(d => ({ ...d, comments: e.target.value }));
  };

  const apply = async () => {
    // final ISO from display if needed
    const isoCandidate = parseDateFromDDMMYY(dateDisplay);
    const finalISO = /^\d{4}-\d{2}-\d{2}$/.test(isoCandidate) ? isoCandidate : draft.date;
    const safeAmount = isNaN(draft.amount) ? 0 : Math.max(0, draft.amount);

    await onComplete({
      ...draft,
      date: finalISO,
      amount: safeAmount,
    });
  };

    // Compute total steps dynamically
  const lastStep: Step = isMeat ? 5 : 4;

  return (
    <div className="modal-backdrop" onClick={onCancel} dir="rtl">
      <div className="modal wizard" onClick={e => e.stopPropagation()}>
        {/* Header + steps indicator */}
        <header className="wizard-head">
          <h2>הוסף מוצר</h2>
          <div className="wizard-steps">
            {/* 1: category */}
            <span className={step >= 1 ? 'done' : ''}>1</span>
            {/* 2: predefined product */}
            <span className={step >= 2 ? 'done' : ''}>2</span>
            {/* 3: core */}
            <span className={step >= 3 ? 'done' : ''}>3</span>
            {/* 4: meat-only (if meat) OR comments */}
            {isMeat ? (
              <>
                <span className={step >= 4 ? 'done' : ''}>4</span>
                <span className={step >= 5 ? 'done' : ''}>5</span>
              </>
            ) : (
              <span className={step >= 4 ? 'done' : ''}>4</span>
            )}
          </div>
        </header>

        {/* Content per step */}
        <div className="wizard-body">
          {step === 1 && (
            <section>
              <p style={{ color: 'var(--muted)' }}>בחר קטגוריה:</p>
              <div className="category-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`cat-btn ${draft.category === cat ? 'active' : ''}`}
                    onClick={() => chooseCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>
          )}
        
        {/* Step 2: product selection (depends on category) */}
          {step === 2 && (
            <section>
              <p style={{ color: 'var(--muted)' }}>בחר מוצר מראש בקטגוריה: <b>{draft.category}</b></p>
              <div className="category-grid">
                {(PRODUCTS_BY_CATEGORY[draft.category] ?? ['אחר']).map(prod => (
                  <button
                    key={prod}
                    className={`cat-btn ${draft.product === prod ? 'active' : ''}`}
                    onClick={() => chooseProduct(prod)}
                  >
                    {prod}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, color: 'var(--muted)' }}>
                אם בחרת <b>אחר</b> — אפשר למלא שם מוצר בשלב הבא.
              </div>
            </section>
          )}

         {/* Step 3: core details */}
          {step === 3 && (
            <section className="form-grid">
              <label>
                מוצר
                <input
                  name="product"
                  value={draft.product}
                  onChange={onCoreChange}
                  required
                  placeholder="שם מוצר"
                />
              </label>

              <label>
                תאריך
                <div className="date-composite">
                  <input
                    className="date-ddmmyy"
                    name="dateDisplay"
                    inputMode="numeric"
                    placeholder="DD/MM/YY"
                    value={dateDisplay}
                    onChange={onDateDisplayChange}
                    aria-label="תאריך בפורמט יום/חודש/שנה (DD/MM/YY)"
                  />
                  <input
                    ref={dateInputRef}
                    className="date-native"
                    type="date"
                    name="date"
                    value={draft.date || ''}
                    onChange={onCoreChange}
                    aria-label="בורר תאריך"
                  />
                  <button type="button" className="calendar-btn" onClick={openPicker} title="בחר תאריך">
                    📅
                  </button>
                </div>
              </label>

              <label>
                כמות
                <input
                  name="amount"
                  type="number"
                  min={0}
                  step="1"
                  value={isNaN(draft.amount) ? '' : draft.amount}
                  onChange={onCoreChange}
                  placeholder="כמות"
                />
              </label>

              <label>
                יחידות
                <input
                  name="units"
                  value={draft.units}
                  onChange={onCoreChange}
                  placeholder="יחידות (למשל: ק״ג, יח׳)"
                />
              </label>
            </section>
          )}

          {step === 4 && isMeat && (
            <section className="form-grid">
              <label className="checkbox">
                <input
                  name="cleanState"
                  type="checkbox"
                  checked={!!draft.cleanState}
                  onChange={onMeatChange}
                />
                מצב נקי
              </label>
              <label className="checkbox">
                <input
                  name="skinState"
                  type="checkbox"
                  checked={!!draft.skinState}
                  onChange={onMeatChange}
                />
                מצב עור
              </label>
            </section>
          )}

          {/* Step 5 (meat): comments + review */}
          {((isMeat && step === 5) || (!isMeat && step === 4)) && (
            <section className="form-grid">
              <label className="col-span">
                הערות
                <textarea
                  name="comments"
                  rows={3}
                  value={draft.comments}
                  onChange={onCommentsChange}
                  placeholder="הערות נוספות (אופציונלי)"
                />
              </label>

              {/* Quick review */}
              <div className="review">
                <div><b>קטגוריה:</b> {draft.category}</div>
                <div><b>מוצר:</b> {draft.product || '—'}</div>
                <div><b>תאריך:</b> {formatDateToDDMMYY(draft.date)}</div>
                <div><b>כמות:</b> {isNaN(draft.amount) ? 0 : draft.amount}</div>
                <div><b>יחידות:</b> {draft.units || '—'}</div>
                {isMeat && (
                  <>
                    <div><b>נקי:</b> {draft.cleanState ? 'כן' : 'לא'}</div>
                    <div><b>עור:</b> {draft.skinState ? 'כן' : 'לא'}</div>
                  </>
                )}
                <div><b>הערות:</b> {draft.comments?.trim() ? draft.comments : '—'}</div>
              </div>
            </section>
          )}
        </div>

        {/* Footer navigation */}
        <footer className="wizard-foot">
          <button className="btn-secondary" onClick={onCancel}>ביטול</button>

          {step > 1 && (
            <button className="btn-secondary" onClick={prev}>חזרה</button>
          )}

          {(() => {
            // Next or Apply button text
            const isLast = step === lastStep;
            return isLast ? (
              <button
                className="btn-primary"
                onClick={apply}
                disabled={!draft.product || draft.amount < 0}
              >
                הוסף
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={next}
                disabled={step === 2 && !draft.product}
              >
                הבא
              </button>
            );
          })()}
        </footer>
      </div>
    </div>
  );
}