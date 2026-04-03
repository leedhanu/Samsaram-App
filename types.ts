
export type UserRole = 'user' | 'admin' | 'host';

export interface User {
  uid: string;
  fullName: string;
  mobile: string;
  password?: string;
  role: UserRole;
  wallet: number;
  isBanned: boolean;
  createdAt: any;
  lastLogin?: any;
}

export interface Host extends User {
  place: string;
  age: number;
  profilePhoto: string;
  selfAudio: string;
  isOnline: boolean;
  callType: 'audio' | 'video' | 'both';
}

export interface RechargeRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  amount: number;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  // date and time are used in AdminDashboard and populated in RechargeSection
  date?: string;
  time?: string;
}

export interface PayoutRequest {
  id: string;
  hostId: string;
  hostName: string;
  hostMobile: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'credited' | 'rejected';
  createdAt: any;
}

export interface Report {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  category: string;
  description: string;
  reply?: string;
  createdAt: any;
}

export interface AppNotification {
  id: string;
  recipientId: string; // userId or 'all'
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'report';
  createdAt: any;
  isRead: boolean;
}

export interface ShortVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  category: 'Malayalam' | 'Hindi' | 'English' | 'Others';
  createdAt: any;
}
