// src/lib/dateUtils.ts

// New function to format date for display in dd/mm/yy
export const formatDateToDDMMYY = (dateString: string | undefined) => {
 if (!dateString) return '';
 const [year, month, day] = dateString.split('-');
 if (!year || !month || !day) return dateString;
 return `${day}/${month}/${year.slice(-2)}`;
};

// New function to parse date from dd/mm/yy input to YYYY-MM-DD
export const parseDateFromDDMMYY = (dateString: string) => {
 if (!dateString) return '';
 const parts = dateString.split('/');
 if (parts.length === 3) {
   let [day, month, year] = parts;
   if (year.length === 2) {
     // Assume 20xx for two-digit years
     year = `20${year}`;
   }
   return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
 }
 return dateString; // Return as is if format doesn't match
};


// Helper: today's date as YYYY-MM-DD for native <input type="date">
export const todayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};


