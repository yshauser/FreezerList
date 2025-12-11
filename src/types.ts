
export type Category = 'בשר' | 'בצק' | 'טבעול' | 'אוכל מוכן' | 'דגים' | 'עוגות' | 'אחר';
export const CATEGORIES: Category[] = ['בשר', 'בצק', 'טבעול', 'אוכל מוכן', 'דגים', 'עוגות', 'אחר'];

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
