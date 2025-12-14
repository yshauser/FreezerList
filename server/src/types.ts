// Shared types between frontend and backend
export type Category = 'בשר' | 'בצק' | 'טבעול' | 'אוכל מוכן' | 'דגים' | 'עוגות' | 'אחר';

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

// Session data stored on server
export interface SessionData {
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    tokens?: {
      access_token: string;
      refresh_token?: string;
      expiry_date?: number;
    };
  }
}
