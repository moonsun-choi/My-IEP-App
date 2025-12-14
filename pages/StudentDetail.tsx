
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Plus, Trash2, Check, X, CheckCircle2, PauseCircle, PlayCircle, ArrowUpDown } from 'lucide-react';
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
import { SortableGoalItem, GOAL_ICONS } from '../components/SortableGoalItem';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Removed updateStudent, deleteStudent
  const { students, goals, fetchGoals, addGoal, updateGoal, deleteGoal, reorderGoals } = useStore();
  
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

  // Global Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);

  const student = students.find(s => s.id === id);

  useEffect(() => {
    if (id) fetchGoals(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
            delay: 150,
            tolerance: 5,
        },
    })
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
      
      if (confirm('이 목표를 정말 삭제하시겠습니까? 관련 기록이 모두 사라질 수 있습니다.')) {
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

  if (!student) return <div className="p-8 text-center text-gray-500">학생 정보를 불러오는 중...</div>;

  return (
    <div className="bg-[#F3F4F6] min-h-full pb-24">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md p-4 md:p-6 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-gray-100 transition-all">
            <button 
                onClick={() => navigate(-1)} 
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
                <ArrowLeft size={24} className="text-gray-700" />
            </button>
            <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-800">{student.name}</h1>
                <p className="text-xs text-gray-500 font-medium">
                    {isEditMode ? '드래그하여 순서를 변경하세요' : '개별화교육 목표'}
                </p>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                        isEditMode 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                     {isEditMode ? <Check size={14} /> : <ArrowUpDown size={14} />}
                     {isEditMode ? '완료' : '편집'}
                </button>
            </div>
        </header>

        {/* Goal List */}
        <main className="p-4 md:p-6">
            <div className="space-y-4">
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

                {goals.length === 0 && !isAddingGoal && (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Plus size={32} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium mb-1">등록된 목표가 없습니다.</p>
                        <p className="text-xs opacity-70">아래 버튼을 눌러 첫 번째 목표를 추가해보세요.</p>
                    </div>
                )}
            </div>

            {/* Add Goal Section (Hidden in Edit Mode) */}
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
                <button
                    onClick={() => setIsAddingGoal(true)}
                    className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-indigo-300 hover:text-indigo-500 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
                        <Plus size={20} />
                    </div>
                    <span>새 목표 추가하기</span>
                </button>
                )
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
                  <div className="grid grid-cols-5 gap-3">
                      {Object.entries(GOAL_ICONS).map(([key, Icon]) => (
                          <button
                              key={key}
                              onClick={() => handleSelectIcon(key)}
                              className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${
                                  selectingIconGoal.icon === key 
                                  ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                          >
                              <Icon size={24} strokeWidth={2} />
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
