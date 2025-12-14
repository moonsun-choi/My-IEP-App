
import { Student, Goal, ObservationLog, Assessment, Material, PromptLevel, WidgetType, MeasurementType, GoalStatus } from '../types';

const DELAY = 200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Polyfill for UUID generation in non-secure contexts (like HTTP on mobile)
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class DatabaseService {
  private get<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private set<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Widgets Settings ---
  async getWidgets(): Promise<WidgetType[]> {
    await delay(100);
    const data = localStorage.getItem('iep_widgets');
    if (!data) {
        // Default widgets
        const defaults: WidgetType[] = ['tracker', 'students'];
        this.set('iep_widgets', defaults);
        return defaults;
    }
    return JSON.parse(data);
  }

  async setWidgets(widgets: WidgetType[]): Promise<void> {
    await delay(100);
    this.set('iep_widgets', widgets);
  }

  // --- Students ---
  async getStudents(): Promise<Student[]> {
    await delay(DELAY);
    const students = this.get<Student>('iep_students');
    if (students.length === 0) {
      // Seed initial data
      const initial: Student[] = [
        { 
          id: '1', 
          name: '김철수', 
          photo_uri: `https://ui-avatars.com/api/?name=${encodeURIComponent('김철수')}&background=FFEDD5&color=C2410C` 
        },
        { 
          id: '2', 
          name: '이영희', 
          photo_uri: `https://ui-avatars.com/api/?name=${encodeURIComponent('이영희')}&background=E0F2FE&color=0369A1` 
        },
      ];
      this.set('iep_students', initial);
      return initial;
    }
    return students;
  }

  async addStudent(name: string): Promise<Student> {
    await delay(DELAY);
    const students = this.get<Student>('iep_students');
    const newStudent: Student = {
      id: generateUUID(),
      name,
      photo_uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    this.set('iep_students', [...students, newStudent]);
    return newStudent;
  }

  async updateStudent(id: string, name: string, photo_uri?: string): Promise<void> {
    await delay(DELAY);
    const students = this.get<Student>('iep_students');
    const updated = students.map(s => s.id === id ? { 
        ...s, 
        name, 
        photo_uri: photo_uri || s.photo_uri || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random` 
    } : s);
    this.set('iep_students', updated);
  }

  async deleteStudent(id: string): Promise<void> {
    await delay(DELAY);
    const students = this.get<Student>('iep_students');
    this.set('iep_students', students.filter(s => s.id !== id));
  }

  async reorderStudents(students: Student[]): Promise<void> {
    // No delay needed for UI responsiveness
    this.set('iep_students', students);
  }

  // --- Goals ---
  async getAllGoals(): Promise<Goal[]> {
    await delay(DELAY);
    const allGoals = this.get<Goal>('iep_goals');
    // Ensure default goals exist if empty
    if (allGoals.length === 0) {
       return this.getGoals('1').then(() => this.get<Goal>('iep_goals'));
    }
    return allGoals.map(g => ({ ...g, status: g.status || 'in_progress' }));
  }

  async getGoals(studentId: string): Promise<Goal[]> {
    await delay(DELAY);
    let allGoals = this.get<Goal>('iep_goals');
    if (allGoals.length === 0) {
       allGoals = [
         { 
            id: 'g1', 
            student_id: '1', 
            title: "이름 호명 반응하기", 
            description: "교사가 내 이름을 부르면 눈을 맞추거나 '네'라고 답한다.",
            icon: 'communication',
            status: 'in_progress'
         },
         { 
            id: 'g2', 
            student_id: '1', 
            title: "사물 요구하기 (주세요)", 
            description: "원하는 사물을 보고 몸짓과 함께 '주세요'라고 요구한다.",
            icon: 'social',
            status: 'in_progress'
         },
         { 
             id: 'g4', 
             student_id: '2', 
             title: "손 씻기 6단계", 
             description: "식사 전 손 씻기 6단계 수칙을 지킨다.",
             icon: 'self_care',
             status: 'completed'
         },
         { 
             id: 'g5', 
             student_id: '2', 
             title: "화장실 뒷처리", 
             description: "용변 후 옷을 입고 난 뒤에 물을 내린다.",
             icon: 'self_care',
             status: 'in_progress'
         }
       ];
       this.set('iep_goals', allGoals);
    }
    // Ensure status exists for legacy data
    return allGoals
        .filter(g => g.student_id === studentId)
        .map(g => ({ ...g, status: g.status || 'in_progress' }));
  }

  async addGoal(studentId: string, title: string, icon?: string, status: GoalStatus = 'in_progress'): Promise<Goal> {
    await delay(DELAY);
    const goals = this.get<Goal>('iep_goals');
    const newGoal: Goal = {
      id: generateUUID(),
      student_id: studentId,
      title,
      icon: icon || 'target',
      status
    };
    this.set('iep_goals', [...goals, newGoal]);
    return newGoal;
  }

  async updateGoal(id: string, title: string, description?: string, icon?: string, status?: GoalStatus): Promise<void> {
    await delay(DELAY);
    const goals = this.get<Goal>('iep_goals');
    const newGoals = goals.map(g => g.id === id ? { 
        ...g, 
        title, 
        description, 
        icon,
        status: status || g.status || 'in_progress' 
    } : g);
    this.set('iep_goals', newGoals);
  }

  async deleteGoal(id: string): Promise<void> {
    await delay(DELAY);
    const goals = this.get<Goal>('iep_goals');
    const newGoals = goals.filter(g => g.id !== id);
    this.set('iep_goals', newGoals);
  }

  async reorderGoals(studentId: string, orderedGoals: Goal[]): Promise<void> {
    // 1. Get all goals
    const allGoals = this.get<Goal>('iep_goals');
    // 2. Filter out goals for this student from the main list
    const otherGoals = allGoals.filter(g => g.student_id !== studentId);
    // 3. Combine others + new ordered list
    const newAllGoals = [...otherGoals, ...orderedGoals];
    this.set('iep_goals', newAllGoals);
  }

  // --- Logs (Trials) ---
  async getLogs(goalId: string): Promise<ObservationLog[]> {
    await delay(DELAY);
    const logs = this.get<ObservationLog>('iep_logs');
    // Normalize old data structure if needed (ensure measurementType exists)
    return logs.filter(l => l.goal_id === goalId).map(l => ({
        ...l,
        measurementType: l.measurementType || 'accuracy',
        value: l.value !== undefined ? l.value : (l.accuracy || 0)
    }));
  }

  async getStudentLogs(studentId: string): Promise<ObservationLog[]> {
    await delay(DELAY);
    const allGoals = this.get<Goal>('iep_goals');
    const studentGoalIds = allGoals.filter(g => g.student_id === studentId).map(g => g.id);
    const logs = this.get<ObservationLog>('iep_logs');
    return logs
        .filter(l => studentGoalIds.includes(l.goal_id))
        .map(l => ({
            ...l,
            measurementType: l.measurementType || 'accuracy',
            value: l.value !== undefined ? l.value : (l.accuracy || 0)
        }));
  }

  async addLog(
      goalId: string, 
      type: MeasurementType, 
      value: number, 
      promptLevel: PromptLevel, 
      media_uri?: string, 
      notes?: string
    ): Promise<ObservationLog> {
    await delay(100); 
    const logs = this.get<ObservationLog>('iep_logs');
    const newLog: ObservationLog = {
      id: generateUUID(),
      goal_id: goalId,
      measurementType: type,
      value: value,
      accuracy: type === 'accuracy' ? value : 0, // Backward compat
      promptLevel,
      timestamp: Date.now(),
      media_uri,
      notes
    };
    this.set('iep_logs', [...logs, newLog]);
    return newLog;
  }

  async deleteLog(logId: string): Promise<void> {
    await delay(100);
    const logs = this.get<ObservationLog>('iep_logs');
    const newLogs = logs.filter(l => l.id !== logId);
    this.set('iep_logs', newLogs);
  }

  async updateLog(
      logId: string, 
      type: MeasurementType, 
      value: number, 
      promptLevel: PromptLevel, 
      timestamp: number, 
      media_uri?: string, 
      notes?: string
    ): Promise<void> {
    await delay(100);
    const logs = this.get<ObservationLog>('iep_logs');
    const newLogs = logs.map(l => l.id === logId ? { 
        ...l, 
        measurementType: type,
        value,
        accuracy: type === 'accuracy' ? value : 0, // Backward compat
        promptLevel, 
        timestamp, 
        media_uri, 
        notes 
    } : l);
    this.set('iep_logs', newLogs);
  }

  // --- Assessments ---
  async getAssessments(): Promise<Assessment[]> {
    await delay(DELAY);
    let data = this.get<Assessment>('iep_assessments');
    if (data.length === 0) {
      data = [
        {
          id: 'a1',
          title: '현행 수준 평가 (6-8세)',
          items: [
            { id: 'i1', text: '정보를 논리적인 순서로 배열함', status: 'neutral' },
            { id: 'i2', text: '문장 길이가 연령에 적합함', status: 'bad' },
            { id: 'i3', text: '눈 맞춤을 형성하고 유지함', status: 'good' },
          ]
        }
      ];
      this.set('iep_assessments', data);
    }
    return data;
  }

  async updateAssessmentItem(assessmentId: string, itemId: string, status: 'good' | 'neutral' | 'bad'): Promise<void> {
    const data = this.get<Assessment>('iep_assessments');
    const newData = data.map(a => {
      if (a.id !== assessmentId) return a;
      return {
        ...a,
        items: a.items.map(i => i.id === itemId ? { ...i, status } : i)
      };
    });
    this.set('iep_assessments', newData);
  }

  // --- Materials ---
  async getMaterials(): Promise<Material[]> {
    await delay(DELAY);
    return [
      { id: 'm1', title: "'ㅁ' 발음 연습 활동지", type: 'worksheet', image_uri: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=300&q=80' },
      { id: 'm2', title: '생일파티 사회성 이야기', type: 'video', image_uri: 'https://images.unsplash.com/photo-1530103862676-de3c9da59af7?auto=format&fit=crop&w=300&q=80' },
      { id: 'm3', title: '색깔 인지 플래시카드', type: 'flashcard', image_uri: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=300&q=80' },
    ];
  }

  // --- Data Export/Import ---
  async exportData(): Promise<string> {
    const data = {
        students: this.get('iep_students'),
        goals: this.get('iep_goals'),
        logs: this.get('iep_logs'),
        assessments: this.get('iep_assessments'),
        widgets: this.get('iep_widgets')
    };
    return JSON.stringify(data);
  }

  async importData(jsonString: string): Promise<void> {
    try {
        const data = JSON.parse(jsonString);
        if (data.students) this.set('iep_students', data.students);
        if (data.goals) this.set('iep_goals', data.goals);
        if (data.logs) this.set('iep_logs', data.logs);
        if (data.assessments) this.set('iep_assessments', data.assessments);
        if (data.widgets) this.set('iep_widgets', data.widgets);
    } catch (e) {
        console.error("Failed to import data", e);
        throw new Error("Invalid data format");
    }
  }
}

export const db = new DatabaseService();
