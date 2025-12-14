
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Link, useNavigate } from 'react-router-dom';
import { Target, ChevronRight, Settings, BarChart2, CheckSquare, Sparkles, ArrowRight, Activity, Users, LogOut } from 'lucide-react';
import { WidgetType } from '../types';
import { useBackExit } from '../hooks/useBackExit';

export const Dashboard: React.FC = () => {
  const { students, logs, fetchStudents, activeWidgets, fetchWidgets, toggleWidget } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  // Android Back Button Exit Logic
  const { showExitConfirm, confirmExit, cancelExit } = useBackExit();

  useEffect(() => {
    fetchStudents();
    fetchWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Insight Logic ---
  
  // 1. Find a student who needs observation today
  const todayStr = new Date().toDateString();
  const studentNeedsObservation = useMemo(() => {
      // Get IDs of students recorded today
      const recordedStudentIds = new Set(
          logs.filter(l => new Date(l.timestamp).toDateString() === todayStr)
              .map(l => {
                  const goal = useStore.getState().goals.find(g => g.id === l.goal_id);
                  return goal?.student_id;
              })
              .filter(Boolean)
      );
      
      // Find first student not in that set
      return students.find(s => !recordedStudentIds.has(s.id));
  }, [students, logs, todayStr]);

  // 2. Weekly Activity Data (Last 7 days)
  const weeklyActivity = useMemo(() => {
      const days = [];
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toDateString();
          const count = logs.filter(l => new Date(l.timestamp).toDateString() === dStr).length;
          days.push({ 
              day: d.toLocaleDateString('ko-KR', { weekday: 'short' }), 
              date: d.getDate(),
              count,
              isToday: i === 0
          });
      }
      return days;
  }, [logs]);

  const maxLogCount = Math.max(...weeklyActivity.map(d => d.count), 5); // Minimum scale of 5

  const WIDGET_CONFIG: Record<WidgetType, { label: string; desc: string; icon: React.ElementType; color: string; path: string }> = {
      tracker: {
          label: '관찰 기록',
          desc: '실시간 데이터 수집',
          icon: CheckSquare,
          color: 'bg-orange-100 text-orange-600',
          path: '/tracker'
      },
      students: {
          label: '내 학급',
          desc: '학생 및 목표 관리',
          icon: Users,
          color: 'bg-indigo-100 text-indigo-600',
          path: '/students'
      },
      reports: {
          label: '보고서',
          desc: '성장 추이 및 데이터 분석',
          icon: BarChart2,
          color: 'bg-blue-100 text-blue-600',
          path: '/reports'
      }
  };
  
  const allWidgetKeys = Object.keys(WIDGET_CONFIG) as WidgetType[];

  return (
    <div className="p-4 md:p-8 pb-24 space-y-8 max-w-6xl mx-auto w-full animate-fade-in">
      
      {/* 1. Hero Section: Insights & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Actionable Focus Card */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-200 transition-all hover:shadow-2xl">
              {/* Background Gradient & Decor */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-indigo-400/20 blur-2xl" />

              <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                      <div className="flex items-center gap-2 mb-2 opacity-90">
                          <Sparkles size={18} className="text-yellow-300" />
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">Today's Focus</span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
                          {studentNeedsObservation 
                            ? `${studentNeedsObservation.name} 학생의 기록이 필요해요.` 
                            : "오늘의 모든 기록을 완료했어요!"}
                      </h2>
                      <p className="text-indigo-100 text-sm md:text-base opacity-90 max-w-md leading-relaxed">
                          {studentNeedsObservation 
                            ? "오늘 아직 관찰 데이터가 입력되지 않았습니다. 꾸준한 기록이 정확한 IEP 분석의 시작입니다." 
                            : "훌륭합니다! 모든 학생의 데이터가 최신 상태입니다. 보고서에서 성장 추이를 확인해보세요."}
                      </p>
                  </div>

                  {studentNeedsObservation ? (
                      <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => navigate('/tracker')}>
                           <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white/30 overflow-hidden shrink-0">
                               <img src={studentNeedsObservation.photo_uri} alt="" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1">
                               <div className="font-bold text-lg">{studentNeedsObservation.name}</div>
                               <div className="text-xs text-indigo-100 opacity-80">최근 기록: 확인 필요</div>
                           </div>
                           <button className="bg-white text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm">
                               기록하기 <ArrowRight size={16} />
                           </button>
                      </div>
                  ) : (
                      <div className="mt-8 flex gap-3">
                          <Link to="/reports" className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                              보고서 확인 <BarChart2 size={18} />
                          </Link>
                      </div>
                  )}
              </div>
          </div>

          {/* Right: Weekly Rhythm (Stats) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-gray-800">
                      <Activity size={20} className="text-orange-500" />
                      <h3 className="font-bold text-lg">이번 주 리듬</h3>
                  </div>
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Last 7 days</span>
              </div>

              <div className="flex-1 flex items-end justify-between gap-2 min-h-[140px]">
                  {weeklyActivity.map((d, i) => {
                      const heightPercent = Math.max((d.count / maxLogCount) * 100, 10); 
                      return (
                          <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                              {/* Tooltip on Hover */}
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                                  {d.count}회
                              </div>
                              
                              <div className="w-full h-[120px] flex items-end justify-center bg-gray-50 rounded-xl relative overflow-hidden">
                                   <div 
                                      className={`w-full mx-1 rounded-t-lg transition-all duration-500 ease-out ${d.isToday ? 'bg-orange-400' : 'bg-indigo-200 group-hover:bg-indigo-300'}`}
                                      style={{ height: `${heightPercent}%` }}
                                   />
                              </div>
                              <span className={`text-[10px] font-bold ${d.isToday ? 'text-orange-500' : 'text-gray-400'}`}>
                                  {d.day}
                              </span>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
      
      {/* 2. Widgets Grid */}
      <div>
         <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="font-bold text-xl text-gray-800">바로가기</h3>
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${isEditing ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
             >
                 {isEditing ? <CheckSquare size={14} /> : <Settings size={14} />}
                 {isEditing ? '완료' : '화면 편집'}
             </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {allWidgetKeys.map((key) => {
                 const widget = WIDGET_CONFIG[key];
                 const isActive = activeWidgets.includes(key);
                 
                 // If not editing and not active, hide
                 if (!isEditing && !isActive) return null;

                 return (
                     <div 
                        key={key}
                        onClick={() => {
                            if (isEditing) {
                                toggleWidget(key);
                            } else {
                                navigate(widget.path);
                            }
                        }}
                        className={`
                            relative p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 group
                            ${isActive 
                                ? 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 cursor-pointer' 
                                : 'bg-gray-50 border-dashed border-gray-200 opacity-60'
                            }
                            ${isEditing ? 'cursor-pointer hover:opacity-100' : ''}
                        `}
                     >
                         {/* Edit Mode Checkbox */}
                         {isEditing && (
                             <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white'}`}>
                                 {isActive && <CheckSquare size={12} className="text-white" />}
                             </div>
                         )}

                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${widget.color}`}>
                             <widget.icon size={28} />
                         </div>
                         
                         <div>
                             <h4 className={`font-bold text-lg ${!isActive && isEditing ? 'text-gray-500' : 'text-gray-800'}`}>
                                 {widget.label}
                             </h4>
                             <p className="text-xs text-gray-400 font-medium mt-0.5">{widget.desc}</p>
                         </div>

                         {!isEditing && (
                             <div className="ml-auto text-gray-300 group-hover:text-indigo-400 transition-colors">
                                 <ChevronRight size={20} />
                             </div>
                         )}
                     </div>
                 );
             })}
             
             {/* Add New Hint (only in edit mode if all are active?) */}
             {isEditing && activeWidgets.length < allWidgetKeys.length && (
                  <div className="p-5 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2 min-h-[100px]">
                      <span className="text-xs font-bold">비활성화된 메뉴를 터치하여 추가하세요</span>
                  </div>
             )}
         </div>
      </div>

      {/* Exit Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={cancelExit}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <LogOut size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">앱 종료</h3>
                    <p className="text-gray-500 text-sm">
                        정말 앱을 종료하시겠습니까?
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={cancelExit}
                        className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        취소
                    </button>
                    <button 
                        onClick={confirmExit}
                        className="flex-1 py-3.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors"
                    >
                        종료하기
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
