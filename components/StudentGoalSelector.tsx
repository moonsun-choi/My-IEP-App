
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

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Student Selector */}
      <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-all hover:border-cyan-300 hover:shadow-md cursor-pointer group">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
          {currentStudent && <img src={currentStudent.photo_uri} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <select 
            value={selectedStudentId}
            onChange={(e) => onSelectStudent(e.target.value)}
            className="w-full text-base font-bold text-gray-700 bg-transparent outline-none appearance-none truncate cursor-pointer"
          >
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-cyan-400">Student</div>
        </div>
        <ChevronDown size={16} className="text-gray-400 group-hover:text-cyan-400" />
      </div>

      {/* Goal Selector */}
      <div className="flex-[2] bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-all hover:border-cyan-300 hover:shadow-md cursor-pointer group">
        <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center shrink-0 border border-cyan-100">
          {showAllGoalsOption && selectedGoalId === 'all' ? <Target size={20} /> : <GoalIcon size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <select 
            value={selectedGoalId}
            onChange={(e) => onSelectGoal(e.target.value)}
            className="w-full text-base font-bold text-gray-700 bg-transparent outline-none appearance-none truncate cursor-pointer"
          >
            {showAllGoalsOption && <option value="all">전체 목표 종합</option>}
            {!showAllGoalsOption && goals.length === 0 && <option>목표 없음</option>}
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-cyan-400">Target Goal</div>
        </div>
        <ChevronDown size={16} className="text-gray-400 group-hover:text-cyan-400" />
      </div>
    </div>
  );
};
