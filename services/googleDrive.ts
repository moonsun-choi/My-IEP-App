
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
const MEDIA_FOLDER_NAME = 'MyIEP_Media';

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
      try {
          tokenClient.requestAccessToken({ prompt: '' });
      } catch (e) {
          reject(e);
      }
    });
  },

  // Check if backup file exists and return its metadata
  getBackupMetadata: async (): Promise<{ id: string, modifiedTime: string } | null> => {
      if (!googleDriveService.isConfigured()) return null;
      try {
          const q = `name = '${BACKUP_FILE_NAME}' and trashed = false`;
          const response = await window.gapi.client.drive.files.list({ 
              q, 
              fields: 'files(id, modifiedTime)' 
          });
          const files = response.result.files;
          if (files && files.length > 0) {
              return { id: files[0].id, modifiedTime: files[0].modifiedTime };
          }
          return null;
      } catch (e) {
          console.error("Error fetching metadata", e);
          return null;
      }
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
        body: createMultipartBody(metadata, jsonData) 
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
  },

  // --- NEW: Media Upload Helpers ---

  // Helper: Get or Create 'MyIEP_Media' folder
  ensureMediaFolder: async (): Promise<string> => {
    const q = `name = '${MEDIA_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
    const files = response.result.files;

    if (files && files.length > 0) {
        return files[0].id;
    } else {
        const metadata = {
            name: MEDIA_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const createRes = await window.gapi.client.drive.files.create({ resource: metadata, fields: 'id' });
        return createRes.result.id;
    }
  },

  // Helper: Convert File to Base64 (Fallback)
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  },

  // Upload Media File (Image/Video)
  uploadMedia: async (file: File): Promise<string> => {
    // 1. Check Auth & Config. If invalid, fallback to Base64 (Local storage)
    if (!googleDriveService.isConfigured()) {
        console.warn("Google Drive not configured. Saving media locally (Base64). Warning: Size limits apply.");
        return googleDriveService.fileToBase64(file);
    }

    const token = window.gapi.client.getToken();
    if (!token) {
        console.warn("Not logged in. Saving media locally (Base64).");
        return googleDriveService.fileToBase64(file);
    }

    try {
        const accessToken = token.access_token;
        const folderId = await googleDriveService.ensureMediaFolder();

        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        // Upload
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });
        
        if (!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        const fileId = data.id;

        // Note: 'webContentLink' allows direct download/display, but requires appropriate permissions.
        // 'drive.file' scope grants access to files created by this app, so the user can view it.
        // However, for an <img> tag to work cross-origin without auth headers, the file usually needs public sharing
        // OR we use the thumbnailLink (which is often accessible) or webContentLink with logged-in browser session.
        // For simplicity in this 'personal' app, we use webContentLink. 
        // If <img> fails to load due to CORs/Auth, we might need a proxy or use Google Drive Embed API.
        
        // Let's try to get a thumbnail link which is more friendly for UI display
        const getFileRes = await window.gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'webContentLink, thumbnailLink'
        });
        
        // Prefer webContentLink (full quality) but fallback to thumbnail if needed. 
        // Note: webContentLink sometimes forces download. thumbnailLink is often better for previews.
        // Let's store webContentLink but if it's an image, maybe we want the thumbnail for list views?
        // We will return webContentLink as the primary URI.
        return getFileRes.result.webContentLink || getFileRes.result.thumbnailLink || "";

    } catch (e) {
        console.error("Upload error:", e);
        // Fallback on error
        return googleDriveService.fileToBase64(file);
    }
  }
};

// Helper for Google Drive API Multipart Upload
function createMultipartBody(metadata: any, content: string) {
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
