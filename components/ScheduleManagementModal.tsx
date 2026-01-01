
import React, { useState, useEffect } from 'react';
import type { ServiceSchedule } from '../types';
import { ServiceType } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';

interface ScheduleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ServiceSchedule[];
  onSave: (schedule: ServiceSchedule) => void;
  onRemove: (scheduleId: string) => void;
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const initialFormState: Omit<ServiceSchedule, 'id'> = {
  dayOfWeek: 0,
  time: '',
  leader: '',
  phoneNumber: '',
  type: '호별',
  location: '',
  deadlineDayOffset: 1,
  deadlineTime: '18:00',
};

const formatDeadlineTime = (timeInput: string): string => {
    if (!timeInput || typeof timeInput !== 'string') return '00:00';
    if (/^\d{2}:\d{2}$/.test(timeInput)) return timeInput; // Already correct
    try {
        const date = new Date(timeInput);
        if (isNaN(date.getTime())) return '00:00'; // Invalid date
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
        return '00:00';
    }
};

const ScheduleManagementModal: React.FC<ScheduleManagementModalProps> = ({
  isOpen, onClose, schedules, onSave, onRemove
}) => {
  // FIX: Corrected Omit to not have duplicate 'id' key.
  const [formData, setFormData] = useState<Omit<ServiceSchedule, 'id'>>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormState);
      setEditingId(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['dayOfWeek', 'deadlineDayOffset'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? parseInt(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: editingId ?? undefined });
    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleEdit = (schedule: ServiceSchedule) => {
    setEditingId(schedule.id ?? null);
    const { id, ...data } = schedule;
    setFormData({
      ...data,
      deadlineTime: formatDeadlineTime(data.deadlineTime)
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const sortedSchedules = [...schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold">요일별 봉사 목록 관리</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border space-y-4">
            <h4 className="font-semibold text-lg mb-2">{editingId ? '봉사 수정' : '새 봉사 추가'}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">요일</label>
                <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  {WEEKDAYS.map((day, index) => <option key={index} value={index}>{day}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">시간</label>
                <input type="text" name="time" value={formData.time} onChange={handleInputChange} placeholder="예: 오후 1:30-4:00" className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700">종류</label>
                <select name="type" value={formData.type} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="호별">호별</option>
                  <option value="전시대">전시대</option>
                  <option value="전시대&호별">전시대&호별</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">장소</label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="예: 왕국회관" className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">인도자</label>
                <input type="text" name="leader" value={formData.leader} onChange={handleInputChange} placeholder="이름" className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">연락처</label>
                <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="010-1234-5678" className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">마감 설정</label>
                <div className="flex items-center mt-1 space-x-2">
                    <select name="deadlineDayOffset" value={formData.deadlineDayOffset} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value={0}>봉사 당일</option>
                        <option value={1}>봉사 1일 전</option>
                    </select>
                    <input 
                        type="time" 
                        name="deadlineTime" 
                        value={formData.deadlineTime} 
                        onChange={handleInputChange} 
                        className="block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                        required 
                    />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              {editingId && <button type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>}
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center">
                <PlusIcon className={`h-5 w-5 mr-1 ${editingId ? 'hidden' : 'inline'}`} />
                {editingId ? '수정하기' : '추가하기'}
              </button>
            </div>
          </form>

          <h4 className="font-semibold text-lg mb-2">봉사 목록</h4>
          <div className="space-y-3">
            {sortedSchedules.map(s => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold">{WEEKDAYS[s.dayOfWeek]} {s.time}</p>
                    <p className="text-sm text-gray-600">{s.type} @ {s.location} (인도자: {s.leader})</p>
                    <p className="text-xs text-gray-500 mt-1">마감: {s.deadlineDayOffset}일 전 {formatDeadlineTime(s.deadlineTime)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(s)} className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded-full">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => onRemove(s.id!)} className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-full">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagementModal;
