
export type Category = 'בשר' | 'בצק' | 'טבעול' | 'אוכל מוכן' | 'דגים' | 'עוגות' | 'קטניות' | 'אחר';
export const CATEGORIES: Category[] = ['בשר', 'בצק', 'טבעול', 'אוכל מוכן', 'דגים', 'עוגות', 'קטניות', 'אחר'];

export type CategoryCake = 'מיץ' | 'תמרים' | 'נוטלה אגוזים' | 'כושי'  | 'אחר';
export type CategoryDough = 'מתוק פריך' | 'שמרים עלים' | 'פילו' | 'אחר';
export type CategoryTivol = 'נקניקיות' | 'נאגטס ספייסי' | 'נאגטס רגיל' | 'חטיפי תירס' | 'שניצל' | 'אחר';
export type CategoryFish = 'סלמון' | 'אמנון' | 'לברק' | 'גפילטע פיש' | 'אחר';
export type CategoryMeat = 'כרעיים עוף'| 'כתף בקר' | 'פרגיות' | 'קוביות בקר' | 'פילה עוף' | 'בקר טחון' | 'אחר';
export type CategoryLegumes = 'חומוס' | 'עדשים שחורות' | 'עדשים כתומות' | 'עדשים אדומות' | 'שעועית אדומה' | 'שעועית בובס' | 'גריסים' | 'חיטה' | 'אחר';

// Strongly-typed arrays for wizard buttons
export const CATEGORY_CAKE_LIST: CategoryCake[] = ['מיץ', 'תמרים', 'נוטלה אגוזים', 'כושי', 'אחר'];
export const CATEGORY_DOUGH_LIST: CategoryDough[] = ['מתוק פריך', 'שמרים עלים', 'פילו', 'אחר'];
export const CATEGORY_TIVOL_LIST: CategoryTivol[] = ['נקניקיות', 'נאגטס ספייסי', 'נאגטס רגיל', 'חטיפי תירס', 'שניצל', 'אחר'];
export const CATEGORY_FISH_LIST: CategoryFish[] = ['סלמון', 'אמנון', 'לברק', 'גפילטע פיש', 'אחר'];
export const CATEGORY_MEAT_LIST: CategoryMeat[] = ['כרעיים עוף', 'כתף בקר', 'פרגיות', 'קוביות בקר', 'פילה עוף', 'בקר טחון', 'אחר'];
export const CATEGORY_READY_LIST: CategoryMeat[] = ['אחר'];
export const CATEGORY_LEGUMES_LIST: CategoryLegumes[] = ['חומוס', 'עדשים שחורות', 'עדשים כתומות', 'עדשים אדומות', 'שעועית אדומה', 'שעועית בובס', 'גריסים', 'חיטה', 'אחר'];

export const PRODUCTS_BY_CATEGORY: Record<Category, string[]> = {
  'עוגות': CATEGORY_CAKE_LIST,
  'בצק': CATEGORY_DOUGH_LIST,
  'טבעול': CATEGORY_TIVOL_LIST,
  'דגים': CATEGORY_FISH_LIST,
  'בשר': CATEGORY_MEAT_LIST,
  'אוכל מוכן': CATEGORY_READY_LIST,
  'קטניות': CATEGORY_LEGUMES_LIST,
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
  'קטניות': 'שקית',
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

export const DEFAULT_UNITS = [
  'ק"ג',
  'יחידות',
  'שקיות',
  'קופסאות',
] as const; //prevents from adding values in run-time

export const UNITS_FRACTIONS = [
  '0.25',
  '0.5',
  '0.75',
  '0.33',
  '0.66',
] as const; //prevents from adding values in run-time

export function defaultUnitsFor(category: Category, product: string): string {
  // explicit by product wins
  if (product in PRODUCT_UNITS) return PRODUCT_UNITS[product];
  // else fallback by category
  return CATEGORY_FALLBACK_UNITS[category] ?? '';
}
export type Location = 'מקרר' | 'מרפסת שירות' | 'מרפסת שמש' | '';
export const LOCATIONS: Location[] = ['', 'מקרר', 'מרפסת שירות', 'מרפסת שמש'];

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
    location?: Location;
}
export type EntryDraft = Omit<Entry, 'id'> & { id?: string };
