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
                // 로그인 직후 클라우드 상태 확인 후 자동 동기화 시도
                get().checkCloudStatus().then(() => {
                    const state = get();
                    if (state.isOnline && state.syncStatus !== 'cloud_newer') {
                        console.log("로그인 직후 자동 동기화 시작 (미디어 업로드 포함)");
                        state.syncLocalToCloud();
                    }
                });
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
            
            // 중복 실행 방지
            if (get().syncStatus === 'syncing') return;

            set({ syncStatus: 'syncing' });
            try {
                // =========================================================
                // [Step 1] 데이터 확보 (모바일 지연 대응 - 강력한 재시도 로직)
                // =========================================================
                let allGoals = await db.getAllGoals();
                let allStudents = await db.getStudents();
                let retryCount = 0;

                // 데이터가 비어있다면 최대 5번(2.5초) 재시도
                while ((allGoals.length === 0 || allStudents.length === 0) && retryCount < 5) {
                    console.log(`[Sync] 데이터 로딩 대기 중... (${retryCount + 1}/5)`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
                    
                    // 스토어 함수를 통해 강제 로드 시도
                    if (allGoals.length === 0) {
                        await get().fetchAllGoals(); // 스토어 업데이트
                        allGoals = await db.getAllGoals(); // DB 재조회
                    }
                    if (allStudents.length === 0) {
                        await get().fetchStudents();
                        allStudents = await db.getStudents();
                    }
                    retryCount++;
                }

                console.log(`[Sync Ready] 목표: ${allGoals.length}개, 학생: ${allStudents.length}명 확보됨.`);

                // =========================================================
                // [Step 2] 로컬 미디어 업로드 (소급 적용)
                // =========================================================
                const allLogs = await db.getAllLogs();
                
                // 업로드 대상 필터링 (Blob, File, Capacitor 경로 등)
                const localMediaLogs = allLogs.filter(l => 
                    l.media_uri && 
                    !l.media_uri.includes('googleusercontent') && 
                    !l.media_uri.includes('drive.google.com') &&
                    (l.media_uri.startsWith('data:') || l.media_uri.startsWith('blob:') || l.media_uri.startsWith('file:') || l.media_uri.startsWith('capacitor:') || l.media_uri.startsWith('content:')) &&
                    !get().uploadingLogIds.includes(l.id)
                );

                if (localMediaLogs.length > 0) {
                    set({ loadingMessage: `미디어 ${localMediaLogs.length}개 동기화 중...` });
                    toast.loading(`미디어 ${localMediaLogs.length}개를 클라우드로 이동 중...`, { id: 'media-upload' });

                    // UI 갱신을 위해 현재 보고 있는 화면의 로그 목록 확인
                    const currentLogsInView = get().logs;
                    let hasUpdated = false;

                    for (const log of localMediaLogs) {
                        try {
                            if (!log.media_uri) continue;
                            
                            // fetch는 # 뒤의 해시를 무시하므로 정상적으로 파일 로드 가능
                            const response = await fetch(log.media_uri);
                            const blob = await response.blob();
                            
                            // [수정] 파일명 및 확장자 결정 로직 개선
                            let finalFileName = '';
                            let mimeType = blob.type || 'image/jpeg';

                            // 1. 저장된 URI에서 파일명(#filename=...) 추출 시도
                            const uriParts = log.media_uri.split('#filename=');
                            let storedName = '';
                            if (uriParts.length > 1) {
                                storedName = decodeURIComponent(uriParts[1]);
                            }

                            if (storedName) {
                                // CASE A: 신규 로직 (파일명이 해시에 저장된 경우)
                                // 이미 recordTrial에서 형식을 다 맞췄으므로 그대로 사용
                                finalFileName = storedName;
                                
                                // 혹시 확장자가 누락되었다면 mimeType 기반으로 추가
                                if (!finalFileName.includes('.')) {
                                    const ext = mimeType.split('/')[1] || 'jpg';
                                    finalFileName = `${finalFileName}.${ext}`;
                                }
                            } else {
                                // CASE B: 기존 데이터 호환 (해시가 없는 경우 직접 조립)
                                let ext = 'jpg';
                                // 확장자 판단 로직 강화 (무조건 mp4가 되는 문제 방지)
                                if (mimeType.includes('video')) {
                                    ext = 'mp4';
                                } else if (mimeType.includes('image')) {
                                    // image/jpeg -> jpg, image/png -> png
                                    ext = mimeType.split('/')[1];
                                    if (ext === 'jpeg') ext = 'jpg';
                                }
                                
                                // 원본명 추출 시도
                                let originalName = 'file';
                                try {
                                    const urlParts = log.media_uri.split('/');
                                    const lastPart = urlParts[urlParts.length - 1]; // blob ID
                                    // blob ID에는 보통 확장자가 없으므로 그냥 둠
                                } catch (e) {}

                                // 이름 재조립
                                let niceName = `log_${log.id}`;
                                const goal = allGoals.find(g => String(g.id) === String(log.goal_id));
                                if (goal) {
                                    const student = allStudents.find(s => String(s.id) === String(goal.student_id));
                                    if (student) {
                                        const dateObj = new Date(log.timestamp);
                                        const dateStr = dateObj.getFullYear() +
                                            String(dateObj.getMonth() + 1).padStart(2, '0') +
                                            String(dateObj.getDate()).padStart(2, '0');
                                        
                                        niceName = `${dateStr}_${student.name}_${originalName}`;
                                    }
                                }
                                finalFileName = `${niceName}.${ext}`;
                            }

                            console.log(`[Sync] Uploading: ${finalFileName} (${mimeType})`);

                            // 2. 파일 생성 및 업로드
                            const file = new File([blob], finalFileName, { type: mimeType });
                            const newUri = await googleDriveService.uploadMedia(file, finalFileName);
                            
                            if (newUri) {
                                await db.updateLog(log.id, log.value, log.promptLevel, log.timestamp, newUri, log.notes, log.mediaType);
                                
                                set(state => ({
                                    logs: state.logs.map(l => l.id === log.id ? { ...l, media_uri: newUri } : l)
                                }));
                                hasUpdated = true;
                            }
                        } catch (mediaErr) {
                            console.error(`Failed to upload media for log ${log.id}`, mediaErr);
                        }
                    }

                    // [중요] 업로드 루프가 끝난 후, 확실하게 UI를 최신 상태(DB)와 동기화
                    if (hasUpdated && currentLogsInView.length > 0) {
                        const currentGoalId = currentLogsInView[0].goal_id;
                        if (currentGoalId) {
                            console.log("UI 강제 새로고침 실행");
                            await get().fetchLogs(currentGoalId); 
                        }
                    }

                    toast.dismiss('media-upload');
                    toast.success("미디어 동기화 완료");
                    set({ loadingMessage: null });
                }

                // =========================================================
                // [Step 3] 텍스트 데이터 백업
                // =========================================================
                const data = await db.exportData();
                await googleDriveService.uploadBackup(data);
                const now = Date.now();
                await db.setLastSyncTime(now);
                set({ syncStatus: 'saved', lastSyncTime: now });
                setTimeout(() => set({ syncStatus: 'idle' }), 2000);

            } catch (e) {
                console.error("Auto sync failed", e);
                set({ syncStatus: 'error', loadingMessage: null });
                toast.dismiss('media-upload');
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
            
            if (mediaUri instanceof File) {
                const state = get();
                const goal = state.goals.find(g => g.id === goalId);
                const student = state.students.find(s => s.id === goal?.student_id);
                const studentName = student?.name || '학생';
                
                const now = new Date();
                const dateStr = now.getFullYear() +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0');

                // 1. 포맷팅된 파일명 생성 (확장자 포함)
                const formattedName = `${dateStr}_${studentName}_${mediaUri.name}`;

                // 2. 파일 객체 생성
                fileToUpload = new File([mediaUri], formattedName, { type: mediaUri.type });
                
                // 3. [핵심 수정] Blob URL 뒤에 '#filename=파일명'을 붙여서 저장
                const blobUrl = URL.createObjectURL(fileToUpload);
                tempUri = `${blobUrl}#filename=${encodeURIComponent(formattedName)}`;
                
                mediaType = fileToUpload.type;
            } else {
                tempUri = mediaUri;
            }

            try {
                // DB에는 파일명이 포함된 tempUri가 저장됨
                const newLog = await db.addLog(goalId, value, promptLevel, tempUri, notes, mediaType);
                
                await get().fetchLogs(goalId);
                toast.success('기록이 저장되었습니다');
                markDirty(); 

                // 백그라운드 업로드
                if (fileToUpload) {
                    const logId = newLog.id;
                    set(state => ({ uploadingLogIds: [...state.uploadingLogIds, logId] }));
                    
                    // [수정] 이미 위에서 파일명을 변경했으므로, fileToUpload.name을 그대로 사용
                    googleDriveService.uploadMedia(fileToUpload, fileToUpload.name).then(async (finalUri) => {
                        if (finalUri) {
                            await db.updateLog(logId, value, promptLevel, newLog.timestamp, finalUri, notes, mediaType);
                            
                            const currentLogs = get().logs;
                            set({ 
                                logs: currentLogs.map(l => l.id === logId ? { ...l, media_uri: finalUri } : l),
                                uploadingLogIds: get().uploadingLogIds.filter(id => id !== logId)
                            });
                            markDirty();

                            if (finalUri.startsWith('http')) {
                                toast.success("미디어 동기화 완료");
                            } else {
                                toast("로컬에 저장됨 (로그인 시 동기화)", { icon: '💾' });
                            }
                        } else {
                             set(state => ({ uploadingLogIds: state.uploadingLogIds.filter(id => id !== logId) }));
                             toast.error("미디어 업로드 실패 (나중에 다시 시도)");
                        }
                    }).catch(err => {
                         console.error("Background upload failed", err);
                         set(state => ({ uploadingLogIds: state.uploadingLogIds.filter(id => id !== logId) }));
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

            const oldLog = get().logs.find(l => l.id === logId);
            
            if (oldLog?.media_uri && oldLog.media_uri.includes('google')) {
                const isRemoved = !mediaUri;
                const isReplaced = mediaUri instanceof File || (typeof mediaUri === 'string' && mediaUri !== oldLog.media_uri);

                if (isRemoved || isReplaced) {
                    googleDriveService.deleteFile(oldLog.media_uri);
                }
            }

            // [수정] 파일명 포맷팅 및 해시 저장 로직
            if (mediaUri instanceof File) {
                const state = get();
                const goal = state.goals.find(g => g.id === goalId);
                const student = state.students.find(s => s.id === goal?.student_id);
                const studentName = student?.name || '학생';
                
                const dateObj = new Date(timestamp);
                const dateStr = dateObj.getFullYear() +
                    String(dateObj.getMonth() + 1).padStart(2, '0') +
                    String(dateObj.getDate()).padStart(2, '0');

                const formattedName = `${dateStr}_${studentName}_${mediaUri.name}`;
                
                fileToUpload = new File([mediaUri], formattedName, { type: mediaUri.type });
                
                // [핵심 수정] URL 뒤에 파일명 부착
                const blobUrl = URL.createObjectURL(fileToUpload);
                tempUri = `${blobUrl}#filename=${encodeURIComponent(formattedName)}`;
                
                mediaType = fileToUpload.type;
            } else {
                tempUri = mediaUri;
            }

            try {
                // Optimistic Update
                await db.updateLog(logId, value, promptLevel, timestamp, tempUri, notes, mediaType);
                await get().fetchLogs(goalId);
                toast.success('기록이 수정되었습니다');
                markDirty();

                if (fileToUpload) {
                    set(state => ({ uploadingLogIds: [...state.uploadingLogIds, logId] }));

                    // [수정] 이미 변경된 파일명 사용
                    googleDriveService.uploadMedia(fileToUpload, fileToUpload.name).then(async (finalUri) => {
                        if (finalUri) {
                            await db.updateLog(logId, value, promptLevel, timestamp, finalUri, notes, mediaType);
                            const currentLogs = get().logs;
                            set({ 
                                logs: currentLogs.map(l => l.id === logId ? { ...l, media_uri: finalUri } : l),
                                uploadingLogIds: get().uploadingLogIds.filter(id => id !== logId)
                            });
                            markDirty();
                            
                            if (finalUri.startsWith('http')) {
                                toast.success("미디어 동기화 완료");
                            } else {
                                toast("로컬에 저장됨 (로그인 시 동기화)", { icon: '💾' });
                            }
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