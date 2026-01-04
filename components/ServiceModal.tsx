import React, { useState, useMemo } from 'react';
import type { ServiceInstance, Volunteer, ServiceFormData, ServiceSchedule, Comment } from '../types';
import { UserRole } from '../types';
import CloseIcon from './icons/CloseIcon';
import UserIcon from './icons/UserIcon';
import ClockIcon from './icons/ClockIcon';
import ServiceForm from './ServiceForm';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import PairingModal from './PairingModal';
import SpotAssignmentModal from './SpotAssignmentModal';
import UsersIcon from './icons/UsersIcon';
import MapPinIcon from './icons/MapPinIcon';

function formatDeadlineTime(timeInput: any): string {
  if (!timeInput) return '00:00';
  if (typeof timeInput === 'string' && /^\d{2}:\d{2}$/.test(timeInput)) return timeInput;
  try {
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) return '00:00';
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch (e) {
    return '00:00';
  }
}

const CommentSection: React.FC<{
    serviceId: string;
    comments: Comment[];
    currentUser: Volunteer;
    onAddComment: (serviceId: string, text: string) => void;
    onUpdateComment: (serviceId: string, commentId: string, newText: string) => void;
    onDeleteComment: (serviceId: string, commentId: string) => void;
}> = ({ serviceId, comments, currentUser, onAddComment, onUpdateComment, onDeleteComment }) => {
    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    const handleAddComment = () => {
        if (newComment.trim()) {
            onAddComment(serviceId, newComment.trim());
            setNewComment('');
        }
    };

    const handleSaveEdit = () => {
        if (editingCommentId && editingText.trim()) {
            onUpdateComment(serviceId, editingCommentId, editingText.trim());
            setEditingCommentId(null);
            setEditingText('');
        }
    };

    const sortedComments = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="font-semibold text-sm mb-3 flex items-center text-gray-700">
                <ChatBubbleIcon className="h-4 w-4 mr-2 text-gray-500" />
                댓글 ({comments.length})
            </h5>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 mb-4">
                {sortedComments.map(comment => (
                    <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-gray-900">{comment.authorName}</p>
                            {currentUser.id === comment.authorId && editingCommentId !== comment.id && (
                                <div className="flex items-center space-x-1">
                                    <button onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.text); }} className="p-1 text-gray-400 hover:text-blue-600"><PencilIcon className="h-3.5 w-3.5"/></button>
                                    <button onClick={() => onDeleteComment(serviceId, comment.id)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-3.5 w-3.5"/></button>
                                </div>
                            )}
                        </div>
                        {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                    rows={2}
                                />
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 text-xs bg-gray-200 rounded">취소</button>
                                    <button onClick={handleSaveEdit} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">저장</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(comment.createdAt).toLocaleString('ko-KR')}
                        </p>
                    </div>
                ))}
            </div>
             <div className="flex gap-2">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글 입력..."
                    className="flex-grow p-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    rows={1}
                />
                <button
                    onClick={handleAddComment}
                    className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                    disabled={!newComment.trim()}
                >
                    작성
                </button>
            </div>
        </div>
    );
};

const VolunteerServiceCard: React.FC<{ 
    service: ServiceInstance; 
    currentUser: Volunteer; 
    onApply: (serviceId: string) => void; 
    onCancel: (serviceId: string) => void;
    onAddComment: (serviceId: string, text: string) => void;
    onUpdateComment: (serviceId: string, commentId: string, newText: string) => void;
    onDeleteComment: (serviceId: string, commentId: string) => void;
}> = ({ service, currentUser, onApply, onCancel, onAddComment, onUpdateComment, onDeleteComment }) => {
    
    const isApplied = service.applicants.some(v => v.id === currentUser.id);
    const canApplyForPublic = service.type === '전시대' ? currentUser.canDoPublicWitnessing : true;

    const [year, month, day] = service.date.split('-').map(Number);
    const serviceDate = new Date(year, month - 1, day);
    const deadline = new Date(serviceDate);
    deadline.setDate(serviceDate.getDate() - service.deadlineDayOffset);
    const formattedTime = formatDeadlineTime(service.deadlineTime);
    const [hours, minutes] = (formattedTime || '18:00').split(':').map(Number);
    deadline.setHours(hours, minutes, 0, 0);
    const isDeadlinePassed = new Date() >= deadline;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg text-gray-900">{service.time}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            service.type === '전시대' ? 'bg-blue-100 text-blue-800' : service.type === '호별' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                            {service.type}
                        </span>
                    </div>
                    <p className="text-gray-600 text-sm">{service.leader} 인도자 ({service.location})</p>
                </div>
            </div>

            <div className="mt-4">
                <h5 className="font-bold text-xs mb-2 flex items-center text-gray-500 uppercase tracking-tight">
                    <UserIcon className="h-3.5 w-3.5 mr-1.5"/>
                    신청자 명단 ({service.applicants.length})
                </h5>
                <div className="flex flex-wrap gap-1.5">
                    {service.applicants.map(v => (
                        <span key={v.id} className={`px-2 py-1 text-xs font-medium rounded-lg border ${
                            v.gender === '자매' ? 'bg-pink-50 border-pink-100 text-pink-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                        }`}>
                            {v.name}
                        </span>
                    ))}
                    {service.applicants.length === 0 && <p className="text-gray-400 text-xs italic">신청자가 없습니다.</p>}
                </div>
            </div>

            <div className="mt-5 flex justify-between items-center">
                <div className="flex items-center text-[10px] text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded-md">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    마감: {service.deadlineDayOffset === 0 ? '당일' : `${service.deadlineDayOffset}일 전`} {formattedTime}
                </div>
                {!isDeadlinePassed ? (
                    isApplied ? (
                        <button onClick={() => onCancel(service.id)} className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 shadow-sm transition-all">신청 취소</button>
                    ) : (
                        <button 
                            onClick={() => onApply(service.id)} 
                            disabled={!canApplyForPublic}
                            className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all ${
                                canApplyForPublic ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                            }`}
                        >
                            {canApplyForPublic ? '봉사 신청' : '신청 불가'}
                        </button>
                    )
                ) : (
                    <span className="px-4 py-2 text-sm font-bold text-gray-400 bg-gray-100 rounded-lg">마감됨</span>
                )}
            </div>

            <CommentSection
                serviceId={service.id}
                comments={service.comments}
                currentUser={currentUser}
                onAddComment={onAddComment}
                onUpdateComment={onUpdateComment}
                onDeleteComment={onDeleteComment}
            />
        </div>
    );
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  services: ServiceInstance[];
  currentUser: Volunteer;
  currentRole: UserRole;
  serviceSchedule: ServiceSchedule[];
  onCreateFromSchedule: (schedules: ServiceSchedule[]) => void;
  onApply: (serviceId: string) => void;
  onCancel: (serviceId: string) => void;
  onAddService: (formData: ServiceFormData) => void;
  onUpdateService: (service: ServiceInstance) => void;
  onDeleteService: (serviceId: string) => void;
  onAddComment: (serviceId: string, text: string) => void;
  onUpdateComment: (serviceId: string, commentId: string, newText: string) => void;
  onDeleteComment: (serviceId: string, commentId: string) => void;
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen, onClose, date, services, currentUser, currentRole, serviceSchedule, onCreateFromSchedule, onApply, onCancel, onAddService, onUpdateService, onDeleteService, onAddComment, onUpdateComment, onDeleteComment
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingFromSchedule, setIsCreatingFromSchedule] = useState(false);
  const [pairingServiceId, setPairingServiceId] = useState<string | null>(null);
  const [spotAssignmentServiceId, setSpotAssignmentServiceId] = useState<string | null>(null);

  const pairingService = useMemo(() => services.find(s => s.id === pairingServiceId) || null, [services, pairingServiceId]);
  const spotAssignmentService = useMemo(() => services.find(s => s.id === spotAssignmentServiceId) || null, [services, spotAssignmentServiceId]);

  const creatableSchedules = useMemo(() => {
    const dayOfWeek = date.getDay();
    const existingKeys = new Set(services.map(s => `${s.time}-${s.location}`));
    return serviceSchedule.filter(s => s.dayOfWeek === dayOfWeek && !existingKeys.has(`${s.time}-${s.location}`));
  }, [date, services, serviceSchedule]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
        <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-white">
            <h3 className="text-xl font-bold text-gray-800">
              {date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })} 봉사
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <CloseIcon className="h-6 w-6 text-gray-500" />
            </button>
          </header>

          <div className="p-4 overflow-y-auto space-y-4 flex-grow">
            {isCreatingFromSchedule ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h4 className="font-bold mb-4">정규 봉사 추가</h4>
                <div className="space-y-2">
                    {creatableSchedules.map(s => (
                        <div key={s.id} className="bg-white p-3 rounded-lg flex justify-between items-center shadow-sm">
                            <p className="text-sm font-bold">{s.time} ({s.location})</p>
                            <button onClick={() => onCreateFromSchedule([s])} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md">추가</button>
                        </div>
                    ))}
                    {creatableSchedules.length === 0 && <p className="text-center text-sm text-gray-500 py-4">추가할 정규 봉사가 없습니다.</p>}
                </div>
                <button onClick={() => setIsCreatingFromSchedule(false)} className="mt-4 w-full py-2 bg-gray-200 text-sm font-bold rounded-lg">취소</button>
              </div>
            ) : isAddingNew ? (
              <ServiceForm onSave={(data) => { onAddService(data); setIsAddingNew(false); }} onCancel={() => setIsAddingNew(false)} serviceDate={date} />
            ) : (
              <>
                {services.map(service => {
                  if (editingId === service.id) {
                    return <ServiceForm key={service.id} initialData={service} onSave={(data) => { onUpdateService({...service, ...data}); setEditingId(null); }} onCancel={() => setEditingId(null)} serviceDate={date} />;
                  }
                  return (
                    <div key={service.id} className="relative">
                      {currentRole === UserRole.Leader && (
                        <div className="absolute top-4 right-4 flex space-x-1 z-10">
                            {(service.type === '전시대' || service.type === '전시대&호별') && (
                                <button onClick={() => setSpotAssignmentServiceId(service.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 shadow-sm" title="전시대 조직">
                                    <MapPinIcon className="h-5 w-5"/>
                                </button>
                            )}
                            <button onClick={() => setPairingServiceId(service.id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 shadow-sm" title="호별 짝 조직">
                                <UsersIcon className="h-5 w-5"/>
                            </button>
                            <button onClick={() => setEditingId(service.id)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 shadow-sm">
                                <PencilIcon className="h-5 w-5"/>
                            </button>
                            <button onClick={() => onDeleteService(service.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 shadow-sm">
                                <TrashIcon className="h-5 w-5"/>
                            </button>
                        </div>
                      )}
                      <VolunteerServiceCard
                        service={service}
                        currentUser={currentUser}
                        onApply={onApply}
                        onCancel={onCancel}
                        onAddComment={onAddComment}
                        onUpdateComment={onUpdateComment}
                        onDeleteComment={onDeleteComment}
                      />
                    </div>
                  );
                })}
                {services.length === 0 && <p className="text-center py-10 text-gray-500 italic">등록된 봉사가 없습니다.</p>}
              </>
            )}
          </div>

          {currentRole === UserRole.Leader && !isAddingNew && !isCreatingFromSchedule && (
            <footer className="p-4 bg-white border-t flex gap-2">
              <button onClick={() => setIsCreatingFromSchedule(true)} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-all">정규 봉사 불러오기</button>
              <button onClick={() => setIsAddingNew(true)} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all">신규 봉사 추가</button>
            </footer>
          )}
        </div>
      </div>

      {pairingService && (
        <PairingModal 
          isOpen={true} 
          onClose={() => setPairingServiceId(null)} 
          service={pairingService}
          onUpdateService={onUpdateService}
        />
      )}
      {spotAssignmentService && (
        <SpotAssignmentModal 
          isOpen={true} 
          onClose={() => setSpotAssignmentServiceId(null)} 
          service={spotAssignmentService} 
          onUpdateService={onUpdateService} 
        />
      )}
    </>
  );
};

export default ServiceModal;