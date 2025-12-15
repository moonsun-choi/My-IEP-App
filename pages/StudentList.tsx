
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Check, ArrowUpDown, Trash2, Plus, Edit2, Camera } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor, // Changed from Mouse/TouchSensor
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStudentItem } from '../components/SortableStudentItem';
import { Student } from '../types';
import { googleDriveService } from '../services/googleDrive';

export const StudentList: React.FC = () => {
  const { students, goals, fetchStudents, fetchAllGoals, isLoading, addStudent, reorderStudents, updateStudent, deleteStudent } = useStore();
  
  // Mode State
  const [isEditMode, setIsEditMode] = useState(false);

  // Sheet States
  const [isAdding, setIsAdding] = useState(false);
  const [settingsStudent, setSettingsStudent] = useState<Student | null>(null);
  
  // Shared Input State for Sheet
  const [tempStudentName, setTempStudentName] = useState('');
  const [tempStudentPhoto, setTempStudentPhoto] = useState<string>('');

  // Swipe Logic
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
    fetchAllGoals(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Updated Sensors: Use PointerSensor for robust handling of both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, // Requires 8px movement to start drag, preventing accidental drags
        },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = students.findIndex((s) => s.id === active.id);
        const newIndex = students.findIndex((s) => s.id === over.id);
        const newOrder = arrayMove(students, oldIndex, newIndex);
        reorderStudents(newOrder);
    }
  };

  // Open Add Sheet
  const openAddSheet = () => {
      setTempStudentName('');
      setTempStudentPhoto('');
      setIsAdding(true);
      setSettingsStudent(null);
      setDragOffset(0);
  };

  // Open Edit Sheet
  const handleSettingsClick = (student: Student) => {
    setSettingsStudent(student);
    setTempStudentName(student.name);
    setTempStudentPhoto(student.photo_uri || '');
    setIsAdding(false);
    setDragOffset(0);
  };

  const closeSheet = () => {
      setIsAdding(false);
      setSettingsStudent(null);
      setTempStudentName('');
      setTempStudentPhoto('');
      setDragOffset(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempStudentName.trim()) return;
    await addStudent(tempStudentName, tempStudentPhoto);
    closeSheet();
  };

  // Direct swipe delete
  const handleDeleteRequest = async (student: Student) => {
    if (confirm(`'${student.name}' 학생을 정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.`)) {
        await deleteStudent(student.id);
    }
  };

  // Functions for Sheet
  const handleUpdateStudent = async () => {
      if(settingsStudent && tempStudentName.trim()) {
          await updateStudent(settingsStudent.id, tempStudentName, tempStudentPhoto);
          closeSheet();
      }
  };

  const handleDeleteFromSheet = async () => {
      if(settingsStudent && confirm(`'${settingsStudent.name}' 학생을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) {
          await deleteStudent(settingsStudent.id);
          closeSheet();
      }
  };

  const handlePhotoClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              // Convert to base64 for local storage display immediately
              // (In a real app with backend, we might upload here)
              const base64 = await googleDriveService.fileToBase64(file);
              setTempStudentPhoto(base64);
          } catch (err) {
              console.error("Failed to process image", err);
          }
      }
  };

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
      // Allow drag if sheet content is scrolled to top
      if (sheetRef.current && sheetRef.current.scrollTop <= 0) {
          dragStartY.current = e.touches[0].clientY;
          setIsDragging(true);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (dragStartY.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - dragStartY.current;

      if (diff > 0) {
          if (e.cancelable) e.preventDefault();
          setDragOffset(diff);
      }
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartY.current = null;
      if (dragOffset > 120) {
          closeSheet();
      } else {
          setDragOffset(0);
      }
  };

  return (
    <div className={`pb-24 p-4 md:p-8 max-w-3xl mx-auto w-full min-h-screen transition-colors ${isEditMode ? 'bg-cyan-50/30' : ''}`}>
      {/* Header */}
      <header className="mb-6 flex justify-between items-center sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm py-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">나의 학급</h1>
            <p className="text-sm text-gray-500 mt-1">
                {isEditMode ? '학생 순서를 변경하거나 관리하세요.' : '목표를 관리할 학생을 선택하세요.'}
            </p>
        </div>
        
        <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${
                isEditMode 
                ? 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-200' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
            {isEditMode ? <Check size={16} /> : <ArrowUpDown size={16} />}
            {isEditMode ? '완료' : '편집'}
        </button>
      </header>

      <main>
        {isLoading && students.length === 0 ? (
           <div className="flex justify-center p-8 text-gray-400">Loading...</div>
        ) : (
            <div className="flex flex-col gap-3">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={students.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                         {students.map((student) => {
                            const studentGoals = goals.filter(g => g.student_id === student.id);
                            
                            return (
                                <SortableStudentItem 
                                    key={student.id}
                                    student={student}
                                    goals={studentGoals}
                                    isEditMode={isEditMode}
                                    onEdit={handleSettingsClick}
                                    onDelete={handleDeleteRequest}
                                    onEnableEditMode={() => setIsEditMode(true)}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            
                {/* Empty State */}
                {students.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                        등록된 학생이 없습니다.<br/>
                        아래 버튼을 눌러 학생을 추가해주세요.
                    </div>
                )}
                
                {/* Add Student Button (Always visible) */}
                <button
                    onClick={openAddSheet}
                    className="w-full mt-4 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-cyan-300 hover:text-cyan-600 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-colors">
                        <Plus size={20} />
                    </div>
                    <span>학생 추가하기</span>
                </button>
            </div>
        )}
      </main>

      {/* Unified Bottom Sheet (Add & Edit) */}
      {(settingsStudent || isAdding) && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in" 
            onClick={closeSheet}
            style={{ opacity: Math.max(0, 1 - dragOffset / 500) }}
          >
              <div 
                ref={sheetRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ transform: `translateY(${dragOffset}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
                className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-slide-up overflow-y-auto max-h-[90vh]"
                onClick={e => e.stopPropagation()}
              >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 opacity-60" />
                  
                  {/* Title */}
                  <h3 className="text-lg font-bold text-center text-gray-800 mb-6">
                    {isAdding ? '학생 등록' : '학생 정보 수정'}
                  </h3>

                  {/* Header Section: Avatar */}
                  <div className="mb-6 text-center">
                      <div 
                        onClick={handlePhotoClick}
                        className="w-24 h-24 rounded-full bg-gray-100 mx-auto mb-3 overflow-hidden border-2 border-gray-100 relative group cursor-pointer shadow-inner"
                      >
                          <img 
                            src={
                                tempStudentPhoto || 
                                (isAdding 
                                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(tempStudentName || 'New')}&background=random` 
                                    : settingsStudent?.photo_uri
                                )
                            } 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity hover:bg-black/40">
                              <Camera size={24} className="text-white opacity-90" />
                          </div>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">사진을 터치하여 변경하세요</p>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*"
                      />
                  </div>
                  
                  {/* Name Input Section */}
                  <div className="mb-8">
                      <label className="text-xs font-bold text-gray-500 mb-2 block ml-1">이름</label>
                      <input 
                          type="text" 
                          value={tempStudentName} 
                          onChange={e => setTempStudentName(e.target.value)}
                          className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 text-lg font-bold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all placeholder:text-gray-300"
                          placeholder="학생 이름을 입력하세요"
                          autoFocus
                      />
                  </div>
                  
                  {/* Actions Section */}
                  <div className="flex gap-3">
                      {!isAdding && (
                        <button 
                            onClick={handleDeleteFromSheet}
                            className="p-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            aria-label="삭제"
                        >
                            <Trash2 size={24} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => isAdding ? handleAddStudent() : handleUpdateStudent()}
                        disabled={!tempStudentName.trim()}
                        className="flex-1 py-4 bg-cyan-600 text-white rounded-xl font-bold text-lg hover:bg-cyan-700 shadow-lg shadow-cyan-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                      >
                          {isAdding ? (
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
    </div>
  );
};
