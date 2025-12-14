
import { create } from 'zustand';
import { AppState, PromptLevel, WidgetType, MeasurementType, Student, Goal, GoalStatus } from '../types';
import { db } from '../services/db';
import { googleDriveService } from '../services/googleDrive';

interface ExtendedAppState extends AppState {
    reorderGoals: (studentId: string, goals: Goal[]) => Promise<void>;
    fetchAllGoals: () => Promise<void>;
    addGoal: (studentId: string, title: string, icon?: string, status?: GoalStatus) => Promise<void>;
    updateGoal: (goalId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => Promise<void>;
    // Updated Signatures to accept File object
    recordTrial: (goalId: string, type: MeasurementType, value: number, promptLevel: PromptLevel, mediaUri?: string | File, notes?: string) => Promise<void>;
    updateLog: (logId: string, goalId: string, type: MeasurementType, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string | File, notes?: string) => Promise<void>;
}

export const useStore = create<ExtendedAppState>((set, get) => ({
  students: [],
  goals: [],
  logs: [],
  assessments: [],
  materials: [],
  activeWidgets: ['tracker', 'students'], 
  isLoading: false,

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
    } finally {
      set({ isLoading: false });
    }
  },

  updateStudent: async (id: string, name: string) => {
    await db.updateStudent(id, name);
    await get().fetchStudents();
  },

  deleteStudent: async (id: string) => {
    await db.deleteStudent(id);
    await get().fetchStudents();
  },

  reorderStudents: async (students: Student[]) => {
    set({ students }); // Optimistic update
    await db.reorderStudents(students);
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
    } finally {}
  },

  updateGoal: async (goalId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => {
    try {
      await db.updateGoal(goalId, title, description, icon, status);
      const goal = get().goals.find(g => g.id === goalId);
      if (goal) {
          await get().fetchGoals(goal.student_id);
      }
    } finally {}
  },

  deleteGoal: async (goalId: string, studentId: string) => {
    try {
        await db.deleteGoal(goalId);
        await get().fetchGoals(studentId);
    } finally {}
  },

  reorderGoals: async (studentId: string, goals: Goal[]) => {
      set({ goals }); // Optimistic local update
      await db.reorderGoals(studentId, goals);
  },

  fetchLogs: async (goalId: string) => {
    const logs = await db.getLogs(goalId);
    set({ logs });
  },

  fetchStudentLogs: async (studentId: string) => {
    const logs = await db.getStudentLogs(studentId);
    set({ logs });
  },

  recordTrial: async (goalId: string, type: MeasurementType, value: number, promptLevel: PromptLevel, mediaUri?: string | File, notes?: string) => {
    let finalUri: string | undefined = undefined;
    
    // Check if mediaUri is actually a File object
    if (mediaUri instanceof File) {
        set({ isLoading: true }); // Show loading during upload
        try {
            finalUri = await googleDriveService.uploadMedia(mediaUri);
        } catch (e) {
            console.error("Failed to upload media", e);
            // Fallback: If upload fails, try to save local base64 to prevent total data loss, 
            // or just save without media and alert user? 
            // googleDriveService.uploadMedia handles fallback to base64 internally if configured, 
            // but if it fails unexpectedly:
            alert("미디어 업로드에 실패하여 텍스트만 저장됩니다.");
        } finally {
            set({ isLoading: false });
        }
    } else {
        finalUri = mediaUri;
    }

    await db.addLog(goalId, type, value, promptLevel, finalUri, notes);
    await get().fetchLogs(goalId);
  },

  deleteLog: async (logId: string, goalId: string) => {
    await db.deleteLog(logId);
    await get().fetchLogs(goalId);
  },

  updateLog: async (logId: string, goalId: string, type: MeasurementType, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string | File, notes?: string) => {
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

    await db.updateLog(logId, type, value, promptLevel, timestamp, finalUri, notes);
    await get().fetchLogs(goalId);
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
  }
}));
