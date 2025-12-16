
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ObservationLog, PromptLevel } from '../types';
import { History, X, Filter, CheckSquare, Paperclip, MessageSquare, ClipboardX, Plus, ChevronLeft, Target, ExternalLink } from 'lucide-react';
import { QuickRecordSheet } from '../components/QuickRecordSheet';
import { LogCard } from '../components/LogCard';
import { StudentGoalSelector } from '../components/StudentGoalSelector';
import { useSearchParams } from 'react-router-dom';
import { getGoalIcon } from '../utils/goalIcons';

export const DailyData: React.FC = () => {
  const { students, goals, logs, uploadingLogIds, fetchStudents, fetchGoals, fetchLogs, recordTrial, deleteLog, updateLog } = useStore();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  
  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ObservationLog | null>(null);

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFilterMedia, setHistoryFilterMedia] = useState(false);
  const [historyFilterNotes, setHistoryFilterNotes] = useState(false);

  // Media Viewer State
  const [viewingLog, setViewingLog] = useState<ObservationLog | null>(null);

  // URL Query Params
  const [searchParams] = useSearchParams();

  // Helper to scroll main view to top
  const scrollToTop = () => {
      const main = document.querySelector('main');
      if (main) {
          main.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Updated effect to handle query param pre-selection
  useEffect(() => {
    if (students.length > 0) {
      const paramId = searchParams.get('studentId');
      
      // If URL param exists and is valid, use it.
      if (paramId && students.some(s => s.id === paramId)) {
        if (selectedStudentId !== paramId) {
            setSelectedStudentId(paramId);
        }
      } 
      // Otherwise default to first student if nothing selected
      else if (!selectedStudentId) {
        setSelectedStudentId(students[0].id);
      }
    }
  }, [students, searchParams]);

  useEffect(() => {
    if (selectedStudentId) {
      // Clear logs immediately to avoid showing previous student's logs
      useStore.setState({ logs: [] });

      fetchGoals(selectedStudentId);
      setSelectedGoalId(''); 
    }
  }, [selectedStudentId, fetchGoals]);

  useEffect(() => {
    // Only auto-select if we have goals AND they belong to the current student
    // (Fixes bug where stale goals from Dashboard/other pages cause mismatch)
    const areGoalsForCurrentStudent = goals.length > 0 && goals[0].student_id === selectedStudentId;

    if (areGoalsForCurrentStudent) {
        // If no goal selected, or the selected goal is not in the current list
        const isSelectionValid = selectedGoalId && goals.some(g => g.id === selectedGoalId);
        
        if (!isSelectionValid) {
            setSelectedGoalId(goals[0].id);
        }
    }
  }, [goals, selectedGoalId, selectedStudentId]);

  useEffect(() => {
    if (selectedGoalId) {
      fetchLogs(selectedGoalId);
    }
  }, [selectedGoalId, fetchLogs]);

  const currentStudent = students.find(s => s.id === selectedStudentId);
  const currentGoal = goals.find(g => g.id === selectedGoalId);
  
  // Resolve Icon Component for History Header
  const CurrentGoalIcon = currentGoal ? getGoalIcon(currentGoal.icon) : Target;

  const stats = useMemo(() => {
    const total = logs.length;
    // Simplify: Assume all logs are valid for accuracy calculation
    const avgAccuracy = total > 0 
        ? Math.round(logs.reduce((acc, l) => acc + (l.value || 0), 0) / total) 
        : 0;
    
    return { total, avgAccuracy };
  }, [logs]);

  // Main list logs (Always sorted by time)
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);

  // Filtered Logs for History Modal
  const filteredHistoryLogs = useMemo(() => {
      let data = [...sortedLogs];
      if (historyFilterMedia) {
          data = data.filter(l => !!l.media_uri);
      }
      if (historyFilterNotes) {
          data = data.filter(l => !!l.notes && l.notes.trim().length > 0);
      }
      return data;
  }, [sortedLogs, historyFilterMedia, historyFilterNotes]);

  // Show only top 5 logs in the main view
  const recentLogs = sortedLogs.slice(0, 5);

  const handleOpenRecordSheet = () => {
    setEditingLog(null);
    setIsSheetOpen(true);
  };

  const handleEditLog = (log: ObservationLog) => {
    setEditingLog(log);
    setIsSheetOpen(true);
  };

  const handleMediaClick = (log: ObservationLog) => {
    setViewingLog(log);
  };

  const handleSheetSave = async (value: number, promptLevel: PromptLevel, timestamp?: number, mediaUri?: string | File, notes?: string) => {
    if (!selectedGoalId) return;

    if (editingLog) {
        await updateLog(editingLog.id, selectedGoalId, value, promptLevel, timestamp || editingLog.timestamp, mediaUri, notes);
    } else {
        await recordTrial(selectedGoalId, value, promptLevel, mediaUri, notes);
    }
  };

  const handleSheetDelete = async () => {
    if (editingLog && selectedGoalId) {
        await deleteLog(editingLog.id, selectedGoalId);
        setIsSheetOpen(false);
        setIsHistoryOpen(false); // Close history if editing from there
        scrollToTop();
    }
  };

  // Helper to find goal info for a log
  const getLogGoalInfo = (log: ObservationLog) => {
      // First try current goal
      if (log.goal_id === selectedGoalId && currentGoal) {
          return { title: currentGoal.title, icon: currentGoal.icon };
      }
      // If not (e.g. in mixed history), find in goals array
      const g = goals.find(g => g.id === log.goal_id);
      return g ? { title: g.title, icon: g.icon } : { title: 'Unknown Goal', icon: 'target' };
  };

  // Helper to extract File ID from Google Drive URL for external link
  const getDriveViewLink = (uri: string) => {
      if (!uri) return '';
      // Handle "uc?export=download&id=..." style
      if (uri.includes('uc?')) {
          const id = uri.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
          if (id) return `https://drive.google.com/file/d/${id}/view`;
      }
      // Handle already formatted links
      return uri; 
  };

  if (!currentStudent) return <div className="p-8 text-center text-gray-500">데이터 로딩 중...</div>;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 pb-24 relative min-h-[calc(100vh-80px)] max-w-4xl mx-auto w-full">
      
      {/* Selectors */}
      <StudentGoalSelector 
        students={students}
        goals={goals}
        selectedStudentId={selectedStudentId}
        selectedGoalId={selectedGoalId}
        onSelectStudent={setSelectedStudentId}
        onSelectGoal={setSelectedGoalId}
        currentStudent={currentStudent}
      />

      {/* Simplified Info Text instead of Card */}
      {!currentGoal && (
          <div className="text-center text-gray-400 text-sm py-4">기록을 시작하려면 목표를 선택하세요.</div>
      )}

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
          <div className="bg-cyan-50 p-5 rounded-2xl flex flex-col items-center justify-center border border-cyan-100">
              <span className="text-xs text-cyan-600 font-bold mb-1 uppercase tracking-wide">평균 수행도</span>
              <span className="text-4xl font-black text-cyan-700">
                  {stats.avgAccuracy}<span className="text-2xl">%</span>
              </span>
          </div>
          <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">총 시도</span>
              <span className="text-4xl font-black text-gray-700">{stats.total}<span className="text-2xl">회</span></span>
          </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg font-bold text-gray-800">최근 기록</h3>
            {sortedLogs.length > 5 && (
                <button 
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-1 text-sm font-bold text-cyan-600 hover:text-cyan-800 transition-colors"
                >
                    <History size={16} />
                    <span>전체 보기 ({sortedLogs.length})</span>
                </button>
            )}
        </div>
        
        <div className="space-y-3 pb-20">
            {recentLogs.length === 0 && (
                <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <ClipboardX size={32} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">
                        아직 기록이 없습니다.<br/>
                        하단 버튼을 눌러 기록을 시작하세요.
                    </p>
                </div>
            )}
            {recentLogs.map((log) => {
                const info = getLogGoalInfo(log);
                const isUploading = uploadingLogIds.includes(log.id);
                return <LogCard key={log.id} log={log} goalTitle={info.title} goalIcon={info.icon} onClick={handleEditLog} onMediaClick={handleMediaClick} isUploading={isUploading} />;
            })}
            
            {sortedLogs.length > 5 && (
                 <button 
                    onClick={() => setIsHistoryOpen(true)}
                    className="w-full py-4 text-center text-gray-500 font-bold text-sm hover:text-cyan-600 transition-colors bg-white rounded-xl border border-gray-100 shadow-sm"
                 >
                     + {sortedLogs.length - 5}개 기록 더 보기
                 </button>
            )}
        </div>
      </div>

      {selectedGoalId && (
          <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-30">
            <button 
                onClick={handleOpenRecordSheet}
                className="bg-cyan-600 text-white font-bold p-4 md:px-6 md:py-4 rounded-full shadow-xl shadow-cyan-200 flex items-center justify-center gap-2 hover:bg-cyan-700 transition-transform hover:scale-105 active:scale-95"
            >
                <Plus size={24} strokeWidth={3} />
                <span className="hidden md:inline">기록하기</span>
            </button>
          </div>
      )}

      {/* Full History Modal (Separate Window) */}
      {isHistoryOpen && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slide-up">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 bg-white shrink-0">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 pr-4">
                          {currentGoal && (
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shrink-0">
                                <CurrentGoalIcon size={20} />
                            </div>
                          )}
                          <div>
                              <h2 className="text-lg font-bold text-gray-800 leading-tight line-clamp-2">
                                  {currentGoal ? currentGoal.title : '전체 기록 히스토리'}
                              </h2>
                              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                 총 {filteredHistoryLogs.length}개의 기록이 있습니다
                              </p>
                          </div>
                      </div>
                      <button 
                          onClick={() => { setIsHistoryOpen(false); scrollToTop(); }} 
                          className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 shrink-0"
                      >
                          <X size={24} />
                      </button>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex gap-2">
                        <button 
                            onClick={() => setHistoryFilterMedia(!historyFilterMedia)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                historyFilterMedia 
                                ? 'bg-cyan-50 text-cyan-600 border-cyan-200 ring-1 ring-cyan-200' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <Paperclip size={14} strokeWidth={2.5} />
                            <span>미디어 포함</span>
                            {historyFilterMedia && <CheckSquare size={12} />}
                        </button>
                        <button 
                            onClick={() => setHistoryFilterNotes(!historyFilterNotes)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                historyFilterNotes 
                                ? 'bg-orange-50 text-orange-600 border-orange-200 ring-1 ring-orange-200' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <MessageSquare size={14} strokeWidth={2.5} />
                            <span>메모 포함</span>
                            {historyFilterNotes && <CheckSquare size={12} />}
                        </button>
                  </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                  <div className="max-w-3xl mx-auto space-y-3">
                    {filteredHistoryLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Filter size={40} className="mb-2 opacity-20" />
                            <p className="text-sm">조건에 맞는 기록이 없습니다.</p>
                        </div>
                    ) : (
                        filteredHistoryLogs.map((log) => {
                             const info = getLogGoalInfo(log);
                             const isUploading = uploadingLogIds.includes(log.id);
                             return <LogCard key={log.id} log={log} goalTitle={info.title} goalIcon={info.icon} onClick={handleEditLog} onMediaClick={handleMediaClick} isUploading={isUploading} />
                        })
                    )}
                  </div>
              </div>
          </div>
      )}

      {/* Media Viewer Modal */}
      {viewingLog && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in" onClick={() => setViewingLog(null)}>
            <button 
                onClick={() => setViewingLog(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/50 z-20"
            >
                <X size={28} />
            </button>

            <div className="w-full max-w-4xl max-h-screen p-4 flex flex-col items-center justify-center gap-4" onClick={e => e.stopPropagation()}>
                {(() => {
                    const isVideo = viewingLog.mediaType?.startsWith('video/') || viewingLog.media_uri?.includes('video') || viewingLog.media_uri?.startsWith('data:video');
                    
                    if (isVideo) {
                        return (
                            <>
                                <video 
                                    src={viewingLog.media_uri} 
                                    controls 
                                    playsInline
                                    className="max-w-full max-h-[70vh] rounded-lg shadow-2xl bg-black"
                                />
                                {/* External Link Button for Mobile Compatibility */}
                                {viewingLog.media_uri?.includes('google') && (
                                    <a 
                                        href={getDriveViewLink(viewingLog.media_uri)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                        <span>구글 드라이브 앱에서 열기</span>
                                    </a>
                                )}
                            </>
                        );
                    } else {
                        return (
                            <img 
                                src={viewingLog.media_uri} 
                                alt="Observation" 
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-black"
                                referrerPolicy="no-referrer"
                            />
                        );
                    }
                })()}
                
                {/* Footer Info */}
                <div className="text-white/90 text-center max-w-lg">
                     <p className="text-sm font-bold mb-1">
                        {new Date(viewingLog.timestamp).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })}
                     </p>
                     {viewingLog.notes && <p className="text-sm opacity-80">{viewingLog.notes}</p>}
                </div>
            </div>
        </div>
      )}

      <QuickRecordSheet
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); scrollToTop(); }}
        onSave={handleSheetSave}
        onDelete={editingLog ? handleSheetDelete : undefined}
        goalTitle={currentGoal?.title || ''}
        goalIcon={currentGoal?.icon} // Added prop
        
        initialValue={editingLog?.value}
        
        initialPromptLevel={editingLog ? editingLog.promptLevel : 'verbal'}
        initialTimestamp={editingLog?.timestamp}
        initialMediaUri={editingLog?.media_uri}
        // Fix: Pass mediaType to handle cloud videos correctly
        initialMediaType={editingLog?.mediaType}
        initialNotes={editingLog?.notes}
        isEditing={!!editingLog}
      />
    </div>
  );
};
