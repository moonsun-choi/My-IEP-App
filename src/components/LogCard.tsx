import React, { useState, useEffect } from 'react';
import { googleDriveService } from '../services/googleDrive'; // 서비스 import 필수
import { ObservationLog, PromptLevel } from '../types';
import { Edit2, Paperclip, MessageSquare, Video, Cloud, Image as ImageIcon, PlayCircle, Maximize2 } from 'lucide-react';
import { getGoalIcon } from '../utils/goalIcons';

interface LogCardProps {
  log: ObservationLog;
  goalTitle?: string; // Optional: Show goal title context
  goalIcon?: string;  // Optional: Show goal icon
  onClick: (log: ObservationLog) => void;
  onMediaClick?: (log: ObservationLog) => void; // New prop for media viewing
  isUploading?: boolean; // New Prop for upload status
}

export const LogCard: React.FC<LogCardProps> = ({ log, goalTitle, goalIcon, onClick, onMediaClick, isUploading }) => {
  const [imgError, setImgError] = useState(false);
  // [추가] 뒤늦게 찾아낸 썸네일을 저장할 state
  const [resolvedThumbnail, setResolvedThumbnail] = useState<string | null>(null);
  
  const value = log.value;
  const GoalIconComponent = getGoalIcon(goalIcon);
  
  // Logic to determine if we should render a <video> tag
  // 1. It is a legacy base64 video string (data:video)
  // 2. OR it is a blob URL (optimistic update) AND mediaType indicates video
  const isVideoBlob = log.media_uri?.startsWith('blob:') && log.mediaType?.startsWith('video/');
  const isLegacyVideo = log.media_uri?.startsWith('data:video');
  
  // Only show the inline video player for Local Blobs or Legacy Data URIs.
  // Remote Drive Videos (webContentLink) should NOT be autoplayed in the list to save data/battery and avoid CORS errors.
  const showVideoPlayer = isVideoBlob || isLegacyVideo;
  
  // For badge display, we just check if the type is video
  const isVideoType = log.mediaType?.startsWith('video/') || isLegacyVideo || log.media_uri?.includes('video');

  // [추가] 구글 드라이브 영상인지 확인하는 헬퍼 변수
  const isDriveVideo = log.media_uri?.includes('drive.google.com') && isVideoType;

  // Reset error state if URI changes
  useEffect(() => {
    setImgError(false);
    setResolvedThumbnail(null); // URI가 바뀌면 썸네일도 초기화
  }, [log.media_uri]);

  // [추가] 구글 드라이브 영상이고, 아직 썸네일이 없을 때 -> 썸네일 확인 시도!
  useEffect(() => {
    if (isDriveVideo && log.media_uri) {
        // URL에서 파일 ID 추출 (예: .../d/1234abc/view -> 1234abc)
        const match = log.media_uri.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            const fileId = match[1];
            // 구글에 "썸네일 다 됐어?" 물어보기
            googleDriveService.getVideoThumbnail(fileId).then(thumb => {
                if (thumb) {
                    setResolvedThumbnail(thumb); // "오 생겼다!" -> 이미지로 교체
                }
            });
        }
    }
  }, [isDriveVideo, log.media_uri]);

  const getPromptLabel = (level: PromptLevel) => {
    const map: Record<string, string> = {
      independent: '독립',
      verbal: '언어',
      gesture: '제스처',
      modeling: '모델링',
      physical: '신체'
    };
    return map[level] || level;
  };

  const getPromptColor = (level: PromptLevel) => {
    if (level === 'independent') return 'bg-green-100 text-green-700 border-green-200';
    if (level === 'verbal') return 'bg-sky-100 text-sky-700 border-sky-200';
    if (level === 'physical') return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getValueColorClass = (val: number) => {
    if (val >= 80) return 'bg-green-50 text-green-600';
    if (val >= 50) return 'bg-yellow-50 text-yellow-600';
    return 'bg-red-50 text-red-500';
  };

  const handleMediaClick = (e: React.MouseEvent) => {
      if (log.media_uri && onMediaClick) {
          e.stopPropagation();
          onMediaClick(log);
      }
  };

  return (
    <div 
      onClick={() => onClick(log)}
      role="button"
      className={`w-full relative overflow-hidden bg-white p-3 md:p-4 rounded-2xl border flex items-center justify-between active:scale-[0.99] hover:shadow-md transition-all group cursor-pointer ${isUploading ? 'border-cyan-200 animate-liquid' : 'border-gray-100'}`}
    >
      <div className="flex items-center gap-3 md:gap-4 w-full relative z-10">
        {/* Value Box - Always Percentage */}
        {/* Added explicit click handler for media viewing */}
        <div 
            onClick={handleMediaClick}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold relative overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${getValueColorClass(value)} ${log.media_uri ? 'cursor-zoom-in active:scale-95 ring-offset-1 hover:ring-2 ring-cyan-200' : ''}`}
        >
          {log.media_uri && (
            showVideoPlayer ? (
                // 1. 방금 찍은 영상 (로컬) -> 자동 재생
                <video src={log.media_uri} className="absolute inset-0 w-full h-full object-cover opacity-30" muted playsInline loop autoPlay />
            ) : (isDriveVideo && !resolvedThumbnail) ? (
                // 2. [영상 전용] 드라이브 영상인데 "아직 썸네일을 못 찾았으면" -> 아이콘 표시 (엑박 방지)
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 opacity-50">
                    <Video size={24} className="text-slate-400" />
                </div>
            ) : (
                // 3. 사진 OR "찾아낸 썸네일(resolvedThumbnail)" -> 이미지 표시
                <>
                    <img 
                      src={resolvedThumbnail || log.media_uri} 
                      alt="" 
                      className={`absolute inset-0 w-full h-full object-cover opacity-30 ${imgError ? 'hidden' : ''}`}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                    {/* 혹시라도 이미지 로딩 실패하면 그때 아이콘 표시 */}
                    {imgError && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            {isVideoType ? <Video size={20} /> : <ImageIcon size={20} />}
                        </div>
                    )}
                </>
            )
          )}
          
          {/* Overlay Icon to indicate playability/viewing */}
          {log.media_uri && !imgError && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-20">
                  {isVideoType ? <PlayCircle size={20} className="text-white drop-shadow-md" /> : <Maximize2 size={18} className="text-white drop-shadow-md" />}
              </div>
          )}

          <div className="relative z-10 flex flex-col items-center pointer-events-none">
            <span className="text-lg">{value}</span>
            <span className="text-[9px] opacity-70">%</span>
          </div>
        </div>

        {/* Info Area */}
        <div className="text-left flex-1 min-w-0">
          {/* Goal Context (Icon + Title) */}
          {(goalTitle) && (
             <div className="flex items-center gap-1.5 mb-1.5 text-gray-800">
                 <div className="p-1 bg-gray-100 rounded-md text-gray-500">
                    <GoalIconComponent size={12} />
                 </div>
                 <span className="text-xs font-bold truncate">{goalTitle}</span>
             </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isUploading && (
                <span className="bg-white/80 text-cyan-600 border border-cyan-100 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold animate-pulse">
                    <Cloud size={10} />
                    업로드 중...
                </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getPromptColor(log.promptLevel)}`}>
              {getPromptLabel(log.promptLevel)}
            </span>
            {log.media_uri && !isUploading && (
              <span className="bg-cyan-50 text-cyan-500 border border-cyan-100 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold">
                {isVideoType ? <Video size={10} /> : <ImageIcon size={10} />}
                {isVideoType ? '영상' : '사진'}
              </span>
            )}
            {log.notes && (
              <span className="bg-orange-50 text-orange-500 border border-orange-100 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold">
                <MessageSquare size={10} />
                메모
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="text-[10px] text-gray-400 font-medium">
                {new Date(log.timestamp).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
            </div>
            {log.notes && (
                <p className="text-[10px] text-gray-500 truncate max-w-[120px] ml-2">
                {log.notes}
                </p>
            )}
          </div>
        </div>
      </div>
      <Edit2 size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors ml-2 relative z-10" />
    </div>
  );
};