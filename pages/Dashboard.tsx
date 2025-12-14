
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
                                   <div className="absolute -top-8 bg-gray