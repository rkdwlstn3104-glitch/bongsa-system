
import React, { useState, useEffect } from 'react';
import type { ServiceInstance, Volunteer } from '../types';
import CloseIcon from './icons/CloseIcon';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceInstance | null;
}

const PairingModal: React.FC<PairingModalProps> = ({ isOpen, onClose, service }) => {
  const [unpairedVolunteers, setUnpairedVolunteers] = useState<Volunteer[]>([]);
  const [groups, setGroups] = useState<Volunteer[][]>([]);
  const [draggedVolunteer, setDraggedVolunteer] = useState<Volunteer | null>(null);

  useEffect(() => {
    if (service) {
      setUnpairedVolunteers([...service.applicants].sort((a,b) => a.name.localeCompare(b.name)));
      setGroups([]); // Reset groups when service changes or modal opens
    }
  }, [service]);

  const handleDragStart = (e: React.DragEvent, volunteer: Volunteer) => {
    setDraggedVolunteer(volunteer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDropOnUnpaired = (e: React.DragEvent, targetVolunteer: Volunteer) => {
    e.preventDefault();
    if (!draggedVolunteer || draggedVolunteer.id === targetVolunteer.id) {
      setDraggedVolunteer(null);
      return;
    }

    const newGroup: Volunteer[] = [draggedVolunteer, targetVolunteer];
    setGroups(prev => [...prev, newGroup]);

    setUnpairedVolunteers(prev => prev.filter(v => v.id !== draggedVolunteer!.id && v.id !== targetVolunteer.id));

    setDraggedVolunteer(null);
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroupIndex: number) => {
    e.preventDefault();
    if (!draggedVolunteer) return;

    const targetGroup = groups[targetGroupIndex];
    if (targetGroup.length >= 3) {
      setDraggedVolunteer(null);
      return;
    }
    
    if (unpairedVolunteers.find(v => v.id === draggedVolunteer.id)) {
        const updatedGroup = [...targetGroup, draggedVolunteer];
        setGroups(prev => prev.map((group, index) => index === targetGroupIndex ? updatedGroup : group));
        
        setUnpairedVolunteers(prev => prev.filter(v => v.id !== draggedVolunteer.id));

        setDraggedVolunteer(null);
    }
  };
  
  const handleDragEnd = () => {
      setDraggedVolunteer(null);
  };

  const handleUnpair = (groupIndex: number) => {
    const groupToUnpair = groups[groupIndex];
    setUnpairedVolunteers(prev => [...prev, ...groupToUnpair].sort((a, b) => a.name.localeCompare(b.name)));
    setGroups(prev => prev.filter((_, index) => index !== groupIndex));
  };
  
  const handleDownload = () => {
    if (!service) return;

    const { date, time, type, location, comments } = service;

    const formatVolunteerNameForCsv = (volunteer: Volunteer) => {
        if (type === '전시대&호별' && !volunteer.canDoPublicWitnessing) {
            return `${volunteer.name}(호)`;
        }
        return volunteer.name;
    };
    
    const header = [
      `"봉사 일시: ${date} ${time}"`,
      `"봉사 종류: ${type}"`,
      `"봉사 장소: ${location}"`,
    ].join('\n');

    const pairedContent = groups.map((group, index) => {
        const groupNames = group.map(formatVolunteerNameForCsv).join('  ');
        return [index + 1 + '조', `"${groupNames}"`].join(',');
    }).join('\n');
    
    const unpaired = unpairedVolunteers;
    const unpairedContent = unpaired.length > 0 ? 
        '미지정,' + unpaired.map(v => `"${formatVolunteerNameForCsv(v)}"`).join(',') : '';

    const sortedComments = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const commentsHeader = '작성자,내용,작성일시';
    const commentsData = sortedComments.map(c => {
        const author = `"${c.authorName}"`;
        const text = `"${c.text.replace(/"/g, '""')}"`; // Escape double quotes
        const createdAt = `"${new Date(c.createdAt).toLocaleString('ko-KR')}"`;
        return [author, text, createdAt].join(',');
    }).join('\n');

    const commentsSection = comments.length > 0
      ? [
          '댓글',
          commentsHeader,
          commentsData,
        ].join('\n')
      : '';

    const csvContent = [
        header,
        '',
        '짝,봉사짝',
        pairedContent,
        '',
        unpairedContent,
        '',
        commentsSection
    ].filter(Boolean).join('\n');
    
    // BOM to support Korean characters in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${date}_${type}_봉사조.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-xl font-bold">짝 구성 및 명단 다운로드</h3>
            <p className="text-sm text-gray-600">{service.date} {service.time} - {service.type}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Unpaired Volunteers */}
          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <h4 className="font-semibold mb-3 text-center border-b pb-2">미지정 전도인 ({unpairedVolunteers.length}명)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {unpairedVolunteers.map(v => (
                <div
                  key={v.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, v)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnUnpaired(e, v)}
                  className={`p-2 rounded-md border text-center cursor-grab ${draggedVolunteer?.id === v.id ? 'opacity-50' : ''} ${
                    v.gender === '형제' ? 'bg-blue-100 border-blue-200' : 'bg-pink-100 border-pink-200'
                  }`}
                >
                  {v.name}
                  {service.type === '전시대&호별' && !v.canDoPublicWitnessing && (
                    <span className="ml-1 text-xs text-red-600 font-semibold">(호별만)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Paired */}
          <div className="bg-green-50 p-4 rounded-lg md:col-span-1">
            <h4 className="font-semibold mb-3 text-center border-b pb-2">결성된 짝 ({groups.length}조)</h4>
            <div className="space-y-3">
              {groups.map((group, index) => (
                <div 
                    key={index}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnGroup(e, index)}
                    className="bg-white p-3 rounded-lg shadow-sm border flex items-center justify-between"
                >
                    <div>
                    <p className="font-bold">{index + 1}조</p>
                    <p className="text-sm">
                        {group.map((member, memberIndex) => {
                            const isDoorOnly = service.type === '전시대&호별' && !member.canDoPublicWitnessing;
                            return (
                                <React.Fragment key={member.id}>
                                    {member.name}
                                    {isDoorOnly && <span className="text-xs text-red-600 font-semibold"> (호별만)</span>}
                                    {memberIndex < group.length - 1 && ' & '}
                                </React.Fragment>
                            );
                        })}
                    </p>
                    </div>
                    <button onClick={() => handleUnpair(index)} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                    해제
                    </button>
                </div>
              ))}
              {unpairedVolunteers.length === 1 && (
                 <div className="bg-white p-3 rounded-lg shadow-sm border text-center text-gray-600">
                    <p>
                        미지정: {unpairedVolunteers[0].name}
                        {service.type === '전시대&호별' && !unpairedVolunteers[0].canDoPublicWitnessing && (
                            <span className="ml-1 text-xs text-red-600 font-semibold">(호별만)</span>
                        )}
                    </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="p-4 border-t flex justify-end">
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            스프레드시트 다운로드
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PairingModal;
