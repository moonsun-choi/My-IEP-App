
import { create } from 'zustand';
import { AppState, PromptLevel, WidgetType, Student, Goal, GoalStatus } from '../types';
import { db } from '../services/db';
import { googleDriveService } from '../services/googleDrive';

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
    syncStatus: 'idle' | 'syncing' | 'saved' | 'error' | 'cloud_newer';
    lastSyncTime: number;

    // Sync Actions
    setOnlineStatus: (isOnline: boolean) => void;
    setLoggedIn: (isLoggedIn: boolean) => void;
    checkCloudStatus: () => Promise<void>;
    syncLocalToCloud: () => Promise<void>;
    syncCloudToLocal: () => Promise<void>;

    reorderGoals: (studentId: string, goals: Goal[]) => Promise<void>;
    fetchAllGoals: () => Promise<void>;
    addGoal: (studentId: string, title: string, icon?: string, status?: GoalStatus) => Promise<void>;
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

    const debouncedSync = debounce(() => get().syncLocalToCloud(), 3000);

    return {
        students: [],
        goals: [],
        logs: [],
        assessments: [],
        materials: [],
        activeWidgets: ['tracker', 'students'], 
        isLoading: false,
        
        // Sync State
        isOnline: navigator.onLine,
        isLoggedIn: false,
        syncStatus: 'idle',
        lastSyncTime: 0,

        setOnlineStatus: (isOnline) => {
            set({ isOnline });
            // If we came back online and are logged in, try to sync pending changes
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

        checkCloudStatus: async () => {
            if (!get().isLoggedIn || !get().isOnline) return;
            try {
                const metadata = await googleDriveService.getBackupMetadata();
                if (metadata) {
                    const cloudTime = new Date(metadata.modifiedTime).getTime();
                    const localLastSync = await db.getLastSyncTime();
                    // If cloud is significantly newer (> 5 seconds buffer) than last sync
                    if (cloudTime > localLastSync + 5000) {
                        set({ syncStatus: 'cloud_newer' });
                    }
                }
            } catch (e) {
                console.error("Failed to check cloud status", e);
            }
        },

        syncLocalToCloud: async () => {
            if (!get().isLoggedIn || !get().isOnline) return;
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
                    
                    // Refresh all data
                    await get().fetchStudents();
                    await get().fetchAllGoals();
                    await get().fetchWidgets();
                    // Refresh logs if a student is selected (context dependent, but good to ensure consistency)
                    
                    set({ syncStatus: 'idle', lastSyncTime: now });
                    alert("동기화가 완료되었습니다.");
                }
            } catch (e) {
                console.error("Restore failed", e);
                set({ syncStatus: 'error' });
                alert("동기화 실패");
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

        fetchStudents: async () => {
            set({ isLoading: true });
            try {
            const students = await db.getStudents();
            set({ students });
            } finally {
            set({ isLoading: false });
            }
        },

        addStudent: async (name: string) => {
            set({ isLoading: true });
            try {
            await db.addStudent(name);
            await get().fetchStudents();
            markDirty();
            } finally {
            set({ isLoading: false });
            }
        },

        updateStudent: async (id: string, name: string) => {
            await db.updateStudent(id, name);
            await get().fetchStudents();
            markDirty();
        },

        deleteStudent: async (id: string) => {
            await db.deleteStudent(id);
            await get().fetchStudents();
            markDirty();
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

        addGoal: async (studentId: string, title: string, icon?: string, status?: GoalStatus) => {
            try {
            await db.addGoal(studentId, title, icon, status);
            await get().fetchGoals(studentId);
            markDirty();
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
            } finally {}
        },

        deleteGoal: async (goalId: string, studentId: string) => {
            try {
                await db.deleteGoal(goalId);
                await get().fetchGoals(studentId);
                markDirty();
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
            let finalUri: string | undefined = undefined;
            
            // Check if mediaUri is actually a File object
            if (mediaUri instanceof File) {
                set({ isLoading: true }); // Show loading during upload
                try {
                    finalUri = await googleDriveService.uploadMedia(mediaUri);
                } catch (e) {
                    console.error("Failed to upload media", e);
                    alert("미디어 업로드에 실패하여 텍스트만 저장됩니다.");
                } finally {
                    set({ isLoading: false });
                }
            } else {
                finalUri = mediaUri;
            }

            // Always use 'accuracy' as type
            await db.addLog(goalId, value, promptLevel, finalUri, notes);
            await get().fetchLogs(goalId);
            markDirty();
        },

        deleteLog: async (logId: string, goalId: string) => {
            await db.deleteLog(logId);
            await get().fetchLogs(goalId);
            markDirty();
        },

        updateLog: async (logId: string, goalId: string, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string | File, notes?: string) => {
            let finalUri: string | undefined = undefined;

            // Check if mediaUri is a new File object
            if (mediaUri instanceof File) {
                set({ isLoading: true });
                try {
                    finalUri = await googleDriveService.uploadMedia(mediaUri);
                } catch (e) {
                    console.error("Failed to upload media", e);
                    alert("미디어 업로드 실패");
                } finally {
                    set({ isLoading: false });
                }
            } else {
                finalUri = mediaUri;
            }

            await db.updateLog(logId, value, promptLevel, timestamp, finalUri, notes);
            await get().fetchLogs(goalId);
            markDirty();
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
