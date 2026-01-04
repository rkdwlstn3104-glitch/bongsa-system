
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
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-600 whitespace-nowrap mr-2">
            봉사 신청 관리
          </h1>
          <div className="flex items-center space-x-1 sm:space-x-4 overflow-hidden">
            <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg whitespace-nowrap overflow-hidden">
                <UserIcon className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500 shrink-0"/>
                <span className="font-semibold text-xs sm:text-base truncate max-w-[60px] sm:max-w-none">{currentUser.name}</span>
                <span className="text-[10px] sm:text-sm text-gray-600">({currentRole})</span>
            </div>
            
            {currentRole === UserRole.Leader && (
              <div className="hidden sm:flex items-center space-x-2 shrink-0">
                <button
                  onClick={onManageSchedule}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 whitespace-nowrap"
                >
                  봉사 목록 관리
                </button>
                <button
                  onClick={onManageVolunteers}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                >
                  전도인 관리
                </button>
                <button
                  onClick={onManagePassword}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 whitespace-nowrap"
                >
                  비밀번호 관리
                </button>
              </div>
            )}
             <button
                onClick={onLogout}
                className="p-1.5 sm:p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
                title="로그아웃"
            >
                <LogoutIcon className="h-5 w-5 sm:h-6 sm:w-6" />
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
