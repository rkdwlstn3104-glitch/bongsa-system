import type { Volunteer, ServiceSchedule, ServiceInstance, Comment } from '../types';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz23kOAv4o77NN4m2yUKlua9u7prMms9tWRlOD20hba-OjW1nrjukLCJvHHj090P9L57w/exec';

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
      throw new Error(result.message || 'API 내부 오류가 발생했습니다.');
    }

    return result.data;
  } catch (error: any) {
    console.error(`API Request Error [${action}]:`, error);
    throw error;
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
