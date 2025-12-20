
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, BackButtonListenerEvent } from '@capacitor/app';

export const useBackExit = () => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    // 1. Native Environment (Android/iOS via Capacitor)
    if (Capacitor.isNativePlatform()) {
        const setupNativeListener = async () => {
            const listener = await App.addListener('backButton', (data: BackButtonListenerEvent) => {
                // If the modal is already open, close it (toggle behavior)
                // If closed, open it to confirm exit
                setShowExitConfirm(prev => {
                    if (prev) return false; 
                    return true;
                });
            });
            return listener;
        };

        const listenerPromise = setupNativeListener();

        // Cleanup listener on unmount
        return () => {
            listenerPromise.then(listener => listener.remove());
        };
    } 
    
    // 2. Web Environment (Browser History Trap)
    else {
        // Trap Setup
        const currentState = window.history.state || {};
        if (!currentState.back_trap) {
            const newState = { ...currentState, back_trap: true };
            window.history.pushState(newState, '', window.location.href);
        }

        const handlePopState = (event: PopStateEvent) => {
            event.preventDefault();

            // Immediate Restore (Retrap)
            const poppedState = window.history.state || {};
            const reTrapState = { ...poppedState, back_trap: true };
            window.history.pushState(reTrapState, '', window.location.href);

            // Show Modal
            setShowExitConfirm(true);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }
  }, []);

  const confirmExit = () => {
    if (Capacitor.isNativePlatform()) {
        // Native Exit
        App.exitApp();
    } else {
        // Web Exit Attempt
        try {
            window.close(); 
        } catch (e) {
            console.error(e);
        }
        // Fallback: Go back twice to escape the trap and the previous page
        window.history.go(-2);
    }
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  return { showExitConfirm, confirmExit, cancelExit };
};
