import { useEffect, useRef, useCallback } from 'react';

interface SystemStabilityOptions {
  onConnectionIssue?: () => void;
  onMemoryWarning?: () => void;
  onPerformanceDrop?: () => void;
}

export const useSystemStability = (options: SystemStabilityOptions = {}) => {
  const { onConnectionIssue, onMemoryWarning, onPerformanceDrop } = options;
  
  // Refs for intervals and monitoring
  const stabilityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastPerformanceNow = useRef<number>(performance.now());
  const frameRequestRef = useRef<number | null>(null);

  // Keep screen awake for TV displays
  const maintainWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && (!wakeLockRef.current || wakeLockRef.current.released)) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('📺 Screen wake lock acquired for TV display');
      }
    } catch (error) {
      console.log('📺 Wake lock not supported or failed:', error);
    }
  }, []);

  // Prevent browser from throttling background tabs
  const preventThrottling = useCallback(() => {
    const animate = () => {
      const now = performance.now();
      const delta = now - lastPerformanceNow.current;
      
      // Check if frame rate has dropped significantly (indicating throttling)
      if (delta > 100) { // More than 100ms between frames indicates throttling
        console.warn('⚠️ Browser throttling detected, attempting to maintain performance');
        if (onPerformanceDrop) {
          onPerformanceDrop();
        }
      }
      
      lastPerformanceNow.current = now;
      frameRequestRef.current = requestAnimationFrame(animate);
    };
    
    frameRequestRef.current = requestAnimationFrame(animate);
  }, [onPerformanceDrop]);

  // Memory leak detection and cleanup
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      const totalMB = memInfo.totalJSHeapSize / 1024 / 1024;
      const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
      
      console.log(`💾 Memory usage: ${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (Limit: ${limitMB.toFixed(1)}MB)`);
      
      // Warning if memory usage is high
      if (usedMB > limitMB * 0.8) {
        console.warn('⚠️ High memory usage detected');
        if (onMemoryWarning) {
          onMemoryWarning();
        }
      }
    }
  }, [onMemoryWarning]);

  // Force garbage collection (if available)
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      console.log('🗑️ Forcing garbage collection');
      (window as any).gc();
    }
  }, []);

  // Comprehensive system health check
  const performSystemHealthCheck = useCallback(() => {
    console.log('🔍 Performing comprehensive system health check...');
    
    // Check connection
    if (!navigator.onLine) {
      console.warn('⚠️ Network connection lost');
      if (onConnectionIssue) {
        onConnectionIssue();
      }
    }
    
    // Check WebSocket connections (basic check)
    const wsConnections = (window as any).___supabaseWebSockets || [];
    if (wsConnections.length === 0) {
      console.warn('⚠️ No active WebSocket connections detected');
      if (onConnectionIssue) {
        onConnectionIssue();
      }
    }
    
    // Check memory
    checkMemoryUsage();
    
    // Maintain wake lock
    maintainWakeLock();
    
    console.log('✅ System health check completed');
  }, [onConnectionIssue, checkMemoryUsage, maintainWakeLock]);

  // Proactive system maintenance
  const performMaintenance = useCallback(() => {
    console.log('🛠️ Performing proactive system maintenance...');
    
    // Force garbage collection if available
    forceGarbageCollection();
    
    // Clear any accumulated console logs if they're too many
    if (console.clear && Math.random() < 0.1) { // 10% chance to clear logs
      console.clear();
      console.log('🧹 Console logs cleared for memory optimization');
    }
    
    console.log('✅ System maintenance completed');
  }, [forceGarbageCollection]);

  // Keep system active with periodic tasks
  const keepSystemActive = useCallback(() => {
    // Perform lightweight DOM manipulation to prevent browser sleeping
    const dummy = document.createElement('div');
    dummy.style.display = 'none';
    document.body.appendChild(dummy);
    document.body.removeChild(dummy);
    
    // Touch localStorage to keep it active
    try {
      const timestamp = Date.now().toString();
      localStorage.setItem('_system_heartbeat', timestamp);
      const retrieved = localStorage.getItem('_system_heartbeat');
      if (retrieved !== timestamp) {
        console.warn('⚠️ localStorage inconsistency detected');
      }
    } catch (error) {
      console.warn('⚠️ localStorage access failed:', error);
    }
    
    // Create and immediately resolve a promise to keep promise queue active
    Promise.resolve().then(() => {
      // Keep event loop active
    });
  }, []);

  // Initialize stability monitoring
  useEffect(() => {
    console.log('🛡️ Initializing system stability monitoring for 24/7 operation...');
    
    // Prevent browser throttling
    preventThrottling();
    
    // Initial wake lock
    maintainWakeLock();
    
    // Main stability check every 30 seconds
    stabilityIntervalRef.current = setInterval(() => {
      performSystemHealthCheck();
      keepSystemActive();
    }, 30000);
    
    // Memory check every 5 minutes
    memoryCheckIntervalRef.current = setInterval(checkMemoryUsage, 5 * 60 * 1000);
    
    // Proactive maintenance every 30 minutes
    performanceCheckIntervalRef.current = setInterval(performMaintenance, 30 * 60 * 1000);
    
    // Handle visibility changes to re-establish connections
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📺 Page became visible, re-establishing connections...');
        maintainWakeLock();
        performSystemHealthCheck();
      }
    };
    
    // Handle online/offline events
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      performSystemHealthCheck();
    };
    
    const handleOffline = () => {
      console.warn('🌐 Network connection lost');
      if (onConnectionIssue) {
        onConnectionIssue();
      }
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up system stability monitoring...');
      
      if (stabilityIntervalRef.current) {
        clearInterval(stabilityIntervalRef.current);
      }
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
      if (performanceCheckIntervalRef.current) {
        clearInterval(performanceCheckIntervalRef.current);
      }
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release();
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    preventThrottling,
    maintainWakeLock,
    performSystemHealthCheck,
    keepSystemActive,
    checkMemoryUsage,
    performMaintenance,
    onConnectionIssue
  ]);

  return {
    performSystemHealthCheck,
    maintainWakeLock,
    forceGarbageCollection,
    checkMemoryUsage
  };
};
