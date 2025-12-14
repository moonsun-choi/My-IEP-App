
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
const env = (import.meta as any).env || {};
const CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = env.VITE_GOOGLE_API_KEY || '';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'my-iep-backup.json';
const MEDIA_FOLDER_NAME = 'MyIEP_Media';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Helpers
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Dynamic Script Loader
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
        // Cleanup on error so we can retry cleanly
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
        reject(err);
    };
    document.body.appendChild(script);
  });
};

export const googleDriveService = {
  isConfigured: () => {
    return !!CLIENT_ID && !!API_KEY && !CLIENT_ID.includes('YOUR_CLIENT_ID');
  },

  // Check if scripts are fully loaded
  isReady: () => {
      return gapiInited && gisInited;
  },

  // Initialize gapi client
  init: async (onInitCallback?: () => void): Promise<void> => {
    // Prevent redundant initialization
    if (googleDriveService.isReady()) {
        if (onInitCallback) onInitCallback();
        return;
    }

    try {
        // 1. Load Scripts Dynamically (Robust for Mobile)
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client')
        ]);
    } catch (e) {
        console.error("Failed to load Google Scripts. Check network connection.", e);
        throw new Error("Network error loading Google Scripts");
    }

    // 2. Wait for global objects
    let attempts = 0;
    while ((typeof window.gapi === 'undefined' || typeof window.google === 'undefined') && attempts < 50) {
        await wait(100);
        attempts++;
    }

    if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') {
         throw new Error("Google global objects not found");
    }

    // 3. Init GAPI
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
            console.error("GAPI Init Error", e);
            gapiInited = true; // Mark as attempted to prevent blocking UI
            resolve();
        }
      });
    });

    // 4. Init GIS
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
      } else {
          gisInited = true;
      }
      resolve();
    });

    await Promise.all([gapiLoaded, gisLoaded]);
    if (onInitCallback) onInitCallback();
  },

  // Trigger Google Login
  login: async (): Promise<string> => {
    // Wait until ready if called too early
    if (!tokenClient && googleDriveService.isConfigured()) {
        if (!gisInited) {
            // Attempt to re-initialize if called before ready
            throw new Error("Google 서비스 초기화 중입니다. 잠시 후 다시 시도해주세요.");
        }
    }

    return new Promise((resolve, reject) => {
      if (!googleDriveService.isConfigured()) {
          reject(new Error("Configuration missing"));
          return;
      }
      
      if (!tokenClient) {
          reject(new Error("Google Login Client not ready."));
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
          // 'prompt' option can sometimes cause issues on mobile if popup is blocked.
          // We rely on the user click event bubbling up.
          tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (e) {
          reject(e);
      }
    });
  },

  // Check if backup file exists and return its metadata
  getBackupMetadata: async (): Promise<{ id: string, modifiedTime: string } | null> => {
      if (!googleDriveService.isConfigured() || !window.gapi?.client?.getToken()) return null;
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

  // Backup Data
  uploadBackup: async (jsonData: string) => {
    const token = window.gapi?.client?.getToken();
    if (!googleDriveService.isConfigured() || !token) {
         console.log("Simulating Cloud Upload (No Token/Config)");
         await wait(1000);
         return;
    }

    try {
        // 1. Search for existing file
        const q = `name = '${BACKUP_FILE_NAME}' and trashed = false`;
        const response = await window.gapi.client.drive.files.list({ q, fields: 'files(id, name)' });
        const files = response.result.files;

        const fileContent = new Blob([jsonData], { type: 'application/json' });
        const metadata = {
            name: BACKUP_FILE_NAME,
            mimeType: 'application/json',
        };

        const accessToken = token.access_token;
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', fileContent);

        if (files && files.length > 0) {
            // Update existing
            const fileId = files[0].id;
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });
        } else {
            // Create new
            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });
        }
    } catch (e) {
        console.error("Upload Backup Error:", e);
        throw e;
    }
  },

  // Restore Data
  downloadBackup: async (): Promise<string | null> => {
    const token = window.gapi?.client?.getToken();
    if (!googleDriveService.isConfigured() || !token) {
        return null; 
    }

    try {
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
    } catch (e) {
        console.error("Download Backup Error:", e);
    }
    return null;
  },

  // --- Media Upload Helpers ---

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

  // Helper: Convert File to Base64 (Safe for large files check)
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Prevent crashing browser with massive files in Base64
        // Limit to ~20MB for local Base64 storage
        if (file.size > 20 * 1024 * 1024) { 
            console.warn("File too large for local Base64 storage");
            resolve(""); // Return empty string instead of rejecting to allow log save
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  },

  // Upload Media File (Image/Video)
  uploadMedia: async (file: File): Promise<string | undefined> => {
    // 1. Check if we have a valid token. 
    // If user refreshed page, gapi token is gone. We cannot upload to Drive.
    // We must fallback to local storage or skip.
    const token = window.gapi?.client?.getToken();
    const hasToken = googleDriveService.isConfigured() && !!token;

    if (!hasToken) {
        console.warn("No active Google Token. Falling back to local storage.");
        try {
            return await googleDriveService.fileToBase64(file);
        } catch (e) {
            console.error("Base64 conversion failed", e);
            return undefined;
        }
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
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Drive Upload Failed: ${res.status} ${errText}`);
        }
        
        const data = await res.json();
        const fileId = data.id;

        // Try to get a viewable link
        try {
            const getFileRes = await window.gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'webContentLink, thumbnailLink'
            });
            return getFileRes.result.webContentLink || getFileRes.result.thumbnailLink || "";
        } catch (e) {
            // If getting link fails, try constructing one or just return ID (context dependent)
             return `https://drive.google.com/file/d/${fileId}/view`;
        }

    } catch (e) {
        console.error("Upload error (Falling back to local):", e);
        // Fallback on API error (e.g. Network, Quota, Auth)
        try {
            return await googleDriveService.fileToBase64(file);
        } catch (innerE) {
            console.error("Fallback Base64 failed:", innerE);
            return undefined; // Return undefined so log is saved without media rather than crashing
        }
    }
  }
};
