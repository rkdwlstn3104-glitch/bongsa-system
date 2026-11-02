import type { Volunteer, ServiceSchedule, ServiceInstance, Comment } from '../types';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz23kOAv4o77NN4m2yUKlua9u7prMms9tWRlOD20hba-OjW1nrjukLCJvHHj090P9L57w/exec';

// Default mock data for local fallback in AI Studio preview
const DEFAULT_VOLUNTEERS: Volunteer[] = [
  { id: 'v1', name: '김철수', gender: '형제', isHouseToHouseOnly: false, canDoConvenienceStore: true },
  { id: 'v2', name: '이영희', gender: '자매', isHouseToHouseOnly: true, canDoConvenienceStore: false },
  { id: 'v3', name: '박민수', gender: '형제', isHouseToHouseOnly: false, canDoConvenienceStore: true },
  { id: 'v4', name: '정수진', gender: '자매', isHouseToHouseOnly: false, canDoConvenienceStore: true },
];

const DEFAULT_SCHEDULES: ServiceSchedule[] = [
  { id: 's1', dayOfWeek: 1, time: '10:00', leader: '김철수', phoneNumber: '010-1234-5678', type: '호별', location: '중앙공원 앞', deadlineDayOffset: 1, deadlineTime: '18:00' },
  { id: 's2', dayOfWeek: 3, time: '14:00', leader: '박민수', phoneNumber: '010-9876-5432', type: '전시대', location: '역전 광장', deadlineDayOffset: 1, deadlineTime: '18:00' },
  { id: 's3', dayOfWeek: 6, time: '09:30', leader: '정수진', phoneNumber: '010-1111-2222', type: '편의점', location: '상가 거리', deadlineDayOffset: 1, deadlineTime: '18:00' },
];

function getStoredData() {
  try {
    const v = localStorage.getItem('bongsa_volunteers');
    const s = localStorage.getItem('bongsa_schedule');
    const i = localStorage.getItem('bongsa_instances');
    const p = localStorage.getItem('bongsa_password');
    return {
      volunteers: v ? JSON.parse(v) : DEFAULT_VOLUNTEERS,
      serviceSchedule: s ? JSON.parse(s) : DEFAULT_SCHEDULES,
      serviceInstances: i ? JSON.parse(i) : [],
      leaderPassword: p || 'admin'
    };
  } catch {
    return {
      volunteers: DEFAULT_VOLUNTEERS,
      serviceSchedule: DEFAULT_SCHEDULES,
      serviceInstances: [],
      leaderPassword: 'admin'
    };
  }
}

function saveStoredData(data: { volunteers?: Volunteer[], serviceSchedule?: ServiceSchedule[], serviceInstances?: ServiceInstance[], leaderPassword?: string }) {
  const current = getStoredData();
  const next = { ...current, ...data };
  if (next.volunteers) localStorage.setItem('bongsa_volunteers', JSON.stringify(next.volunteers));
  if (next.serviceSchedule) localStorage.setItem('bongsa_schedule', JSON.stringify(next.serviceSchedule));
  if (next.serviceInstances) localStorage.setItem('bongsa_instances', JSON.stringify(next.serviceInstances));
  if (next.leaderPassword) localStorage.setItem('bongsa_password', next.leaderPassword);
}

async function apiRequest(action: string, payload?: any) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify({ action, payload }),
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || `API 내부 오류가 발생했습니다. (${action})`);
    }

    return result.data;
  } catch (error: any) {
    console.warn(`[Local Fallback Active] API Request [${action}] failed, using local storage fallback. Error:`, error);
    
    // Fallback local execution logic
    const db = getStoredData();
    
    switch (action) {
      case 'fetchData':
        return {
          volunteers: db.volunteers,
          serviceSchedule: db.serviceSchedule,
          serviceInstances: db.serviceInstances,
          leaderPassword: db.leaderPassword
        };
      case 'updateLeaderPassword':
        saveStoredData({ leaderPassword: payload.newPassword });
        return { success: true };
      case 'addVolunteer': {
        const newVol: Volunteer = {
          id: `v_${Date.now()}`,
          name: payload.name,
          gender: payload.gender,
          isHouseToHouseOnly: !!payload.isHouseToHouseOnly,
          canDoConvenienceStore: !!payload.canDoConvenienceStore,
        };
        const updated = [...db.volunteers, newVol];
        saveStoredData({ volunteers: updated });
        return newVol;
      }
      case 'updateVolunteer': {
        const updated = db.volunteers.map((v: Volunteer) => v.id === payload.id ? payload : v);
        saveStoredData({ volunteers: updated });
        return payload;
      }
      case 'removeVolunteer': {
        const updated = db.volunteers.filter((v: Volunteer) => v.id !== payload.id);
        saveStoredData({ volunteers: updated });
        return { id: payload.id };
      }
      case 'saveSchedule': {
        const sched = payload.schedule || payload;
        let updated;
        if (sched.id) {
          updated = db.serviceSchedule.map((s: ServiceSchedule) => s.id === sched.id ? sched : s);
        } else {
          const newSched = { ...sched, id: `s_${Date.now()}` };
          updated = [...db.serviceSchedule, newSched];
        }
        saveStoredData({ serviceSchedule: updated });
        return sched.id ? sched : updated[updated.length - 1];
      }
      case 'removeSchedule': {
        const updated = db.serviceSchedule.filter((s: ServiceSchedule) => s.id !== payload.id);
        saveStoredData({ serviceSchedule: updated });
        return { id: payload.id };
      }
      case 'saveServiceInstance': {
        const inst = payload.instance || payload;
        let updated;
        const exists = db.serviceInstances.find((i: ServiceInstance) => i.id === inst.id);
        if (exists) {
          updated = db.serviceInstances.map((i: ServiceInstance) => i.id === inst.id ? inst : i);
        } else {
          const newInst = { ...inst, id: inst.id && !inst.id.startsWith('temp_') ? inst.id : `inst_${Date.now()}` };
          updated = [...db.serviceInstances, newInst];
        }
        saveStoredData({ serviceInstances: updated });
        return inst;
      }
      case 'deleteServiceInstance': {
        const updated = db.serviceInstances.filter((i: ServiceInstance) => i.id !== payload.id);
        saveStoredData({ serviceInstances: updated });
        return { id: payload.id };
      }
      case 'toggleApplication': {
        const { serviceId, volunteer, isApplying } = payload;
        const updatedInstances = db.serviceInstances.map((inst: ServiceInstance) => {
          if (inst.id === serviceId) {
            let applicants = inst.applicants || [];
            if (isApplying) {
              if (!applicants.some((v: Volunteer) => v.id === volunteer.id)) {
                applicants = [...applicants, volunteer];
              }
            } else {
              applicants = applicants.filter((v: Volunteer) => v.id !== volunteer.id);
            }
            return { ...inst, applicants };
          }
          return inst;
        });
        saveStoredData({ serviceInstances: updatedInstances });
        const targetInst = updatedInstances.find((i: ServiceInstance) => i.id === serviceId);
        return targetInst ? targetInst.applicants : [];
      }
      case 'addComment': {
        const { serviceId, comment } = payload;
        const updatedInstances = db.serviceInstances.map((inst: ServiceInstance) => {
          if (inst.id === serviceId) {
            const comments = [...(inst.comments || []), comment];
            return { ...inst, comments };
          }
          return inst;
        });
        saveStoredData({ serviceInstances: updatedInstances });
        const targetInst = updatedInstances.find((i: ServiceInstance) => i.id === serviceId);
        return targetInst ? targetInst.comments : [];
      }
      case 'updateComment': {
        const { serviceId, commentId, newText } = payload;
        const updatedInstances = db.serviceInstances.map((inst: ServiceInstance) => {
          if (inst.id === serviceId) {
            const comments = (inst.comments || []).map((c: Comment) => c.id === commentId ? { ...c, text: newText } : c);
            return { ...inst, comments };
          }
          return inst;
        });
        saveStoredData({ serviceInstances: updatedInstances });
        const targetInst = updatedInstances.find((i: ServiceInstance) => i.id === serviceId);
        return targetInst ? targetInst.comments : [];
      }
      case 'deleteComment': {
        const { serviceId, commentId } = payload;
        const updatedInstances = db.serviceInstances.map((inst: ServiceInstance) => {
          if (inst.id === serviceId) {
            const comments = (inst.comments || []).filter((c: Comment) => c.id !== commentId);
            return { ...inst, comments };
          }
          return inst;
        });
        saveStoredData({ serviceInstances: updatedInstances });
        const targetInst = updatedInstances.find((i: ServiceInstance) => i.id === serviceId);
        return targetInst ? targetInst.comments : [];
      }
      default:
        throw new Error(`지원하지 않는 액션입니다: ${action}`);
    }
  }
}

export const fetchData = async (): Promise<{ 
  volunteers: Volunteer[], 
  serviceSchedule: ServiceSchedule[],
  serviceInstances: ServiceInstance[],
  leaderPassword: string
}> => {
  return apiRequest('fetchData');
};

export const updateLeaderPassword = async (newPassword: string): Promise<void> => {
  await apiRequest('updateLeaderPassword', { newPassword });
};

export const addVolunteer = async (volunteer: Omit<Volunteer, 'id'>): Promise<Volunteer> => {
    return await apiRequest('addVolunteer', volunteer);
};

export const updateVolunteer = async (volunteer: Volunteer): Promise<Volunteer> => {
    return await apiRequest('updateVolunteer', volunteer);
};

export const removeVolunteer = async (volunteerId: string): Promise<void> => {
  await apiRequest('removeVolunteer', { id: volunteerId });
};

export const saveSchedule = async (schedule: ServiceSchedule): Promise<ServiceSchedule> => {
    return await apiRequest('saveSchedule', schedule);
};

export const removeSchedule = async (scheduleId: string): Promise<void> => {
  await apiRequest('removeSchedule', { id: scheduleId });
};

export const saveServiceInstance = async (instance: ServiceInstance): Promise<ServiceInstance> => {
  return await apiRequest('saveServiceInstance', instance);
};

export const deleteServiceInstance = async (instanceId: string): Promise<void> => {
  await apiRequest('deleteServiceInstance', { id: instanceId });
};

// --- 안전한 원자적 업데이트 API ---

export const toggleApplication = async (serviceId: string, volunteer: Volunteer, isApplying: boolean): Promise<Volunteer[]> => {
  return await apiRequest('toggleApplication', { serviceId, volunteer, isApplying });
};

export const addComment = async (serviceId: string, comment: Comment): Promise<Comment[]> => {
  return await apiRequest('addComment', { serviceId, comment });
};

export const updateComment = async (serviceId: string, commentId: string, newText: string): Promise<Comment[]> => {
  return await apiRequest('updateComment', { serviceId, commentId, newText });
};

export const deleteComment = async (serviceId: string, commentId: string): Promise<Comment[]> => {
  return await apiRequest('deleteComment', { serviceId, commentId });
};
