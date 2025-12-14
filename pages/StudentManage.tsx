
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Plus, Check, ArrowLeft } from 'lucide-react';
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
import { SortableStudentItem } from '../components/SortableStudentItem';
import { Student } from '../types';

export const StudentManage: React.FC = () => {
  const { students, goals, fetchStudents, fetchAllGoals, addStudent, reorderStudents, updateStudent, deleteStudent } = useStore();
  const navigate = useNavigate();
  
  const [newStudentName, setNewStudentName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Editing State for Modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchAllGoals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (over && active.id !== over.id) {
      const oldIndex = students.findIndex((s) => s.id === active.id);
      const newIndex = students.findIndex((s) => s.id === over.id);
      
      const newOrder = arrayMove(students, oldIndex, newIndex);
      reorderStudents(newOrder);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    await addStudent(newStudentName);
    setNewStudentName('');
    setIsAdding(false);
  };

  const handleEditClick = (student: Student) => {
      setEditingStudent(student);
      setEditName(student.name);
  };

  const handleDeleteClick = async (student: Student) => {
      if (confirm(`'${student.name}' 학생을 정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.`)) {
          await deleteStudent(student.id);
      }
  };

  const handleSaveEdit = async () => {
      if (editingStudent && editName.trim()) {
          await updateStudent(editingStudent.id, editName);
          setEditingStudent(null);
      }
  };

  return (
    <div className="pb-24 p-4 md:p-8 max-w-3xl mx-auto w-full min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center sticky top-0 z-10 bg-[#F3F4F6]/90 backdrop-blur-sm py-2">
        <div className="flex items-center gap-3">
             <button 
                onClick={() => navigate('/students')}
                className="p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors"
            >
                <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">학생 관리</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    추가, 수정, 삭제 및 순서 변경
                </p>
            </div>
        </div>
        
        <button 
            onClick={() => navigate('/students')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
            <Check size={16} />
            완료
        </button>
      </header>

      <main>
        <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
        >
        <SortableContext 
            items={students.map(s => s.id)}
            strategy={verticalListSortingStrategy}
        >
            <div className="flex flex-col gap-3">
            {students.map((student) => (
                <SortableStudentItem 
                key={student.id} 
                student={student}
                goals={goals.filter(g => g.student_id === student.id)}
                isEditMode={true} // Always edit mode in this page
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                />
            ))}
            </div>
        </SortableContext>
        </DndContext>

        {/* Add Student Section */}
        {isAdding ? (
        <form onSubmit={handleAddStudent} className="mt-6 p-6 bg-white rounded-2xl animate-fade-in border border-indigo-100 shadow-md">
            <h3 className="text-sm font-bold text-indigo-800 mb-4">새 학생 등록</h3>
            <input
            type="text"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="학생 이름 입력"
            className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 bg-gray-50"
            autoFocus
            />
            <div className="flex gap-3">
            <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 text-gray-500 bg-gray-100 rounded-xl font-bold hover:bg-gray-200"
            >
                취소
            </button>
            <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
            >
                추가하기
            </button>
            </div>
        </form>
        ) : (
        <button
            onClick={() => setIsAdding(true)}
            className="w-full mt-6 py-4 bg-white border border-gray-200 shadow-sm rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
        >
            <Plus size={20} />
            새 학생 추가
        </button>
        )}
      </main>

      {/* Edit Name Modal */}
      {editingStudent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">학생 이름 수정</h3>
                  <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 outline-none mb-6 font-bold"
                      autoFocus
                  />
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setEditingStudent(null)}
                          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
                      >
                          취소
                      </button>
                      <button 
                          onClick={handleSaveEdit}
                          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold"
                      >
                          저장
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
