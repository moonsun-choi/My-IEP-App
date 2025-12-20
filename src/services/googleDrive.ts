// --- GOOGLE DRIVE SERVICE ---
// Note: To make this work, you must create a project in Google Cloud Console,
// enable the "Google Drive API", and create an OAuth 2.0 Client ID (Web Application).

import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Access environment variables in Vite safely
const env = (import.meta as any).env || {};
// IMPORTANT: For Native/Capacitor, this MUST be the WEB CLIENT ID, not the Android Client ID.
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

  // Check if scripts are fully loaded (Native considers 'gapi' enough)
  isReady: () => {
      if (Capacitor.isNativePlatform()) {
          return gapiInited;
      }
      return gapiInited && gisInited;
  },

  // Initialize gapi client
  init: async (onInitCallback?: () => void): Promise<void> => {
    // Prevent redundant initialization
    if (googleDriveService.isReady()) {
        if (onInitCallback) onInitCallback();
        return;
    }

    // --- NATIVE PLATFORM INITIALIZATION ---
    if (Capacitor.isNativePlatform()) {
        // 1. Initialize Plugin IMMEDIATELY (Before network calls)
        try {
            console.log("Initializing Native Google Auth...");
            GoogleAuth.initialize({
                clientId: CLIENT_ID, // Use WEB Client ID here
                scopes: ['https://www.googleapis.com/auth/drive.file'],
                grantOfflineAccess: true, 
            });
        } catch (e) {
            console.error("GoogleAuth.initialize failed:", e);
        }

        try {
            // 2. Load GAPI (Needed for Drive API calls)
            await loadScript('https://apis.google.com/js/api.js');
            await new Promise<void>((resolve) => window.gapi.load('client', resolve));
            
            // 3. Init GAPI Client (API Key only)
            if (googleDriveService.isConfigured()) {
                await window.gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
            }

            gapiInited = true;
            if (onInitCallback) onInitCallback();
            return;

        } catch (e) {
            console.error("Native GAPI Init Error (Check Network):", e);
            throw e;
        }
    }

    // --- WEB PLATFORM INITIALIZATION (Existing Logic) ---
    try {
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client')
        ]);
    } catch (e) {
        console.error("Failed to load Google Scripts.", e);
        throw new Error("Network error loading Google Scripts");
    }

    // Wait for global objects
    let attempts = 0;
    while ((typeof window.gapi === 'undefined' || typeof window.google === 'undefined') && attempts < 50) {
        await wait(100);
        attempts++;
    }

    if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') {
         throw new Error("Google global objects not found");
    }

    // Init GAPI
    const gapiLoaded = new Promise<void>((resolve, reject) => {
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
            reject(e);
        }
      });
    });

    // Init GIS
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

  // Attempt to restore session
  restoreSession: async (): Promise<any> => {
      // --- NATIVE RESTORE ---
      if (Capacitor.isNativePlatform()) {
          try {
              // Ensure plugin is initialized before refresh
              GoogleAuth.initialize({
                  clientId: CLIENT_ID,
                  scopes: ['https://www.googleapis.com/auth/drive.file'],
                  grantOfflineAccess: true, 
              });

              // Attempt to refresh the session
              // GoogleAuth.refresh() returns Authentication object { accessToken, idToken, ... } not User object
              const authResponse = await GoogleAuth.refresh();
              
              if (authResponse && authResponse.accessToken) {
                  console.log("Native Session Restored");
                  
                  // Ensure GAPI is ready to receive the token
                  if (!window.gapi || !window.gapi.client) {
                      await loadScript('https://apis.google.com/js/api.js');
                      await new Promise<void>((resolve) => window.gapi.load('client', resolve));
                      await window.gapi.client.init({
                          apiKey: API_KEY,
                          discoveryDocs: [DISCOVERY_DOC],
                      });
                  }

                  // Inject Token into GAPI
                  window.gapi.client.setToken({ access_token: authResponse.accessToken });

                  // Since refresh() doesn't return user profile, we fetch it manually
                  const userInfo = await googleDriveService.getUserInfo();
                  return userInfo;
              }
          } catch (e) {
              console.log("No valid native session found (User likely logged out).");
              // This is normal if user never logged in or explicitly logged out
              return null;
          }
          return null;
      }

      // --- WEB RESTORE ---
      const token = localStorage.getItem('google_access_token');
      const expiry = localStorage.getItem('google_token_expiry');
      
      if (!token || !expiry) return null;

      // Check if expired
      if (Date.now() > parseInt(expiry, 10)) {
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_token_expiry');
          localStorage.removeItem('iep_user_profile');
          return null;
      }

      // Restore to GAPI
      if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken({ access_token: token });
          
          // Verify token validity by fetching profile
          // Optimistic: If we have a cached profile, we can use it even if network check fails
          const cachedProfile = localStorage.getItem('iep_user_profile');
          const userProfile = cachedProfile ? JSON.parse(cachedProfile) : null;

          // Attempt to verify online
          const user = await googleDriveService.getUserInfo();
          if (user) {
              return user; // Success (Cache updated inside getUserInfo)
          } else {
              // Fetch failed (Network or Auth error)
              // If we have a cached profile and token is mathematically valid (checked above), return cached profile.
              // This allows offline app restart or handling flaky networks.
              if (userProfile) {
                  console.warn("Using cached user profile (Offline/Verify Failed)");
                  return userProfile;
              }

              // Only clear if we really can't verify and have no cache
              localStorage.removeItem('google_access_token');
              localStorage.removeItem('google_token_expiry');
              localStorage.removeItem('iep_user_profile');
          }
      }
      return null;
  },

  // Trigger Google Login
  login: async (): Promise<string> => {
    // --- NATIVE LOGIN ---
    if (Capacitor.isNativePlatform()) {
        try {
             GoogleAuth.initialize({
                clientId: CLIENT_ID,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
                grantOfflineAccess: true,
            });

            // GoogleAuth.signIn() returns User object { authentication: { accessToken ... }, email, ... }
            const user = await GoogleAuth.signIn();
            console.log("Native Sign In Success", user);
            
            const accessToken = user.authentication.accessToken;
            if (!accessToken) throw new Error("No Access Token received from Native Login");
            
            // Bridge: Inject token into GAPI
            if (!window.gapi || !window.gapi.client) {
                await loadScript('https://apis.google.com/js/api.js');
                await new Promise<void>((resolve) => window.gapi.load('client', resolve));
                // We might need to init with API Key here if not done yet
                if (API_KEY) {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                }
            }
            
            window.gapi.client.setToken({ access_token: accessToken });
            return accessToken;

        } catch (e: any) {
            console.error("Native Login Error:", e);
            if (JSON.stringify(e).includes("10")) {
                throw new Error("Google Cloud 설정(SHA-1) 또는 Client ID를 확인해주세요. (Error 10)");
            }
            throw new Error(e.message || "Native Login Failed");
        }
    }

    // --- WEB LOGIN (Existing) ---
    if (!tokenClient && googleDriveService.isConfigured()) {
        if (!gisInited) {
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

      tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
          return;
        }
        
        // Save Token for Persistence (Web)
        const token = resp.access_token;
        const expiresIn = resp.expires_in || 3599;
        localStorage.setItem('google_access_token', token);
        // Set expiry slightly earlier than actual to be safe
        localStorage.setItem('google_token_expiry', (Date.now() + (expiresIn * 1000) - 60000).toString());

        resolve(token);
      };

      try {
          tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (e) {
          reject(e);
      }
    });
  },

  // Get User Profile Info
  getUserInfo: async (): Promise<any> => {
      // For Native, we rely on the token being valid in GAPI or just fetch from endpoint
      const token = window.gapi?.client?.getToken()?.access_token;
      if (!token) return null;

      try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              // Cache profile for persistence
              localStorage.setItem('iep_user_profile', JSON.stringify(data));
              return data;
          }
      } catch (e) {
          console.error("Failed to fetch user info", e);
      }
      return null;
  },

  // Sign Out
  signOut: async () => {
      // Clear Local Storage
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_token_expiry');
      localStorage.removeItem('iep_user_profile');

      // 1. Native Sign Out
      if (Capacitor.isNativePlatform()) {
          try {
              await GoogleAuth.signOut();
          } catch (e) {
              console.warn("Native sign out error", e);
          }
      }

      // 2. Clear Web Session (Revoke if possible, or just clear token)
      // Revoking token on web is good practice if we want to force re-consent or clear session on Google side for this app
      const token = window.gapi?.client?.getToken()?.access_token;
      if (token && window.google?.accounts?.oauth2) {
          // window.google.accounts.oauth2.revoke(token, () => {}); // Optional: Revoke permission
      }

      // 3. Clear GAPI Token
      if (window.gapi?.client) {
          window.gapi.client.setToken(null);
      }
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
            const fileId = files[0].id;
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });
        } else {
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
        if (file.size > 20 * 1024 * 1024) { 
            console.warn("File too large for local Base64 storage");
            resolve(""); 
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  },

  // Upload Media File (Image/Video)
  // 👇 [수정 1] customName 파라미터 추가
  uploadMedia: async (file: File, customName?: string): Promise<string | undefined> => {
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
            // 👇 [수정 2] customName이 있으면 그걸 쓰고, 없으면 원래 파일명 사용
            name: customName || file.name,
            mimeType: file.type,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        // 1. 파일 업로드 요청
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
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

        // 2. 썸네일/링크 정보 가져오기 (API 호출 방식 개선)
        // gapi 대신 fetch를 사용하여 인증 토큰 문제를 방지합니다.
        try {
            const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,thumbnailLink,webViewLink`, {
                method: 'GET',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
            });
            
            if (metaRes.ok) {
                const metaData = await metaRes.json();
                
                // [수정 3] 이미지인 경우 썸네일 링크 사용 (미리보기 해결 핵심 ⭐)
                if (file.type.startsWith('image/') && metaData.thumbnailLink) {
                     // 기본 작은 사이즈(=s220)를 큰 사이즈(=s1200)로 변경하여 선명하게 표시
                     const link = metaData.thumbnailLink.replace(/=s\d+/, '=s1200');
                     return `${link}#id=${fileId}`;
                }

                // 비디오거나 썸네일이 없으면 다운로드 링크 사용
                return metaData.webContentLink || metaData.webViewLink || "";
            }
        } catch (e) {
             console.warn("Failed to fetch metadata via API, falling back to View Link", e);
        }

        // 최후의 수단
        return `https://drive.google.com/file/d/${fileId}/view`;

    } catch (e) {
        console.error("Upload error (Falling back to local):", e);
        try {
            return await googleDriveService.fileToBase64(file);
        } catch (innerE) {
            console.error("Fallback Base64 failed:", innerE);
            return undefined; 
        }
    }
  },

  // Delete Media File from Drive
  deleteFile: async (fileUri: string) => {
    const token = window.gapi?.client?.getToken();
    if (!googleDriveService.isConfigured() || !token) {
        return; 
    }

    // Attempt to extract File ID from URI
    let fileId: string | null = null;
    
    try {
        // Pattern 0: appended hash id (Custom fix for thumbnail links)
        const matchHash = fileUri.match(/#id=([a-zA-Z0-9_-]+)/);
        if (matchHash) {
            fileId = matchHash[1];
        }
        // Pattern 1: .../d/FILE_ID...
        else {
            const matchD = fileUri.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matchD) {
                fileId = matchD[1];
            } 
            // Pattern 2: id=FILE_ID (query param)
            else if (fileUri.includes('id=')) {
                // Be more robust than URL parser
                const matchId = fileUri.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (matchId) fileId = matchId[1];
            }
        }
    } catch (e) {
        // Fallback or invalid URL
    }

    if (!fileId) return;

    try {
        // Instead of DELETE (permanent), we use UPDATE to trash it (safer)
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trashed: true })
        });
        console.log(`File ${fileId} moved to trash.`);
    } catch (e) {
        console.error("Failed to delete file from Drive", e);
    }
  }
};