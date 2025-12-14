
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, CheckSquare, BarChart2, LayoutDashboard, Users, Cloud, Upload, Download, Loader2, BookOpen } from 'lucide-react';
import { googleDriveService } from '../services/googleDrive';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { exportData, importData } = useStore();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    googleDriveService.init(() => {
        // Check if previously logged in logic could go here
    });
  }, []);

  // Close sidebar automatically when route changes (e.g. back button pressed)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleGoogleLogin = async () => {
      try {
          await googleDriveService.login();
          setIsLoggedIn(true);
      } catch (e: any) {
          console.error("Login Failed:", e);
          
          if (e.message === "Configuration missing") {
              alert("Google API 설정이 누락되었습니다. .env 파일을 확인해주세요.");
          } else if (e.message?.includes("not initialized")) {
              alert("Google 서비스가 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.");
          } else if (e.type === 'popup_blocked_by_browser') {
              alert("브라우저가 로그인 팝업을 차단했습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
          } else if (e.type === 'popup_closed_by_user') {
              // User closed the popup, no need to alert error
          } else {
              alert("로그인 중 오류가 발생했습니다. (콘솔 확인 필요)");
          }
      }
  };

  const handleBackup = async () => {
      if (!isLoggedIn) return;
      setIsSyncing(true);
      setSyncStatus('idle');
      try {
          const data = await exportData();
          await googleDriveService.uploadBackup(data);
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 3000);
          
          if (!googleDriveService.isConfigured()) {
              alert("백업 완료 (시뮬레이션)\n* 실제 Google Drive 연동을 위해선 코드를 설정해야 합니다.");
          }
      } catch (e) {
          console.error(e);
          setSyncStatus('error');
          alert("백업 실패");
      } finally {
          setIsSyncing(false);
      }
  };

  const handleRestore = async () => {
      if (!isLoggedIn) return;
      if (!confirm("현재 데이터를 덮어쓰고 복원하시겠습니까?")) return;

      setIsSyncing(true);
      try {
          const json = await googleDriveService.downloadBackup();
          if (json) {
            await importData(json);
            alert("복원 완료되었습니다.");
            window.location.reload();
          } else {
            alert("백업 파일을 찾을 수 없거나 (시뮬레이션 모드) 파일이 비어있습니다.");
          }
      } catch (e) {
          console.error(e);
          alert("복원 실패");
      } finally {
          setIsSyncing(false);
      }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: '대시보드', path: '/' },
    { icon: Users, label: '내 학급', path: '/students' },
    { icon: CheckSquare, label: '관찰 기록', path: '/tracker' },
    { icon: BarChart2, label: '보고서', path: '/reports' },
  ];

  const getPageTitle = () => {
    if (location.pathname.startsWith('/student/')) return '개별화교육(IEP) 상세';
    const current = menuItems.find(item => item.path === location.pathname);
    return current ? current.label : 'My IEP App';
  };

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden w-full relative">
      {/* Sidebar Overlay (Mobile Only) */}
      <div 
        className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar - Desktop & Mobile Drawer */}
      <div 
        className={`
            fixed inset-y-0 left-0 w-[280px] bg-white z-50 
            transform transition-transform duration-300 ease-out 
            pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
            md:translate-x-0 border-r border-gray-100 shadow-2xl md:shadow-none flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div className="px-6 py-8 flex items-center justify-between shrink-0">
          <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                <BookOpen size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
                <h2 className="text-xl font-black tracking-tight text-gray-800 leading-none">My IEP</h2>
                <span className="text-xs font-bold text-indigo-500 tracking-wider">APP</span>
            </div>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 md:hidden bg-gray-50 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar space-y-1">
          <div className="px-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Menu</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                    group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200
                    ${isActive 
                        ? 'bg-indigo-50/80 text-indigo-700 shadow-sm ring-1 ring-indigo-100' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }
                `}
              >
                <div className="flex items-center gap-3.5">
                    <Icon 
                        size={22} 
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} 
                    />
                    <span className={`font-semibold text-[15px] ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Cloud Sync */}
        <div className="p-4 mt-auto">
            <div className={`rounded-2xl border p-4 transition-all duration-300 ${isLoggedIn ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${isLoggedIn ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Cloud size={14} fill="currentColor" />
                    </div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        {isLoggedIn ? 'Cloud Connected' : 'Backup Sync'}
                    </span>
                </div>
                
                {!isLoggedIn ? (
                    <button 
                        onClick={handleGoogleLogin}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-gray-200 shadow-sm transition-all active:scale-95"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google 로그인
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={handleBackup}
                            disabled={isSyncing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isSyncing ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
                            백업하기
                        </button>
                        <button 
                            onClick={handleRestore}
                            disabled={isSyncing}
                            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isSyncing ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                            복원하기
                        </button>
                    </div>
                )}
                
                {syncStatus === 'success' && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold text-green-600 animate-pulse">
                        <CheckSquare size={10} />
                        <span>데이터 동기화 완료</span>
                    </div>
                )}
            </div>
            <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-300 font-medium">v1.1.0 (Beta)</p>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative md:ml-[280px] transition-all duration-300">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60 pt-[env(safe-area-inset-top)] transition-all">
          <div className="h-[68px] flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 -ml-2.5 text-gray-500 hover:bg-gray-100/80 hover:text-gray-800 rounded-xl transition-colors md:hidden shrink-0"
                >
                <Menu size={24} />
                </button>
                
                {/* Breadcrumb-like Title */}
                <div className="flex flex-col min-w-0 pr-4">
                    <h1 className="text-lg md:text-xl font-extrabold text-gray-800 tracking-tight leading-tight truncate">
                        {getPageTitle()}
                    </h1>
                    <span className="text-[10px] md:text-xs font-medium text-gray-400 truncate">
                        My IEP App Workspace
                    </span>
                </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-0 scroll-smooth bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};
