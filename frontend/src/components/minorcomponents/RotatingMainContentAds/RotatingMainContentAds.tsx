import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io, Socket } from "socket.io-client";
import axios from "axios";
import styles from './RotatingMainContentAds.module.css';
import { MainContentAdCard } from '../MainContentAdCard/MainContentAdCard';
import { baseURL } from '../../../utils';
import { Ad } from '../types';

// Create a module-level socket instance (singleton pattern)
let globalSocket: Socket | null = null;

interface RotatingMainContentAdsProps {
  ads: Ad[];
}

interface SettingsResponse {
  totalCycleTime?: number;
  [key: string]: any;
}

const DEFAULT_CYCLE_TIME = 600000; // 10 minutes

// Initialize the socket only once
const getSocket = () => {
  if (!globalSocket) {
    try {
      const token = localStorage.getItem('token');
      
      globalSocket = io(baseURL, {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000, // Increased timeout
        auth: { token }
      });
      
      // Global connection handlers
      globalSocket.on("connect", () => {
        console.log('Socket initialized and connected');
      });
      
      globalSocket.on("connect_error", (error: Error) => {
        console.error("Socket connection error:", error);
      });
      
      // Don't disconnect on component unmount
      globalSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        if (reason === "io server disconnect") {
          // Reconnect if server disconnected
          setTimeout(() => {
            if (globalSocket) globalSocket.connect();
          }, 5000);
        }
      });
    } catch (error) {
      console.error("Error initializing socket:", error);
      return null;
    }
  }
  return globalSocket;
};

export const RotatingMainContentAds = ({ ads }: RotatingMainContentAdsProps) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cycleTime, setCycleTime] = useState(DEFAULT_CYCLE_TIME);
  const [isVisible, setIsVisible] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const transitionRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  const socketListenerAddedRef = useRef(false);

  // Get the singleton socket instance
  const socket = useMemo(() => getSocket(), []);

  // Fetch settings without socket
  const fetchSettings = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get<SettingsResponse>(`${baseURL}/settings`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        withCredentials: true
      });
      
      if (!isMountedRef.current) return;
      
      if (response.data?.totalCycleTime) {
        console.log(`Setting cycle time to ${response.data.totalCycleTime}ms`);
        setCycleTime(response.data.totalCycleTime);
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  // Memoize sorted ads
  const sortedAds = useMemo(() => {
    if (!Array.isArray(ads) || !ads.length) return [];
    return [...ads].sort((a, b) => {
      const orderA = a.orderInCasinosPage ?? Infinity;
      const orderB = b.orderInCasinosPage ?? Infinity;
      return orderA - orderB;
    });
  }, [ads]);

  // Visibility observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Mount/unmount handler
  useEffect(() => {
    isMountedRef.current = true;
    
    // Fetch settings on mount
    fetchSettings();
    
    return () => {
      isMountedRef.current = false;
      
      // Clear intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (transitionRef.current) {
        clearTimeout(transitionRef.current);
      }
    };
  }, [fetchSettings]);

  // Socket event listener - separate from socket initialization
  useEffect(() => {
    // Add socket listener only if not already added
    if (socket && !socketListenerAddedRef.current) {
      socketListenerAddedRef.current = true;
      
      // Listen for settings updates
      socket.on("settings_updated", (updatedSettings: SettingsResponse) => {
        if (!isMountedRef.current) return;
        
        if (updatedSettings?.totalCycleTime) {
          console.log(`Socket event: Setting cycle time to ${updatedSettings.totalCycleTime}ms`);
          setCycleTime(updatedSettings.totalCycleTime);
        }
      });
      
      // Remove listener on component unmount
      return () => {
        if (socket) {
          socket.off("settings_updated");
          socketListenerAddedRef.current = false;
        }
      };
    }
  }, [socket]);

  // Rotation handler
  const rotateAd = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
    }

    setIsTransitioning(true);
    
    transitionRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      setIsTransitioning(false);
      setCurrentAdIndex(prevIndex => (prevIndex + 1) % sortedAds.length);
    }, 300);
  }, [sortedAds.length]);

  // Handle rotation intervals
  useEffect(() => {
    if (!sortedAds.length || !isVisible) return;

    // Clear previous interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Calculate individual ad display time
    const calculatedInterval = sortedAds.length > 0 ? Math.max(cycleTime / sortedAds.length, 10000) : cycleTime;
    console.log(`Setting rotation interval to ${calculatedInterval}ms for each ad (total cycle: ${cycleTime}ms)`);
    
    // Set up new interval
    intervalRef.current = setInterval(rotateAd, calculatedInterval);

    // Cleanup on unmount or deps change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sortedAds.length, cycleTime, isVisible, rotateAd]);

  if (!Array.isArray(sortedAds) || !sortedAds.length) return null;

  return (
    <div 
      ref={containerRef}
      className={styles.mainContentSection}
      style={{ minHeight: '100px' }}
    >
      <div 
        className={`${styles.rotatingAdContainer} ${isTransitioning ? styles.transitioning : ''}`}
        style={{ willChange: 'opacity' }}
      >
        <MainContentAdCard 
          key={sortedAds[currentAdIndex]._id} 
          ad={sortedAds[currentAdIndex]} 
        />
      </div>
    </div>
  );
};