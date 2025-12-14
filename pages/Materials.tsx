import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Play, FileText, Image as ImageIcon } from 'lucide-react';

export const Materials: React.FC = () => {
  const { materials, fetchMaterials } = useStore();

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-bold text-gray-800">학습 자료실</h2>
        <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{materials.length}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {materials.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
                <div className="relative h-32 bg-gray-200">
                    <img src={item.image_uri} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-gray-800 shadow-lg">
                            {item.type === 'video' ? <Play size={20} fill="currentColor" /> : item.type === 'worksheet' ? <FileText size={20} /> : <ImageIcon size={20} />}
                        </div>
                    </div>
                </div>
                <div className="p-3">
                    <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wide">{item.type}</span>
                    <h3 className="font-bold text-gray-800 text-sm mt-1 leading-snug">{item.title}</h3>
                </div>
            </div>
        ))}
        
        {/* Add New Card */}
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 text-gray-400 gap-2 min-h-[180px]">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xl">+</span>
            </div>
            <span className="text-xs font-bold">업로드</span>
        </div>
      </div>
    </div>
  );
};