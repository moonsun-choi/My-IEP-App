
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Link, useNavigate } from 'react-router-dom';
import { Target, ChevronRight, Settings, BarChart2, X, CheckSquare, Sparkles, ArrowRight, Activity, CalendarClock, Users, LogOut } from 'lucide-react';
import { WidgetType } from '../types';
import { getGoalIcon } from '../utils/goalIcons';
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
  }, [fetchStudents, fetchWidgets]);

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
          desc: '실시간 데이터 수집 시작',
          icon: CheckSquare,
          color: 'bg-orange-100 text-orange-600',
          path: '/tracker'
      },
      students: {
          label: '내 학급',
          desc: '학생 명단 및 목표 설정',
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

  return (
    <div className="p-4 md:p-8 pb-24 space-y-8 max-w-6xl mx-auto w-full">
      
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
                      const heightPercent = Math.max((d.count / maxLogCount) * 100, 15); // Min height 15%
                      return (
                          <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                              <div className="relative w-full flex justify-end flex-col items-center h-[120px]">
                                   {/* Tooltip */}
                                   <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                       {d.count}건
                                   </div>
                                   {/* Bar */}
                                   <div 
                                      className={`w-full max-w-[12px] md:max-w-[16px] rounded-t-full rounded-b-md transition-all duration-500 ease-out ${d.isToday ? 'bg-indigo-500 shadow-md shadow-indigo-200' : 'bg-gray-100 group-hover:bg-indigo-200'}`}
                                      style={{ height: `${heightPercent}%` }}
                                   />
                              </div>
                              <div className="flex flex-col items-center">
                                  <span className={`text-[10px] font-bold uppercase ${d.isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                                      {d.day}
                                  </span>
                                  {d.isToday && <div className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />}
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      </div>

      {/* 2. Main Widgets (Quick Actions) */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                바로가기
            </h3>
            <button 
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
                <Settings size={14} /> 편집
            </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWidgets.map(widgetKey => {
                const config = WIDGET_CONFIG[widgetKey];
                const Icon = config.icon;
                return (
                    <Link 
                        key={widgetKey} 
                        to={config.path} 
                        className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                    >
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${config.color}`}>
                                <Icon size={28} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">{config.label}</h4>
                                <p className="text-sm text-gray-500">{config.desc}</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                            <ChevronRight size={18} />
                        </div>
                    </Link>
                )
            })}
            
            {activeWidgets.length === 0 && (
                <div className="col-span-full text-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <p className="text-sm">선택된 메뉴가 없습니다.</p>
                    <button onClick={() => setIsEditing(true)} className="text-indigo-500 font-bold text-sm mt-2 hover:underline">메뉴 설정하기</button>
                </div>
            )}
        </div>
      </div>

      {/* 3. Recent Updates (Simpler list) */}
      <div>
        <div className="flex justify-between items-center px-1 mb-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
               <CalendarClock size={20} className="text-gray-400" />
               최근 활동 내역
            </h3>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {logs.length > 0 ? logs.sort((a,b) => b.timestamp - a.timestamp).slice(0, 3).map((log) => {
                const goal = useStore.getState().goals.find(g => g.id === log.goal_id);
                const student = students.find(s => s.id === goal?.student_id);
                const GoalIcon = getGoalIcon(goal?.icon);

                return (
                    <div key={log.id} className="p-4 md:p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                             {student ? <img src={student.photo_uri} alt="" className="w-full h-full object-cover"/> : <Target size={18} className="text-gray-400"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 truncate">
                                {student ? student.name : 'Unknown'} 
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {goal && (
                                    <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-medium truncate max-w-[120px]">
                                        <GoalIcon size={10} />
                                        <span className="truncate">{goal.title}</span>
                                    </div>
                                )}
                                <span className="text-xs text-indigo-600 font-bold">
                                    {log.measurementType === 'accuracy' ? `정확도 ${log.value}%` : '기록됨'}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                    </div>
                );
            }) : (
                <div className="p-10 text-center text-gray-400 text-sm">
                    아직 기록된 활동이 없습니다.
                </div>
            )}
            
            {logs.length > 0 && (
                <Link to="/tracker" className="block p-4 text-center text-xs font-bold text-indigo-500 hover:bg-indigo-50 transition-colors">
                    전체 기록 보러가기
                </Link>
            )}
        </div>
      </div>

      {/* Edit Widgets Modal */}
      {isEditing && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4 sm:p-0">
              <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-3xl p-6 shadow-2xl animate-slide-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">메뉴 설정</h3>
                      <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="space-y-3 mb-6">
                      {(Object.keys(WIDGET_CONFIG) as WidgetType[]).map(key => {
                          const config = WIDGET_CONFIG[key];
                          const Icon = config.icon;
                          const isActive = activeWidgets.includes(key);
                          return (
                              <button 
                                key={key}
                                onClick={() => toggleWidget(key)}
                                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                    isActive 
                                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                                    : 'border-gray-100 bg-white hover:border-gray-300'
                                }`}
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                                          <Icon size={20} />
                                      </div>
                                      <span className={`font-bold ${isActive ? 'text-indigo-900' : 'text-gray-500'}`}>
                                          {config.label}
                                      </span>
                                  </div>
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                      isActive ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                                  }`}>
                                      {isActive && <CheckSquare size={14} className="text-white" />}
                                  </div>
                              </button>
                          )
                      })}
                  </div>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-gray-200"
                  >
                      설정 완료
                  </button>
              </div>
          </div>
      )}

      {/* Exit Confirmation Modal (Triggered by Back Button Trap) */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-scale-up text-center">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LogOut size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">앱을 종료하시겠습니까?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    현재 화면에서 나가면 앱이 종료됩니다.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={cancelExit}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        취소
                    </button>
                    <button 
                        onClick={confirmExit}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                    >
                        종료
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
