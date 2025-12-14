
import { useState, useEffect } from 'react';

export const useBackExit = () => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    // 1. Trap Setup (초기 설정)
    // React Router가 사용하는 state(key 등)를 덮어쓰지 않도록 기존 state를 복사해야 합니다.
    const currentState = window.history.state || {};
    
    // 이미 트랩이 설정되어 있지 않은 경우에만 push (StrictMode 등 중복 방지)
    if (!currentState.back_trap) {
        const newState = { ...currentState, back_trap: true };
        window.history.pushState(newState, '', window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      // 뒤로가기 버튼 클릭됨. 브라우저는 이미 이전 히스토리로 이동한 상태.
      event.preventDefault();

      // 2. Immediate Restore (즉시 복구)
      // 사용자가 화면에 머물도록(Trap), 그리고 '취소'를 눌렀을 때를 대비해
      // 즉시 트랩 상태를 다시 히스토리 스택에 밀어넣습니다.
      // 이때도 이동한 시점(Prev)의 router state를 유지하며 trap 플래그만 추가합니다.
      const poppedState = window.history.state || {};
      const reTrapState = { ...poppedState, back_trap: true };
      window.history.pushState(reTrapState, '', window.location.href);

      // 3. Show Modal
      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const confirmExit = () => {
    // 현재 상태는 handlePopState에서 복구된 [..., Prev, Trap] 입니다.
    // 앱을 종료(이탈)하려면 Trap과 Prev를 모두 벗어나야 하므로 2단계 뒤로 이동합니다.
    try {
        window.close(); // PWA/Android Webview 대응
    } catch (e) {
        console.error(e);
    }
    // 브라우저 히스토리상 앱 진입 전으로 이동
    window.history.go(-2);
  };

  const cancelExit = () => {
    // handlePopState에서 이미 트랩을 복구해두었으므로, 모달만 닫으면 됩니다.
    setShowExitConfirm(false);
  };

  return { showExitConfirm, confirmExit, cancelExit };
};
