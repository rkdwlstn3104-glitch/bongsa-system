
import React, { useState, useMemo } from 'react';
import type { Volunteer, Gender } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

interface VolunteerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  onAddVolunteer: (name: string, gender: Gender, isHouseToHouseOnly: boolean, canDoConvenienceStore: boolean) => void;
  onUpdateVolunteer: (volunteer: Volunteer) => void;
  onRemoveVolunteer: (volunteerId: string) => void;
}

const VolunteerManagementModal: React.FC<VolunteerManagementModalProps> = ({
  isOpen, onClose, volunteers, onAddVolunteer, onUpdateVolunteer, onRemoveVolunteer
}) => {
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('형제');
  const [isHouseToHouseOnly, setIsHouseToHouseOnly] = useState(false);
  const [canDoConvenienceStore, setCanDoConvenienceStore] = useState(false);

  // 전도인 목록을 이름 기준 오름차순(가나다 순)으로 정렬
  const sortedVolunteers = useMemo(() => {
    return [...volunteers].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  }, [volunteers]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddVolunteer(newName.trim(), newGender, isHouseToHouseOnly, canDoConvenienceStore);
      setNewName('');
      setNewGender('형제');
      setIsHouseToHouseOnly(false);
      setCanDoConvenienceStore(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold">전도인 관리</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border space-y-4">
            <h4 className="font-semibold text-lg">새 전도인 추가</h4>
            <div>
              <label htmlFor="volunteer-name" className="block text-sm font-medium text-gray-700">이름</label>
              <input
                id="volunteer-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="이름"
                className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">성별</label>
              <div className="mt-2 flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="형제"
                    checked={newGender === '형제'}
                    onChange={() => setNewGender('형제')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm">형제</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="자매"
                    checked={newGender === '자매'}
                    onChange={() => setNewGender('자매')}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                  />
                  <span className="text-sm">자매</span>
                </label>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHouseToHouseOnly}
                  onChange={(e) => setIsHouseToHouseOnly(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">호별 봉사만 가능</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDoConvenienceStore}
                  onChange={(e) => setCanDoConvenienceStore(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">편의점 봉사 가능</span>
              </label>
            </div>
            
            <div className="pt-2">
              <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center font-semibold">
                <PlusIcon className="h-5 w-5 mr-2" /> 추가하기
              </button>
            </div>
          </form>

          <h4 className="font-semibold text-lg mb-3">전도인 목록 ({sortedVolunteers.length}명)</h4>
          <ul className="space-y-2">
            {sortedVolunteers.map(v => (
              <li key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <span className={`w-12 text-center text-sm font-bold rounded-full px-2 py-1 ${v.gender === '자매' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                    {v.gender}
                  </span>
                  <span className="font-medium">{v.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="grid grid-cols-1 gap-x-2 gap-y-1">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!v.isHouseToHouseOnly}
                        onChange={(e) => onUpdateVolunteer({ ...v, isHouseToHouseOnly: e.target.checked })}
                        className="h-3 w-3 rounded text-blue-600"
                      />
                      <span className="text-[10px] whitespace-nowrap">호별만</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!v.canDoConvenienceStore}
                        onChange={(e) => onUpdateVolunteer({ ...v, canDoConvenienceStore: e.target.checked })}
                        className="h-3 w-3 rounded text-blue-600"
                      />
                      <span className="text-[10px] whitespace-nowrap">편의점</span>
                    </label>
                  </div>
                  <button onClick={() => onRemoveVolunteer(v.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full ml-1">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VolunteerManagementModal;
