
import React, { useState, useEffect } from 'react';
import type { ServiceInstance, ServiceFormData } from '../types';

interface ServiceFormProps {
  initialData?: ServiceInstance;
  onSave: (data: ServiceFormData) => void;
  onCancel: () => void;
  serviceDate: Date;
}

// This function is used for validating the time format.
function parseStartTime(timeString: string): { hours: number, minutes: number } | null {
    const timePart = timeString.split('-')[0].trim();
    const regex = /(오전|오후|저녁)?\s*(\d{1,2}):(\d{2})/;
    const match = timePart.match(regex);

    if (!match) return null;

    let [, period, hoursStr, minutesStr] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (hours === 12) { // Handle 12 AM/PM
        if (period === '오전') hours = 0; // 12 AM is 00 hours
    } else if (period === '오후' || period === '저녁') {
        hours += 12;
    }
    
    return { hours, minutes };
}

// Helper function to format deadline time for the input[type=time]
const formatDeadlineTimeForInput = (timeInput: string): string => {
    if (!timeInput || typeof timeInput !== 'string') return '18:00';
    // Check if it's already in HH:mm format
    if (/^\d{2}:\d{2}$/.test(timeInput)) {
        return timeInput;
    }
    try {
        // Handles cases where Google Sheets might return a full date/ISO string
        const date = new Date(timeInput);
        if (isNaN(date.getTime())) {
            return '18:00'; // Return default if parsing fails
        }
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        return '18:00'; // Return default on error
    }
};

const ServiceForm: React.FC<ServiceFormProps> = ({ initialData, onSave, onCancel, serviceDate }) => {
  const [formData, setFormData] = useState<ServiceFormData>({
    time: '',
    leader: '',
    phoneNumber: '',
    type: '호별',
    location: '',
    deadlineDayOffset: 1,
    deadlineTime: '18:00',
  });

  useEffect(() => {
    if (initialData) {
      const { time, leader, phoneNumber, type, location, deadlineDayOffset, deadlineTime } = initialData;
      setFormData({ time, leader, phoneNumber, type, location, deadlineDayOffset, deadlineTime: formatDeadlineTimeForInput(deadlineTime) });
    } else {
      // Reset to defaults for a new form
      setFormData({
        time: '',
        leader: '',
        phoneNumber: '',
        type: '호별',
        location: '',
        deadlineDayOffset: 1,
        deadlineTime: '18:00',
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['deadlineDayOffset'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? parseInt(value) : value as any }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseStartTime(formData.time)) {
        alert("시간 형식이 올바르지 않습니다. (예: 오후 1:30-4:00)");
        return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4 animate-fade-in">
        <h4 className="font-semibold text-lg">{initialData ? '봉사 수정' : '새 봉사 추가'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
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
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">저장</button>
        </div>
    </form>
  );
};

export default ServiceForm;
