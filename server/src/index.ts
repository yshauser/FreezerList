// Main Express server - handles OAuth and Sheets API proxy
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  requireAuth,
  refreshAccessTokenIfNeeded,
} from './auth.js';
import {
  readEntries,
  appendEntry,
  updateEntryById,
  deleteEntryById,
  getSheetId,
} from './sheets.js';
import type { EntryDraft, Entry } from './types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables validation
const REQUIRED_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'SESSION_SECRET',
  'SPREADSHEET_ID',
  'SHEET_NAME',
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEET_NAME = process.env.SHEET_NAME!;

// Initialize OAuth2 client (singleton)
const oauth2Client = createOAuth2Client();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS - allow credentials for cookie-based sessions
app.use(cors({
  origin: true, // In production, set this to your specific domain
  credentials: true,
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== AUTH ROUTES =====

// GET /auth/status - Check if user is authenticated
app.get('/auth/status', (req, res) => {
  const authenticated = !!req.session.tokens?.access_token;
  res.json({ authenticated });
});

// GET /auth/login - Initiate OAuth flow
app.get('/auth/login', (req, res) => {
  const authUrl = getAuthUrl(oauth2Client);
  res.redirect(authUrl);
});

// GET /auth/callback - OAuth callback handler
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  
  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(oauth2Client, code);
    
    // Store tokens in session (server-side only)
    req.session.tokens = tokens;
    
    // Save session
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('OAuth successful, tokens stored in session');
    
    // Redirect back to frontend
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// POST /auth/logout - Clear session
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ===== SHEETS API ROUTES =====

// GET /api/sheet-id - Get sheet ID
app.get('/api/sheet-id', requireAuth, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(oauth2Client, req);
    
    const sheetId = await getSheetId(
      oauth2Client,
      SPREADSHEET_ID,
      SHEET_NAME
    );
    
    res.json({ sheetId });
  } catch (error: any) {
    console.error('Get sheet ID error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to get sheet ID' });
  }
});

// GET /api/entries - Read all entries
app.get('/api/entries', requireAuth, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(oauth2Client, req);
    
    const entries = await readEntries(
      oauth2Client,
      SPREADSHEET_ID,
      SHEET_NAME
    );
    
    res.json(entries);
  } catch (error: any) {
    console.error('Read entries error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to read entries' });
  }
});

// POST /api/entries - Create new entry
app.post('/api/entries', requireAuth, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(oauth2Client, req);
    
    const draft: EntryDraft = req.body;
    const result = await appendEntry(
      oauth2Client,
      SPREADSHEET_ID,
      SHEET_NAME,
      draft
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Append entry error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to create entry' });
  }
});

// PUT /api/entries/:id - Update entry
app.put('/api/entries/:id', requireAuth, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(oauth2Client, req);
    
    const { id } = req.params;
    const entry: Entry = req.body;
    
    await updateEntryById(
      oauth2Client,
      SPREADSHEET_ID,
      SHEET_NAME,
      id,
      entry
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to update entry' });
  }
});

// DELETE /api/entries/:id - Delete entry
app.delete('/api/entries/:id', requireAuth, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(oauth2Client, req);
    
    const { id } = req.params;
    
    // Get sheet ID first
    const sheetId = await getSheetId(
      oauth2Client,
      SPREADSHEET_ID,
      SHEET_NAME
    );
    
    await deleteEntryById(
      oauth2Client,
      SPREADSHEET_ID,
      SHEET_NAME,
      sheetId,
      id
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to delete entry' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}`);
  console.log(`📄 Sheet name: ${SHEET_NAME}`);
});
