
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Plus, Trash2, Check, X, CheckCircle2, PauseCircle, PlayCircle, ArrowUpDown, BarChart3, ListChecks, Wand2, Edit2, Target } from 'lucide-react';
import { Goal, GoalStatus } from '../types';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableGoalItem } from '../components/SortableGoalItem';
import { GOAL_ICONS, getGoalIcon } from '../utils/goalIcons';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { students, goals, logs, fetchGoals, fetchStudentLogs, addGoal, updateGoal, deleteGoal, reorderGoals } = useStore();
  
  // Tabs: 'goals' | 'summary'
  const [activeTab, setActiveTab] = useState<'goals' | 'summary'>('goals');

  // Unified Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [targetGoal, setTargetGoal] = useState<Goal | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<GoalStatus>('in_progress');
  const [formIcon, setFormIcon] = useState<string>('target');
  
  // Icon Picker Modal State
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  // Global Edit Mode (for goals list)
  const [isEditMode, setIsEditMode] = useState(false);

  const student = students.find(s => s.id === id);

  useEffect(() => {
    if (id) {
        fetchGoals(id);
        if (activeTab === 'summary') fetchStudentLogs(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeTab]);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && id) {
        const oldIndex = goals.findIndex((g) => g.id === active.id);
        const newIndex = goals.findIndex((g) => g.id === over.id);
        const newOrder = arrayMove(goals, oldIndex, newIndex);
        reorderGoals(id, newOrder);
    }
  };

  // --- Sheet Handlers ---
  const openAddSheet = () => {
      setSheetMode('add');
      setTargetGoal(null);
      setFormTitle('');
      setFormDesc('');
      setFormStatus('in_progress');
      setFormIcon('target');
      setIsSheetOpen(true);
  };

  const openEditSheet = (goal: Goal) => {
      setSheetMode('edit');
      setTargetGoal(goal);
      setFormTitle(goal.title);
      setFormDesc(goal.description || '');
      setFormStatus(goal.status || 'in_progress');
      setFormIcon(goal.icon || 'target');
      setIsSheetOpen(true);
  };

  const closeSheet = () => {
      setIsSheetOpen(false);
      setTargetGoal(null);
  };

  const handleFormSubmit = async () => {
      if (!id || !formTitle.trim()) return;

      if (sheetMode === 'add') {
          // Pass description (formDesc) to addGoal
          await addGoal(id, formTitle, formDesc, formIcon, formStatus);
      } else if (sheetMode === 'edit' && targetGoal) {
          await updateGoal(targetGoal.id, formTitle, formDesc, formIcon, formStatus);
      }
      closeSheet();
  };

  const handleDeleteGoal = async (goal?: Goal) => {
      const target = goal || targetGoal;
      if (!target || !id) return;
      if (confirm('이 목표를 정말 삭제하시겠습니까?')) {
        await deleteGoal(target.id, id);
        closeSheet();
        if (goals.length <= 1) setIsEditMode(false);
      }
  };

  // Icon Click on List Item (Just opens edit sheet for that goal to change icon)
  const handleIconClick = (goal: Goal) => {
      setTargetGoal(goal);
      setFormIcon(goal.icon || 'target');
      setIsIconPickerOpen(true);
  };

  // Summary Logic
  const summaryStats = useMemo(() => {
      if (!logs.length) return null;
      const recentLogs = logs.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
      const avg = recentLogs.length 
        ? Math.round(recentLogs.reduce((acc, curr) => acc + (curr.value || 0), 0) / recentLogs.length)
        : 0;
      return { count: logs.length, avg };
  }, [logs]);

  // Use formIcon for picker, or default
  const CurrentIcon = getGoalIcon(formIcon);

  if (!student) return <div className="p-8 text-center text-gray-500">학생 정보를 불러오는 중...</div>;

  return (
    <div className="bg-[#F3F4F6] min-h-full pb-24">
      <div className="max-w-3xl mx-auto w-full">
        {/* Expanded Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-gray-100 transition-all">
             <div className="flex items-center gap-4 p-4 md:p-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                
                {/* Profile Section */}
                <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                        <img src={student.photo_uri} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 leading-tight">{student.name}</h1>
                        <p className="text-xs text-gray-500 font-medium">개별화교육계획 (IEP)</p>
                    </div>
                </div>
             </div>

             {/* Tab Navigation */}
             <div className="flex px-4 md:px-6 gap-6">
                 <button 
                    onClick={() => setActiveTab('goals')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'goals' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                     <ListChecks size={16} />
                     목표 관리
                     <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md text-[10px]">{goals.length}</span>
                 </button>
                 <button 
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'summary' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                     <BarChart3 size={16} />
                     분석 요약
                 </button>
             </div>
        </header>

        {/* CONTENT AREA */}
        <main className="p-4 md:p-6">
            
            {/* TAB 1: GOALS */}
            {activeTab === 'goals' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Goal List Controls */}
                    {goals.length > 0 && (
                        <div className="flex justify-end mb-2">
                            <button 
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${isEditMode ? 'bg-cyan-100 text-cyan-600' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                {isEditMode ? <Check size={14} /> : <ArrowUpDown size={14} />}
                                {isEditMode ? '편집 완료' : '편집'}
                            </button>
                        </div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={goals.map(g => g.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {goals.map((goal) => (
                                <SortableGoalItem 
                                    key={goal.id} 
                                    goal={goal} 
                                    isEditMode={isEditMode}
                                    onEdit={openEditSheet}
                                    onDelete={handleDeleteGoal}
                                    onIconClick={handleIconClick}
                                    onEnableEditMode={() => setIsEditMode(true)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Empty State */}
                    {goals.length === 0 && (
                        <div className="py-16 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-dashed border-gray-200">
                                <Wand2 size={32} className="text-cyan-300" />
                            </div>
                            <h3 className="text-gray-800 font-bold text-lg mb-2">아직 목표가 없어요</h3>
                            <p className="text-sm text-gray-500 max-w-[200px] mb-6 leading-relaxed">
                                학생을 위한 첫 번째 IEP 목표를<br/>설정하고 기록을 시작해보세요.
                            </p>
                            <button
                                onClick={openAddSheet}
                                className="px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 shadow-lg shadow-cyan-200 transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={18} /> 목표 추가하기
                            </button>
                        </div>
                    )}

                    {/* Add Goal Button (Footer) */}
                    {goals.length > 0 && !isEditMode && (
                        <button
                            onClick={openAddSheet}
                            className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-cyan-300 hover:text-cyan-600 transition-all group"
                        >
                            <Plus size={20} className="group-hover:scale-110 transition-transform"/>
                            <span>목표 추가하기</span>
                        </button>
                    )}
                </div>
            )}

            {/* TAB 2: SUMMARY */}
            {activeTab === 'summary' && (
                <div className="animate-fade-in space-y-6">
                    {/* Mini Stats Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-6">
                             <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
                                 <BarChart3 size={24} />
                             </div>
                             <div>
                                 <h3 className="font-bold text-gray-800 text-lg">최근 수행 요약</h3>
                                 <p className="text-xs text-gray-500">최근 10회 기록 기준</p>
                             </div>
                        </div>

                        {summaryStats ? (
                            <div className="flex gap-4">
                                <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">평균 정확도</div>
                                    <div className="text-3xl font-black text-gray-800">{summaryStats.avg}%</div>
                                </div>
                                <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">누적 기록</div>
                                    <div className="text-3xl font-black text-gray-800">{summaryStats.count}회</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                아직 분석할 데이터가 충분하지 않습니다.
                            </div>
                        )}
                        
                        <button 
                            onClick={() => navigate('/reports')}
                            className="w-full mt-6 py-3 text-sm font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors"
                        >
                            상세 보고서 보기
                        </button>
                    </div>
                </div>
            )}
        </main>
      </div>

      {/* Unified Add/Edit Goal Sheet */}
      {isSheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in" onClick={closeSheet}>
            <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 opacity-60" />
                
                {/* Sheet Title */}
                <h3 className="text-lg font-bold text-center text-gray-800 mb-6">
                    {sheetMode === 'add' ? '목표 등록' : '목표 수정'}
                </h3>
                
                {/* Icon Picker Removed from Sheet */}

                {/* Status Toggles */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-gray-500 mb-2 block text-center">진행 상태</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <button 
                            onClick={() => setFormStatus('in_progress')}
                            className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${formStatus === 'in_progress' ? 'bg-white text-cyan-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <PlayCircle size={16} /> 진행중
                            </button>
                            <button 
                            onClick={() => setFormStatus('completed')}
                            className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${formStatus === 'completed' ? 'bg-white text-green-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <CheckCircle2 size={16} /> 완료됨
                            </button>
                            <button 
                            onClick={() => setFormStatus('on_hold')}
                            className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${formStatus === 'on_hold' ? 'bg-white text-gray-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <PauseCircle size={16} /> 보류
                            </button>
                    </div>
                </div>

                {/* Inputs */}
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">목표 제목</label>
                        <input 
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all placeholder:text-gray-300"
                            placeholder="예: 이름 부르면 눈 맞추기"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">상세 설명 (선택)</label>
                        <textarea 
                            value={formDesc}
                            onChange={(e) => setFormDesc(e.target.value)}
                            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-cyan-500 transition-all placeholder:text-gray-300 resize-none"
                            rows={3}
                            placeholder="구체적인 수행 기준이나 상황 설명"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {sheetMode === 'edit' && (
                        <button 
                            onClick={() => handleDeleteGoal()}
                            className="p-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        >
                            <Trash2 size={24} />
                        </button>
                    )}
                    <button 
                        onClick={handleFormSubmit}
                        disabled={!formTitle.trim()}
                        className="flex-1 py-4 bg-cyan-600 text-white rounded-xl font-bold text-lg hover:bg-cyan-700 shadow-lg shadow-cyan-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {sheetMode === 'add' ? (
                            <>
                                <Plus size={20} strokeWidth={3} />
                                <span>등록하기</span>
                            </>
                        ) : (
                            <>
                                <Edit2 size={20} strokeWidth={3} />
                                <span>수정 완료</span>
                            </>
                        )}
                    </button>
                </div>
                
                <button 
                    onClick={closeSheet}
                    className="w-full mt-6 py-2 text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors"
                >
                    닫기
                </button>
            </div>
        </div>
      )}
      
      {/* Icon Picker Overlay (Direct Icon Edit) */}
      {isIconPickerOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsIconPickerOpen(false)}>
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">아이콘 변경</h3>
                      <button onClick={() => setIsIconPickerOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                          <X size={18} />
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-3">
                      {Object.entries(GOAL_ICONS).map(([key, Icon]) => (
                          <button
                              key={key}
                              onClick={async () => {
                                  if (!isSheetOpen && targetGoal) {
                                      // Direct update from list card
                                      await updateGoal(targetGoal.id, targetGoal.title, targetGoal.description, key, targetGoal.status);
                                      setTargetGoal(null);
                                  } else {
                                      // Fallback for sheet (though UI hidden)
                                      setFormIcon(key);
                                  }
                                  setIsIconPickerOpen(false);
                              }}
                              className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all gap-1 ${
                                  formIcon === key 
                                  ? 'bg-cyan-600 text-white shadow-lg scale-105' 
                                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                          >
                              <Icon size={20} strokeWidth={2} />
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
