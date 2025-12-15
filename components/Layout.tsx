
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, CheckSquare, BarChart2, LayoutDashboard, Users, Cloud, Upload, Download, Loader2, CloudOff, AlertTriangle, RefreshCw, LogOut, User as UserIcon } from 'lucide-react';
import { googleDriveService } from '../services/googleDrive';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGoogleScriptReady, setIsGoogleScriptReady] = useState(false);
  
  const location = useLocation();
  const { 
    isLoggedIn, isOnline, syncStatus, user,
    setLoggedIn, setOnlineStatus, setUser, logout,
    syncCloudToLocal, syncLocalToCloud, checkCloudStatus
  } = useStore();

  // --- Periodic Sync Cycle (30 seconds) ---
  useEffect(() => {
    // Only run if logged in and online
    if (!isLoggedIn || !isOnline) return;

    const syncInterval = setInterval(() => {
        // 1. Check for incoming changes from cloud
        checkCloudStatus();
        
        // 2. Retry upload if in error state or just to be safe
        if (syncStatus === 'error') {
            syncLocalToCloud();
        }
    }, 30000); // 30 seconds cycle

    return () => clearInterval(syncInterval);
  }, [isLoggedIn, isOnline, syncStatus, checkCloudStatus, syncLocalToCloud]);

  useEffect(() => {
    // 1. Init Google Drive
    const initDrive = async () => {
        try {
            await googleDriveService.init(async () => {
                setIsGoogleScriptReady(true);
                
                // Attempt to restore session on refresh
                const restoredUser = await googleDriveService.restoreSession();
                if (restoredUser) {
                     setUser({
                        name: restoredUser.name,
                        email: restoredUser.email,
                        picture: restoredUser.picture
                    });
                    setLoggedIn(true);
                    // toast.success("로그인 상태 복구됨", { id: 'restore-login' });
                }
            });
        } catch (err) {
            console.log("Initial Google service load failed:", err);
        }
    };
    initDrive();

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
    };
  }, [setOnlineStatus]);

  // 3. Protect against accidental closure during sync
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (syncStatus === 'syncing') {
            e.preventDefault();
            e.returnValue = '데이터 동기화 중입니다.';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncStatus]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleGoogleLogin = async () => {
      if (!navigator.onLine) {
          toast.error("인터넷 연결을 확인해주세요.", { id: 'offline-error', duration: 2000 });
          return;
      }

      if (!isGoogleScriptReady) {
          const loadingId = toast.loading("Google 서비스 연결 재시도 중...", { id: 'retry-loading' });
          try {
            await googleDriveService.init(() => {
                setIsGoogleScriptReady(true);
            });
            toast.dismiss(loadingId);
          } catch (e) {
            toast.dismiss(loadingId);
            toast.error("연결에 실패했습니다.", { id: 'retry-error', duration: 3000 });
            return;
          }
      }

      try {
          toast.dismiss();
          await googleDriveService.login();
          const userInfo = await googleDriveService.getUserInfo();
          if (userInfo) {
              setUser({
                  name: userInfo.name,
                  email: userInfo.email,
                  picture: userInfo.picture
              });
          }
          setLoggedIn(true);
          toast.success("Google 로그인 성공", { duration: 3000 });
      } catch (e: any) {
          console.error("Login Failed:", e);
          if (e.message === "Configuration missing") {
              toast.error("API 키 설정이 필요합니다", { duration: 3000 });
          } else {
              toast.error("로그인 중 오류가 발생했습니다.", { duration: 3000 });
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

  const renderProfileCard = () => {
      if (!isOnline) {
          return (
             <div className="bg-gray-100 p-4 rounded-2xl flex items-center gap-3 opacity-60">
                 <div className="p-2 bg-gray-200 rounded-full">
                     <CloudOff size={20} className="text-gray-500" />
                 </div>
                 <div>
                     <div className="text-xs font-bold text-gray-500">오프라인 모드</div>
                     <div className="text-[10px] text-gray-400">네트워크 연결 끊김</div>
                 </div>
             </div>
          );
      }

      if (!isLoggedIn) {
          return (
             <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
                 <div className="text-xs font-bold text-gray-500 mb-3 text-center">데이터 백업을 위해 로그인하세요</div>
                 <button 
                    onClick={handleGoogleLogin}
                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                 >
                    {isGoogleScriptReady ? (
                        <>
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4"/>
                            <span>Google 계정으로 로그인</span>
                        </>
                    ) : (
                        <>
                            <Loader2 size={14} className="animate-spin text-gray-400" />
                            <span className="text-gray-400">연결 중...</span>
                        </>
                    )}
                 </button>
             </div>
          );
      }

      return (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm relative group">
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                      {user?.picture ? (
                          <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <UserIcon size={20} />
                          </div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate leading-tight">{user?.name || '사용자'}</div>
                      <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
                  </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 mb-3">
                    <span className="text-xs font-bold text-gray-500">Cloud Sync</span>
                    <div className="flex items-center gap-1.5">
                        {syncStatus === 'syncing' && (
                            <>
                                <RefreshCw size={12} className="text-cyan-500 animate-spin" />
                                <span className="text-[10px] text-cyan-500 font-bold">동기화 중</span>
                            </>
                        )}
                        {syncStatus === 'saved' && (
                            <>
                                <Cloud size={12} className="text-green-500" />
                                <span className="text-[10px] text-green-600 font-bold">동기화 완료</span>
                            </>
                        )}
                        {syncStatus === 'error' && (
                            <>
                                <AlertTriangle size={12} className="text-red-500" />
                                <span className="text-[10px] text-red-500 font-bold">오류 발생</span>
                            </>
                        )}
                        {syncStatus === 'cloud_newer' && (
                            <>
                                <Download size={12} className="text-orange-500 animate-bounce" />
                                <span className="text-[10px] text-orange-500 font-bold">새 데이터 있음</span>
                            </>
                        )}
                        {syncStatus === 'idle' && (
                            <span className="text-[10px] text-gray-400">대기 중</span>
                        )}
                    </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                   {syncStatus === 'cloud_newer' ? (
                        <div className="col-span-3 flex gap-1.5">
                            <button 
                                onClick={syncCloudToLocal}
                                className="flex-1 bg-orange-50 text-orange-600 border border-orange-100 py-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-orange-100 active:scale-95 transition-all leading-none"
                            >
                                <Download size={14} className="mb-0.5"/>
                                <span>복원</span>
                            </button>
                            <button 
                                onClick={() => {
                                    if(confirm("현재 기기의 데이터로 클라우드 백업을 덮어씁니다.\n(클라우드에 있는 이전 데이터는 삭제됩니다)\n\n계속하시겠습니까?")) {
                                        syncLocalToCloud();
                                    }
                                }}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-gray-50 active:scale-95 transition-all leading-none"
                            >
                                <Upload size={14} className="mb-0.5"/>
                                <span>덮어쓰기</span>
                            </button>
                        </div>
                   ) : (
                       <button 
                            onClick={syncLocalToCloud}
                            disabled={syncStatus === 'syncing'}
                            className="col-span-3 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-all"
                        >
                            <Upload size={12} /> 
                            {syncStatus === 'syncing' ? '업로드 중...' : '지금 동기화'}
                        </button>
                   )}
                   
                   <button 
                        onClick={logout}
                        title="로그아웃"
                        className="col-span-1 bg-white border border-gray-200 text-red-400 py-2 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all"
                   >
                       <LogOut size={14} />
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
        <div className="px-6 py-8 flex items-center justify-between shrink-0">
          <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-100 group-hover:scale-105 transition-transform overflow-hidden relative bg-cyan-500">
               <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-lime-400 rounded-full" />
               </div>
            </div>
            <div className="flex flex-col">
                <h2 className="text-xl font-black tracking-tight text-gray-800 leading-none">My IEP</h2>
                <span className="text-xs font-bold text-cyan-500 tracking-wider">APP</span>
            </div>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 md:hidden bg-gray-50 rounded-full">
            <X size={20} />
          </button>
        </div>

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
                        ? 'bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-100' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }
                `}
              >
                <div className="flex items-center gap-3.5">
                    <Icon 
                        size={22} 
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`transition-colors ${isActive ? 'text-cyan-600' : 'text-gray-400 group-hover:text-gray-600'}`} 
                    />
                    <span className={`font-semibold text-[15px] ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
            {renderProfileCard()}
            <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-300 font-medium">v1.1.5</p>
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative md:ml-[280px] transition-all duration-300">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60 pt-[env(safe-area-inset-top)] transition-all">
          <div className="h-[68px] flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 -ml-2.5 text-gray-500 hover:bg-gray-100/80 hover:text-gray-800 rounded-xl transition-colors md:hidden shrink-0"
                >
                <Menu size={24} />
                </button>
                <div className="flex flex-col min-w-0 pr-4">
                    <h1 className="text-lg md:text-xl font-extrabold text-gray-800 tracking-tight leading-tight truncate">
                        {getPageTitle()}
                    </h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 {!isOnline && <CloudOff size={20} className="text-gray-300" />}
                 {isOnline && isLoggedIn && syncStatus === 'syncing' && <RefreshCw size={20} className="text-cyan-500 animate-spin" />}
            </div>
          </div>
        </header>

        {/* Added overflow-x-hidden to prevent page-wide horizontal scroll */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-0 scroll-smooth bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};
