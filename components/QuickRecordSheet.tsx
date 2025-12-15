
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Calendar, HelpCircle, Hand, Mic, Eye, User, X, Camera, MessageSquare, Video, Loader2 } from 'lucide-react';
import { PromptLevel } from '../types';
import { useStore } from '../store/useStore';

interface QuickRecordSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated signature: removed MeasurementType
  onSave: (value: number, promptLevel: PromptLevel, timestamp?: number, mediaUri?: string | File, notes?: string) => void;
  onDelete?: () => void;
  goalTitle: string;
  initialValue?: number;
  initialPromptLevel?: PromptLevel;
  initialTimestamp?: number;
  initialMediaUri?: string;
  initialMediaType?: string; // New prop for correct video detection
  initialNotes?: string;
  isEditing?: boolean;
}

const PROMPT_CONFIG: Record<PromptLevel, { label: string; shortLabel: string; icon: React.ElementType; selectedClass: string; iconColor: string }> = {
    independent: { 
        label: '독립 수행 (Independent)',
        shortLabel: '독립',
        icon: User, 
        selectedClass: 'bg-green-100 text-green-700 border-green-500 ring-1 ring-green-500',
        iconColor: 'text-green-600'
    },
    verbal: { 
        label: '언어 촉구 (Verbal)',
        shortLabel: '언어',
        icon: Mic, 
        selectedClass: 'bg-sky-100 text-sky-700 border-sky-500 ring-1 ring-sky-500',
        iconColor: 'text-sky-500'
    },
    gesture: { 
        label: '제스처 (Gesture)',
        shortLabel: '제스처',
        icon: Hand, 
        selectedClass: 'bg-amber-100 text-amber-700 border-amber-500 ring-1 ring-amber-500',
        iconColor: 'text-amber-500'
    },
    modeling: { 
        label: '모델링 (Modeling)',
        shortLabel: '모델링',
        icon: Eye, 
        // Reverted to Purple as requested
        selectedClass: 'bg-purple-100 text-purple-700 border-purple-500 ring-1 ring-purple-500',
        iconColor: 'text-purple-500'
    },
    physical: { 
        label: '신체 촉구 (Physical)',
        shortLabel: '신체',
        icon: HelpCircle, 
        selectedClass: 'bg-rose-100 text-rose-700 border-rose-500 ring-1 ring-rose-500',
        iconColor: 'text-rose-500'
    },
};

const PROMPT_ORDER: PromptLevel[] = ['independent', 'verbal', 'gesture', 'modeling', 'physical'];

export const QuickRecordSheet: React.FC<QuickRecordSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  goalTitle,
  initialValue = 0,
  initialPromptLevel = 'verbal', 
  initialTimestamp,
  initialMediaUri,
  initialMediaType,
  initialNotes = '',
  isEditing = false,
}) => {
  // Use local loading state if needed, but for optimistic updates we generally don't block
  // Removing global isLoading check for closing behavior
  
  // Data States
  const [accuracy, setAccuracy] = useState<number>(50);
  const [promptLevel, setPromptLevel] = useState<PromptLevel>('verbal');
  const [editDateTime, setEditDateTime] = useState<string>('');
  
  // Media State
  const [mediaPreview, setMediaPreview] = useState<string | undefined>(undefined);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [currentMediaType, setCurrentMediaType] = useState<string | undefined>(undefined);
  
  const [notes, setNotes] = useState<string>('');
  
  // Swipe to Close Logic
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPromptLevel(initialPromptLevel);
      setMediaPreview(initialMediaUri);
      setCurrentMediaType(initialMediaType);
      setMediaFile(null); // Reset file on open
      setNotes(initialNotes);
      setAccuracy(isEditing ? initialValue : 50);
      setDragOffset(0); // Reset drag

      if (isEditing && initialTimestamp) {
          const date = new Date(initialTimestamp);
          const pad = (n: number) => n.toString().padStart(2, '0');
          const localIso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
          setEditDateTime(localIso);
      } else {
        setEditDateTime('');
      }
    }
  }, [isOpen, isEditing, initialValue, initialPromptLevel, initialTimestamp, initialMediaUri, initialMediaType, initialNotes]);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (mediaPreview && mediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const handleSave = () => {
    let timestamp: number | undefined;
    if (isEditing && editDateTime) {
        timestamp = new Date(editDateTime).getTime();
    }
    
    // Pass the File object if a new file was selected, otherwise pass the existing URI string
    const mediaToSave = mediaFile ? mediaFile : mediaPreview;

    onSave(accuracy, promptLevel, timestamp, mediaToSave, notes.trim());
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file); // Store the file for upload
      setCurrentMediaType(file.type); // Update type state
      
      // OPTIMIZED: Use createObjectURL instead of FileReader for large files (prevents mobile crash)
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    }
    // Allow re-selecting the same file if needed
    if (e.target) e.target.value = '';
  };

  const clearMedia = () => {
    setMediaPreview(undefined);
    setMediaFile(null);
    setCurrentMediaType(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Touch Handlers for Swipe to Close ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (sheetRef.current && sheetRef.current.scrollTop === 0) {
          dragStartY.current = e.touches[0].clientY;
          setIsDragging(true);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (dragStartY.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - dragStartY.current;

      // Only allow dragging down
      if (diff > 0) {
          // Prevent default scroll behavior if we are dragging the sheet
          if (e.cancelable) e.preventDefault();
          setDragOffset(diff);
      }
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartY.current = null;
      
      if (dragOffset > 120) {
          onClose();
      } else {
          setDragOffset(0);
      }
  };

  if (!isOpen) return null;

  // Determine if it's a video based on File object OR passed mediaType OR URL string (fallback)
  const isVideo = mediaFile 
    ? mediaFile.type.startsWith('video/') 
    : (currentMediaType?.startsWith('video/') || mediaPreview?.startsWith('data:video') || mediaPreview?.includes('.mp4') || mediaPreview?.includes('video'));

  // Can we actually play it? (Must be a File/Blob or legacy data URI. Cloud thumbnails are just images)
  const isPlayable = mediaFile || mediaPreview?.startsWith('blob:') || mediaPreview?.startsWith('data:video');

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-fade-in backdrop-blur-sm"
        onClick={onClose}
        style={{ opacity: Math.max(0, 1 - dragOffset / 500) }}
      />
      
      {/* Container for positioning: Centers on Desktop, Bottom on Mobile */}
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center pointer-events-none">
        <div 
            ref={sheetRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
                transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined, 
                transition: isDragging ? 'none' : 'transform 0.2s ease-out' 
            }}
            className={`
                bg-white p-6 shadow-2xl overflow-y-auto w-full pointer-events-auto
                
                max-w-md rounded-t-3xl max-h-[90vh] animate-slide-up
                
                md:w-full md:max-w-lg md:rounded-3xl md:max-h-[85vh] md:animate-scale-up
            `}
        >
            {/* Drag Handle (Mobile Only) */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-50 md:hidden" />

            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 truncate flex-1 pr-4 leading-tight">
                {goalTitle}
                </h3>
                <div className="flex gap-2">
                    {isEditing && onDelete && (
                        <button onClick={onDelete} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50">
                            <Trash2 size={20} />
                        </button>
                    )}
                    {/* Close Button (More visible on Desktop) */}
                    <button onClick={onClose} className="p-2 text-gray-400 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors hidden md:block disabled:opacity-50">
                        <X size={20} />
                    </button>
                </div>
            </div>
            
            {/* Date Time Edit */}
            {isEditing && (
                <div className="mb-4 animate-fade-in">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <Calendar size={16} className="text-gray-400 ml-2" />
                    <input 
                        type="datetime-local" 
                        value={editDateTime}
                        onChange={(e) => setEditDateTime(e.target.value)}
                        className="bg-transparent font-medium text-gray-800 w-full outline-none text-sm p-1"
                    />
                    </div>
                </div>
            )}

            {/* Accuracy Slider */}
            <div className="mb-8">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-bold text-gray-500">수행 정확도</span>
                    <span className={`text-3xl font-extrabold transition-colors duration-300 ${accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-yellow-500' : 'text-orange-500'}`}>
                        {accuracy}<span className="text-xl">%</span>
                    </span>
                </div>
                <div className="relative h-10 flex items-center">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={accuracy}
                        onChange={(e) => setAccuracy(parseInt(e.target.value, 10))}
                        className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 accent-cyan-600 relative z-10"
                    />
                    {/* Markers matched to thumb position (thumb width 28px) */}
                    <div className="absolute top-8 left-0 right-0 h-6">
                        {[0, 25, 50, 75, 100].map((val) => (
                        <div 
                            key={val} 
                            className="absolute flex flex-col items-center group -translate-x-1/2"
                            style={{ 
                                left: `calc(${val}% + (${14 - val * 0.28}px))` 
                            }}
                        >
                            <div className={`h-1.5 w-0.5 mb-1 transition-colors ${accuracy >= val ? 'bg-cyan-500' : 'bg-gray-300'}`}></div>
                            <span className={`text-[10px] font-medium transition-colors ${accuracy >= val ? 'text-cyan-600' : 'text-gray-400'}`}>{val}</span>
                        </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Prompt Level Selection */}
            <div className="mb-6">
                <span className="text-sm font-bold text-gray-500 mb-3 block">촉구 유형 (Prompt Level)</span>
                <div className="grid grid-cols-2 gap-2">
                    {PROMPT_ORDER.map((key) => {
                        const config = PROMPT_CONFIG[key];
                        const Icon = config.icon;
                        const isSelected = promptLevel === key;
                        const isIndependent = key === 'independent';

                        return (
                            <button
                                key={key}
                                onClick={() => setPromptLevel(key)}
                                className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                                    ${isIndependent ? 'col-span-2 justify-center py-3' : ''}
                                    ${isSelected 
                                        ? `${config.selectedClass} shadow-sm font-bold` 
                                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <Icon size={18} className={isSelected ? config.iconColor : 'text-gray-400'} />
                                <span className="text-sm">{isIndependent ? config.label : config.shortLabel}</span>
                                {isSelected && <div className={`w-2 h-2 rounded-full absolute right-3 ${config.selectedClass.split(' ')[0].replace('bg-', 'bg-current ')} opacity-50`} />}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Notes & Media */}
            <div className="mb-8">
            <div className="grid grid-cols-2 gap-3">
                {/* Notes Input */}
                <div className="col-span-2">
                    <label className="text-sm font-bold text-gray-500 mb-2 block">메모 & 미디어 추가(선택)</label>
                    <div className="relative">
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="특이사항이나 관찰 내용을 입력하세요..."
                            maxLength={1000}
                            className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-cyan-500 outline-none resize-none h-20 transition-all"
                        />
                        <MessageSquare size={16} className="absolute top-3.5 left-3.5 text-gray-400" />
                    </div>
                    <div className="text-right text-[10px] text-gray-400 mt-1">{notes.length}/1000</div>
                </div>

                {/* Media Attachment */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl h-12 text-gray-400 hover:bg-gray-50 hover:border-cyan-300 hover:text-cyan-500 transition-colors"
                >
                    <Camera size={18} />
                    <span className="text-xs font-bold">사진/영상 추가</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*,video/*"
                />
                
                {/* Preview */}
                {mediaPreview ? (
                    <div className="bg-gray-50 rounded-xl h-12 border border-gray-100 flex items-center justify-between px-3 relative overflow-hidden">
                        <div className="flex items-center gap-2 z-10 w-full min-w-0">
                            <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                {isVideo && isPlayable ? (
                                    <video src={mediaPreview} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                    <img 
                                      src={mediaPreview} 
                                      alt="preview" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                )}
                                {isVideo && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Video size={12} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-gray-500 font-bold truncate">
                                {mediaFile ? '업로드 대기중' : '첨부 완료'}
                            </span>
                        </div>
                        <button 
                            onClick={clearMedia}
                            className="z-10 p-1.5 bg-gray-200 rounded-full hover:bg-gray-300 shrink-0 ml-2"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-12 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-300">
                        미디어 없음
                    </div>
                )}
            </div>
            </div>

            {/* Save Button */}
            <button
            onClick={handleSave}
            className="w-full py-4 rounded-xl font-bold text-white text-lg bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <span>{isEditing ? '수정 완료' : '기록 저장'}</span>
            </button>
        </div>
      </div>
    </>
  );
};
