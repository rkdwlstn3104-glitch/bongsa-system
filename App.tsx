
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Volunteer, ServiceInstance, ServiceSchedule, ServiceFormData, Gender, Comment } from './types';
import { UserRole } from './types';
import Header from './components/Header';
import Calendar from './components/Calendar';
import ServiceModal from './components/ServiceModal';
import VolunteerManagementModal from './components/VolunteerManagementModal';
import ScheduleManagementModal from './components/ScheduleManagementModal';
import PasswordManagementModal from './components/PasswordManagementModal';
import Login from './components/Login';
import { 
  fetchData, 
  addVolunteer, 
  removeVolunteer, 
  saveSchedule, 
  removeSchedule, 
  saveServiceInstance, 
  deleteServiceInstance, 
  updateLeaderPassword,
  toggleApplication,
  addComment,
  updateComment,
  deleteComment
} from './api/googleSheet';

// Helper function to format date to YYYY-MM-DD string, ignoring timezone
const toYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function App() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [serviceSchedule, setServiceSchedule] = useState<ServiceSchedule[]>([]);
  const [serviceInstances, setServiceInstances] = useState<ServiceInstance[]>([]);
  const [leaderPassword, setLeaderPassword] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<Volunteer | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // 배경 동기화 상태
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // 데이터 로딩 로직을 함수화하여 재사용 가능하게 변경
  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      else setIsSyncing(true);
      
      const data = await fetchData();
      
      const normalizeDayOfWeek = <T extends ServiceSchedule | ServiceInstance>(item: T): T => ({
        ...item,
        dayOfWeek: item.dayOfWeek === 7 ? 0 : item.dayOfWeek,
      });

      const normalizedSchedules = data.serviceSchedule.map(normalizeDayOfWeek);
      const normalizedInstances = data.serviceInstances.map(normalizeDayOfWeek) as ServiceInstance[];

      setVolunteers(data.volunteers);
      setServiceSchedule(normalizedSchedules);
      setServiceInstances(normalizedInstances);
      setLeaderPassword(data.leaderPassword);
      setLastSyncTime(new Date());
      setError(null);
    } catch (err) {
      console.error("데이터 동기화 실패:", err);
      if (!isBackground) setError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 자동 동기화 (Polling): 20초마다 최신 데이터 확인
  useEffect(() => {
    if (!currentUser) return; // 로그인 상태일 때만 작동

    const interval = setInterval(() => {
      // 사용자가 모달을 열어두거나 활발히 활동 중일 때도 배경에서 조용히 업데이트
      loadData(true);
    }, 20000); // 20초 간격

    return () => clearInterval(interval);
  }, [currentUser, loadData]);


  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const handleLogin = (user: Volunteer, role: UserRole) => {
    setCurrentUser(user);
    setCurrentRole(role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
  };

  const handleUpdateLeaderPassword = async (currentPassword: string, newPassword: string) => {
    if (currentPassword !== leaderPassword) {
      throw new Error("현재 비밀번호가 일치하지 않습니다.");
    }
    if (newPassword.length < 4) {
      throw new Error("새 비밀번호는 4자 이상이어야 합니다.");
    }
    
    const originalPassword = leaderPassword;
    setLeaderPassword(newPassword);

    try {
      await updateLeaderPassword(newPassword);
      alert("비밀번호가 성공적으로 변경되었습니다.");
    } catch (error) {
      console.error("비밀번호 업데이트 실패:", error);
      setLeaderPassword(originalPassword);
      throw new Error("서버 오류로 인해 비밀번호를 변경하지 못했습니다.");
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsServiceModalOpen(true);
  };

  const servicesForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateString = toYYYYMMDD(selectedDate);
    return serviceInstances.filter(instance => instance.date === dateString).sort((a,b) => a.time.localeCompare(b.time));
  }, [selectedDate, serviceInstances]);

  // --- Data Mutation Handlers ---

  const handleAddVolunteer = async (name: string, gender: Gender, canDoPublicWitnessing: boolean) => {
    const tempId = `temp_${Date.now()}`;
    const newVolunteer: Volunteer = { id: tempId, name, gender, canDoPublicWitnessing };
    setVolunteers(prev => [...prev, newVolunteer]);
    try {
        const savedVolunteer = await addVolunteer({ name, gender, canDoPublicWitnessing });
        setVolunteers(prev => prev.map(v => v.id === tempId ? savedVolunteer : v));
    } catch (e) {
        console.error("전도인 추가 실패:", e);
        alert("전도인 추가에 실패했습니다.");
        setVolunteers(prev => prev.filter(v => v.id !== tempId));
    }
  };

  const handleRemoveVolunteer = async (volunteerId: string) => {
    if (currentUser?.id === volunteerId) {
        alert("자기 자신은 삭제할 수 없습니다.");
        return;
    }
    const originalVolunteers = [...volunteers];
    setVolunteers(prev => prev.filter(v => v.id !== volunteerId));
    try {
        await removeVolunteer(volunteerId);
    } catch(e) {
        console.error("전도인 삭제 실패:", e);
        alert("전도인 삭제에 실패했습니다.");
        setVolunteers(originalVolunteers);
    }
  };

  const handleSaveSchedule = async (scheduleToSave: ServiceSchedule) => {
    const isUpdate = !!scheduleToSave.id;
    const originalSchedules = [...serviceSchedule];
    const tempId = `temp_sched_${Date.now()}`;
    
    if (isUpdate) {
        setServiceSchedule(prev => prev.map(s => s.id === scheduleToSave.id ? scheduleToSave : s));
    } else {
        setServiceSchedule(prev => [...prev, { ...scheduleToSave, id: tempId }]);
    }
    try {
        const saved = await saveSchedule(scheduleToSave);
        if (isUpdate) {
            setServiceSchedule(prev => prev.map(s => s.id === saved.id ? saved : s));
        } else {
            setServiceSchedule(prev => prev.map(s => s.id === tempId ? saved : s));
        }
    } catch (e) {
        console.error("봉사 목록 저장 실패:", e);
        alert("저장에 실패했습니다.");
        setServiceSchedule(originalSchedules);
    }
  };

  const handleRemoveSchedule = async (scheduleId: string) => {
    const originalSchedules = [...serviceSchedule];
    setServiceSchedule(prev => prev.filter(s => s.id !== scheduleId));
    try {
        await removeSchedule(scheduleId);
    } catch (e) {
        console.error("봉사 목록 삭제 실패:", e);
        alert("삭제에 실패했습니다.");
        setServiceSchedule(originalSchedules);
    }
  };
  
  const handleAddServiceInstance = async (newInstance: ServiceInstance) => {
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => [...prev, newInstance]);
    try {
      const savedInstance = await saveServiceInstance(newInstance);
      setServiceInstances(prev => prev.map(s => (s.id === newInstance.id ? savedInstance : s)));
    } catch (e) {
      console.error("봉사 생성 실패:", e);
      alert("봉사 생성에 실패했습니다.");
      setServiceInstances(originalInstances);
    }
  };
  
  const handleUpdateServiceInstance = async (updatedInstance: ServiceInstance) => {
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.map(s => s.id === updatedInstance.id ? updatedInstance : s));
    try {
        await saveServiceInstance(updatedInstance);
    } catch (e) {
        console.error("봉사 업데이트 실패:", e);
        alert("업데이트에 실패했습니다.");
        setServiceInstances(originalInstances);
    }
  };

  const handleDeleteServiceInstance = async (serviceId: string) => {
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.filter(s => s.id !== serviceId));
    try {
        await deleteServiceInstance(serviceId);
    } catch (e) {
        console.error("봉사 삭제 실패:", e);
        alert("봉사 삭제에 실패했습니다.");
        setServiceInstances(originalInstances);
    }
  };

  const handleApply = async (serviceId: string) => {
    if (!currentUser) return;
    const instance = serviceInstances.find(s => s.id === serviceId);
    if (!instance) return;

    // Optimistic UI update
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.map(s => 
      s.id === serviceId ? { ...s, applicants: [...s.applicants, currentUser] } : s
    ));

    try {
      const newApplicants = await toggleApplication(serviceId, currentUser, true);
      setServiceInstances(prev => prev.map(s => 
        s.id === serviceId ? { ...s, applicants: newApplicants } : s
      ));
      setLastSyncTime(new Date());
    } catch (e) {
      console.error("신청 실패:", e);
      alert("신청 중 오류가 발생했습니다. 다시 시도해주세요.");
      setServiceInstances(originalInstances);
    }
  };

  const handleCancel = async (serviceId: string) => {
    if (!currentUser) return;
    const instance = serviceInstances.find(s => s.id === serviceId);
    if (!instance) return;

    // Optimistic UI update
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.map(s => 
      s.id === serviceId ? { ...s, applicants: s.applicants.filter(v => v.id !== currentUser.id) } : s
    ));

    try {
      const newApplicants = await toggleApplication(serviceId, currentUser, false);
      setServiceInstances(prev => prev.map(s => 
        s.id === serviceId ? { ...s, applicants: newApplicants } : s
      ));
      setLastSyncTime(new Date());
    } catch (e) {
      console.error("취소 실패:", e);
      alert("취소 중 오류가 발생했습니다.");
      setServiceInstances(originalInstances);
    }
  };
  
  const handleAddComment = async (serviceId: string, text: string) => {
    if (!currentUser) return;
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      text,
      createdAt: new Date().toISOString(),
    };

    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.map(s => 
      s.id === serviceId ? { ...s, comments: [...s.comments, newComment] } : s
    ));

    try {
      const newComments = await addComment(serviceId, newComment);
      setServiceInstances(prev => prev.map(s => 
        s.id === serviceId ? { ...s, comments: newComments } : s
      ));
    } catch (e) {
      console.error("댓글 저장 실패:", e);
      setServiceInstances(originalInstances);
    }
  };

  const handleUpdateComment = async (serviceId: string, commentId: string, newText: string) => {
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.map(s => 
      s.id === serviceId ? { 
        ...s, 
        comments: s.comments.map(c => c.id === commentId ? { ...c, text: newText } : c) 
      } : s
    ));

    try {
      const newComments = await updateComment(serviceId, commentId, newText);
      setServiceInstances(prev => prev.map(s => 
        s.id === serviceId ? { ...s, comments: newComments } : s
      ));
    } catch (e) {
      console.error("댓글 수정 실패:", e);
      setServiceInstances(originalInstances);
    }
  };

  const handleDeleteComment = async (serviceId: string, commentId: string) => {
    const originalInstances = [...serviceInstances];
    setServiceInstances(prev => prev.map(s => 
      s.id === serviceId ? { ...s, comments: s.comments.filter(c => c.id !== commentId) } : s
    ));

    try {
      const newComments = await deleteComment(serviceId, commentId);
      setServiceInstances(prev => prev.map(s => 
        s.id === serviceId ? { ...s, comments: newComments } : s
      ));
    } catch (e) {
      console.error("댓글 삭제 실패:", e);
      setServiceInstances(originalInstances);
    }
  };
  
  const handleCreateFromSchedule = (schedulesToCreate: ServiceSchedule[]) => {
    if (!selectedDate) return;
    const dateString = toYYYYMMDD(selectedDate);
    const servicesOnDateCount = serviceInstances.filter(instance => instance.date === dateString).length;
    if (servicesOnDateCount >= 3 || servicesOnDateCount + schedulesToCreate.length > 3) {
      alert(`하루에 최대 3개의 봉사만 생성할 수 있습니다.`);
      return;
    }

    const newInstances: ServiceInstance[] = schedulesToCreate.map((schedule, i) => ({
      ...schedule,
      id: `temp_si_${Date.now()}_${i}`,
      date: dateString,
      dayOfWeek: selectedDate.getDay(),
      applicants: [],
      comments: [],
    }));

    setServiceInstances(prev => [...prev, ...newInstances]);

    Promise.all(newInstances.map(inst => saveServiceInstance(inst)))
      .then(savedInstances => {
        const savedMap = new Map<string, ServiceInstance>();
        newInstances.forEach((tempInstance, index) => {
          savedMap.set(tempInstance.id, savedInstances[index]);
        });
        setServiceInstances(prev => prev.map(inst => savedMap.get(inst.id) || inst));
      })
      .catch(e => {
        console.error("봉사 생성 실패:", e);
        const tempIds = new Set(newInstances.map(i => i.id));
        setServiceInstances(prev => prev.filter(i => !tempIds.has(i.id)));
      });
  };
  
  const handleAddServiceFromForm = (formData: ServiceFormData) => {
    if (!selectedDate) return;
    const dateString = toYYYYMMDD(selectedDate);
    if (serviceInstances.filter(instance => instance.date === dateString).length >= 3) {
        alert("하루에 최대 3개의 봉사만 생성할 수 있습니다.");
        return;
    }
    const newService: ServiceInstance = {
        ...formData,
        id: `temp_si_${Date.now()}`,
        date: dateString,
        dayOfWeek: selectedDate.getDay(),
        applicants: [],
        comments: [],
    };
    handleAddServiceInstance(newService);
  };
  
  if (isLoading) {
    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-100">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xl font-semibold text-blue-600">데이터를 불러오는 중...</p>
                <p className="text-gray-500 mt-2">잠시만 기다려주세요.</p>
            </div>
        </div>
    );
  }
  
  if (error) {
     return (
        <div className="min-h-screen flex justify-center items-center bg-red-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-md border border-red-200">
                <h2 className="text-2xl font-bold text-red-600">오류 발생</h2>
                <p className="text-gray-700 mt-4">{error}</p>
                <button onClick={() => loadData()} className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">다시 시도</button>
            </div>
        </div>
     );
  }

  if (!currentUser || !currentRole) {
    return <Login volunteers={volunteers} onLogin={handleLogin} leaderPassword={leaderPassword} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <Header
        currentUser={currentUser}
        currentRole={currentRole}
        onLogout={handleLogout}
        onManageVolunteers={() => setIsVolunteerModalOpen(true)}
        onManageSchedule={() => setIsScheduleModalOpen(true)}
        onManagePassword={() => setIsPasswordModalOpen(true)}
      />
      
      {/* 동기화 상태 표시기 */}
      <div className="bg-white border-b px-4 py-1 flex justify-end items-center space-x-2 text-[10px] text-gray-400">
          {isSyncing ? (
              <span className="flex items-center">
                  <div className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                  동기화 중...
              </span>
          ) : (
              <span>최근 동기화: {lastSyncTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          )}
          <button onClick={() => loadData(true)} className="hover:text-blue-500 underline">지금 동기화</button>
      </div>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <Calendar
            onDateSelect={handleDateSelect}
            serviceInstances={serviceInstances}
          />
        </div>
      </main>

      {isServiceModalOpen && selectedDate && (
        <ServiceModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          date={selectedDate}
          services={servicesForSelectedDate}
          currentUser={currentUser}
          currentRole={currentRole}
          serviceSchedule={serviceSchedule}
          onCreateFromSchedule={handleCreateFromSchedule}
          onApply={handleApply}
          onCancel={handleCancel}
          onAddService={handleAddServiceFromForm}
          onUpdateService={handleUpdateServiceInstance}
          onDeleteService={handleDeleteServiceInstance}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
        />
      )}

      {isVolunteerModalOpen && (
        <VolunteerManagementModal
          isOpen={isVolunteerModalOpen}
          onClose={() => setIsVolunteerModalOpen(false)}
          volunteers={volunteers}
          onAddVolunteer={handleAddVolunteer}
          onRemoveVolunteer={handleRemoveVolunteer}
        />
      )}

      {isScheduleModalOpen && (
        <ScheduleManagementModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          schedules={serviceSchedule}
          onSave={handleSaveSchedule}
          onRemove={handleRemoveSchedule}
        />
      )}

      {isPasswordModalOpen && (
        <PasswordManagementModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onUpdatePassword={handleUpdateLeaderPassword}
        />
      )}
    </div>
  );
}
