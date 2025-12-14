
// --- GOOGLE DRIVE SERVICE ---
// Note: To make this work, you must create a project in Google Cloud Console,
// enable the "Google Drive API", and create an OAuth 2.0 Client ID (Web Application).

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Access environment variables in Vite safely
// Use optional chaining or fallback to empty object to prevent "Cannot read properties of undefined"
const env = (import.meta as any).env || {};
const CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = env.VITE_GOOGLE_API_KEY || '';

// Debug logging to verify configuration loading
console.log('Google Drive Config:', {
    hasClientId: !!CLIENT_ID,
    hasApiKey: !!API_KEY,
    clientIdLength: CLIENT_ID.length
});

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'my-iep-backup.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const googleDriveService = {
  isConfigured: () => {
    // Check if keys are present and not default placeholders (if any)
    return !!CLIENT_ID && !!API_KEY && !CLIENT_ID.includes('YOUR_CLIENT_ID');
  },

  // Initialize gapi client (load scripts first in index.html)
  init: async (onInitCallback: () => void) => {
    if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') {
        console.warn('Google scripts not loaded');
        return;
    }

    const gapiLoaded = new Promise<void>((resolve) => {
      window.gapi.load('client', async () => {
        try {
            if (googleDriveService.isConfigured()) {
                await window.gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
            }
            gapiInited = true;
            resolve();
        } catch(e) {
            console.error(e);
        }
      });
    });

    const gisLoaded = new Promise<void>((resolve) => {
      if (googleDriveService.isConfigured()) {
          try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined at request time
            });
            gisInited = true;
          } catch (e) {
            console.error("GIS Init Error", e);
          }
      }
      resolve();
    });

    await Promise.all([gapiLoaded, gisLoaded]);
    onInitCallback();
  },

  // Trigger Google Login
  login: async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!googleDriveService.isConfigured()) {
          reject(new Error("Configuration missing"));
          return;
      }
      
      if (!tokenClient) {
          reject(new Error("Google Identity Services not initialized"));
          return;
      }

      // Handle the token response
      tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
          return;
        }
        resolve(resp.access_token);
      };

      // Request token.
      // Using 'select_account' or empty prompt is better for mobile UX than forcing consent every time.
      // This reduces the chance of the popup being blocked or dismissed unexpectedly.
      try {
          tokenClient.requestAccessToken({ prompt: '' });
      } catch (e) {
          reject(e);
      }
    });
  },

  // Backup Data (Create or Update file)
  uploadBackup: async (jsonData: string) => {
    if (!googleDriveService.isConfigured()) {
         console.log("Simulating Cloud Upload:", jsonData.length, "bytes");
         await new Promise(r => setTimeout(r, 1500));
         return;
    }

    // 1. Search for existing file
    const q = `name = '${BACKUP_FILE_NAME}' and trashed = false`;
    const response = await window.gapi.client.drive.files.list({ q, fields: 'files(id, name)' });
    const files = response.result.files;

    const fileContent = new Blob([jsonData], { type: 'application/json' });
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
    };

    const accessToken = window.gapi.client.getToken().access_token;

    if (files && files.length > 0) {
      // Update existing
      const fileId = files[0].id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: createMultipartBody(metadata, jsonData) // Simplified update
      });
    } else {
      // Create new
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileContent);

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form
      });
    }
  },

  // Restore Data (Find and Read file)
  downloadBackup: async (): Promise<string | null> => {
    if (!googleDriveService.isConfigured()) {
        console.log("Simulating Cloud Download");
        await new Promise(r => setTimeout(r, 1500));
        // Return null or mock data
        return null; 
    }

    const q = `name = '${BACKUP_FILE_NAME}' and trashed = false`;
    const response = await window.gapi.client.drive.files.list({ q, fields: 'files(id, name)' });
    const files = response.result.files;

    if (files && files.length > 0) {
      const fileId = files[0].id;
      const fileRes = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      return JSON.stringify(fileRes.result);
    }
    return null;
  }
};

// Helper for Google Drive API Multipart Upload
function createMultipartBody(metadata: any, content: string) {
    // For text files, a simple text body often works for PATCH if content-type is set correctly,
    // but the proper way for 'multipart' uploadType involves boundaries.
    // Given the constraints and library usage, we'll keep it simple for now.
    // Ideally, this should construct a proper multipart/related body.
    
    // Minimal Polyfill for Multipart body construction if needed in future:
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const base64Data = btoa(unescape(encodeURIComponent(content)));

    return delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Data +
        close_delim;
}
