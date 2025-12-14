
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Settings, User, ChevronRight, Target, PlayCircle } from 'lucide-react';

export const StudentList: React.FC = () => {
  const { students, goals, fetchStudents, fetchAllGoals, isLoading } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
    fetchAllGoals(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pb-24 p-4 md:p-8 max-w-3xl mx-auto w-full min-h-screen">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm py-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">학생 선택</h1>
            <p className="text-sm text-gray-500 mt-1">
                목표를 관리할 학생을 선택하세요.
            </p>
        </div>
        
        <button 
            onClick={() => navigate('/students/manage')}
            className="px-4 py-2 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
        >
            <Settings size={16} />
            관리
        </button>
      </header>

      <main>
        {isLoading && students.length === 0 ? (
           <div className="flex justify-center p-8 text-gray-400">Loading...</div>
        ) : (
            <div className="flex flex-col gap-3">
            {students.map((student) => {
                const studentGoals = goals.filter(g => g.student_id === student.id);
                
                return (
                    <button
                        key={student.id}
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 flex items-center gap-4 transition-all active:scale-[0.99] group"
                    >
                        {/* Profile Image */}
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 relative">
                            <img 
                                src={student.photo_uri} 
                                alt={student.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300 absolute inset-0 -z-10">
                                <User size={24} />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-bold text-lg text-gray-900 truncate mb-1.5 group-hover:text-indigo-600 transition-colors">
                                {student.name}
                            </h3>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                    <Target size={12} className="text-gray-400" />
                                    <span>총 목표 {studentGoals.length}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                    <PlayCircle size={12} className="text-indigo-500" />
                                    <span>진행중 {studentGoals.filter(g => g.status === 'in_progress').length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
                            <ChevronRight size={18} />
                        </div>
                    </button>
                );
            })}
            
            {students.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    등록된 학생이 없습니다.<br/>
                    우측 상단 [관리] 버튼을 눌러 학생을 추가해주세요.
                </div>
            )}
            </div>
        )}
      </main>
    </div>
  );
};
