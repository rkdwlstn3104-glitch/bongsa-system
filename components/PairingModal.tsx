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
    
    // 타겟이 이미 그룹에 속해있는지 확인
    const targetGroupIdx = groups.findIndex(g => g.some(v => v.id === targetVolunteer.id));

    if (targetGroupIdx > -1) {
      // 타겟이 이미 조에 있다면 그 조에 합류 (최대 3인)
      if (groups[targetGroupIdx].length < 3) {
          handleDropOnGroup(e, targetGroupIdx);
      } else {
          alert("한 조에는 최대 3명까지만 편성할 수 있습니다.");
      }
    } else {
      // 타겟이 미지정이라면 새로운 조 생성
      setGroups(prev => [...prev, [draggedVolunteer, targetVolunteer]]);
      setUnpairedVolunteers(prev => prev.filter(v => v.id !== draggedVolunteer.id && v.id !== targetVolunteer.id));
    }
    setDraggedVolunteer(null);
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroupIndex: number) => {
    e.preventDefault();
    if (!draggedVolunteer) return;
    
    // 이미 해당 조에 있는지 확인
    if (groups[targetGroupIndex].some(v => v.id === draggedVolunteer.id)) return;
    
    if (groups[targetGroupIndex].length >= 3) {
      alert("한 조에는 최대 3명까지만 편성할 수 있습니다.");
      return;
    }

    // 다른 조에서 이동해오는 경우 처리
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

    // 그룹에서 제거하여 미지정 목록으로 이동
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
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <header className="p-5 border-b flex justify-between items-center bg-white">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">호별 짝 조직</h3>
            <p className="text-base text-gray-500 font-bold">{service.date} {service.time} | {service.location}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon className="h-8 w-8 text-gray-400"/>
          </button>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col lg:flex-row">
          {/* 미지정 인원 목록 */}
          <div 
            className="w-full lg:w-80 bg-gray-50 border-r border-gray-200 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={handleDropToUnpairedList}
          >
            <div className="p-4 bg-gray-200 border-b border-gray-300">
                <h4 className="font-black text-sm text-gray-600 uppercase tracking-widest">미지정 인원 ({unpairedVolunteers.length})</h4>
            </div>
            <div className="flex-grow overflow-y-auto p-4 flex flex-wrap gap-2 content-start">
              {unpairedVolunteers.map(v => (
                <div 
                  key={v.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, v)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnUnpaired(e, v)}
                  className={`px-4 py-2 rounded-xl border-2 font-black cursor-grab active:scale-105 transition-all shadow-sm select-none hover:border-gray-400 ${
                    v.gender === '자매' ? 'bg-pink-100 border-pink-200 text-pink-700' : 'bg-blue-100 border-blue-200 text-blue-700'
                  }`}
                >
                  {v.name}
                </div>
              ))}
              {unpairedVolunteers.length === 0 && (
                <p className="text-center w-full py-10 text-gray-300 text-sm italic font-bold">모든 인원이 배정되었습니다.</p>
              )}
            </div>
          </div>

          {/* 편성된 조 목록 */}
          <div className="flex-grow p-6 bg-white overflow-y-auto">
            <h4 className="font-black text-lg text-gray-400 mb-6 uppercase tracking-tighter">편성된 조 목록 ({groups.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group, idx) => (
                <div 
                  key={idx} 
                  onDragOver={handleDragOver} 
                  onDrop={(e) => handleDropOnGroup(e, idx)} 
                  className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col gap-4 relative group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg uppercase">{idx+1}조</span>
                    <button onClick={() => handleUnpair(idx)} className="text-xs text-red-500 font-black hover:underline opacity-0 group-hover:opacity-100 transition-opacity">해제</button>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {group.map(v => (
                      <div 
                        key={v.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, v)}
                        className={`px-4 py-3 rounded-xl font-black text-sm shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform ${
                          v.gender === '자매' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {v.name}
                      </div>
                    ))}
                    {group.length < 3 && (
                        <div className="w-full h-12 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-300 font-bold italic">
                            + 드래그하여 추가
                        </div>
                    )}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                  <div className="col-span-full py-20 border-4 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-gray-300">
                      <p className="text-xl font-black mb-2">아직 편성된 조가 없습니다.</p>
                      <p className="font-bold">왼쪽 명단에서 전도인을 드래그하여 다른 전도인 위에 놓으세요!</p>
                  </div>
              )}
            </div>
          </div>
        </div>

        <footer className="p-5 border-t-2 border-gray-100 bg-white flex justify-end gap-4">
          <button 
            onClick={handleDownload} 
            className="px-8 py-3.5 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-lg text-lg"
          >
            CSV 다운로드
          </button>
          <button 
            onClick={onClose} 
            className="px-8 py-3.5 bg-white border-2 border-gray-300 text-gray-500 font-black rounded-2xl hover:bg-gray-100 transition-all text-lg"
          >
            취소
          </button>
          <button 
            onClick={handleSave} 
            className="px-14 py-3.5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-2xl transition-all text-lg active:scale-95"
          >
            저장
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PairingModal;