import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Smile, Meh, Frown, CheckCircle } from 'lucide-react';

export const Assessments: React.FC = () => {
  const { assessments, fetchAssessments, updateAssessmentItem } = useStore();

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-start mb-4">
             <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">라이브러리 | 현행 수준</div>
                <h2 className="text-lg font-bold text-gray-800 mt-1">강점 및 요구(Needs)</h2>
             </div>
             <div className="bg-gray-100 p-2 rounded-lg">
                <CheckCircle size={20} className="text-gray-400" />
             </div>
         </div>
         
         {assessments.map((assessment) => (
             <div key={assessment.id} className="space-y-6">
                 {assessment.items.map((item) => (
                     <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-gray-700 font-medium mb-3 text-sm leading-relaxed">
                            {item.text}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => updateAssessmentItem(assessment.id, item.id, 'good')}
                                className={`p-2 rounded-full transition-all ${item.status === 'good' ? 'bg-green-100 text-green-500 scale-110' : 'text-gray-300 hover:bg-gray-100'}`}
                            >
                                <Smile size={28} />
                            </button>
                            <button 
                                onClick={() => updateAssessmentItem(assessment.id, item.id, 'neutral')}
                                className={`p-2 rounded-full transition-all ${item.status === 'neutral' ? 'bg-yellow-100 text-yellow-500 scale-110' : 'text-gray-300 hover:bg-gray-100'}`}
                            >
                                <Meh size={28} />
                            </button>
                            <button 
                                onClick={() => updateAssessmentItem(assessment.id, item.id, 'bad')}
                                className={`p-2 rounded-full transition-all ${item.status === 'bad' ? 'bg-red-100 text-red-500 scale-110' : 'text-gray-300 hover:bg-gray-100'}`}
                            >
                                <Frown size={28} />
                            </button>
                        </div>
                     </div>
                 ))}
             </div>
         ))}
      </div>
    </div>
  );
};