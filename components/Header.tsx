
import React from 'react';
import type { Volunteer } from '../types';
import { UserRole } from '../types';
import UserIcon from './icons/UserIcon';
import LogoutIcon from './icons/LogoutIcon';
import KeyIcon from './icons/KeyIcon';

interface HeaderProps {
  currentUser: Volunteer;
  currentRole: UserRole;
  onLogout: () => void;
  onManageVolunteers: () => void;
  onManageSchedule: () => void;
  onManagePassword: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentRole,
  onLogout,
  onManageVolunteers,
  onManageSchedule,
  onManagePassword
}) => {

  return (
    <header className="bg-white shadow-md sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">봉사 신청 관리</h1>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                <UserIcon className="h-6 w-6 text-gray-500"/>
                <span className="font-semibold">{currentUser.name}</span>
                <span className="text-sm text-gray-600">({currentRole})</span>
            </div>
            
            {currentRole === UserRole.Leader && (
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={onManageSchedule}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  봉사 목록 관리
                </button>
                <button
                  onClick={onManageVolunteers}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  전도인 관리
                </button>
                <button
                  onClick={onManagePassword}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  비밀번호 관리
                </button>
              </div>
            )}
             <button
                onClick={onLogout}
                className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="로그아웃"
            >
                <LogoutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        {currentRole === UserRole.Leader && (
            <div className="sm:hidden pb-3 space-y-2">
                <button
                    onClick={onManageSchedule}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    봉사 목록 관리
                </button>
                 <button
                    onClick={onManageVolunteers}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    전도인 관리
                </button>
                <button
                    onClick={onManagePassword}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                    비밀번호 관리
                </button>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;
