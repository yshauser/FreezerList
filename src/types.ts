
export type Category = 'בשר' | 'בצק' | 'טבעול' | 'אוכל מוכן' | 'דגים' | 'עוגות' | 'אחר';
export const CATEGORIES: Category[] = ['בשר', 'בצק', 'טבעול', 'אוכל מוכן', 'דגים', 'עוגות', 'אחר'];

export type CategoryCake = 'מיץ' | 'תמרים' | 'נוטלה אגוזים' | 'כושי'  | 'אחר';
export type CategoryDough = 'מתוק פריך' | 'שמרים עלים' | 'פילו' | 'אחר';
export type CategoryTivol = 'נקניקיות' | 'נאגטס ספייסי' | 'נאגטס רגיל' | 'חטיפי תירס' | 'שניצל' | 'אחר';
export type CategoryFish = 'סלמון' | 'אמנון' | 'לברק' | 'גפילטע פיש' | 'אחר';
export type CategoryMeat = 'כרעיים עוף'| 'כתף בקר' | 'פרגיות' | 'קוביות בקר' | 'פילה עוף' | 'בקר טחון' | 'אחר';

// Strongly-typed arrays for wizard buttons
export const CATEGORY_CAKE_LIST: CategoryCake[] = ['מיץ', 'תמרים', 'נוטלה אגוזים', 'כושי', 'אחר'];
export const CATEGORY_DOUGH_LIST: CategoryDough[] = ['מתוק פריך', 'שמרים עלים', 'פילו', 'אחר'];
export const CATEGORY_TIVOL_LIST: CategoryTivol[] = ['נקניקיות', 'נאגטס ספייסי', 'נאגטס רגיל', 'חטיפי תירס', 'שניצל', 'אחר'];
export const CATEGORY_FISH_LIST: CategoryFish[] = ['סלמון', 'אמנון', 'לברק', 'גפילטע פיש', 'אחר'];
export const CATEGORY_MEAT_LIST: CategoryMeat[] = ['כרעיים עוף', 'כתף בקר', 'פרגיות', 'קוביות בקר', 'פילה עוף', 'בקר טחון', 'אחר'];
export const CATEGORY_READY_LIST: CategoryMeat[] = ['אחר'];

export const PRODUCTS_BY_CATEGORY: Record<Category, string[]> = {
  'עוגות': CATEGORY_CAKE_LIST,
  'בצק': CATEGORY_DOUGH_LIST,
  'טבעול': CATEGORY_TIVOL_LIST,
  'דגים': CATEGORY_FISH_LIST,
  'בשר': CATEGORY_MEAT_LIST,
  'אוכל מוכן': CATEGORY_READY_LIST,
  'אחר': ['אחר'],
};
export function defaultAmountFor(category: Category, product: string): number | undefined {
if (product === 'בקר טחון') return 700;
  return category === 'בשר' ? undefined : 1;
}
const CATEGORY_FALLBACK_UNITS: Partial<Record<Category, string>> = {
  'עוגות': '',
  'בצק': '',
  'טבעול': 'שקית',
  'דגים': 'ק"ג',  // typical fish default
  'בשר': 'ק"ג',   // typical meat default
  'אחר': '',
};
// Explicit units per product (overrides category fallback)
const PRODUCT_UNITS: Record<string, string> = {
  // Fish
  'סלמון': 'ק"ג',
  'אמנון': 'שקית',
  'לברק': 'שקית',
  'גפילטע פיש': 'תבנית',
  // Meat
  'כרעיים עוף': 'כרעיים',
  'בקר טחון': 'גרם',
  'כתף בקר': 'ק"ג',
  'פרגיות': 'ק"ג',
  'קוביות בקר': 'ק"ג',
  'פילה עוף': 'ק"ג',
};
export function defaultUnitsFor(category: Category, product: string): string {
  // explicit by product wins
  if (product in PRODUCT_UNITS) return PRODUCT_UNITS[product];
  // else fallback by category
  return CATEGORY_FALLBACK_UNITS[category] ?? '';
}
export interface Entry {
    id: string;
    product: string;
    category: Category;
    date?: string;      // ISO: YYYY-MM-DD
    amount: number;
    units: string;
    cleanState?: boolean;
    skinState?: boolean;
    comments: string;
}
export type EntryDraft = Omit<Entry, 'id'> & { id?: string };
