import React, { useState, useEffect, useRef } from 'react';
import type { ServiceInstance, Volunteer } from '../types';
import CloseIcon from './icons/CloseIcon';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceInstance | null;
  onUpdateService: (updatedService: ServiceInstance) => void;
}

const PairingModal: React.FC<PairingModalProps> = ({ isOpen, onClose, service, onUpdateService }) => {
  const [unpairedVolunteers, setUnpairedVolunteers] = useState<Volunteer[]>([]);
  const [groups, setGroups] = useState<Volunteer[][]>([]);
  const [draggedVolunteer, setDraggedVolunteer] = useState<Volunteer | null>(null);
  
  const initializedServiceId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && service) {
      if (initializedServiceId.current !== service.id) {
        const savedPairs = service.pairs || [];
        const assignedIds = new Set(savedPairs.flat().map(v => v.id));
        
        setGroups(savedPairs);
        setUnpairedVolunteers(
          [...service.applicants]
            .filter(v => !assignedIds.has(v.id))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        initializedServiceId.current = service.id;
      }
    } else if (!isOpen) {
      initializedServiceId.current = null;
    }
  }, [service, isOpen]);

  const handleDragStart = (e: React.DragEvent, volunteer: Volunteer) => {
    setDraggedVolunteer(volunteer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnUnpaired = (e: React.DragEvent, targetVolunteer: Volunteer) => {
    e.preventDefault();
    if (!draggedVolunteer || draggedVolunteer.id === targetVolunteer.id) return;
    
    const targetGroupIdx = groups.findIndex(g => g.some(v => v.id === targetVolunteer.id));

    if (targetGroupIdx > -1) {
      if (groups[targetGroupIdx].length < 3) {
          handleDropOnGroup(e, targetGroupIdx);
      } else {
          alert("한 조에는 최대 3명까지만 편성할 수 있습니다.");
      }
    } else {
      setGroups(prev => [...prev, [draggedVolunteer, targetVolunteer]]);
      setUnpairedVolunteers(prev => prev.filter(v => v.id !== draggedVolunteer.id && v.id !== targetVolunteer.id));
    }
    setDraggedVolunteer(null);
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroupIndex: number) => {
    e.preventDefault();
    if (!draggedVolunteer) return;
    if (groups[targetGroupIndex].some(v => v.id === draggedVolunteer.id)) return;
    
    if (groups[targetGroupIndex].length >= 3) {
      alert("한 조에는 최대 3명까지만 편성할 수 있습니다.");
      return;
    }

    const newGroups = groups.map((g, i) => {
      let filtered = g.filter(v => v.id !== draggedVolunteer.id);
      if (i === targetGroupIndex) return [...filtered, draggedVolunteer];
      return filtered;
    }).filter(g => g.length > 0);

    setGroups(newGroups);
    setUnpairedVolunteers(prev => prev.filter(v => v.id !== draggedVolunteer.id));
    setDraggedVolunteer(null);
  };

  const handleDropToUnpairedList = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedVolunteer) return;

    const isAlreadyUnpaired = unpairedVolunteers.some(v => v.id === draggedVolunteer.id);
    if (isAlreadyUnpaired) return;

    setGroups(prev => prev.map(g => g.filter(v => v.id !== draggedVolunteer.id)).filter(g => g.length > 0));
    setUnpairedVolunteers(prev => [...prev, draggedVolunteer].sort((a, b) => a.name.localeCompare(b.name)));
    setDraggedVolunteer(null);
  };

  const handleUnpair = (groupIndex: number) => {
    setUnpairedVolunteers(prev => [...prev, ...groups[groupIndex]].sort((a, b) => a.name.localeCompare(b.name)));
    setGroups(prev => prev.filter((_, i) => i !== groupIndex));
  };

  const handleSave = () => {
    if (!service) return;
    onUpdateService({ ...service, pairs: groups });
    onClose();
  };

  const handleDownload = () => {
    if (!service) return;
    const { date, time, type, location } = service;
    const padCell = (text: string) => `"${text.padEnd(20)}"`;
    const header = `"봉사: ${date} ${time} (${location})"\n"종류: ${type}"\n\n${padCell("조")},${padCell("명단")}\n`;
    const rows = groups.map((g, i) => `${padCell((i+1) + "조")},${padCell(g.map(v => v.name).join(' '))}`).join('\n');
    const unpaired = unpairedVolunteers.length > 0 ? `\n${padCell("미지정")},${padCell(unpairedVolunteers.map(v => v.name).join(' '))}` : '';
    const blob = new Blob(['\uFEFF' + header + rows + unpaired], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${date}_호별짝조직.csv`;
    link.click();
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex justify-center items-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] flex flex-col overflow-hidden">
        <header className="p-4 sm:p-5 border-b flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">호별 짝 조직</h3>
            <p className="text-xs sm:text-base text-gray-500 font-bold">{service.date} {service.time} | {service.location}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400"/>
          </button>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col lg:flex-row">
          {/* 미지정 인원 영역 */}
          <div 
            className="w-full lg:w-80 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col h-48 lg:h-auto shrink-0"
            onDragOver={handleDragOver}
            onDrop={handleDropToUnpairedList}
          >
            <div className="p-3 sm:p-4 bg-gray-200 border-b border-gray-300 sticky top-0 z-10">
                <h4 className="font-black text-xs sm:text-sm text-gray-600 uppercase tracking-widest">미지정 인원 ({unpairedVolunteers.length})</h4>
            </div>
            <div className="flex-grow overflow-y-auto p-2 sm:p-4 flex flex-wrap gap-2 content-start">
              {unpairedVolunteers.map(v => (
                <div 
                  key={v.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, v)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnUnpaired(e, v)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 font-black cursor-grab active:scale-105 transition-all shadow-sm select-none text-sm sm:text-base ${
                    v.gender === '자매' ? 'bg-pink-100 border-pink-200 text-pink-700' : 'bg-blue-100 border-blue-200 text-blue-700'
                  }`}
                >
                  {v.name}
                </div>
              ))}
              {unpairedVolunteers.length === 0 && (
                <p className="text-center w-full py-6 text-gray-300 text-xs italic font-bold">배정 완료</p>
              )}
            </div>
          </div>

          {/* 편성된 조 영역 */}
          <div className="flex-grow p-3 sm:p-6 bg-white overflow-y-auto">
            <h4 className="font-black text-sm sm:text-lg text-gray-400 mb-3 sm:mb-6 uppercase tracking-tighter">편성된 조 ({groups.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
              {groups.map((group, idx) => (
                <div 
                  key={idx} 
                  onDragOver={handleDragOver} 
                  onDrop={(e) => handleDropOnGroup(e, idx)} 
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col gap-3 relative group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md uppercase">{idx+1}조</span>
                    <button onClick={() => handleUnpair(idx)} className="text-[10px] sm:text-xs text-red-500 font-black hover:underline opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">해제</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                    {group.map(v => (
                      <div 
                        key={v.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, v)}
                        className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 transition-transform ${
                          v.gender === '자매' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {v.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                  <div className="col-span-full py-10 sm:py-20 border-2 sm:border-4 border-dashed border-gray-100 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-gray-300 text-center px-4">
                      <p className="text-sm sm:text-xl font-black mb-1 sm:mb-2">아직 조가 없습니다.</p>
                      <p className="text-[10px] sm:text-sm font-bold">인원을 드래그하여 다른 인원 위에 놓으세요!</p>
                  </div>
              )}
            </div>
          </div>
        </div>

        <footer className="p-3 sm:p-5 border-t-2 border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
              <button 
                onClick={handleDownload} 
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all shadow-md text-sm sm:text-lg"
              >
                CSV 저장
              </button>
              <button 
                onClick={onClose} 
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-white border-2 border-gray-200 text-gray-500 font-black rounded-xl hover:bg-gray-100 text-sm sm:text-lg"
              >
                취소
              </button>
          </div>
          <button 
            onClick={handleSave} 
            className="w-full sm:w-auto px-10 sm:px-14 py-3 sm:py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg text-sm sm:text-lg order-1 sm:order-2"
          >
            저장하기
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PairingModal;