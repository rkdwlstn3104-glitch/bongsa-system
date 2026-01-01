
import React, { useState, useMemo } from 'react';
import type { ServiceInstance, Volunteer, ServiceFormData, ServiceSchedule, Comment } from '../types';
import { UserRole, ServiceType } from '../types';
import CloseIcon from './icons/CloseIcon';
import UserIcon from './icons/UserIcon';
import ClockIcon from './icons/ClockIcon';
import ServiceForm from './ServiceForm';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import PairingModal from './PairingModal';
import UsersIcon from './icons/UsersIcon';

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

    const handleStartEdit = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditingText(comment.text);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditingText('');
    };

    const handleSaveEdit = () => {
        if (editingCommentId && editingText.trim()) {
            onUpdateComment(serviceId, editingCommentId, editingText.trim());
            handleCancelEdit();
        }
    };

    const sortedComments = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="font-semibold text-sm mb-3 flex items-center">
                <ChatBubbleIcon className="h-4 w-4 mr-2 text-gray-500" />
                댓글 ({comments.length}개)
            </h5>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {sortedComments.length > 0 ? (
                    sortedComments.map(comment => (
                        <div key={comment.id} className="text-sm">
                            <div className="flex justify-between items-start">
                                <p className="font-bold">{comment.authorName}</p>
                                {currentUser.id === comment.authorId && editingCommentId !== comment.id && (
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleStartEdit(comment)} className="p-1 text-gray-400 hover:text-blue-600"><PencilIcon className="h-4 w-4"/></button>
                                        <button onClick={() => onDeleteComment(serviceId, comment.id)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                )}
                            </div>
                            {editingCommentId === comment.id ? (
                                <div className="mt-1 space-y-2">
                                    <textarea
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        className="w-full p-2 border rounded-md text-sm"
                                        rows={2}
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={handleCancelEdit} className="px-3 py-1 text-xs bg-gray-200 rounded">취소</button>
                                        <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">저장</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(comment.createdAt).toLocaleString('ko-KR')}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm">댓글이 없습니다.</p>
                )}
            </div>
             <div className="mt-4">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="w-full p-2 border rounded-md text-sm"
                    rows={2}
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={handleAddComment}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        disabled={!newComment.trim()}
                    >
                        댓글 작성
                    </button>
                </div>
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

    const deadlineDisplayString = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(deadline);

    const isPastDate = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return serviceDate < today;
    }, [serviceDate]);


    const getServiceTypeColor = (type: ServiceType) => {
        if (type === '전시대') return 'bg-blue-100 text-blue-800';
        if (type === '호별') return 'bg-green-100 text-green-800';
        return 'bg-purple-100 text-purple-800';
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg">{service.time}</h4>
                    <p className="text-gray-600">{service.leader} ({service.location})</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(service.type)}`}>
                    {service.type}
                </span>
            </div>

            <div className="mt-3 bg-yellow-100/60 p-3 rounded-lg">
                <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <div className="ml-3 pl-3 border-l border-yellow-400">
                        <p className="text-sm font-bold text-yellow-800">신청 마감</p>
                        <p className="text-sm text-yellow-700">{deadlineDisplayString}</p>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <h5 className="font-semibold text-sm mb-2 flex items-center">
                    <UserIcon className="h-4 w-4 mr-2 text-gray-500"/>
                    신청자 ({service.applicants.length}명)
                </h5>
                {service.applicants.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {service.applicants.map(v => {
                            const isDoorToDoorOnly = service.type === '전시대&호별' && !v.canDoPublicWitnessing;
                            return (
                                <span 
                                    key={v.id} 
                                    className={`px-2 py-1 text-sm rounded-md ${isDoorToDoorOnly ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-800'}`}
                                >
                                    {v.name}{isDoorToDoorOnly ? ' (호별만)' : ''}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">신청자가 없습니다.</p>
                )}
            </div>
            <div className="mt-4 flex justify-end">
                {!isDeadlinePassed ? (
                    isApplied ? (
                        <button
                            onClick={() => onCancel(service.id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            신청 취소
                        </button>
                    ) : (
                        <button
                            onClick={() => onApply(service.id)}
                            disabled={!canApplyForPublic}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                canApplyForPublic
                                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                    : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {canApplyForPublic ? '봉사 신청' : '신청 불가'}
                        </button>
                    )
                ) : (
                    <span className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-200 rounded-lg">
                        신청 마감
                    </span>
                )}
            </div>
            {!isPastDate && (
                <CommentSection
                    serviceId={service.id}
                    comments={service.comments}
                    currentUser={currentUser}
                    onAddComment={onAddComment}
                    onUpdateComment={onUpdateComment}
                    onDeleteComment={onDeleteComment}
                />
            )}
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
  const [pairingService, setPairingService] = useState<ServiceInstance | null>(null);

  // Memoize creatable schedules to avoid re-calculation
  const creatableSchedules = useMemo(() => {
    const dayOfWeek = date.getDay();
    const existingServiceKeys = new Set(services.map(s => `${s.time}-${s.location}`));
    return serviceSchedule.filter(s => 
      s.dayOfWeek === dayOfWeek && !existingServiceKeys.has(`${s.time}-${s.location}`)
    ).sort((a, b) => a.time.localeCompare(b.time));
  }, [date, services, serviceSchedule]);

  const isAtMaxServices = services.length >= 3;

  const isPastDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  }, [date]);

  if (!isOpen) return null;
  
  const resetFormStates = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setIsCreatingFromSchedule(false);
  };

  const handleClose = () => {
    resetFormStates();
    onClose();
  };
  
  const handleSaveNew = (formData: ServiceFormData) => {
    onAddService(formData);
    setIsAddingNew(false);
  };

  const handleSaveUpdate = (formData: ServiceFormData) => {
    const originalService = services.find(s => s.id === editingId);
    if (originalService) {
        onUpdateService({ ...originalService, ...formData });
    }
    setEditingId(null);
  }

  const handleDelete = (serviceId: string) => {
    if (window.confirm('정말로 이 봉사를 삭제하시겠습니까?')) {
        onDeleteService(serviceId);
    }
  }

  const renderCreateFromSchedule = () => (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-lg">요일 정규 봉사 생성</h4>
        <button
          type="button"
          onClick={() => setIsCreatingFromSchedule(false)}
          className="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
        >
          돌아가기
        </button>
      </div>

      {creatableSchedules.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {isAtMaxServices && <p className="text-center text-red-500 text-sm py-2">하루에 최대 3개의 봉사만 생성할 수 있습니다.</p>}
          {creatableSchedules.map(schedule => (
            <div key={schedule.id} className="p-3 bg-white rounded-lg shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">{schedule.time} <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{schedule.type}</span></p>
                <p className="text-sm text-gray-600">{schedule.location} (인도자: {schedule.leader})</p>
              </div>
              <button
                onClick={() => onCreateFromSchedule([schedule])}
                disabled={isAtMaxServices}
                className={`px-4 py-2 text-white text-sm font-semibold rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${isAtMaxServices ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                생성
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">이 요일에 추가할 수 있는 정규 봉사가 모두 생성되었습니다.</p>
        </div>
      )}
    </div>
  );
  
  const renderLeaderView = () => (
    <>
      {isCreatingFromSchedule ? renderCreateFromSchedule() : (
        <>
          {services.map(service => {
            if (editingId === service.id) {
              return <ServiceForm key={service.id} initialData={service} onSave={handleSaveUpdate} onCancel={() => setEditingId(null)} serviceDate={date} />;
            }
            
            const [year, month, day] = service.date.split('-').map(Number);
            const serviceDate = new Date(year, month - 1, day);
            
            const deadline = new Date(serviceDate);
            deadline.setDate(serviceDate.getDate() - service.deadlineDayOffset);
            const formattedTime = formatDeadlineTime(service.deadlineTime);
            const [hours, minutes] = (formattedTime || '18:00').split(':').map(Number);
            deadline.setHours(hours, minutes, 0, 0);
            
            const deadlineDisplayString = new Intl.DateTimeFormat('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true,
            }).format(deadline);
            
            const isCardPastDate = new Date(service.date) < new Date(new Date().toDateString());

            return (
              <div key={service.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-lg">{service.time}</h4>
                        <p className="text-gray-600">{service.leader} ({service.location})</p>
                    </div>
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            service.type === '전시대' ? 'bg-blue-100 text-blue-800' : service.type === '호별' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>{service.type}</span>
                        {!isCardPastDate && (
                            <>
                            <button onClick={() => setPairingService(service)} className="p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-full" title="짝 구성">
                                <UsersIcon className="h-5 w-5"/>
                            </button>
                            <button onClick={() => setEditingId(service.id)} className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded-full" title="수정">
                                <PencilIcon className="h-5 w-5"/>
                            </button>
                            <button onClick={() => handleDelete(service.id)} className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-full" title="삭제">
                                <TrashIcon className="h-5 w-5"/>
                            </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-3 bg-yellow-100/60 p-3 rounded-lg">
                    <div className="flex items-center">
                        <ClockIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        <div className="ml-3 pl-3 border-l border-yellow-400">
                            <p className="text-sm font-bold text-yellow-800">신청 마감</p>
                            <p className="text-sm text-yellow-700">{deadlineDisplayString}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <h5 className="font-semibold text-sm mb-2 flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-500"/>
                        신청자 ({service.applicants.length}명)
                    </h5>
                    {service.applicants.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {service.applicants.map(v => {
                                const isDoorToDoorOnly = service.type === '전시대&호별' && !v.canDoPublicWitnessing;
                                return (
                                    <span 
                                        key={v.id} 
                                        className={`px-2 py-1 text-sm rounded-md ${isDoorToDoorOnly ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-800'}`}
                                    >
                                        {v.name}{isDoorToDoorOnly ? ' (호별만)' : ''}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">신청자가 없습니다.</p>
                    )}
                </div>
                {!isPastDate && (
                    <CommentSection
                        serviceId={service.id}
                        comments={service.comments}
                        currentUser={currentUser}
                        onAddComment={onAddComment}
                        onUpdateComment={onUpdateComment}
                        onDeleteComment={onDeleteComment}
                    />
                )}
              </div>
            );
          })}
          {isAddingNew && <ServiceForm onSave={handleSaveNew} onCancel={() => setIsAddingNew(false)} serviceDate={date} />}
        </>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-gray-100 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">
            {date.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto space-y-4">
          {services.length === 0 && !isAddingNew && !isCreatingFromSchedule && (
            <div className="text-center py-8">
              <p className="text-gray-600">이 날짜에는 등록된 봉사가 없습니다.</p>
            </div>
          )}

          {currentRole === UserRole.Volunteer 
            ? services.map(service => <VolunteerServiceCard key={service.id} service={service} currentUser={currentUser} onApply={onApply} onCancel={onCancel} onAddComment={onAddComment} onUpdateComment={onUpdateComment} onDeleteComment={onDeleteComment} />)
            : renderLeaderView()
          }
        </div>
        {currentRole === UserRole.Leader && !isAddingNew && !isCreatingFromSchedule && (
            <footer className="p-4 border-t border-gray-200 space-y-2">
              {isPastDate ? (
                <p className="text-center text-red-500 text-sm py-2">이미 지나간 날짜에는 봉사를 생성할 수 없습니다.</p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                      <button
                          onClick={() => setIsCreatingFromSchedule(true)}
                          disabled={isAtMaxServices || creatableSchedules.length === 0}
                          className={`w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                            isAtMaxServices || creatableSchedules.length === 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          }`}
                      >
                        요일 정규 봉사 생성
                      </button>
                      <button
                          onClick={() => setIsAddingNew(true)}
                          disabled={isAtMaxServices}
                          className={`w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center transition-colors ${
                            isAtMaxServices
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          }`}
                      >
                          <PlusIcon className="h-5 w-5 mr-1"/>
                          신규 봉사 추가
                      </button>
                  </div>
                  {isAtMaxServices && <p className="text-center text-red-500 text-sm">하루에 최대 3개의 봉사만 생성할 수 있습니다.</p>}
                </>
              )}
            </footer>
        )}
      </div>
      {pairingService && (
        <PairingModal
          isOpen={!!pairingService}
          onClose={() => setPairingService(null)}
          service={pairingService}
        />
      )}
    </div>
  );
};

export default ServiceModal;
