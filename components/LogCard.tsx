import React from 'react';
import { ObservationLog, PromptLevel } from '../types';
import { Edit2, Paperclip, MessageSquare } from 'lucide-react';

interface LogCardProps {
  log: ObservationLog;
  onClick: (log: ObservationLog) => void;
}

export const LogCard: React.FC<LogCardProps> = ({ log, onClick }) => {
  const value = log.value ?? log.accuracy ?? 0;

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
    if (level === 'verbal') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (level === 'physical') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getValueColorClass = (val: number) => {
    if (val >= 80) return 'bg-green-50 text-green-600';
    if (val >= 50) return 'bg-yellow-50 text-yellow-600';
    return 'bg-red-50 text-red-500';
  };

  return (
    <button 
      onClick={() => onClick(log)}
      className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between active:scale-[0.99] hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4 w-full">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold relative overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${getValueColorClass(value)}`}>
          {log.media_uri && (
            <img src={log.media_uri} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-lg">{value}</span>
            <span className="text-[9px] opacity-70">%</span>
          </div>
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getPromptColor(log.promptLevel)}`}>
              {getPromptLabel(log.promptLevel)}
            </span>
            {log.media_uri && (
              <span className="bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold">
                <Paperclip size={10} />
                자료
              </span>
            )}
            {log.notes && (
              <span className="bg-orange-50 text-orange-500 border border-orange-100 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold">
                <MessageSquare size={10} />
                메모
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 font-medium">
            {new Date(log.timestamp).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
          </div>
          {log.notes && (
            <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
              {log.notes}
            </p>
          )}
        </div>
      </div>
      <Edit2 size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  );
};