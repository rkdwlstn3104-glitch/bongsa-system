
import React, { useState, useEffect } from 'react';
import type { Volunteer } from '../types';
import { UserRole } from '../types';

interface LoginProps {
  volunteers: Volunteer[];
  onLogin: (user: Volunteer, role: UserRole) => void;
  leaderPassword: string;
}

const Login: React.FC<LoginProps> = ({ volunteers, onLogin, leaderPassword }) => {
  const [loginMode, setLoginMode] = useState<'volunteer' | 'leader'>('volunteer');
  const [volunteerName, setVolunteerName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 1. 컴포넌트가 마운트될 때 저장된 이름을 불러옵니다.
  useEffect(() => {
    const savedName = localStorage.getItem('volunteerName');
    if (savedName) {
      setVolunteerName(savedName);
    }
  }, []);

  // 2. 이름이 변경될 때마다 로컬 스토리지에 즉시 동기화합니다.
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVolunteerName(value);
    localStorage.setItem('volunteerName', value);
  };

  const handleVolunteerLogin = () => {
    const trimmedName = volunteerName.trim();
    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }
    const user = volunteers.find(v => v.name === trimmedName);
    if (user) {
      // 로그인 성공 시에도 다시 한 번 저장하여 확실히 함
      localStorage.setItem('volunteerName', trimmedName);
      onLogin(user, UserRole.Volunteer);
    } else {
      setError('등록되지 않은 이름입니다. 봉사 인도자에게 문의하세요.');
    }
  };

  const handleLeaderLogin = () => {
    if (password.toString() === leaderPassword.toString()) {
      const leaderUser: Volunteer = {
        id: 'leader_user_account',
        name: '봉사인도자',
        gender: '형제',
        canDoPublicWitnessing: true,
      };
      onLogin(leaderUser, UserRole.Leader);
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setPassword('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (loginMode === 'volunteer') {
      handleVolunteerLogin();
    } else {
      handleLeaderLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2 text-balance">봉사 신청 관리</h1>
        <p className="text-center text-gray-600 mb-8">이름을 입력하여 로그인하세요</p>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex border-b mb-6">
            <button 
              type="button"
              onClick={() => { setLoginMode('volunteer'); setError(''); setPassword(''); }}
              className={`flex-1 py-3 text-center font-semibold transition-colors ${loginMode === 'volunteer' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100 rounded-t-lg'}`}
            >
              전도인 로그인
            </button>
            <button 
              type="button"
              onClick={() => { setLoginMode('leader'); setError(''); }}
              className={`flex-1 py-3 text-center font-semibold transition-colors ${loginMode === 'leader' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100 rounded-t-lg'}`}
            >
              인도자 로그인
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMode === 'volunteer' ? (
              <div className="animate-fade-in">
                <label htmlFor="volunteer-name-input" className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input
                  id="volunteer-name-input"
                  type="text"
                  value={volunteerName}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="등록된 이름을 입력하세요"
                  autoComplete="name"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">입력하신 이름은 브라우저에 자동 저장되어 유지됩니다.</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="관리자 비밀번호를 입력하세요"
                  autoComplete="current-password"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm text-center rounded-lg border border-red-100 animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg active:transform active:scale-[0.98]"
            >
              로그인하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
