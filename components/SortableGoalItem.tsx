
import React, { useState } from 'react';
import { 
  GripVertical, Trash2, Edit2, Check, Pause, Target
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Goal } from '../types';
import { GOAL_ICONS, getGoalIcon } from '../utils/goalIcons';

interface SortableGoalItemProps {
  goal: Goal;
  isEditMode: boolean;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onIconClick: (goal: Goal) => void;
}

export const SortableGoalItem: React.FC<SortableGoalItemProps> = ({ 
    goal, 
    isEditMode, 
    onEdit,
    onDelete,
    onIconClick
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
      id: goal.id,
      disabled: !isEditMode
  });
  
  // --- Swipe Logic ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const minSwipeDistance = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
      if (!isEditMode) return;
      setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isEditMode || touchStart === null) return;
      const currentX = e.targetTouches[0].clientX;
      const diff = currentX - touchStart;
      
      // Limit swipe range
      if (diff > 120) setTouchOffset(120);
      else if (diff < -120) setTouchOffset(-120);
      else setTouchOffset(diff);
  };

  const handleTouchEnd = () => {
      if (!isEditMode || touchStart === null) return;
      
      if (touchOffset > minSwipeDistance) {
          onEdit(goal);
      } else if (touchOffset < -minSwipeDistance) {
          onDelete(goal);
      }
      
      setTouchStart(null);
      setTouchOffset(0); // Snap back
  };


  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : 'transform 0.2s ease',
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  // Determine Icon Component
  const IconComponent = getGoalIcon(goal.icon);
  const status = goal.status || 'in_progress';

  // --- Visual Logic ---
  const getContainerClasses = () => {
      const base = "relative w-full text-left p-4 rounded-2xl flex items-start gap-3 md:gap-4 group transition-transform touch-none select-none overflow-hidden";
      
      if (isEditMode) {
          // Edit Mode: Unified distinct look (White + Indigo Border)
          return `${base} bg-white border-2 border-indigo-500 shadow-md`;
      }
      
      // Normal Mode: Status-based colors
      switch (status) {
          case 'completed':
              return `${base} bg-green-50/50 border border-green-200 hover:bg-green-50`;
          case 'on_hold':
              return `${base} bg-gray-50 border border-gray-100 opacity-70 hover:opacity-100`;
          default:
              return `${base} bg-white border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-indigo-100 active:bg-gray-100`;
      }
  };

  const getIconContainerClasses = () => {
      const base = "w-12 h-12 rounded-xl flex items-center justify-center transition-transform active:scale-95 relative shrink-0";
      
      if (isEditMode) {
          return `${base} bg-gray-50 text-gray-400 border border-gray-100`;
      }

      switch (status) {
          case 'completed':
              return `${base} bg-green-100 text-green-600 shadow-sm`;
          case 'on_hold':
              return `${base} bg-gray-200 text-gray-400`;
          default:
              return `${base} ${goal.icon && goal.icon !== 'target' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`;
      }
  };

  return (
    <div className="relative group touch-none mb-2">
       {/* Background Actions (Swipe Reveal) */}
       {isEditMode && (
         <div className="absolute inset-0 rounded-2xl flex overflow-hidden shadow-inner bg-gray-100">
             <div 
                className="flex-1 bg-blue-500 flex items-center justify-start pl-6 text-white transition-opacity duration-200"
                style={{ opacity: touchOffset > 0 ? Math.min(touchOffset / 60, 1) : 0 }}
             >
                 <Edit2 size={24} />
             </div>
             <div 
                className="flex-1 bg-red-500 flex items-center justify-end pr-6 text-white transition-opacity duration-200"
                style={{ opacity: touchOffset < 0 ? Math.min(Math.abs(touchOffset) / 60, 1) : 0 }}
             >
                 <Trash2 size={24} />
             </div>
         </div>
      )}

      <div
        ref={setNodeRef}
        style={{
            ...style,
            transform: transform ? CSS.Transform.toString(transform) : `translateX(${touchOffset}px)`
        }}
        
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        
        // Handle click on container
        onClick={(e) => {
            if(isDragging) return;
            onEdit(goal);
        }}
        
        className={`${getContainerClasses()} ${isDragging ? 'shadow-2xl scale-105 z-50 ring-4 ring-indigo-200 !bg-white' : 'cursor-pointer'}`}
      >
        {/* Drag Handle (Edit Mode Only) */}
        {isEditMode && (
            <div 
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                className="text-indigo-400 p-2 -ml-2 cursor-grab active:cursor-grabbing touch-none flex items-center self-center justify-center bg-gray-50 rounded-lg hover:bg-indigo-50 mr-1"
                onClick={(e) => e.stopPropagation()} // Prevent click propagating to container
            >
                <GripVertical size={24} />
            </div>
        )}

        {/* Left Icon Area */}
        <div className="mt-0.5 shrink-0 flex items-center justify-center">
            {isEditMode ? (
                 // Edit Mode: Simplified Icon
                <div className="w-12 h-12 rounded-xl bg-indigo-50/50 flex items-center justify-center text-indigo-400 border border-indigo-100">
                    <IconComponent size={20} />
                </div>
            ) : (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onIconClick(goal); 
                    }}
                    className={getIconContainerClasses()}
                >
                    <IconComponent size={24} strokeWidth={status === 'completed' ? 2.5 : 2} />
                    
                    {/* Status Overlays */}
                    {status === 'completed' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                            <Check size={12} strokeWidth={4} />
                        </div>
                    )}
                    {status === 'on_hold' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                            <Pause size={10} fill="currentColor" />
                        </div>
                    )}
                </button>
            )}
        </div>

        <div className="flex-1 min-w-0 py-1">
            {/* Status Badge (Text) - Hide in Edit Mode to reduce clutter */}
            {!isEditMode && status === 'completed' && (
                <div className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold tracking-wide uppercase">
                    <span>완료됨</span>
                </div>
            )}
            {!isEditMode && status === 'on_hold' && (
                <div className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-md bg-gray-200 text-gray-600 text-[10px] font-bold tracking-wide uppercase">
                    <span>보류</span>
                </div>
            )}

            <h4 className={`font-bold text-base md:text-lg leading-snug truncate transition-colors ${status === 'completed' && !isEditMode ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800'}`}>
                {goal.title}
            </h4>
            
            {goal.description && (
                <p className={`text-xs md:text-sm mt-1 line-clamp-2 leading-relaxed ${status === 'completed' && !isEditMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {goal.description}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};
