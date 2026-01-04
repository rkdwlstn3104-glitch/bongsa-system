
export type Gender = '형제' | '자매';

export interface Volunteer {
  id: string;
  name: string;
  gender: Gender;
  canDoPublicWitnessing: boolean;
}

export type ServiceType = '호별' | '전시대' | '전시대&호별';

export interface ServiceSchedule {
  id?: string;
  dayOfWeek: number; // 0 for Sunday, ..., 6 for Saturday
  time: string;
  leader: string;
  phoneNumber: string;
  type: ServiceType;
  location: string;
  deadlineDayOffset: number; // e.g., 1 for 1 day before
  deadlineTime: string; // e.g., "18:00"
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string; // ISO string
}

export interface ServiceInstance extends ServiceSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  applicants: Volunteer[];
  comments: Comment[];
  assignments?: Record<string, Volunteer[]>; // Spot assignments: { '스팟A-1조': [v1, v2], ... }
  pairs?: Volunteer[][]; // 조 편성: [[v1, v2], [v3, v4, v5], ...]
}

export type ServiceFormData = Omit<ServiceInstance, 'id' | 'date' | 'applicants' | 'dayOfWeek' | 'comments' | 'assignments' | 'pairs'>;

export enum UserRole {
  Leader = '봉사인도자',
  Volunteer = '전도인',
}
