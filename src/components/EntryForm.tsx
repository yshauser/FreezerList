// src/components/EntryForm.tsx
import React, { useEffect, useState, useRef } from 'react';
import type { Entry, EntryDraft } from '../types';
import { CATEGORIES, UNITS_FRACTIONS, LOCATIONS } from '../types';
import { formatDateToDDMMYY, parseDateFromDDMMYY, todayISO } from '../lib/dateUtils';

// const getTodayDateFormatted = () => {
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = (today.getMonth() + 1).toString().padStart(2, '0');
//   const day = today.getDate().toString().padStart(2, '0');
//   return `${year}-${month}-${day}`;
// };

interface Props {
	open: boolean;
	initial?: Entry;                   // if provided → Edit mode
	onCancel: () => void;
	onApply: (data: EntryDraft) => Promise<void> | void;
}



export const EntryForm: React.FC<Props> = ({ open, initial, onCancel, onApply }) => {
	const [draft, setDraft] = useState<EntryDraft>({
		product: '',
		category: 'בשר',
		date: todayISO(),
		amount: 0,
		units: '',
		cleanState: false,
		skinState: false,
		comments: '',
		location: '',
	});

	
	// DD/MM/YY display mirrors the ISO date:
	const [dateDisplay, setDateDisplay] = useState<string>(formatDateToDDMMYY(draft.date));
	const dateInputRef = useRef<HTMLInputElement>(null);


	useEffect(() => {
		if (!open) return;
		if (initial) {
			const { id, ...rest } = initial;
			setDraft({ id, ...rest});
			setDateDisplay(formatDateToDDMMYY(rest.date));
		} else {
			const iso = todayISO();
			setDraft(d => ({ ...d, date: iso }));
			setDateDisplay(formatDateToDDMMYY(iso));
		}
	}, [initial, open]);


	if (!open) return null;


 const onChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value, type, checked } = e.target as any;
		setDraft(d => ({
			...d,
			[name]:
				type === 'checkbox'
					? checked
					: name === 'amount'
					? Number(value)
					: value,
		}));

		// If the native ISO date changed, mirror to DD/MM/YY
		if (name === 'date') {
			setDateDisplay(formatDateToDDMMYY(value));
		}
	};



 // User edits the DD/MM/YY field
	const onDateDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setDateDisplay(val);
		const iso = parseDateFromDDMMYY(val);
		// If parse produced an ISO-like string, update draft.date
		if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
			setDraft(d => ({ ...d, date: iso }));
		}
	};


	const openPicker = () => {
		const el = dateInputRef.current;
		// Chromium-based browsers support showPicker; others will just focus.
		if (el?.showPicker) el.showPicker();
		else el?.focus();
	};
	
	const apply = async (e: React.FormEvent) => {
		e.preventDefault();
		// Final sanity: ensure draft.date is ISO (derive from display if needed)
		const isoCandidate = parseDateFromDDMMYY(dateDisplay);
		const finalISO =
			/^\d{4}-\d{2}-\d{2}$/.test(isoCandidate) ? isoCandidate : draft.date;
		await onApply({ ...draft, date: finalISO });
	};


	return (
		<div className="modal-backdrop" onClick={onCancel}>
			<div className="modal" onClick={e => e.stopPropagation()}>
				<h2 style={{ marginTop: 0 }}>{initial ? 'עריכת מוצר' : 'הוסף מוצר'}</h2>
				<div className="modal-body">
				<form onSubmit={apply} className="form-grid">
					<label>
						מוצר
						<input name="product" value={draft.product} onChange={onChange} required />
					</label>
					<label>
						קטגוריה
						<select name="category" value={draft.category} onChange={onChange} required>
							
					{CATEGORIES.map(cat => (
							<option key={cat} value={cat}>{cat}</option>
						))}

						</select>
					</label>
	
					<label>
						תאריך
						<div className="date-composite">
							{/* Visible DD/MM/YY field */}
							<input
								className="date-ddmmyy"
								name="dateDisplay"
								inputMode="numeric"
								placeholder="DD/MM/YY"
								value={dateDisplay}
								onChange={onDateDisplayChange}
								aria-label="תאריך בפורמט יום/חודש/שנה (DD/MM/YY)"
							/>
							{/* Native date input (ISO) kept for picker/icon */}
							<input
								ref={dateInputRef}
								className="date-native"
								type="date"
								name="date"
								value={draft.date || ''}
								onChange={onChange}
								aria-label="בורר תאריך"
							/>
							<button type="button" className="calendar-btn" onClick={openPicker} title="בחר תאריך">
								📅
							</button>
						</div>
					</label>

					<label>
						כמות
						{draft.category === 'קטניות' ? (
							<>
								<input 
									name="amount" 
									type="number" 
									step="0.25" 
									list="fractions-list"
									value={isNaN(draft.amount) ? '' : draft.amount} 
									onChange={onChange} 
									onFocus={(e) => e.target.select()}
								/>
								<datalist id="fractions-list">
									{UNITS_FRACTIONS.map(fraction => (
										<option key={fraction} value={fraction} />
									))}
									<option value={1} />
								</datalist>
							</>
						) : (
							<input name="amount" type="number" step="1" 
							value={isNaN(draft.amount) ? '' : draft.amount} 
							onChange={onChange} 
 							onFocus={(e) => e.target.select()}
							/>
						)}
					</label>
					<label>
						יחידות
						<input name="units" value={draft.units} onChange={onChange} />
					</label>

					<label>
						מיקום
						<select name="location" value={draft.location ?? ''} onChange={onChange}>
							{LOCATIONS.map(loc => (
								<option key={loc} value={loc}>{loc === '' ? 'לא ידוע' : loc}</option>
							))}
						</select>
					</label>

					<label className="checkbox">
						<input name="cleanState" type="checkbox" checked={!!draft.cleanState} onChange={onChange} />
						מצב נקי
					</label>
					<label className="checkbox">
						<input name="skinState" type="checkbox" checked={!!draft.skinState} onChange={onChange} />
						מצב עור
					</label>

					<label className="col-span">
						הערות
						<textarea name="comments" rows={3} value={draft.comments} onChange={onChange} />
					</label>
				</form>
				        {/* NEW: sticky footer with actions */}
	      <div className="modal-actions">
					<button type="button" className="btn-secondary" onClick={onCancel}>ביטול</button>
					<button type="submit" className="btn-primary" onClick={apply}>אישור</button>
				</div>
				</div>
			</div>
		</div>
	);
}