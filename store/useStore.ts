
import { create } from 'zustand';
import { AppState, PromptLevel, WidgetType, MeasurementType, Student, Goal, GoalStatus } from '../types';
import { db } from '../services/db';

interface ExtendedAppState extends AppState {
    reorderGoals: (studentId: string, goals: Goal[]) => Promise<void>;
    fetchAllGoals: () => Promise<void>;
    // Override base types with extended arguments
    addGoal: (studentId: string, title: string, icon?: string, status?: GoalStatus) => Promise<void>;
    updateGoal: (goalId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => Promise<void>;
}

export const useStore = create<ExtendedAppState>((set, get) => ({
  students: [],
  goals: [],
  logs: [],
  assessments: [],
  materials: [],
  activeWidgets: ['tracker', 'students'], // Initial default state before fetch
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
      // Fetches goals for ALL students (useful for list view summaries)
      const goals = await db.getAllGoals();
      set({ goals });
  },

  fetchGoals: async (studentId: string) => {
    // set({ isLoading: true }); // Avoid flicker for quick switches
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
      // We need to know studentId to re-fetch, but for now we can find it from local state if needed
      // Or just assume the UI will trigger re-fetch or optimistically update. 
      // Efficient way: find goal in current store to get studentId
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

  recordTrial: async (goalId: string, type: MeasurementType, value: number, promptLevel: PromptLevel, mediaUri?: string, notes?: string) => {
    // Optimistic update could go here
    await db.addLog(goalId, type, value, promptLevel, mediaUri, notes);
    await get().fetchLogs(goalId);
  },

  deleteLog: async (logId: string, goalId: string) => {
    await db.deleteLog(logId);
    await get().fetchLogs(goalId);
  },

  updateLog: async (logId: string, goalId: string, type: MeasurementType, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string, notes?: string) => {
    await db.updateLog(logId, type, value, promptLevel, timestamp, mediaUri, notes);
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
    // Refresh all data
    await get().fetchStudents();
    await get().fetchWidgets();
  }
}));
