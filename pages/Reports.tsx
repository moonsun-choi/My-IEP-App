
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { StudentGoalSelector } from '../components/StudentGoalSelector';
import { getGoalIcon } from '../utils/goalIcons';

export const Reports: React.FC = () => {
  const { students, goals, logs, fetchStudents, fetchGoals, fetchStudentLogs } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all'); // 'all' or specific goalId
  
  // Date Range State
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
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
        fetchGoals(selectedStudentId);
        fetchStudentLogs(selectedStudentId); // Fetch logs for the student to populate charts
        setSelectedGoalId('all'); // Reset goal filter when student changes
    }
  }, [selectedStudentId, fetchGoals, fetchStudentLogs]);
  
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const studentGoals = goals.filter(g => g.student_id === selectedStudentId);
  const studentGoalIds = studentGoals.map(g => g.id);
  
  const currentGoal = studentGoals.find(g => g.id === selectedGoalId);

  // Calculate Start/End Date objects based on selection
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

    let daysToSubtract = 6; // 1w (7 days total including today)
    if (rangeType === '1m') daysToSubtract = 29;
    if (rangeType === '3m') daysToSubtract = 89;

    start.setDate(end.getDate() - daysToSubtract);
    
    return { startDate: start, endDate: end };
  }, [rangeType, customStart, customEnd]);

  // Chart Data Aggregation
  const chartData = useMemo(() => {
    // 1. Filter logs for this student
    let relevantLogs = logs.filter(l => studentGoalIds.includes(l.goal_id));
    
    // 2. Filter by specific goal if selected
    if (selectedGoalId !== 'all') {
        relevantLogs = relevantLogs.filter(l => l.goal_id === selectedGoalId);
    }
    
    // Create Date Array from startDate to endDate
    const days = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // Prevent excessive loop if dates are invalid
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
            avg = Math.round(dayLogs.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / dayLogs.length);
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

  // SVG Chart Helper
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
              
              if (isFirst) {
                  path += `M ${x},${y}`;
                  isFirst = false;
                  if (totalPoints === 1) {
                      path += ` L 100,${y}`;
                  }
              } else {
                  path += ` L ${x},${y}`;
              }
          }
      });
      return path;
  };

  // --- Advanced Analysis Algorithm ---
  const analysisResult = useMemo(() => {
    if (validDataPoints.length < 2) return null;

    // 1. Calculate Recent Average (Last 3 valid days or all if less)
    const recentPoints = validDataPoints.slice(-3);
    const recentAvg = recentPoints.reduce((acc, curr) => acc + (curr.avgAccuracy || 0), 0) / recentPoints.length;

    // 2. Linear Regression for Slope (Trend)
    // x = index, y = accuracy
    const n = validDataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    validDataPoints.forEach((d, i) => {
        const val = d.avgAccuracy || 0;
        sumX += i;
        sumY += val;
        sumXY += i * val;
        sumXX += i * i;
    });

    // Slope formula: (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
    const denominator = (n * sumXX - sumX * sumX);
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;

    // 3. Determine Status and Message
    let status: 'mastery' | 'improving' | 'declining' | 'stagnant_low' | 'stagnant_mid' = 'stagnant_mid';
    let title = '';
    let message = '';
    let color = '';

    // Condition A: Mastery / High Maintenance (> 90%)
    if (recentAvg >= 90) {
        status = 'mastery';
        title = '매우 훌륭한 수행 수준 (Mastery)';
        message = '최근 수행도가 90% 이상으로 매우 안정적입니다. 현재 단계의 목표를 달성한 것으로 보입니다. 일반화(Generalization) 과제로 확장하거나 다음 단계의 목표 설정을 고려해보세요.';
        color = 'bg-indigo-50 border-indigo-100 text-indigo-900 icon-indigo';
    } 
    // Condition B: Improving (Slope > 0.5)
    else if (slope > 0.5) {
        status = 'improving';
        title = '지속적인 성장세 (Improving)';
        message = '전반적으로 수행 정확도가 상승하고 있습니다. 현재 적용 중인 교수 전략과 강화(Reinforcement)가 효과적으로 작용하고 있습니다. 현재 방법을 유지하세요.';
        color = 'bg-green-50 border-green-100 text-green-900 icon-green';
    }
    // Condition C: Declining (Slope < -0.5)
    else if (slope < -0.5) {
        status = 'declining';
        title = '수행도 하락 (Declining)';
        message = '최근 수행 정확도가 하락하는 추세입니다. 과제의 난이도가 갑자기 높아졌거나, 학생의 컨디션 또는 환경적인 방해 요인이 있는지 점검이 필요합니다.';
        color = 'bg-red-50 border-red-100 text-red-900 icon-red';
    }
    // Condition D: Stagnant Low (< 60%)
    else if (recentAvg < 60) {
        status = 'stagnant_low';
        title = '도움 필요 (Needs Support)';
        message = '수행도가 낮은 상태에서 정체되어 있습니다. 현재 과제가 학생에게 어려울 수 있습니다. 과제를 더 작은 단위로 나누거나(Task Analysis), 촉구(Prompt) 수준을 높여 성공 경험을 만들어주세요.';
        color = 'bg-orange-50 border-orange-100 text-orange-900 icon-orange';
    }
    // Condition E: Stagnant Mid (60-90%)
    else {
        status = 'stagnant_mid';
        title = '수행 유지 및 정체 (Plateau)';
        message = '수행도가 일정 수준에서 유지되고 있으나 뚜렷한 상승폭은 보이지 않습니다. 변동성을 줄이기 위해 환경을 통제하거나, 더 강력한 강화제를 사용하여 동기를 부여해보세요.';
        color = 'bg-gray-50 border-gray-200 text-gray-900 icon-gray';
    }

    return { slope, recentAvg, status, title, message, color };
  }, [validDataPoints]);

  const dayCount = chartData.length;

  return (
    <div className="p-4 md:p-8 pb-20 max-w-5xl mx-auto w-full">
       <div className="flex justify-between items-center mb-8">
          <h2 className="font-bold text-2xl text-gray-800">보고서</h2>
       </div>

       {/* Selectors Container - Replaced with reusable component */}
       <div className="mb-6">
           <StudentGoalSelector
             students={students}
             goals={studentGoals}
             selectedStudentId={selectedStudentId}
             selectedGoalId={selectedGoalId}
             onSelectStudent={setSelectedStudentId}
             onSelectGoal={setSelectedGoalId}
             currentStudent={currentStudent}
             showAllGoalsOption={true}
           />
       </div>
        
        {/* Date Range Selector */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex gap-2 bg-white p-1 rounded-xl w-full md:w-auto border border-gray-100 shadow-sm">
                {[
                    { label: '1주일', value: '1w' },
                    { label: '1개월', value: '1m' },
                    { label: '3개월', value: '3m' },
                    { label: '직접 설정', value: 'custom' }
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setRangeType(option.value as any)}
                        className={`flex-1 md:px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                            rangeType === option.value 
                            ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Custom Date Pickers */}
            {rangeType === 'custom' && (
                <div className="flex gap-4 animate-fade-in w-full md:w-auto">
                    <div className="flex-1 md:w-40 bg-white border border-gray-200 rounded-xl px-4 py-2 flex flex-col justify-center">
                        <label className="text-[10px] text-gray-400 font-bold mb-0.5">시작일</label>
                        <input 
                            type="date" 
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="text-xs font-bold text-gray-800 bg-transparent outline-none w-full"
                        />
                    </div>
                    <div className="flex-1 md:w-40 bg-white border border-gray-200 rounded-xl px-4 py-2 flex flex-col justify-center">
                        <label className="text-[10px] text-gray-400 font-bold mb-0.5">종료일</label>
                        <input 
                            type="date" 
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="text-xs font-bold text-gray-800 bg-transparent outline-none w-full"
                        />
                    </div>
                </div>
            )}
        </div>

       {/* Chart Container */}
       <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[350px] relative">
          <div className="flex justify-between items-end mb-8">
              <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">평균 정확도 추이</h3>
                  <div className="text-4xl font-black text-gray-800 mt-2 tracking-tight">
                      {validDataPoints.length > 0 
                          ? Math.round(validDataPoints.reduce((a, b) => a + (b.avgAccuracy || 0), 0) / validDataPoints.length) + '%' 
                          : '-'}
                  </div>
              </div>
              <div className="text-xs text-gray-400 text-right font-medium">
                  총 <span className="text-gray-800 font-bold">{totalLogsCount}회</span> 기록<br/>
                  {rangeType === 'custom' 
                    ? `${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}` 
                    : `${dayCount}일간 데이터`}
              </div>
          </div>

          {validDataPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-300 py-20">
                  <AlertCircle size={48} className="mb-4 opacity-30" />
                  <p className="text-sm font-medium">기간 내 데이터가 없습니다.</p>
              </div>
          ) : (
              <div className="relative h-[240px] w-full">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between text-gray-200">
                      {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="border-b border-gray-100 w-full h-0 flex items-center">
                              <span className="text-[10px] text-gray-300 ml-[-24px] absolute w-6 text-right pr-2">
                                  {100 - (i * 25)}
                              </span>
                          </div>
                      ))}
                  </div>

                  {/* SVG Chart */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path 
                          d={`${getPoints()} L 100,100 L 0,100 Z`} // Close path for fill if needed, but here we use stroke
                          fill="url(#gradient)" // Optional fill
                          className="opacity-50"
                      />
                      <polyline
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3"
                          points={getPoints()}
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                  </svg>

                   {/* Data Points */}
                   {dayCount <= 30 && chartData.map((d, i) => {
                       if(d.avgAccuracy === null) return null;
                       const divider = (chartData.length > 1) ? chartData.length - 1 : 1;
                       const left = (i / divider) * 100;
                       const bottom = d.avgAccuracy;
                       return (
                           <div 
                                key={i}
                                className="absolute w-3 h-3 bg-white border-[3px] border-indigo-500 rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-sm z-10 hover:scale-150 transition-transform cursor-pointer"
                                style={{ left: `${left}%`, bottom: `${bottom}%` }}
                                title={`${d.dateLabel}: ${d.avgAccuracy}%`}
                           />
                       )
                   })}

                  {/* X-Axis Labels (Adaptive) */}
                  <div className="absolute top-[100%] left-0 right-0 flex justify-between mt-3 px-1">
                      {chartData.map((d, i) => {
                          // Adaptive Labeling Logic
                          let showLabel = false;
                          const step = Math.max(1, Math.floor((chartData.length - 1) / (window.innerWidth > 768 ? 8 : 4))); 

                          if (i % step === 0 || i === chartData.length - 1) {
                              showLabel = true;
                          }

                          return (
                              <div 
                                key={i} 
                                className="text-[10px] text-gray-400 absolute transform -translate-x-1/2 whitespace-nowrap font-medium"
                                style={{ left: `${(i / (Math.max(1, chartData.length - 1))) * 100}%`, opacity: showLabel ? 1 : 0 }}
                              >
                                  {d.dateLabel}
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}
       </div>

       {/* Analysis Result Card */}
       {analysisResult && (
           <div className={`mt-8 p-6 rounded-2xl border animate-fade-in flex gap-5 items-start ${analysisResult.color}`}>
                <div className={`p-3 rounded-full shrink-0 bg-white/60 shadow-sm`}>
                    {analysisResult.status === 'mastery' && <Trophy size={24} className="text-indigo-600" />}
                    {analysisResult.status === 'improving' && <TrendingUp size={24} className="text-green-600" />}
                    {analysisResult.status === 'declining' && <TrendingDown size={24} className="text-red-600" />}
                    {analysisResult.status === 'stagnant_low' && <AlertCircle size={24} className="text-orange-600" />}
                    {analysisResult.status === 'stagnant_mid' && <Minus size={24} className="text-gray-600" />}
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        {analysisResult.title}
                        {selectedGoalId !== 'all' && (
                            <span className="text-xs font-normal opacity-70 border border-current px-2 py-0.5 rounded-full flex items-center gap-1">
                                {(() => {
                                    const GoalIcon = currentGoal ? getGoalIcon(currentGoal.icon) : null;
                                    return GoalIcon && <GoalIcon size={12} />;
                                })()}
                                {currentGoal?.title}
                            </span>
                        )}
                    </h3>
                    <p className="leading-relaxed text-sm md:text-base opacity-90 font-medium">
                        {analysisResult.message}
                    </p>
                    <div className="mt-3 text-xs font-bold opacity-60 flex gap-4">
                        <span>최근 평균: {Math.round(analysisResult.recentAvg)}%</span>
                        <span>추세 기울기: {analysisResult.slope.toFixed(2)}</span>
                    </div>
                </div>
           </div>
       )}
    </div>
  );
};
