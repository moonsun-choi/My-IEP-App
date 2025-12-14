
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, CheckSquare, BarChart2, LayoutDashboard, Users, Cloud, Upload, Download, Loader2, BookOpen, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { googleDriveService } from '../services/googleDrive';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGoogleScriptReady, setIsGoogleScriptReady] = useState(false);
  const [isScriptSlow, setIsScriptSlow] = useState(false);
  
  const location = useLocation();
  const { isLoggedIn, isOnline, syncStatus, setLoggedIn, setOnlineStatus, syncCloudToLocal, syncLocalToCloud } = useStore();

  useEffect(() => {
    // 1. Init Google Drive
    
    // Set a timeout to indicate slow network if scripts don't load quickly
    const slowTimer = setTimeout(() => {
        if (!isGoogleScriptReady) setIsScriptSlow(true);
    }, 6000); // 6 seconds

    googleDriveService.init(() => {
        // Callback when ready
        setIsGoogleScriptReady(true);
        setIsScriptSlow(false);
        console.log("Google Service Initialized");
    });

    // 2. Setup Online/Offline listeners
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial Check
    setOnlineStatus(navigator.onLine);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearTimeout(slowTimer);
    };
  }, [setOnlineStatus]);

  // 3. Protect against accidental closure during sync
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (syncStatus === 'syncing') {
            e.preventDefault();
            // Standard message for legacy browsers (modern browsers ignore the message but show a generic prompt)
            e.returnValue = '데이터 동기화 중입니다. 앱을 종료하면 변경사항이 저장되지 않을 수 있습니다.';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncStatus]);

  // Close sidebar automatically when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleGoogleLogin = async () => {
      if (!isGoogleScriptReady) {
          toast.loading("Google 서비스 준비 중입니다...");
          return;
      }

      try {
          await googleDriveService.login();
          setLoggedIn(true);
          toast.success("Google 로그인 성공");
      } catch (e: any) {
          console.error("Login Failed:", e);
          
          if (e.message === "Configuration missing") {
              toast.error("Google API 설정이 누락되었습니다");
          } else if (e.message?.includes("not initialized") || e.message?.includes("로딩 중")) {
              toast.loading("Google 서비스 로딩 중...");
          } else if (e.type === 'popup_blocked_by_browser') {
              toast.error("브라우저 팝업이 차단되었습니다");
          } else {
              toast.error("로그인 중 오류가 발생했습니다");
          }
      }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: '대시보드', path: '/' },
    { icon: Users, label: '나의 학급', path: '/students' },
    { icon: CheckSquare, label: '관찰 기록', path: '/tracker' },
    { icon: BarChart2, label: '보고서', path: '/reports' },
  ];

  const getPageTitle = () => {
    if (location.pathname.startsWith('/student/')) return '개별화교육(IEP) 상세';
    const current = menuItems.find(item => item.path === location.pathname);
    return current ? current.label : 'My IEP App';
  };

  // Status UI Helper
  const renderSyncStatus = () => {
      if (!isOnline) {
          return (
              <div className="flex items-center gap-2 text-gray-400">
                  <CloudOff size={16} />
                  <span className="text-xs font-bold">오프라인 모드</span>
              </div>
          );
      }

      // Check Configuration Status
      if (!googleDriveService.isConfigured()) {
          return (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-bold">설정 필요</span>
                  </div>
                  <p className="text-[10px] text-amber-600/80 leading-tight mb-2">
                      Google Drive 동기화를 위해 API 키 설정이 필요합니다.
                  </p>
                  <button 
                    onClick={() => toast.error("VITE_GOOGLE_CLIENT_ID 및 API_KEY 환경변수가 설정되지 않았습니다.")}
                    className="w-full bg-white text-amber-600 py-2 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-50 transition-colors"
                  >
                      설정 확인
                  </button>
              </div>
          );
      }
      
      if (!isLoggedIn) {
          return (
              <button 
                onClick={isScriptSlow ? () => window.location.reload() : handleGoogleLogin}
                disabled={!isGoogleScriptReady && !isScriptSlow}
                className={`w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isGoogleScriptReady ? (
                    <>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4"/>
                        Google 로그인 및 동기화
                    </>
                ) : isScriptSlow ? (
                    <>
                        <RefreshCw size={16} className="text-amber-500" />
                        연결 지연 (터치하여 새로고침)
                    </>
                ) : (
                    <>
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                        서비스 로딩 중...
                    </>
                )}
              </button>
          );
      }

      if (syncStatus === 'syncing') {
          return (
              <div className="flex items-center justify-center gap-2 text-indigo-600 py-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-bold">클라우드 저장 중...</span>
              </div>
          );
      }

      if (syncStatus === 'cloud_newer') {
          return (
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 animate-pulse">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold">클라우드 데이터 발견</span>
                </div>
                <button 
                    onClick={() => syncCloudToLocal()}
                    className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                >
                    <Download size={14} />
                    데이터 내려받기 (복원)
                </button>
            </div>
          );
      }
      
      // Default: Logged in and Idle/Saved
      return (
          <div className="space-y-3">
              <div className="flex items-center justify-between text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} />
                    <span className="text-xs font-bold">동기화 완료</span>
                  </div>
                  {syncStatus === 'saved' && <span className="text-[10px] font-medium">방금 전</span>}
              </div>
              
              <div className="grid grid-cols-2 gap-2 opacity-50 hover:opacity-100 transition-opacity">
                   <button onClick={() => syncLocalToCloud()} className="text-[10px] flex items-center justify-center gap-1 py-1 bg-gray-100 rounded text-gray-500 hover:bg-gray-200">
                       <Upload size={10} /> 업로드
                   </button>
                   <button onClick={() => syncCloudToLocal()} className="text-[10px] flex items-center justify-center gap-1 py-1 bg-gray-100 rounded text-gray-500 hover:bg-gray-200">
                       <Download size={10} /> 다운로드
                   </button>
              </div>
          </div>
      );
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

        {/* Footer / Cloud Sync Status */}
        <div className="p-4 mt-auto">
            <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50/50">
                <div className="mb-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Cloud Sync</div>
                    {renderSyncStatus()}
                </div>
            </div>
            <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-300 font-medium">v1.1.0 (Auto-Sync)</p>
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
                        {isOnline ? 'Online Mode' : 'Offline Mode (Local Storage)'}
                    </span>
                </div>
            </div>
            
            {/* Header Status Icon (Mobile/Desktop) */}
            <div className="flex items-center gap-2">
                 {!isOnline && <CloudOff size={20} className="text-gray-300" />}
                 {isOnline && isLoggedIn && syncStatus === 'saved' && <CheckSquare size={20} className="text-green-500" />}
                 {isOnline && isLoggedIn && syncStatus === 'syncing' && <RefreshCw size={20} className="text-indigo-500 animate-spin" />}
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
