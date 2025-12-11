

// src/lib/googleAuth.ts

// נכריז על טיפוס מקומי ברור ל־oauth2 כדי ש‑TS ידע שיש לו את המתודות
type OAuth2Client = {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (resp: { access_token?: string; error?: string }) => void;
  }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
  revoke: (token: string, done?: () => void) => void;
};

// לא חובה, אבל עוזר בזמן פיתוח
declare global {
  interface Window {
    gapi: any;
    google?: {
      accounts?: {
        oauth2?: OAuth2Client;
      };
    };
  }
}

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient: { requestAccessToken: (opts?: { prompt?: string }) => void } | null = null;

export async function initGapiClient(apiKey: string): Promise<void> {
  await new Promise<void>((resolve) => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({ apiKey, discoveryDocs: [DISCOVERY_DOC] });
      resolve();
    });
  });
}

export function initTokenClient(clientId: string) {
  // צמצום: לוקחים פעם אחת לאובייקט ביניים, בודקים שהוא קיים, ואז מטפּלים בו
  const oauth2 = (window as any).google?.accounts?.oauth2 as OAuth2Client | undefined;
  if (!oauth2) throw new Error('Google Identity Services not loaded yet');

  tokenClient = oauth2.initTokenClient({
    client_id: clientId,
    scope: SHEETS_SCOPE,
    callback: (resp) => {
      if (resp.error) {
        console.error('OAuth error:', resp.error);
        return;
      }
      (window as any).gapi.client.setToken({ access_token: resp.access_token });
    },
  });
}


export async function ensureSignedIn(prompt: 'consent' | '' = 'consent'): Promise<void> {
  if (!tokenClient) throw new Error('Token client not initialized');

  // IMPORTANT: set the callback just before requesting the token
  await new Promise<void>((resolve, reject) => {
    // tokenClient returned by initTokenClient has a dynamic 'callback' property
    (tokenClient as any).callback = (resp: { access_token?: string; error?: string }) => {

      if (resp?.error) return reject(new Error(resp.error));

    //   try {
    //     window.gapi.client.setToken({ access_token: resp.access_token });
    //     resolve();
    //   } catch (e) {
    //     reject(e as Error);
    //   }
        window.gapi.client.setToken({ access_token: resp.access_token });
        resolve();
    };

       // Request the token. 'prompt' controls if account chooser/consent shows.
    tokenClient!.requestAccessToken({ prompt });
  });
}

export function signOut() {
  const tok = window.gapi.client.getToken?.();
  if (tok?.access_token) {
    window.google?.accounts?.oauth2?.revoke(tok.access_token, () => {});
    window.gapi.client.setToken('');
  }
}
