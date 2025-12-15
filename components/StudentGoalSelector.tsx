
import React from 'react';
import { ChevronDown, Target } from 'lucide-react';
import { Student, Goal } from '../types';
import { getGoalIcon } from '../utils/goalIcons';

interface StudentGoalSelectorProps {
  students: Student[];
  goals: Goal[];
  selectedStudentId: string;
  selectedGoalId: string;
  onSelectStudent: (id: string) => void;
  onSelectGoal: (id: string) => void;
  currentStudent?: Student;
  showAllGoalsOption?: boolean;
}

export const StudentGoalSelector: React.FC<StudentGoalSelectorProps> = ({
  students,
  goals,
  selectedStudentId,
  selectedGoalId,
  onSelectStudent,
  onSelectGoal,
  currentStudent,
  showAllGoalsOption = false,
}) => {
  const currentGoal = goals.find(g => g.id === selectedGoalId);
  const GoalIcon = currentGoal ? getGoalIcon(currentGoal.icon) : Target;

  const getGoalTitleDisplay = () => {
      if (showAllGoalsOption && selectedGoalId === 'all') return '전체 목표 종합';
      if (goals.length === 0) return '목표 없음';
      return currentGoal ? currentGoal.title : '목표를 선택하세요';
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Student Selector */}
      <div className="relative flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-all hover:border-cyan-300 hover:shadow-md cursor-pointer group">
        <select 
            value={selectedStudentId}
            onChange={(e) => onSelectStudent(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        >
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-gray-100 pointer-events-none">
          {currentStudent && <img src={currentStudent.photo_uri} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="w-full text-base font-bold text-gray-700 truncate">
              {currentStudent?.name || '학생 선택'}
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-cyan-400">Student</div>
        </div>
        <ChevronDown size={16} className="text-gray-400 group-hover:text-cyan-400 pointer-events-none" />
      </div>

      {/* Goal Selector */}
      <div className="relative flex-[2] bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-all hover:border-cyan-300 hover:shadow-md cursor-pointer group">
        <select 
            value={selectedGoalId}
            onChange={(e) => onSelectGoal(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={goals.length === 0 && !showAllGoalsOption}
        >
            {showAllGoalsOption && <option value="all">전체 목표 종합</option>}
            {!showAllGoalsOption && goals.length === 0 && <option value="" disabled>목표 없음</option>}
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>

        <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center shrink-0 border border-cyan-100 pointer-events-none">
          {showAllGoalsOption && selectedGoalId === 'all' ? <Target size={20} /> : <GoalIcon size={20} />}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="w-full text-base font-bold text-gray-700 truncate">
              {getGoalTitleDisplay()}
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-cyan-400">Target Goal</div>
        </div>
        <ChevronDown size={16} className="text-gray-400 group-hover:text-cyan-400 pointer-events-none" />
      </div>
    </div>
  );
};
