
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GripVertical, Trash2, Edit2, Target, PlayCircle, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Student, Goal } from '../types';

interface SortableStudentItemProps {
  student: Student;
  goals?: Goal[];
  isEditMode: boolean;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onEnableEditMode: () => void;
}

export const SortableStudentItem: React.FC<SortableStudentItemProps> = ({ 
    student, 
    goals = [],
    isEditMode, 
    onEdit,
    onDelete,
    onEnableEditMode
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
      id: student.id,
      disabled: !isEditMode
  });

  const navigate = useNavigate();

  // --- Swipe & Long Press Logic ---
  // Store both X and Y coordinates to distinguish scroll from swipe
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const longPressTimer = useRef<any>(null);
  const minSwipeDistance = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
      // Long Press Detection (for triggering edit mode)
      if (!isEditMode) {
          longPressTimer.current = setTimeout(() => {
              if (navigator.vibrate) navigator.vibrate(50);
              onEnableEditMode();
          }, 500); // 500ms long press
      }

      // Swipe Start (Record initial position)
      if (isEditMode) {
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      // Cancel long press on move
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }

      if (!isEditMode || touchStart === null) return;
      
      const currentX = e.targetTouches[0].clientX;
      const currentY = e.targetTouches[0].clientY;
      const diffX = currentX - touchStart.x;
      const diffY = currentY - touchStart.y;
      
      // CRITICAL: Determine if this is a vertical scroll or horizontal swipe
      // If vertical movement is greater than horizontal, assume scroll and do nothing (let browser handle it)
      if (Math.abs(diffY) > Math.abs(diffX)) return;

      // If Horizontal Swipe, prevent default to stop browser navigation/scroll and handle custom swipe
      if (e.cancelable) e.preventDefault();

      // Limit swipe range
      if (diffX > 120) setTouchOffset(120);
      else if (diffX < -120) setTouchOffset(-120);
      else setTouchOffset(diffX);
  };

  const handleTouchEnd = () => {
      // Cancel long press
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }

      if (!isEditMode || touchStart === null) return;
      
      // Swipe Right -> Edit
      if (touchOffset > minSwipeDistance) {
          onEdit(student);
      } 
      // Swipe Left -> Delete
      else if (touchOffset < -minSwipeDistance) {
          onDelete(student);
      }
      
      setTouchStart(null);
      setTouchOffset(0); // Snap back
  };

  // Mouse equivalents for desktop long-press testing
  const handleMouseDown = () => {
    if (!isEditMode) {
        longPressTimer.current = setTimeout(() => {
            onEnableEditMode();
        }, 500);
    }
  };
  const handleMouseUp = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : 'transform 0.2s ease', 
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  const handleCardClick = () => {
      if (isDragging) return;
      
      if (!isEditMode) {
          navigate(`/student/${student.id}`);
      } else {
          onEdit(student);
      }
  };

  // Counts
  const totalCount = goals.length;
  const activeCount = goals.filter(g => g.status === 'in_progress').length;

  return (
    <div className="relative group touch-pan-y mb-1">
      {/* Background Actions (Swipe Reveal) */}
      {isEditMode && (
         <div className="absolute inset-0 rounded-2xl flex overflow-hidden shadow-inner bg-gray-100">
             {/* Left Reveal (Blue for Edit) */}
             <div 
                className="flex-1 bg-cyan-500 flex items-center justify-start pl-6 text-white transition-opacity duration-200"
                style={{ opacity: touchOffset > 0 ? Math.min(touchOffset / 60, 1) : 0 }}
             >
                 <Edit2 size={24} />
             </div>
             
             {/* Right Reveal (Red for Delete) */}
             <div 
                className="flex-1 bg-red-500 flex items-center justify-end pr-6 text-white transition-opacity duration-200"
                style={{ opacity: touchOffset < 0 ? Math.min(Math.abs(touchOffset) / 60, 1) : 0 }}
             >
                 <Trash2 size={24} />
             </div>
         </div>
      )}

      {/* Main Card */}
      <div
        ref={setNodeRef}
        style={{
            ...style,
            transform: transform ? CSS.Transform.toString(transform) : `translateX(${touchOffset}px)` 
        }}
        
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        
        className={`
          relative p-4 rounded-2xl flex items-center gap-4 transition-all touch-pan-y select-none overflow-hidden
          ${isEditMode 
            ? 'bg-white border-2 border-cyan-500 shadow-md cursor-pointer' 
            : 'bg-white border border-gray-100 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99]' 
          }
          ${isDragging ? 'shadow-2xl scale-105 z-50 ring-4 ring-cyan-200' : ''}
        `}
        onClick={handleCardClick}
      >

        {/* Drag Handle Indicator (Edit Mode Only) */}
        {isEditMode && (
            <div 
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="text-cyan-400 p-2 -ml-3 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center bg-gray-50 rounded-lg hover:bg-cyan-50 mr-1"
                // STOP PROPAGATION to prevent parent Swipe Logic from interfering
                onPointerDown={(e) => {
                    listeners?.onPointerDown?.(e);
                    e.stopPropagation();
                }}
                onTouchStart={(e) => {
                    e.stopPropagation(); 
                }}
                onClick={(e) => e.stopPropagation()}
            >
               <GripVertical size={24} />
            </div>
        )}

        <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 relative">
            <img 
              src={student.photo_uri} 
              alt={student.name}
              className="w-full h-full object-cover"
              draggable={false}
              onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="w-full h-full flex items-center justify-center bg-cyan-50 text-cyan-300 absolute inset-0 -z-10">
              <User size={24} />
            </div>
            
            {/* Overlay Icon in Edit Mode to suggest editing */}
            {isEditMode && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Edit2 size={16} className="text-white" />
                </div>
            )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 truncate mb-1.5">{student.name}</h3>
          
          <div className="flex items-center gap-2">
               <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  <Target size={12} className="text-gray-400" />
                  <span>전체 {totalCount}</span>
               </div>
               <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md">
                  <PlayCircle size={12} className="text-cyan-500" />
                  <span>진행 {activeCount}</span>
               </div>
          </div>
        </div>
      </div>
    </div>
  );
};
