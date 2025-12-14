// OAuth 2.0 Authorization Code Flow implementation
import { OAuth2Client } from 'google-auth-library';
import { Request, Response, NextFunction } from 'express';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize OAuth2 client
export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing required OAuth environment variables');
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

// Generate OAuth consent URL
export function getAuthUrl(oauth2Client: OAuth2Client): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(
  oauth2Client: OAuth2Client,
  code: string
) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.tokens?.access_token) {
    return res.status(401).json({ 
      error: 'Not authenticated',
      authenticated: false 
    });
  }
  next();
}

// Refresh access token if expired
export async function refreshAccessTokenIfNeeded(
  oauth2Client: OAuth2Client,
  req: Request
): Promise<void> {
  if (!req.session.tokens) {
    throw new Error('No tokens in session');
  }

  // Set credentials on the client
  oauth2Client.setCredentials(req.session.tokens);

  // Check if token is expired or will expire soon (within 5 minutes)
  const expiryDate = req.session.tokens.expiry_date;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (!expiryDate || expiryDate - now < fiveMinutes) {
    // Token is expired or will expire soon - refresh it
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update session with new tokens
      req.session.tokens = {
        ...req.session.tokens,
        ...credentials,
      };
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }
}
