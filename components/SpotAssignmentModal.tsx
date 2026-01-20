import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ServiceInstance, Volunteer } from '../types';
import CloseIcon from './icons/CloseIcon';

interface SpotAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceInstance | null;
  onUpdateService: (updatedService: ServiceInstance) => void;
}

const SPOTS = ['스팟A', '스팟B', '스팟C', '스팟D'];
const GROUPS = ['1조', '2조', '3조', '4조'];

const SpotAssignmentModal: React.FC<SpotAssignmentModalProps> = ({ isOpen, onClose, service, onUpdateService }) => {
  const [localAssignments, setLocalAssignments] = useState<Record<string, Volunteer[]>>({});
  const [draggedVolunteer, setDraggedVolunteer] = useState<{ v: Volunteer, fromKey?: string } | null>(null);
  
  const initializedServiceId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && service) {
      if (initializedServiceId.current !== service.id) {
        setLocalAssignments(service.assignments || {});
        initializedServiceId.current = service.id;
      }
    } else if (!isOpen) {
      initializedServiceId.current = null;
    }
  }, [service, isOpen]);

  const unassignedApplicants = useMemo(() => {
    if (!service) return [];
    const allAssigned = (Object.values(localAssignments) as Volunteer[][]).reduce((acc: Volunteer[], val: Volunteer[]) => acc.concat(val), [] as Volunteer[]);
    const assignedIds = new Set(allAssigned.map(v => v.id));
    return (service.applicants || []).filter(v => !assignedIds.has(v.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [service, localAssignments]);

  const handleDragStart = (e: React.DragEvent, volunteer: Volunteer, fromKey?: string) => {
    setDraggedVolunteer({ v: volunteer, fromKey });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnCell = (e: React.DragEvent, spot: string, group: string) => {
    e.preventDefault();
    if (!draggedVolunteer) return;

    const targetKey = `${spot}-${group}`;
    if (draggedVolunteer.fromKey === targetKey) {
        setDraggedVolunteer(null);
        return;
    }

    const currentCellPeople = localAssignments[targetKey] || [];
    if (currentCellPeople.length >= 3) {
        alert("한 셀에는 최대 3명까지만 배정할 수 있습니다.");
        setDraggedVolunteer(null);
        return;
    }

    const newAssignments = { ...localAssignments };
    if (draggedVolunteer.fromKey) {
        newAssignments[draggedVolunteer.fromKey] = (newAssignments[draggedVolunteer.fromKey] || []).filter(v => v.id !== draggedVolunteer.v.id);
    }
    newAssignments[targetKey] = [...(newAssignments[targetKey] || []), draggedVolunteer.v];
    
    setLocalAssignments(newAssignments);
    setDraggedVolunteer(null);
  };

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedVolunteer || !draggedVolunteer.fromKey) return;

    const newAssignments = { ...localAssignments };
    newAssignments[draggedVolunteer.fromKey] = (newAssignments[draggedVolunteer.fromKey] || []).filter(v => v.id !== draggedVolunteer.v.id);
    
    setLocalAssignments(newAssignments);
    setDraggedVolunteer(null);
  };

  const handleRemoveFromCell = (key: string, volunteerId: string) => {
    const newAssignments = { ...localAssignments };
    newAssignments[key] = (newAssignments[key] || []).filter(v => v.id !== volunteerId);
    setLocalAssignments(newAssignments);
  };

  const handleSave = () => {
    if (!service) return;
    onUpdateService({ ...service, assignments: localAssignments });
    onClose();
  };

  const handleDownload = () => {
    if (!service) return;
    const { date, time, location, comments } = service;
    const headerInfo = [`"봉사 일시: ${date} ${time}"`, `"장소: ${location}"`, ""].join('\n');
    const quoteCell = (text: string) => `"${text.trim()}"`;
    const tableHeader = ["조", ...SPOTS].map(quoteCell).join(',');
    const rows = GROUPS.map(group => {
      const rowData = SPOTS.map(spot => {
        const key = `${spot}-${group}`;
        const people = localAssignments[key] || [];
        const names = people.map(p => {
            const isOnlyDoorToDoor = !p.canDoPublicWitnessing && (service.type === '호별' || service.type === '전시대&호별');
            return p.name + (isOnlyDoorToDoor ? '(호)' : '');
        }).join(' ');
        return quoteCell(names);
      });
      return [quoteCell(group), ...rowData].join(',');
    });
    let commentSection = "";
    if (comments && comments.length > 0) {
      commentSection = ["", "", `"--- 봉사 댓글 (${comments.length}개) ---"`, ...comments.map(c => `"${c.authorName}: ${c.text.replace(/"/g, '""')} (${new Date(c.createdAt).toLocaleString('ko-KR')})"`)].join('\n');
    }
    const csvContent = [headerInfo, tableHeader, ...rows, commentSection].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${date.replace(/-/g, '')}_전시대조직_${location}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex justify-center items-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-w-[98vw] lg:max-w-7xl sm:max-h-[95vh] flex flex-col overflow-hidden text-[16px]">
        <header className="flex items-center justify-between p-3 sm:p-4 border-b bg-white border-gray-300 shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">전시대 조직 작성</h3>
            <p className="text-xs sm:text-base text-gray-500 font-bold">{service.date} {service.time} | {service.location}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <CloseIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
          </button>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col lg:flex-row">
          {/* 신청자 명단 영역 */}
          <div 
            className="w-full lg:w-80 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-300 flex flex-col h-48 lg:h-auto shrink-0"
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
          >
            <div className="p-2 sm:p-4 bg-gray-200 border-b border-gray-300 flex justify-between items-center sticky top-0 z-10">
                <h4 className="font-black text-xs sm:text-sm text-gray-600 uppercase tracking-widest">신청자 ({unassignedApplicants.length})</h4>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500"><span className="w-2 h-2 bg-blue-200 border border-blue-300 rounded-full"></span>형</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500"><span className="w-2 h-2 bg-pink-200 border border-pink-300 rounded-full"></span>자</span>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-2 sm:p-4 flex flex-wrap gap-2 sm:gap-3 content-start">
              {unassignedApplicants.map(v => {
                const isOnlyDoorToDoor = !v.canDoPublicWitnessing && (service.type === '호별' || service.type === '전시대&호별');
                return (
                  <div
                    key={v.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, v)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl border-2 shadow-sm cursor-grab active:cursor-grabbing font-black transition-all text-sm sm:text-base select-none ${
                        v.gender === '자매' 
                          ? 'bg-pink-100 border-pink-200 text-pink-800' 
                          : 'bg-blue-100 border-blue-200 text-blue-800'
                    }`}
                  >
                    {v.name}{isOnlyDoorToDoor ? '(호)' : ''}
                  </div>
                );
              })}
              {unassignedApplicants.length === 0 && (
                <div className="w-full text-center py-4 text-gray-400 text-xs italic font-medium">배정 완료</div>
              )}
            </div>
          </div>

          {/* 조직표 영역 */}
          <div className="flex-grow overflow-auto p-2 sm:p-6 bg-white">
            <div className="min-w-full inline-block align-middle">
              <table className="w-full border-collapse border-[2px] border-black text-center table-fixed shadow-sm">
                <thead>
                  <tr className="bg-gray-100 font-black">
                    <th className="border-[1.5px] border-black p-2 sm:p-4 w-12 sm:w-20 text-sm sm:text-lg bg-gray-200">조</th>
                    {SPOTS.map(spot => (
                      <th key={spot} className="border-[1.5px] border-black p-2 sm:p-4 text-sm sm:text-lg">
                        {spot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map(group => (
                    <tr key={group} className="min-h-24 sm:min-h-40 font-black">
                      <td className="border-[1.5px] border-black p-2 sm:p-4 bg-gray-100 text-sm sm:text-lg">
                        {group}
                      </td>
                      {SPOTS.map(spot => {
                        const cellKey = `${spot}-${group}`;
                        const assignedPeople = localAssignments[cellKey] || [];
                        return (
                          <td 
                            key={cellKey}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnCell(e, spot, group)}
                            className={`border-[1.5px] border-black p-1 sm:p-2 relative group bg-white min-w-[80px] sm:min-w-[120px]`}
                            style={{ height: 'auto', minHeight: '100px' }}
                          >
                            <div className="w-full min-h-[80px] flex flex-col justify-start items-center gap-1 sm:gap-2 pt-1">
                              {assignedPeople.map(p => {
                                const isOnlyDoorToDoor = !p.canDoPublicWitnessing && (service.type === '호별' || service.type === '전시대&호별');
                                return (
                                  <div 
                                    key={p.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, p, cellKey)}
                                    className={`w-full max-w-[110px] py-1.5 sm:py-2.5 rounded-md sm:rounded-lg border-[1.5px] shadow-sm cursor-grab active:cursor-grabbing flex items-center justify-between px-1 sm:px-2 gap-1 transition-all ${
                                        p.gender === '자매' ? 'bg-pink-50 border-pink-200 text-pink-900' : 'bg-blue-50 border-blue-200 text-blue-900'
                                    }`}
                                  >
                                    <span className="text-xs sm:text-sm truncate">{p.name}{isOnlyDoorToDoor ? '(호)' : ''}</span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleRemoveFromCell(cellKey, p.id); }}
                                      className="text-gray-400 hover:text-red-600"
                                    >
                                      <CloseIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                  </div>
                                );
                              })}
                              {assignedPeople.length === 0 && (
                                <div className="h-10 sm:h-20 w-full border border-dashed border-gray-100 rounded-lg"></div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="p-3 sm:p-5 border-t-2 border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
              <button
                onClick={handleDownload}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-md flex items-center justify-center gap-2 text-sm sm:text-lg"
              >
                CSV 다운
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

export default SpotAssignmentModal;