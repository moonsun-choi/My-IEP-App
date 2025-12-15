import React from 'react';
import { ChevronDown, Target, Check } from 'lucide-react';
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
    // [수정됨] flex flex-col 제거하고 space-y-3 사용 (Block 레이아웃 유지)
    <div className="space-y-3">
      {/* 1. Horizontal Scroll Student Profile Bar */}
      {/* w-full 제거됨, -mx-4로 좌우 여백 확장 */}
      <div className="flex overflow-x-auto py-3 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide gap-4 snap-x">
          {students.map((s) => {
              const isSelected = selectedStudentId === s.id;
              
              return (
                  <button 
                    key={s.id}
                    onClick={() => onSelectStudent(s.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group transition-all snap-start"
                  >
                      {/* Avatar Ring Container */}
                      <div className={`
                          rounded-full p-[3px] transition-all duration-300 relative
                          ${isSelected 
                            ? 'bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-md scale-105' 
                            : 'bg-transparent border border-gray-200 hover:border-cyan-200'
                          }
                      `}>
                          {/* Avatar Image */}
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white bg-gray-100 overflow-hidden relative">
                              <img 
                                src={s.photo_uri} 
                                alt={s.name} 
                                className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                              />
                          </div>
                          
                          {/* Selection Indicator (Check Icon) */}
                          {isSelected && (
                              <div className="absolute bottom-0 right-0 bg-cyan-600 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                                  <Check size={10} strokeWidth={4} />
                              </div>
                          )}
                      </div>
                      
                      {/* Name Label */}
                      <span className={`
                          text-xs md:text-sm max-w-[70px] truncate text-center transition-colors
                          ${isSelected ? 'font-bold text-gray-800' : 'text-gray-500 font-medium group-hover:text-gray-700'}
                      `}>
                          {s.name}
                      </span>
                  </button>
              );
          })}
          
          {/* Empty State / Add Hint (Optional) */}
          {students.length === 0 && (
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gray-50 border border-dashed border-gray-300 text-gray-400 shrink-0">
                  <span className="text-[10px]">학생 없음</span>
              </div>
          )}
      </div>

      {/* 2. Goal Selector (Dropdown) */}
      <div className="relative bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-all hover:border-cyan-300 hover:shadow-md cursor-pointer group">
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

        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${selectedGoalId === 'all' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
          {showAllGoalsOption && selectedGoalId === 'all' ? <Target size={18} /> : <GoalIcon size={18} />}
        </div>
        
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 group-hover:text-cyan-500 transition-colors">Target Goal</div>
          <div className="w-full text-sm font-bold text-gray-700 truncate">
              {getGoalTitleDisplay()}
          </div>
        </div>
        <ChevronDown size={16} className="text-gray-400 group-hover:text-cyan-400 pointer-events-none transition-colors" />
      </div>
    </div>
  );
};

// Add styles for hiding scrollbar but keeping functionality
const style = document.createElement('style');
style.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }
`;
document.head.appendChild(style);