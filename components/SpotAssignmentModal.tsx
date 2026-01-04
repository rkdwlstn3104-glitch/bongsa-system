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
  
  // 현재 모달에서 편집 중인 봉사의 ID를 추적하여 배경 업데이트 시 초기화 방지
  const initializedServiceId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && service) {
      // 모달이 새로 열렸거나, 다른 봉사 데이터가 들어온 경우에만 초기화
      if (initializedServiceId.current !== service.id) {
        setLocalAssignments(service.assignments || {});
        initializedServiceId.current = service.id;
      }
    } else if (!isOpen) {
      // 모달이 닫히면 초기화 상태 리셋
      initializedServiceId.current = null;
    }
    // 의존성 배열에서 service를 제거하지 않고, 내부 로직으로 초기화 시점 제어
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
    
    // CSV 헤더 정보 (인코딩 문제 방지를 위해 큰따옴표 활용)
    const headerInfo = [
      `"봉사 일시: ${date} ${time}"`,
      `"장소: ${location}"`,
      ""
    ].join('\n');
    
    // 헤더 및 셀 데이터를 지정된 너비(20자)로 패딩하는 헬퍼 함수
    const padCell = (text: string) => `"${text.padEnd(20)}"`;
    
    const tableHeader = ["조", ...SPOTS].map(padCell).join(',');
    
    // 데이터 행 생성
    const rows = GROUPS.map(group => {
      const rowData = SPOTS.map(spot => {
        const key = `${spot}-${group}`;
        const people = localAssignments[key] || [];
        // 이름을 공백 2개로 구분하고 20자 너비로 패딩
        const names = people.map(p => p.name).join('  ');
        return padCell(names);
      });
      return [padCell(group), ...rowData].join(',');
    });

    // 댓글 섹션 추가
    let commentSection = "";
    if (comments && comments.length > 0) {
      commentSection = [
        "",
        "",
        `"--- 봉사 댓글 (${comments.length}개) ---"`,
        ...comments.map(c => `"${c.authorName}: ${c.text.replace(/"/g, '""')} (${new Date(c.createdAt).toLocaleString('ko-KR')})"`)
      ].join('\n');
    }

    const csvContent = [headerInfo, tableHeader, ...rows, commentSection].join('\n');
    
    // UTF-8 BOM 추가하여 엑셀에서 한글 깨짐 방지
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
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] lg:max-w-7xl max-h-[95vh] flex flex-col overflow-hidden text-[16px]">
        <header className="flex items-center justify-between p-4 border-b bg-white border-gray-300">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">전시대 조직 작성</h3>
            <p className="text-base text-gray-500 font-bold">{service.date} {service.time} | {service.location}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <CloseIcon className="h-8 w-8 text-gray-400" />
          </button>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col lg:flex-row">
          <div 
            className="w-full lg:w-80 bg-gray-50 border-r border-gray-300 flex flex-col shrink-0"
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
          >
            <div className="p-4 bg-gray-200 border-b border-gray-300 flex justify-between items-center sticky top-0 z-10">
                <h4 className="font-black text-sm text-gray-600 uppercase tracking-widest">신청자 명단 ({unassignedApplicants.length})</h4>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500"><span className="w-2.5 h-2.5 bg-blue-200 border border-blue-300 rounded-full"></span>형제</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500"><span className="w-2.5 h-2.5 bg-pink-200 border border-pink-300 rounded-full"></span>자매</span>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 flex flex-wrap gap-3 content-start">
              {unassignedApplicants.map(v => (
                <div
                  key={v.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, v)}
                  className={`px-4 py-2.5 rounded-xl border-2 shadow-sm cursor-grab active:cursor-grabbing font-black transition-all hover:scale-110 select-none ${
                      v.gender === '자매' 
                        ? 'bg-pink-100 border-pink-200 text-pink-800 hover:border-pink-400' 
                        : 'bg-blue-100 border-blue-200 text-blue-800 hover:border-blue-400'
                  }`}
                >
                  {v.name}
                </div>
              ))}
              {unassignedApplicants.length === 0 && (
                <div className="w-full text-center py-10 text-gray-400 text-sm italic font-medium">모든 인원이 배정되었습니다.</div>
              )}
            </div>
          </div>

          <div className="flex-grow overflow-auto p-6 bg-white">
            <div className="min-w-full inline-block align-middle">
              <table className="w-full border-collapse border-[3px] border-black text-center table-fixed shadow-md">
                <thead>
                  <tr className="bg-gray-100 font-black">
                    <th className="border-[2.5px] border-black p-5 w-28 text-xl bg-gray-200">조</th>
                    {SPOTS.map(spot => (
                      <th key={spot} className="border-[2.5px] border-black p-5 text-xl">
                        {spot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map(group => (
                    <tr key={group} className="min-h-40 font-black">
                      <td className="border-[2.5px] border-black p-5 bg-gray-100 text-xl">
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
                            className={`border-[2.5px] border-black p-3 relative group hover:bg-blue-50/40 transition-colors bg-white min-w-[150px]`}
                            style={{ height: '160px' }}
                          >
                            <div className="w-full h-full flex flex-col justify-center items-center gap-3">
                              {assignedPeople.map(p => (
                                <div 
                                  key={p.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, p, cellKey)}
                                  className={`w-full max-w-[140px] py-3 rounded-xl border-[2.5px] shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center gap-2 transition-all hover:scale-105 ${
                                      p.gender === '자매' ? 'bg-pink-100 border-pink-300 text-pink-900' : 'bg-blue-100 border-blue-300 text-blue-900'
                                  }`}
                                >
                                  {p.name}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveFromCell(cellKey, p.id); }}
                                    className="text-gray-400 hover:text-red-600 p-1"
                                  >
                                    <CloseIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              ))}
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

        <footer className="p-5 border-t-2 border-gray-100 bg-white flex justify-end gap-4 items-center">
          <button
            onClick={handleDownload}
            className="px-8 py-3.5 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-xl flex items-center gap-3 text-lg"
          >
            CSV 다운로드
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3.5 bg-white border-2 border-gray-300 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-colors text-lg"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-14 py-3.5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-2xl transition-all text-lg"
          >
            저장
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SpotAssignmentModal;