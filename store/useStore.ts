
import { create } from 'zustand';
import { AppState, PromptLevel, WidgetType, Student, Goal, GoalStatus } from '../types';
import { db } from '../services/db';
import { googleDriveService } from '../services/googleDrive';
import toast from 'react-hot-toast';

// Debounce helper for auto-sync
const debounce = (func: Function, wait: number) => {
  let timeout: any;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface ExtendedAppState extends AppState {
    // Sync related state
    isOnline: boolean;
    isLoggedIn: boolean;
    user: { name: string; email: string; picture: string } | null; // User Profile
    syncStatus: 'idle' | 'syncing' | 'saved' | 'error' | 'cloud_newer';
    lastSyncTime: number;
    
    // UI Feedback
    loadingMessage: string | null;
    uploadingLogIds: string[]; // Track which logs are currently uploading media

    // Sync Actions
    setOnlineStatus: (isOnline: boolean) => void;
    setLoggedIn: (isLoggedIn: boolean) => void;
    setUser: (user: any) => void; // Set User Profile
    logout: () => Promise<void>; // Logout Action
    
    checkCloudStatus: () => Promise<void>;
    syncLocalToCloud: () => Promise<void>;
    syncCloudToLocal: () => Promise<void>;

    // Student Actions Override
    addStudent: (name: string, photo_uri?: string) => Promise<void>;
    updateStudent: (id: string, name: string, photo_uri?: string) => Promise<void>;

    reorderGoals: (studentId: string, goals: Goal[]) => Promise<void>;
    fetchAllGoals: () => Promise<void>;
    addGoal: (studentId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => Promise<void>;
    updateGoal: (goalId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => Promise<void>;
    recordTrial: (goalId: string, value: number, promptLevel: PromptLevel, mediaUri?: string | File, notes?: string) => Promise<void>;
    updateLog: (logId: string, goalId: string, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string | File, notes?: string) => Promise<void>;
}

export const useStore = create<ExtendedAppState>((set, get) => {
    
    // Internal helper to trigger auto-sync
    const markDirty = () => {
        if (get().isOnline && get().isLoggedIn) {
            debouncedSync();
        }
    };

    // Reduced debounce time: 3000ms -> 1500ms for "Real-time" feel
    const debouncedSync = debounce(() => get().syncLocalToCloud(), 1500);

    return {
        students: [],
        goals: [],
        logs: [],
        assessments: [],
        materials: [],
        activeWidgets: ['tracker', 'students'], 
        isLoading: false,
        loadingMessage: null,
        uploadingLogIds: [],
        
        // Sync State
        isOnline: navigator.onLine,
        isLoggedIn: false,
        user: null,
        syncStatus: 'idle',
        lastSyncTime: 0,

        setOnlineStatus: (isOnline) => {
            set({ isOnline });
            if (isOnline && get().isLoggedIn) {
                get().syncLocalToCloud();
            }
        },
        
        setLoggedIn: (isLoggedIn) => {
            set({ isLoggedIn });
            if (isLoggedIn) {
                get().checkCloudStatus();
            }
        },

        setUser: (user) => {
            set({ user });
        },

        logout: async () => {
            try {
                await googleDriveService.signOut();
                set({ 
                    isLoggedIn: false, 
                    user: null, 
                    syncStatus: 'idle' 
                });
                toast.success("로그아웃 되었습니다.");
            } catch (e) {
                console.error("Logout failed", e);
                toast.error("로그아웃 실패");
            }
        },

        checkCloudStatus: async () => {
            if (!get().isLoggedIn || !get().isOnline) return;
            try {
                const metadata = await googleDriveService.getBackupMetadata();
                if (metadata) {
                    const cloudTime = new Date(metadata.modifiedTime).getTime();
                    const localLastSync = await db.getLastSyncTime();
                    // If cloud is newer by more than 10 seconds
                    if (cloudTime > localLastSync + 10000) {
                        set({ syncStatus: 'cloud_newer' });
                    }
                }
            } catch (e) {
                console.error("Failed to check cloud status", e);
            }
        },

        syncLocalToCloud: async () => {
            if (!get().isLoggedIn || !get().isOnline) return;
            
            // Prevent multiple syncs overlap
            if (get().syncStatus === 'syncing') return;

            set({ syncStatus: 'syncing' });
            try {
                const data = await db.exportData();
                await googleDriveService.uploadBackup(data);
                const now = Date.now();
                await db.setLastSyncTime(now);
                set({ syncStatus: 'saved', lastSyncTime: now });
                setTimeout(() => set({ syncStatus: 'idle' }), 2000);
            } catch (e) {
                console.error("Auto sync failed", e);
                set({ syncStatus: 'error' });
                // Do not toast on background auto-sync to avoid annoyance, 
                // the UI icon will show the error state.
            }
        },

        syncCloudToLocal: async () => {
            if (!get().isLoggedIn || !get().isOnline) return;
            set({ syncStatus: 'syncing' });
            try {
                const json = await googleDriveService.downloadBackup();
                if (json) {
                    await db.importData(json);
                    const now = Date.now();
                    await db.setLastSyncTime(now);
                    
                    await get().fetchStudents();
                    await get().fetchAllGoals();
                    await get().fetchWidgets();
                    
                    set({ syncStatus: 'idle', lastSyncTime: now });
                    toast.success("데이터 복원 완료");
                }
            } catch (e) {
                console.error("Restore failed", e);
                set({ syncStatus: 'error' });
                toast.error("데이터 복원 실패");
            }
        },

        fetchWidgets: async () => {
            const widgets = await db.getWidgets();
            set({ activeWidgets: widgets });
        },

        toggleWidget: async (widget: WidgetType) => {
            const current = get().activeWidgets;
            let newWidgets: WidgetType[];
            if (current.includes(widget)) {
                newWidgets = current.filter(w => w !== widget);
            } else {
                newWidgets = [...current, widget];
            }
            set({ activeWidgets: newWidgets });
            await db.setWidgets(newWidgets);
            markDirty();
        },
        
        // --- Dashboard Data Fetcher ---
        fetchDashboardData: async () => {
            set({ isLoading: true });
            try {
                // Fetch Students & Goals (Goals needed for ID mapping)
                const students = await db.getStudents();
                const goals = await db.getAllGoals();

                // Fetch logs from the last 7 days for "Today's Focus" and "Weekly Rhythm"
                const end = Date.now();
                const start = new Date();
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0); // Start of 7 days ago
                
                const logs = await db.getLogsByTimeRange(start.getTime(), end);

                set({ students, goals, logs });
            } finally {
                set({ isLoading: false });
            }
        },

        fetchStudents: async () => {
            set({ isLoading: true });
            try {
            const students = await db.getStudents();
            set({ students });
            } finally {
            set({ isLoading: false });
            }
        },

        addStudent: async (name: string, photo_uri?: string) => {
            set({ isLoading: true });
            try {
            await db.addStudent(name, photo_uri);
            await get().fetchStudents();
            markDirty();
            toast.success('학생이 추가되었습니다');
            } finally {
            set({ isLoading: false });
            }
        },

        updateStudent: async (id: string, name: string, photo_uri?: string) => {
            await db.updateStudent(id, name, photo_uri);
            await get().fetchStudents();
            markDirty();
            toast.success('학생 정보 수정됨');
        },

        deleteStudent: async (id: string) => {
            await db.deleteStudent(id);
            await get().fetchStudents();
            markDirty();
            toast.success('학생 삭제됨');
        },

        reorderStudents: async (students: Student[]) => {
            set({ students }); // Optimistic update
            await db.reorderStudents(students);
            markDirty();
        },

        fetchAllGoals: async () => {
            const goals = await db.getAllGoals();
            set({ goals });
        },

        fetchGoals: async (studentId: string) => {
            try {
            const goals = await db.getGoals(studentId);
            set({ goals });
            } finally {
            set({ isLoading: false });
            }
        },

        addGoal: async (studentId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => {
            try {
            await db.addGoal(studentId, title, description, icon, status);
            await get().fetchGoals(studentId);
            markDirty();
            toast.success('목표 추가됨');
            } finally {}
        },

        updateGoal: async (goalId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => {
            try {
            await db.updateGoal(goalId, title, description, icon, status);
            const goal = get().goals.find(g => g.id === goalId);
            if (goal) {
                await get().fetchGoals(goal.student_id);
            }
            markDirty();
            toast.success('목표 수정됨');
            } finally {}
        },

        deleteGoal: async (goalId: string, studentId: string) => {
            try {
                await db.deleteGoal(goalId);
                await get().fetchGoals(studentId);
                markDirty();
                toast.success('목표 삭제됨');
            } finally {}
        },

        reorderGoals: async (studentId: string, goals: Goal[]) => {
            set({ goals }); // Optimistic local update
            await db.reorderGoals(studentId, goals);
            markDirty();
        },

        fetchLogs: async (goalId: string) => {
            const logs = await db.getLogs(goalId);
            set({ logs });
        },

        fetchStudentLogs: async (studentId: string) => {
            const logs = await db.getStudentLogs(studentId);
            set({ logs });
        },

        recordTrial: async (goalId: string, value: number, promptLevel: PromptLevel, mediaUri?: string | File, notes?: string) => {
            let tempUri: string | undefined = undefined;
            let fileToUpload: File | null = null;
            let mediaType: string | undefined = undefined;
            
            // 1. Optimistic Preparation: If File, create Blob URL for immediate display
            if (mediaUri instanceof File) {
                tempUri = URL.createObjectURL(mediaUri);
                fileToUpload = mediaUri;
                mediaType = mediaUri.type;
            } else {
                tempUri = mediaUri;
            }

            try {
                // 2. Add to DB immediately (Optimistic Save)
                // Note: We intentionally save the blob URI locally so it shows up in the UI right away.
                // It will be replaced with the cloud URI once upload finishes.
                const newLog = await db.addLog(goalId, value, promptLevel, tempUri, notes, mediaType);
                
                // 3. Update UI state immediately
                await get().fetchLogs(goalId);
                toast.success('기록이 저장되었습니다');
                markDirty(); // Trigger sync for text data

                // 4. Background Upload Logic
                if (fileToUpload) {
                    const logId = newLog.id;
                    
                    // Add to uploading list to show UI feedback
                    set(state => ({ uploadingLogIds: [...state.uploadingLogIds, logId] }));
                    
                    // Don't await this! Let it run in background.
                    googleDriveService.uploadMedia(fileToUpload).then(async (finalUri) => {
                        if (finalUri) {
                            // Update the log with the real Cloud URI
                            // If finalUri is likely an image (thumbnail), we can update mediaType or leave it.
                            // Google Drive returns thumbnail links, so usually it renders as image.
                            // We update the URI. We keep the original mediaType or could update it to 'image/jpeg' if we want to force img tag.
                            // But for now, let's keep original type so we know it was a video, but allow LogCard to handle it.
                            await db.updateLog(logId, value, promptLevel, newLog.timestamp, finalUri, notes, mediaType);
                            
                            // Update local state to reflect the cloud URI (persistence fix)
                            const currentLogs = get().logs;
                            set({ 
                                logs: currentLogs.map(l => l.id === logId ? { ...l, media_uri: finalUri } : l),
                                uploadingLogIds: get().uploadingLogIds.filter(id => id !== logId)
                            });
                            
                            // toast.success("미디어 동기화 완료");
                        } else {
                             // Handle Upload Failure (Keep local blob but warn)
                             set(state => ({ uploadingLogIds: state.uploadingLogIds.filter(id => id !== logId) }));
                             toast.error("미디어 업로드 실패 (로컬에만 저장됨)");
                        }
                    }).catch(err => {
                         console.error("Background upload failed", err);
                         set(state => ({ uploadingLogIds: state.uploadingLogIds.filter(id => id !== logId) }));
                         toast.error("미디어 업로드 중 오류 발생");
                    });
                }

            } catch (e) {
                console.error("Save failed", e);
                toast.error("저장 실패");
            }
        },

        deleteLog: async (logId: string, goalId: string) => {
            // Check for media deletion
            const logToDelete = get().logs.find(l => l.id === logId);
            if (logToDelete?.media_uri && logToDelete.media_uri.includes('google')) {
                // Fire and forget - clean up cloud file
                googleDriveService.deleteFile(logToDelete.media_uri);
            }

            await db.deleteLog(logId);
            await get().fetchLogs(goalId);
            markDirty();
            toast.success('기록 삭제됨');
        },

        updateLog: async (logId: string, goalId: string, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string | File, notes?: string) => {
            let tempUri: string | undefined = undefined;
            let fileToUpload: File | null = null;
            let mediaType: string | undefined = undefined;

            // Check for media removal/replacement logic
            const oldLog = get().logs.find(l => l.id === logId);
            
            // If there was media, and the new media is different (either undefined, or a new file/uri)
            // Note: If mediaUri is a File, it's definitely new. If it's a string, it might be the same or different.
            if (oldLog?.media_uri && oldLog.media_uri.includes('google')) {
                const isRemoved = !mediaUri;
                const isReplaced = mediaUri instanceof File || (typeof mediaUri === 'string' && mediaUri !== oldLog.media_uri);

                if (isRemoved || isReplaced) {
                    // Delete old file from Drive
                    googleDriveService.deleteFile(oldLog.media_uri);
                }
            }

            if (mediaUri instanceof File) {
                tempUri = URL.createObjectURL(mediaUri);
                fileToUpload = mediaUri;
                mediaType = mediaUri.type;
            } else {
                tempUri = mediaUri;
                // mediaType remains undefined, db will preserve old value
            }

            try {
                // Optimistic Update
                await db.updateLog(logId, value, promptLevel, timestamp, tempUri, notes, mediaType);
                await get().fetchLogs(goalId);
                toast.success('기록이 수정되었습니다');
                markDirty();

                // Background Upload
                if (fileToUpload) {
                    set(state => ({ uploadingLogIds: [...state.uploadingLogIds, logId] }));

                    googleDriveService.uploadMedia(fileToUpload).then(async (finalUri) => {
                        if (finalUri) {
                            await db.updateLog(logId, value, promptLevel, timestamp, finalUri, notes, mediaType);
                            const currentLogs = get().logs;
                            set({ 
                                logs: currentLogs.map(l => l.id === logId ? { ...l, media_uri: finalUri } : l),
                                uploadingLogIds: get().uploadingLogIds.filter(id => id !== logId)
                            });
                        } else {
                             set(state => ({ uploadingLogIds: state.uploadingLogIds.filter(id => id !== logId) }));
                             toast.error("미디어 업로드 실패");
                        }
                    }).catch(err => {
                         console.error("Background update upload failed", err);
                         set(state => ({ uploadingLogIds: state.uploadingLogIds.filter(id => id !== logId) }));
                    });
                }
            } catch (e) {
                console.error("Update failed", e);
                toast.error("수정 실패");
            }
        },

        fetchAssessments: async () => {
            set({ isLoading: true });
            try {
            const assessments = await db.getAssessments();
            set({ assessments });
            } finally {
            set({ isLoading: false });
            }
        },

        updateAssessmentItem: async (assessmentId, itemId, status) => {
            await db.updateAssessmentItem(assessmentId, itemId, status);
            await get().fetchAssessments();
            markDirty();
        },

        fetchMaterials: async () => {
            set({ isLoading: true });
            try {
            const materials = await db.getMaterials();
            set({ materials });
            } finally {
            set({ isLoading: false });
            }
        },

        exportData: async () => {
            return await db.exportData();
        },

        importData: async (jsonString: string) => {
            await db.importData(jsonString);
            await get().fetchStudents();
            await get().fetchWidgets();
            markDirty();
        }
    };
});
