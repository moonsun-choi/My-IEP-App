
export interface Student {
  id: string;
  name: string;
  photo_uri?: string;
}

export type GoalStatus = 'in_progress' | 'completed' | 'on_hold';

export interface Goal {
  id: string;
  student_id: string;
  title: string;
  description?: string;
  icon?: string;
  status: GoalStatus;
}

export type PromptLevel = 'independent' | 'verbal' | 'gesture' | 'modeling' | 'physical';

export type MeasurementType = 'accuracy';

export interface ObservationLog {
  id: string;
  goal_id: string;
  
  // Data Fields
  measurementType: MeasurementType;
  value: number; // stores accuracy(%) only
  
  promptLevel: PromptLevel;
  timestamp: number;
  notes?: string;
  media_uri?: string;
}

export interface AssessmentItem {
  id: string;
  text: string;
  status: 'good' | 'neutral' | 'bad' | null;
}

export interface Assessment {
  id: string;
  title: string;
  items: AssessmentItem[];
}

export interface Material {
  id: string;
  title: string;
  type: 'worksheet' | 'video' | 'flashcard';
  image_uri: string;
}

export type WidgetType = 'tracker' | 'students' | 'reports';

export interface AppState {
  students: Student[];
  goals: Goal[];
  logs: ObservationLog[];
  assessments: Assessment[];
  materials: Material[];
  isLoading: boolean;
  
  // Dashboard Widgets
  activeWidgets: WidgetType[];
  fetchWidgets: () => Promise<void>;
  toggleWidget: (widget: WidgetType) => Promise<void>;
  
  // New Action for Dashboard
  fetchDashboardData: () => Promise<void>;

  // Actions
  fetchStudents: () => Promise<void>;
  addStudent: (name: string) => Promise<void>;
  updateStudent: (id: string, name: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  reorderStudents: (students: Student[]) => Promise<void>;

  fetchGoals: (studentId: string) => Promise<void>;
  addGoal: (studentId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => Promise<void>;
  updateGoal: (goalId: string, title: string, description?: string, icon?: string, status?: GoalStatus) => Promise<void>;
  deleteGoal: (goalId: string, studentId: string) => Promise<void>;
  
  // Updated Tracking Actions
  recordTrial: (goalId: string, value: number, promptLevel: PromptLevel, mediaUri?: string | File, notes?: string) => Promise<void>;
  fetchLogs: (goalId: string) => Promise<void>;
  fetchStudentLogs: (studentId: string) => Promise<void>;
  deleteLog: (logId: string, goalId: string) => Promise<void>;
  updateLog: (logId: string, goalId: string, value: number, promptLevel: PromptLevel, timestamp: number, mediaUri?: string | File, notes?: string) => Promise<void>;
  
  // Assessment & Materials
  fetchAssessments: () => Promise<void>;
  updateAssessmentItem: (assessmentId: string, itemId: string, status: 'good' | 'neutral' | 'bad') => Promise<void>;
  fetchMaterials: () => Promise<void>;

  // Data Import/Export
  exportData: () => Promise<string>;
  importData: (jsonString: string) => Promise<void>;
}
