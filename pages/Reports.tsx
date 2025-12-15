
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Trophy, ChevronDown, Calendar, Target, Check, BarChart2 } from 'lucide-react';
import { getGoalIcon } from '../utils/goalIcons';
import { useSearchParams } from 'react-router-dom';

export const Reports: React.FC = () => {
  const { students, goals, logs, fetchStudents, fetchGoals, fetchStudentLogs } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  
  const [searchParams] = useSearchParams();

  const [rangeType, setRangeType] = useState<'1w' | '1m' | '3m' | 'custom'>('1w');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (students.length > 0) {
      const paramId = searchParams.get('studentId');
      if (paramId && students.some(s => s.id === paramId)) {
        if (selectedStudentId !== paramId) setSelectedStudentId(paramId);
      } else if (!selectedStudentId) {
        setSelectedStudentId(students[0].id);
      }
    }
  }, [students, searchParams]);

  useEffect(() => {
    if (selectedStudentId) {
        fetchGoals(selectedStudentId);
        fetchStudentLogs(selectedStudentId);
        setSelectedGoalId('all');
    }
  }, [selectedStudentId, fetchGoals, fetchStudentLogs]);
  
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const studentGoals = goals.filter(g => g.student_id === selectedStudentId);
  const studentGoalIds = studentGoals.map(g => g.id);
  
  const currentGoal = studentGoals.find(g => g.id === selectedGoalId);
  const CurrentGoalIcon = currentGoal ? getGoalIcon(currentGoal.icon) : Target;

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (rangeType === 'custom') {
        const s = customStart ? new Date(customStart) : new Date();
        const e = customEnd ? new Date(customEnd) : new Date();
        s.setHours(0,0,0,0);
        e.setHours(23,59,59,999);
        return { startDate: s, endDate: e };
    }

    let daysToSubtract = 6;
    if (rangeType === '1m') daysToSubtract = 29;
    if (rangeType === '3m') daysToSubtract = 89;

    start.setDate(end.getDate() - daysToSubtract);
    return { startDate: start, endDate: end };
  }, [rangeType, customStart, customEnd]);

  const chartData = useMemo(() => {
    let relevantLogs = logs.filter(l => studentGoalIds.includes(l.goal_id));
    if (selectedGoalId !== 'all') {
        relevantLogs = relevantLogs.filter(l => l.goal_id === selectedGoalId);
    }
    
    const days = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    let safetyCounter = 0;
    while (current <= end && safetyCounter < 365) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
        safetyCounter++;
    }

    return days.map(day => {
        const dateStr = day.toDateString();
        const dayLogs = relevantLogs.filter(l => new Date(l.timestamp).toDateString() === dateStr);
        let avg = 0;
        if (dayLogs.length > 0) {
            avg = Math.round(dayLogs.reduce((acc, curr) => acc + (curr.value || 0), 0) / dayLogs.length);
        }
        return {
            date: day,
            dateLabel: day.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
            avgAccuracy: dayLogs.length > 0 ? avg : null,
            count: dayLogs.length
        };
    });
  }, [logs, studentGoalIds, selectedGoalId, startDate, endDate]);

  const validDataPoints = chartData.filter(d => d.avgAccuracy !== null);
  const totalLogsCount = validDataPoints.reduce((acc, cur) => acc + cur.count, 0);
  const dayCount = chartData.length;

  // Chart Rendering Helper
  const chartHeight = 200;
  const getPoints = () => {
      if (validDataPoints.length === 0) return '';
      let path = '';
      let isFirst = true;
      const totalPoints = chartData.length;
      const divider = totalPoints > 1 ? totalPoints - 1 : 1; 
      chartData.forEach((d, i) => {
          if (d.avgAccuracy !== null) {
              const x = (i / divider) * 100;
              const y = chartHeight - (d.avgAccuracy / 100) * chartHeight;
              if (isFirst) { path += `M ${x},${y}`; isFirst = false; if (totalPoints === 1) path += ` L 100,${y}`; } 
              else { path += ` L ${x},${y}`; }
          }
      });
      return path;
  };

  const analysisResult = useMemo(() => {
    if (validDataPoints.length < 2) return null;
    const recentPoints = validDataPoints.slice(-3);
    const recentAvg = recentPoints.reduce((acc, curr) => acc + (curr.avgAccuracy || 0), 0) / recentPoints.length;

    const n = validDataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXYAvg = 0, sumXX = 0;
    validDataPoints.forEach((d, i) => {
        const val = d.avgAccuracy || 0;
        sumX += i;
        sumY += val;
        sumXY += i * val;
        sumXX += i * i;
    });
    const denominator = (n * sumXX - sumX * sumX);
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;

    let status: 'mastery' | 'improving' | 'declining' | 'stagnant_low' | 'stagnant_mid' = 'stagnant_mid';
    let title = '';
    let message = '';
    let color = '';

    if (recentAvg >= 90) {
        status = 'mastery'; title = '매우 훌륭한 수행 수준 (Mastery)';
        message = '최근 수행도가 90% 이상으로 매우 안정적입니다.\n현재 단계의 목표를 달성한 것으로 보입니다.';
        color = 'bg-cyan-50 border-cyan-100 text-cyan-900';
    } else if (slope > 0.5) {
        status = 'improving'; title = '지속적인 성장세 (Improving)';
        message = '전반적으로 수행 정확도가 상승하고 있습니다.\n현재 교수 전략이 효과적입니다.';
        color = 'bg-green-50 border-green-100 text-green-900';
    } else if (slope < -0.5) {
        status = 'declining'; title = '수행도 하락 (Declining)';
        message = '최근 수행 정확도가 하락하는 추세입니다.\n난이도 조절이나 방해 요인 점검이 필요합니다.';
        color = 'bg-red-50 border-red-100 text-red-900';
    } else if (recentAvg < 60) {
        status = 'stagnant_low'; title = '도움 필요 (Needs Support)';
        message = '수행도가 낮은 상태입니다.\n과제 단계를 세분화하거나 촉구 수준을 높여주세요.';
        color = 'bg-orange-50 border-orange-100 text-orange-900';
    } else {
        status = 'stagnant_mid'; title = '수행 유지 (Plateau)';
        message = '수행도가 일정 수준에서 유지되고 있습니다.\n더 강력한 강화제나 환경 변화가 필요할 수 있습니다.';
        color = 'bg-gray-50 border-gray-200 text-gray-900';
    }
    return { slope, recentAvg, status, title, message, color };
  }, [validDataPoints]);

  return (
    <div className="pb-24 max-w-6xl mx-auto w-full px-4 md:px-8 md:pt-8">
       
       {/* --- 1. Dashboard Header (Cyan Theme) --- */}
       <div className="bg-cyan-50/50 backdrop-blur-sm -mx-4 md:mx-0 md:rounded-3xl px-6 pt-4 pb-8 shadow-sm mb-6 border-b border-cyan-100 md:border">
           
           {/* Step 1: Student Selector */}
           <div className="flex overflow-x-auto w-[calc(100%+3rem)] max-w-[100vw] py-3 -mx-6 pl-9 pr-2 md:mx-0 md:px-0 md:w-full scrollbar-hide gap-4 snap-x">
                {students.map((s) => {
                    const isSelected = selectedStudentId === s.id;
                    return (
                        <button 
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className="flex flex-col items-center gap-2 shrink-0 group transition-all snap-start"
                        >
                            <div className={`
                                rounded-full p-[3px] transition-all duration-300 relative
                                ${isSelected 
                                ? 'bg-gradient-to-tr from-cyan-400 to-blue-400 shadow-md scale-105' 
                                : 'bg-transparent border-2 border-slate-200 hover:border-cyan-300'
                                }
                            `}>
                                <div className="w-12 h-12 rounded-full border-[3px] border-white bg-slate-100 overflow-hidden relative">
                                    <img src={s.photo_uri} alt={s.name} className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                                </div>
                                {isSelected && (
                                    <div className="absolute bottom-0 right-0 bg-cyan-600 text-white rounded-full p-0.5 border-2 border-white shadow-sm z-10">
                                        <Check size={8} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                            <span className={`text-xs max-w-[60px] truncate text-center transition-colors ${isSelected ? 'font-bold text-slate-800' : 'text-slate-500 font-medium'}`}>
                                {s.name}
                            </span>
                        </button>
                    );
                })}
           </div>

           {/* Step 2: Controls Card (Integrated) */}
           <div className="bg-white rounded-2xl p-2 shadow-sm border border-cyan-100/50 mt-2">
               <div className="flex flex-col md:flex-row gap-2">
                   {/* Goal Selector */}
                   <div className="relative flex-1">
                        <select 
                            value={selectedGoalId}
                            onChange={(e) => setSelectedGoalId(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={studentGoals.length === 0}
                        >
                            <option value="all">전체 목표 종합</option>
                            {studentGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </select>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedGoalId === 'all' ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-600'}`}>
                                 {selectedGoalId === 'all' ? <Target size={20} /> : <CurrentGoalIcon size={20} />}
                             </div>
                             <div className="flex-1 min-w-0 text-left">
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">분석 목표</div>
                                 <div className="text-sm font-bold text-slate-800 truncate">
                                     {selectedGoalId === 'all' ? '전체 목표 종합' : currentGoal?.title}
                                 </div>
                             </div>
                             <ChevronDown size={18} className="text-slate-400" />
                        </div>
                   </div>

                   {/* Divider (Mobile hidden) */}
                   <div className="w-px bg-slate-100 my-2 hidden md:block"></div>
                   <div className="h-px bg-slate-100 mx-2 md:hidden"></div>

                   {/* Period Tabs */}
                   <div className="flex-1 flex flex-col justify-center p-2">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[{l:'1주',v:'1w'}, {l:'1개월',v:'1m'}, {l:'3개월',v:'3m'}, {l:'직접',v:'custom'}].map((opt) => (
                                <button
                                    key={opt.v}
                                    onClick={() => setRangeType(opt.v as any)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        rangeType === opt.v 
                                        ? 'bg-white text-cyan-600 shadow-sm text-shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                   </div>
               </div>

               {/* Custom Date Inputs (Conditional) */}
               {rangeType === 'custom' && (
                    <div className="border-t border-slate-100 mt-2 pt-3 px-1 pb-2 animate-fade-in flex gap-2">
                        <div className="flex-1 min-w-0">
                            <label className="text-[10px] text-slate-400 font-bold mb-1 block ml-1">시작일</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-2 rounded-lg border border-slate-200">
                                <Calendar size={14} className="text-slate-400 shrink-0" />
                                <input 
                                    type="date" 
                                    value={customStart} 
                                    onChange={e => setCustomStart(e.target.value)} 
                                    className="bg-transparent text-xs font-bold text-slate-700 w-full outline-none p-0 min-w-0" 
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="text-[10px] text-slate-400 font-bold mb-1 block ml-1">종료일</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-2 rounded-lg border border-slate-200">
                                <Calendar size={14} className="text-slate-400 shrink-0" />
                                <input 
                                    type="date" 
                                    value={customEnd} 
                                    onChange={e => setCustomEnd(e.target.value)} 
                                    className="bg-transparent text-xs font-bold text-slate-700 w-full outline-none p-0 min-w-0" 
                                />
                            </div>
                        </div>
                    </div>
               )}
           </div>
       </div>

       {/* --- 2. Chart Section --- */}
       <div className="">
           {/* Chart Container */}
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[300px] relative mb-6">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            평균 수행도
                        </h3>
                        <div className="text-4xl font-black text-slate-800 mt-1 tracking-tight">
                            {validDataPoints.length > 0 
                                ? Math.round(validDataPoints.reduce((a, b) => a + (b.avgAccuracy || 0), 0) / validDataPoints.length) + '%' 
                                : '-'}
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 text-right font-medium">
                        <span className="text-slate-800 font-bold">{totalLogsCount}회</span> 기록<br/>
                        {rangeType === 'custom' 
                            ? `${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}` 
                            : `${dayCount}일간`}
                    </div>
                </div>

                {validDataPoints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-300 py-16">
                        <AlertCircle size={40} className="mb-3 opacity-30" />
                        <p className="text-xs font-bold">데이터가 없습니다</p>
                    </div>
                ) : (
                    <div className="relative h-[200px] w-full">
                        {/* Grid */}
                        <div className="absolute inset-0 flex flex-col justify-between text-slate-200">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="border-b border-slate-50 w-full h-0 flex items-center">
                                    <span className="text-[9px] text-slate-300 ml-[-20px] absolute w-6 text-right pr-2">
                                        {100 - (i * 25)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Chart Line */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 200">
                            <defs>
                                <linearGradient id="gradientReport" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#0891b2" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path 
                                d={`${getPoints()} L 100,200 L 0,200 Z`}
                                fill="url(#gradientReport)"
                            />
                            <polyline
                                fill="none"
                                stroke="#0891b2" // Cyan-600
                                strokeWidth="3"
                                points={getPoints()}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>

                        {/* Dots */}
                        {dayCount <= 30 && chartData.map((d, i) => {
                            if(d.avgAccuracy === null) return null;
                            const divider = (chartData.length > 1) ? chartData.length - 1 : 1;
                            const left = (i / divider) * 100;
                            const bottom = d.avgAccuracy;
                            return (
                                <div 
                                    key={i}
                                    className="absolute w-2.5 h-2.5 bg-white border-[2px] border-cyan-500 rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-sm z-10"
                                    style={{ left: `${left}%`, bottom: `${bottom}%` }}
                                />
                            )
                        })}

                        {/* Labels */}
                        <div className="absolute top-[100%] left-0 right-0 flex justify-between mt-2 px-1">
                            {chartData.map((d, i) => {
                                let showLabel = false;
                                const step = Math.max(1, Math.floor((chartData.length - 1) / 5)); 
                                if (i % step === 0 || i === chartData.length - 1) showLabel = true;
                                if (!showLabel) return null;
                                return (
                                    <div 
                                        key={i} 
                                        className="text-[9px] text-slate-400 absolute transform -translate-x-1/2 whitespace-nowrap font-bold"
                                        style={{ left: `${(i / (Math.max(1, chartData.length - 1))) * 100}%` }}
                                    >
                                        {d.dateLabel}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
           </div>

           {/* Analysis Result */}
           {analysisResult && (
               <div className={`p-5 rounded-2xl border flex gap-4 items-start ${analysisResult.color} bg-opacity-50`}>
                    <div className="p-2 rounded-full bg-white shadow-sm shrink-0">
                        {analysisResult.status === 'mastery' && <Trophy size={20} className="text-cyan-600" />}
                        {analysisResult.status === 'improving' && <TrendingUp size={20} className="text-green-600" />}
                        {analysisResult.status === 'declining' && <TrendingDown size={20} className="text-red-600" />}
                        {analysisResult.status === 'stagnant_low' && <AlertCircle size={20} className="text-orange-600" />}
                        {analysisResult.status === 'stagnant_mid' && <Minus size={20} className="text-gray-600" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-1 break-keep">{analysisResult.title}</h4>
                        <p className="text-sm opacity-90 leading-relaxed whitespace-pre-line break-keep">{analysisResult.message}</p>
                    </div>
               </div>
           )}
       </div>
    </div>
  );
};
