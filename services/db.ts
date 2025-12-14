
import { Student, Goal, ObservationLog, Assessment, Material, PromptLevel, WidgetType, MeasurementType, GoalStatus } from '../types';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DELAY = 100; // Reduced delay as IDB is async but fast
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Improved UUID generation with crypto fallback
function generateUUID() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      // @ts-ignore
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }
  }
  // Fallback for very old environments (unlikely in modern context)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Define the DB Schema
interface IEPDB extends DBSchema {
  logs: {
    key: string;
    value: ObservationLog;
    indexes: { 'by-goal': string; 'by-timestamp': number };
  };
  keyval: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'my-iep-db';
const DB_VERSION = 1;

class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<IEPDB>>;

  constructor() {
    this.dbPromise = this.init();
  }

  private async init() {
    const db = await openDB<IEPDB>(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase<IEPDB>) {
        // 1. Logs Store (Individual records for scalability)
        const logStore = db.createObjectStore('logs', { keyPath: 'id' });
        logStore.createIndex('by-goal', 'goal_id');
        logStore.createIndex('by-timestamp', 'timestamp');

        // 2. Key-Value Store (For Arrays like Students, Goals where order matters)
        db.createObjectStore('keyval');
      },
    });

    await this.migrateFromLocalStorage(db);
    return db;
  }

  // Migrate legacy localStorage data to IndexedDB
  private async migrateFromLocalStorage(db: IDBPDatabase<IEPDB>) {
    if (localStorage.getItem('iep_db_migrated')) return;

    console.log("Migrating data from localStorage to IndexedDB...");
    
    // Migrate Logs
    const oldLogs = localStorage.getItem('iep_logs');
    if (oldLogs) {
      try {
        const logs: any[] = JSON.parse(oldLogs); // Use any to handle legacy structure
        const tx = db.transaction('logs', 'readwrite');
        for (const log of logs) {
             // Fix legacy data
             if (!log.measurementType) log.measurementType = 'accuracy';
             if (log.value === undefined && log.accuracy !== undefined) log.value = log.accuracy;
             
             // Clean up deprecated fields before saving if desired, or save as is
             // Here we ensure 'value' is set.
             await tx.store.put(log as ObservationLog);
        }
        await tx.done;
      } catch (e) {
        console.error("Log migration failed", e);
      }
    }

    // Migrate Key-Value Arrays
    const keys = [
        { local: 'iep_students', db: 'students' },
        { local: 'iep_goals', db: 'goals' },
        { local: 'iep_assessments', db: 'assessments' },
        { local: 'iep_widgets', db: 'widgets' }
    ];

    const tx = db.transaction('keyval', 'readwrite');
    for (const k of keys) {
      const val = localStorage.getItem(k.local);
      if (val) {
        try {
            await tx.store.put(JSON.parse(val), k.db);
        } catch (e) {
            console.error(`Migration for ${k.local} failed`, e);
        }
      }
    }
    await tx.done;

    // Mark as migrated and clean up large logs to free localStorage quota immediately
    localStorage.setItem('iep_db_migrated', 'true');
    localStorage.removeItem('iep_logs'); 
  }

  // --- Helpers for KeyVal Store ---
  private async getKeyVal<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.dbPromise;
    const val = await db.get('keyval', key);
    return (val as T) || defaultValue;
  }

  private async setKeyVal(key: string, value: any) {
    const db = await this.dbPromise;
    await db.put('keyval', value, key);
  }

  // --- Widgets Settings ---
  async getWidgets(): Promise<WidgetType[]> {
    return this.getKeyVal<WidgetType[]>('widgets', ['tracker', 'students']);
  }

  async setWidgets(widgets: WidgetType[]): Promise<void> {
    await this.setKeyVal('widgets', widgets);
  }

  // --- Sync Metadata ---
  async setLastSyncTime(timestamp: number): Promise<void> {
    await this.setKeyVal('last_sync_time', timestamp);
  }

  async getLastSyncTime(): Promise<number> {
    return this.getKeyVal<number>('last_sync_time', 0);
  }

  // --- Students ---
  async getStudents(): Promise<Student[]> {
    // Seed data if empty
    const students = await this.getKeyVal<Student[]>('students', []);
    if (students.length === 0) {
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
      await this.setKeyVal('students', initial);
      return initial;
    }
    return students;
  }

  async addStudent(name: string): Promise<Student> {
    const students = await this.getStudents();
    const newStudent: Student = {
      id: generateUUID(),
      name,
      photo_uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    await this.setKeyVal('students', [...students, newStudent]);
    return newStudent;
  }

  async updateStudent(id: string, name: string, photo_uri?: string): Promise<void> {
    const students = await this.getStudents();
    const updated = students.map(s => s.id === id ? { 
        ...s, 
        name, 
        photo_uri: photo_uri || s.photo_uri || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random` 
    } : s);
    await this.setKeyVal('students', updated);
  }

  async deleteStudent(id: string): Promise<void> {
    const students = await this.getStudents();
    await this.setKeyVal('students', students.filter(s => s.id !== id));
  }

  async reorderStudents(students: Student[]): Promise<void> {
    await this.setKeyVal('students', students);
  }

  // --- Goals ---
  async getAllGoals(): Promise<Goal[]> {
    let allGoals = await this.getKeyVal<Goal[]>('goals', []);
    
    // Seed default goals if absolutely empty
    if (allGoals.length === 0 && (await this.getStudents()).length > 0) {
       const demoGoals = [
         { id: 'g1', student_id: '1', title: "이름 호명 반응하기", description: "교사가 내 이름을 부르면 눈을 맞추거나 '네'라고 답한다.", icon: 'communication', status: 'in_progress' as GoalStatus },
         { id: 'g2', student_id: '1', title: "사물 요구하기 (주세요)", description: "원하는 사물을 보고 몸짓과 함께 '주세요'라고 요구한다.", icon: 'social', status: 'in_progress' as GoalStatus },
         { id: 'g4', student_id: '2', title: "손 씻기 6단계", description: "식사 전 손 씻기 6단계 수칙을 지킨다.", icon: 'self_care', status: 'completed' as GoalStatus },
         { id: 'g5', student_id: '2', title: "화장실 뒷처리", description: "용변 후 옷을 입고 난 뒤에 물을 내린다.", icon: 'self_care', status: 'in_progress' as GoalStatus }
       ];
       await this.setKeyVal('goals', demoGoals);
       allGoals = demoGoals;
    }
    return allGoals.map(g => ({ ...g, status: g.status || 'in_progress' }));
  }

  async getGoals(studentId: string): Promise<Goal[]> {
    const allGoals = await this.getAllGoals();
    return allGoals.filter(g => g.student_id === studentId);
  }

  async addGoal(studentId: string, title: string, icon?: string, status: GoalStatus = 'in_progress'): Promise<Goal> {
    const goals = await this.getAllGoals();
    const newGoal: Goal = {
      id: generateUUID(),
      student_id: studentId,
      title,
      icon: icon || 'target',
      status
    };
    await this.setKeyVal('goals', [...goals, newGoal]);
    return newGoal;
  }

  async updateGoal(id: string, title: string, description?: string, icon?: string, status?: GoalStatus): Promise<void> {
    const goals = await this.getAllGoals();
    const newGoals = goals.map(g => g.id === id ? { 
        ...g, 
        title, 
        description, 
        icon,
        status: status || g.status || 'in_progress' 
    } : g);
    await this.setKeyVal('goals', newGoals);
  }

  async deleteGoal(id: string): Promise<void> {
    const goals = await this.getAllGoals();
    await this.setKeyVal('goals', goals.filter(g => g.id !== id));
  }

  async reorderGoals(studentId: string, orderedGoals: Goal[]): Promise<void> {
    const allGoals = await this.getAllGoals();
    const otherGoals = allGoals.filter(g => g.student_id !== studentId);
    await this.setKeyVal('goals', [...otherGoals, ...orderedGoals]);
  }

  // --- Logs (Trials) ---
  async getLogs(goalId: string): Promise<ObservationLog[]> {
    const db = await this.dbPromise;
    const logs = await db.getAllFromIndex('logs', 'by-goal', goalId);
    
    // Normalize logic for legacy support (runtime fix)
    return logs.map((l: any) => ({
        ...l,
        measurementType: 'accuracy', 
        value: l.value !== undefined ? l.value : (l.accuracy || 0)
    }));
  }

  async getStudentLogs(studentId: string): Promise<ObservationLog[]> {
    const goals = await this.getGoals(studentId);
    const goalIds = goals.map(g => g.id);

    const db = await this.dbPromise;
    const promises = goalIds.map(gid => db.getAllFromIndex('logs', 'by-goal', gid));
    const results = await Promise.all(promises);
    
    const logs = results.flat();

    return logs.map((l: any) => ({
        ...l,
        measurementType: 'accuracy', 
        value: l.value !== undefined ? l.value : (l.accuracy || 0)
    }));
  }

  async addLog(
      goalId: string, 
      value: number, 
      promptLevel: PromptLevel, 
      media_uri?: string, 
      notes?: string
    ): Promise<ObservationLog> {
    
    const newLog: ObservationLog = {
      id: generateUUID(),
      goal_id: goalId,
      measurementType: 'accuracy',
      value: value,
      promptLevel,
      timestamp: Date.now(),
      media_uri,
      notes
    };
    
    const db = await this.dbPromise;
    await db.add('logs', newLog);
    return newLog;
  }

  async deleteLog(logId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('logs', logId);
  }

  async updateLog(
      logId: string, 
      value: number, 
      promptLevel: PromptLevel, 
      timestamp: number, 
      media_uri?: string, 
      notes?: string
    ): Promise<void> {
    
    const db = await this.dbPromise;
    const oldLog = await db.get('logs', logId);
    if (!oldLog) throw new Error("Log not found");

    const updatedLog: ObservationLog = {
        ...oldLog,
        measurementType: 'accuracy',
        value,
        promptLevel,
        timestamp,
        media_uri,
        notes
    };
    await db.put('logs', updatedLog);
  }

  // --- Assessments ---
  async getAssessments(): Promise<Assessment[]> {
    let data = await this.getKeyVal<Assessment[]>('assessments', []);
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
      await this.setKeyVal('assessments', data);
    }
    return data;
  }

  async updateAssessmentItem(assessmentId: string, itemId: string, status: 'good' | 'neutral' | 'bad'): Promise<void> {
    const data = await this.getAssessments();
    const newData = data.map(a => {
      if (a.id !== assessmentId) return a;
      return {
        ...a,
        items: a.items.map(i => i.id === itemId ? { ...i, status } : i)
      };
    });
    await this.setKeyVal('assessments', newData);
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
    const db = await this.dbPromise;
    const logs = await db.getAll('logs');

    const data = {
        students: await this.getKeyVal('students', []),
        goals: await this.getKeyVal('goals', []),
        logs: logs,
        assessments: await this.getKeyVal('assessments', []),
        widgets: await this.getKeyVal('widgets', [])
    };
    return JSON.stringify(data);
  }

  async importData(jsonString: string): Promise<void> {
    try {
        const data = JSON.parse(jsonString);
        const db = await this.dbPromise;

        // Import KeyVal items
        const txKeyVal = db.transaction('keyval', 'readwrite');
        if (data.students) await txKeyVal.store.put(data.students, 'students');
        if (data.goals) await txKeyVal.store.put(data.goals, 'goals');
        if (data.assessments) await txKeyVal.store.put(data.assessments, 'assessments');
        if (data.widgets) await txKeyVal.store.put(data.widgets, 'widgets');
        await txKeyVal.done;

        // Import Logs
        if (data.logs && Array.isArray(data.logs)) {
            const txLogs = db.transaction('logs', 'readwrite');
            await txLogs.store.clear();
            for (const log of data.logs) {
                // Ensure accuracy compatibility on import
                if (!log.measurementType) log.measurementType = 'accuracy';
                await txLogs.store.put(log);
            }
            await txLogs.done;
        }

    } catch (e) {
        console.error("Failed to import data", e);
        throw new Error("Invalid data format");
    }
  }
}

export const db = new DatabaseService();
