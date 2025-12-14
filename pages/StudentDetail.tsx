
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Plus, Trash2, Check, X, CheckCircle2, PauseCircle, PlayCircle, ArrowUpDown, Settings, BarChart3, ListChecks, Wand2, User } from 'lucide-react';
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
import { GOAL_ICONS } from '../utils/goalIcons';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { students, goals, logs, fetchGoals, fetchStudentLogs, addGoal, updateGoal, deleteGoal, reorderGoals, updateStudent, deleteStudent } = useStore();
  
  // Tabs: 'goals' | 'summary'
  const [activeTab, setActiveTab] = useState<'goals' | 'summary'>('goals');

  // Add Goal State
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<GoalStatus>('in_progress');
  
  // Icon Selection State
  const [selectingIconGoal, setSelectingIconGoal] = useState<Goal | null>(null);

  // Global Edit Mode (for goals)
  const [isEditMode, setIsEditMode] = useState(false);

  // Student Settings Sheet State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempStudentName, setTempStudentName] = useState('');

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

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newGoalTitle.trim()) return;
    await addGoal(id, newGoalTitle); 
    setNewGoalTitle('');
    setIsAddingGoal(false);
  };

  const handleOpenEdit = (goal: Goal) => {
      setEditingGoal(goal);
      setEditTitle(goal.title);
      setEditDescription(goal.description || '');
      setEditStatus(goal.status || 'in_progress');
  };

  const handleUpdateGoal = async () => {
      if (!editingGoal || !editTitle.trim()) return;
      await updateGoal(editingGoal.id, editTitle, editDescription, editingGoal.icon, editStatus);
      setEditingGoal(null);
  };

  const handleDeleteGoal = async (goal?: Goal) => {
      const target = goal || editingGoal;
      if (!target || !id) return;
      if (confirm('이 목표를 정말 삭제하시겠습니까?')) {
        await deleteGoal(target.id, id);
        setEditingGoal(null);
        if (goals.length <= 1) setIsEditMode(false);
      }
  };
  
  const handleIconClick = (goal: Goal) => {
      setSelectingIconGoal(goal);
  };
  
  const handleSelectIcon = async (iconKey: string) => {
      if (selectingIconGoal) {
          await updateGoal(selectingIconGoal.id, selectingIconGoal.title, selectingIconGoal.description, iconKey, selectingIconGoal.status);
          setSelectingIconGoal(null);
      }
  };

  // Student Profile Actions
  const handleUpdateStudentName = async () => {
      if(student && tempStudentName.trim()) {
          await updateStudent(student.id, tempStudentName);
          setIsEditingName(false);
          setIsSettingsOpen(false);
      }
  };
  
  const handleDeleteStudent = async () => {
      if(student && confirm(`'${student.name}' 학생을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) {
          await deleteStudent(student.id);
          navigate('/students');
      }
  };

  // Summary Logic
  const summaryStats = useMemo(() => {
      if (!logs.length) return null;
      // Last 7 days accuracy
      const recentLogs = logs.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
      const avg = recentLogs.length 
        ? Math.round(recentLogs.reduce((acc, curr) => acc + (curr.value || curr.accuracy || 0), 0) / recentLogs.length)
        : 0;
      return { count: logs.length, avg };
  }, [logs]);

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
                
                {/* Settings Toggle */}
                <button 
                    onClick={() => {
                        setTempStudentName(student.name);
                        setIsSettingsOpen(true);
                    }}
                    className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                >
                    <Settings size={20} />
                </button>
             </div>

             {/* Tab Navigation */}
             <div className="flex px-4 md:px-6 gap-6">
                 <button 
                    onClick={() => setActiveTab('goals')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'goals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                     <ListChecks size={16} />
                     목표 관리
                     <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md text-[10px]">{goals.length}</span>
                 </button>
                 <button 
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
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
                                className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${isEditMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                {isEditMode ? <Check size={14} /> : <ArrowUpDown size={14} />}
                                {isEditMode ? '편집 완료' : '순서 편집'}
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
                                    onEdit={handleOpenEdit}
                                    onDelete={handleDeleteGoal}
                                    onIconClick={handleIconClick}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Empty State */}
                    {goals.length === 0 && !isAddingGoal && (
                        <div className="py-16 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-dashed border-gray-200">
                                <Wand2 size={32} className="text-indigo-300" />
                            </div>
                            <h3 className="text-gray-800 font-bold text-lg mb-2">아직 목표가 없어요</h3>
                            <p className="text-sm text-gray-500 max-w-[200px] mb-6 leading-relaxed">
                                학생을 위한 첫 번째 IEP 목표를<br/>설정하고 기록을 시작해보세요.
                            </p>
                            <button
                                onClick={() => setIsAddingGoal(true)}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={18} /> 목표 추가하기
                            </button>
                        </div>
                    )}

                    {/* Add Goal Form / Button Logic */}
                    {!isEditMode && (
                        isAddingGoal ? (
                        <form onSubmit={handleAddGoal} className="mt-6 p-6 bg-white rounded-2xl shadow-sm animate-fade-in border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-700">새 목표 추가</h3>
                                <button type="button" onClick={() => setIsAddingGoal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block">목표 제목</label>
                                <textarea
                                value={newGoalTitle}
                                onChange={(e) => setNewGoalTitle(e.target.value)}
                                placeholder="예: 이름 부르면 눈 맞추기"
                                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none font-medium"
                                rows={2}
                                autoFocus
                                />
                            </div>
                            
                            <button
                                type="submit"
                                className="w-full py-3.5 text-sm bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform active:scale-95"
                            >
                                저장하기
                            </button>
                        </form>
                        ) : (
                        goals.length > 0 && (
                            <button
                                onClick={() => setIsAddingGoal(true)}
                                className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-indigo-300 hover:text-indigo-500 transition-all group"
                            >
                                <Plus size={20} className="group-hover:scale-110 transition-transform"/>
                                <span>새 목표 추가하기</span>
                            </button>
                        )
                        )
                    )}
                </div>
            )}

            {/* TAB 2: SUMMARY */}
            {activeTab === 'summary' && (
                <div className="animate-fade-in space-y-6">
                    {/* Mini Stats Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-6">
                             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
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
                            className="w-full mt-6 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                        >
                            상세 보고서 보기
                        </button>
                    </div>
                </div>
            )}
        </main>
      </div>

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">목표 수정</h3>
                    <button onClick={() => setEditingGoal(null)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="space-y-5 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block">진행 상태</label>
                        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                             <button 
                                onClick={() => setEditStatus('in_progress')}
                                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${editStatus === 'in_progress' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                             >
                                 <PlayCircle size={16} /> 진행중
                             </button>
                             <button 
                                onClick={() => setEditStatus('completed')}
                                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${editStatus === 'completed' ? 'bg-white text-green-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                             >
                                 <CheckCircle2 size={16} /> 완료됨
                             </button>
                             <button 
                                onClick={() => setEditStatus('on_hold')}
                                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${editStatus === 'on_hold' ? 'bg-white text-gray-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                             >
                                 <PauseCircle size={16} /> 보류
                             </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">목표 제목</label>
                        <textarea 
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 outline-none text-sm font-medium"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">상세 설명 (선택)</label>
                        <textarea 
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 outline-none text-sm"
                            rows={3}
                            placeholder="구체적인 수행 기준 등"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => handleDeleteGoal()}
                        className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button 
                        onClick={handleUpdateGoal}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    >
                        수정 완료
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* Icon Selection Modal */}
      {selectingIconGoal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectingIconGoal(null)}>
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">아이콘 변경</h3>
                      <button onClick={() => setSelectingIconGoal(null)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                          <X size={18} />
                      </button>
                  </div>
                  
                  {/* Expanded Icon Grid */}
                  <div className="grid grid-cols-5 gap-3">
                      {Object.entries(GOAL_ICONS).map(([key, Icon]) => (
                          <button
                              key={key}
                              onClick={() => handleSelectIcon(key)}
                              className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all gap-1 ${
                                  selectingIconGoal.icon === key 
                                  ? 'bg-indigo-600 text-white shadow-lg scale-105' 
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

      {/* Student Settings Sheet (Bottom Modal) */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in" onClick={() => setIsSettingsOpen(false)}>
              <div 
                className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-slide-up"
                onClick={e => e.stopPropagation()}
              >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 opacity-60" />
                  
                  <div className="mb-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto mb-3 overflow-hidden border border-gray-200 relative group">
                          <img src={student.photo_uri} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <span className="text-white text-xs font-bold">사진 변경</span>
                          </div>
                      </div>
                      
                      {isEditingName ? (
                          <div className="flex items-center gap-2 justify-center">
                              <input 
                                  type="text" 
                                  value={tempStudentName} 
                                  onChange={e => setTempStudentName(e.target.value)}
                                  className="border-b-2 border-indigo-500 text-center font-bold text-xl outline-none pb-1 w-40"
                                  autoFocus
                              />
                              <button onClick={handleUpdateStudentName} className="p-2 bg-indigo-600 text-white rounded-full">
                                  <Check size={16} />
                              </button>
                          </div>
                      ) : (
                          <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2" onClick={() => setIsEditingName(true)}>
                              {student.name} <Settings size={14} className="text-gray-400" />
                          </h2>
                      )}
                  </div>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-700 font-bold flex items-center justify-between px-6 transition-colors"
                      >
                          <span className="flex items-center gap-3"><User size={20} className="text-gray-400"/>이름 수정</span>
                          <ArrowLeft size={16} className="rotate-180 text-gray-300"/>
                      </button>
                      
                      <button 
                        onClick={handleDeleteStudent}
                        className="w-full py-4 bg-red-50 hover:bg-red-100 rounded-2xl text-red-600 font-bold flex items-center justify-between px-6 transition-colors"
                      >
                          <span className="flex items-center gap-3"><Trash2 size={20} className="text-red-400"/>학생 삭제</span>
                      </button>
                  </div>
                  
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full mt-6 py-4 text-gray-500 font-bold hover:text-gray-800"
                  >
                      닫기
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
