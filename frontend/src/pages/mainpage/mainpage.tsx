import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Demo } from './Demo';
import axios from 'axios';
import styles from "./PlinkoLandingPage.module.css"; // Using GamePage styles
import { StandardAdCard } from '../../components/minorcomponents/StandardAdCard/StandardAdCard';
import { FooterAdCard } from "../../components/minorcomponents/footeradcard/footerAdCard";
import { SidebarAdCard } from '../../components/minorcomponents/SidebarAdCard/SidebarAdCard';
import { RotatingMainContentAds } from '../../components/minorcomponents/RotatingMainContentAds/RotatingMainContentAds';
import { AdContainer } from '../../components/minorcomponents/AdContainer/AdContainer';
import { Ad } from '../../components/minorcomponents/types';
import { baseURL } from "../../utils";

// Mobile breakpoints
const MOBILE_BREAKPOINT = 2200;
const FOOTER_MOBILE_BREAKPOINT = 1000;

// Define setting types
interface AdSettings {
  standardAdCount: number;
  sidebarAdCount: number;
  footerAdCount: number;
  mobileAdCount: number;
  standardAdRotationInterval: number;
  sidebarAdRotationInterval: number;
  footerAdRotationInterval: number;
  mobileAdRotationInterval: number;
}

// Define window with optional io property
declare global {
  interface Window {
    io?: {
      connect: (url: string) => any;
    };
  }
}

const MainPage: React.FC = () => {
  // Ad rotation indexes
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState<number>(0);
  const [currentSidebarIndex, setCurrentSidebarIndex] = useState<number>(0);
  const [currentFooterIndex, setCurrentFooterIndex] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isFooterMobile, setIsFooterMobile] = useState<boolean>(false);
  const [mobileRotationPhase, setMobileRotationPhase] = useState<number>(0); // 0 = header ads, 1 = sidebar ads
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  
  // Use refs to track mounted state and intervals
  const isMountedRef = useRef<boolean>(true);
  const mobileIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const desktopIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Track if effect has run
  const setupCompletedRef = useRef<boolean>(false);
  
  // Dynamic settings from server
  const [adSettings, setAdSettings] = useState<AdSettings>({
    // Default values until we get settings from server
    standardAdCount: 4,
    sidebarAdCount: 4,
    footerAdCount: 3,
    mobileAdCount: 2,
    standardAdRotationInterval: 50000,
    sidebarAdRotationInterval: 75000,
    footerAdRotationInterval: 100000,
    mobileAdRotationInterval: 10000
  });

  // Cleanup function
  const cleanupTimers = () => {
    if (mobileIntervalRef.current) {
      clearInterval(mobileIntervalRef.current);
      mobileIntervalRef.current = null;
    }
    
    desktopIntervalsRef.current.forEach(interval => clearInterval(interval));
    desktopIntervalsRef.current = [];
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = undefined;
    }
  };

  // Track component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupTimers();
    };
  }, []);

  // Fetch ad settings from server just once
  useEffect(() => {
    let isMounted = true;
    
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${baseURL}/settings`);
        
        if (!isMounted) return;
        
        // Check if settings exist directly in response.data or in response.data.settings
        const settings = response.data.settings || response.data;
        
        if (!settings) {
          console.error('Settings not found in API response');
          return; // Keep using default values
        }
        
        // Use optional chaining to safely access properties
        setAdSettings({
          standardAdCount: settings.standardAdCount ?? 4,
          sidebarAdCount: settings.sidebarAdCount ?? 4,
          footerAdCount: settings.footerAdCount ?? 3,
          mobileAdCount: settings.mobileAdCount ?? 2,
          standardAdRotationInterval: settings.standardAdRotationInterval ?? 50000,
          sidebarAdRotationInterval: settings.sidebarAdRotationInterval ?? 75000,
          footerAdRotationInterval: settings.footerAdRotationInterval ?? 100000,
          mobileAdRotationInterval: settings.mobileAdRotationInterval ?? 10000
        });
      } catch (error) {
        console.error('Error fetching ad settings:', error);
        // Keep using default values if fetch fails
      }
    };
    
    fetchSettings();
    
    // A single socket connection that doesn't get recreated
    let socket: any = null;
    
    try {
      // Check if io exists on window object
      if (window.io) {
        socket = window.io.connect(baseURL);
        if (socket) {
          socket.on("settings_updated", (updatedSettings: Partial<AdSettings>) => {
            if (!isMounted || !updatedSettings) return;
            
            setAdSettings(prevSettings => ({
              standardAdCount: updatedSettings.standardAdCount ?? prevSettings.standardAdCount,
              sidebarAdCount: updatedSettings.sidebarAdCount ?? prevSettings.sidebarAdCount,
              footerAdCount: updatedSettings.footerAdCount ?? prevSettings.footerAdCount,
              mobileAdCount: updatedSettings.mobileAdCount ?? prevSettings.mobileAdCount,
              standardAdRotationInterval: updatedSettings.standardAdRotationInterval ?? prevSettings.standardAdRotationInterval,
              sidebarAdRotationInterval: updatedSettings.sidebarAdRotationInterval ?? prevSettings.sidebarAdRotationInterval,
              footerAdRotationInterval: updatedSettings.footerAdRotationInterval ?? prevSettings.footerAdRotationInterval,
              mobileAdRotationInterval: updatedSettings.mobileAdRotationInterval ?? prevSettings.mobileAdRotationInterval
            }));
          });
        }
      }
    } catch (error) {
      console.log('Socket connection not available or error:', error);
      // Continue without socket updates
    }
    
    return () => {
      isMounted = false;
      if (socket) {
        socket.off("settings_updated");
        // Don't disconnect the socket here - other components might be using it
      }
    };
  }, []);

  // Function to check if the screen is mobile width
  useEffect(() => {
    const checkMobileStatus = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setIsFooterMobile(window.innerWidth < FOOTER_MOBILE_BREAKPOINT);
    };
    
    // Initial check
    checkMobileStatus();
    
    // Add listener for window resize
    window.addEventListener('resize', checkMobileStatus);
    
    // Cleanup listener
    return () => window.removeEventListener('resize', checkMobileStatus);
  }, []);

  // Setup and teardown ad rotation timers based on mobile state
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Clear all existing timers first
    cleanupTimers();
    
    // Only do this the first time or when mode (mobile/desktop) changes
    if (isMobile && !setupCompletedRef.current) {
      console.log('Setting up unified mobile rotation interval:', adSettings.mobileAdRotationInterval);
      setupCompletedRef.current = true;
    }
    
    if (isMobile) {
      // Mobile rotation logic
      const handleMobileTransition = () => {
        if (!isMountedRef.current) return;
        
        // Start fade-out transition
        setIsTransitioning(true);
        
        // Using refs to avoid cleanup issues
        transitionTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          
          // Update phase first (batch updates)
          const nextPhase = mobileRotationPhase === 0 ? 1 : 0;
          
          // Update all states in one go without nested timeouts
          setMobileRotationPhase(nextPhase);
          
          if (nextPhase === 1) {
            setCurrentSidebarIndex(prev => prev + 1);
          } else {
            setCurrentHeaderIndex(prev => prev + 1);
          }
          
          setCurrentFooterIndex(prev => prev + 1);
          
          // Remove transition class after a short delay
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsTransitioning(false);
            }
          }, 50);
        }, 300);
      };
      
      mobileIntervalRef.current = setInterval(handleMobileTransition, adSettings.mobileAdRotationInterval);
    } else {
      // Desktop rotation logic - separate timers
      
      // Header ads rotation
      const headerInterval = setInterval(() => {
        if (isMountedRef.current) {
          setCurrentHeaderIndex(prev => prev + 1);
        }
      }, adSettings.standardAdRotationInterval);
      
      // Sidebar ads rotation
      const sidebarInterval = setInterval(() => {
        if (isMountedRef.current) {
          setCurrentSidebarIndex(prev => prev + 1);
        }
      }, adSettings.sidebarAdRotationInterval);
      
      // Footer ads rotation
      const footerInterval = setInterval(() => {
        if (isMountedRef.current) {
          setCurrentFooterIndex(prev => prev + 1);
        }
      }, adSettings.footerAdRotationInterval);
      
      desktopIntervalsRef.current = [headerInterval, sidebarInterval, footerInterval];
    }
    
    // Cleanup function
    return cleanupTimers;
  }, [
    isMobile, 
    mobileRotationPhase,
    // Only these essential dependencies
    adSettings.mobileAdRotationInterval,
    adSettings.standardAdRotationInterval,
    adSettings.sidebarAdRotationInterval,
    adSettings.footerAdRotationInterval
  ]);

  // Helper function to get visible ads - memoize to avoid recreating on every render
  const getVisibleAds = useMemo(() => {
    return (ads: Ad[], startIndex: number, visibleCount: number): Ad[] => {
      if (!ads || ads.length === 0) return [];
      if (ads.length <= visibleCount) return ads;
      
      const wrappedIndex = startIndex % ads.length;
      const visibleAds: Ad[] = [];
      
      for (let i = 0; i < visibleCount; i++) {
        const index = (wrappedIndex + i) % ads.length;
        visibleAds.push(ads[index]);
      }
      
      return visibleAds;
    };
  }, []);

  // Get ads for mobile view based on current phase - memoize to avoid recreating on every render
  const getMobileAds = useMemo(() => {
    return (headerAds: Ad[], sidebarAds: Ad[]): Ad[] => {
      if (!headerAds || !sidebarAds) return [];
      
      if (mobileRotationPhase === 0) {
        // Show header ads
        return getVisibleAds(headerAds, currentHeaderIndex, adSettings.mobileAdCount);
      } else {
        // Show sidebar ads
        return getVisibleAds(sidebarAds, currentSidebarIndex, adSettings.mobileAdCount);
      }
    };
  }, [mobileRotationPhase, currentHeaderIndex, currentSidebarIndex, adSettings.mobileAdCount, getVisibleAds]);

  // For mobile footer, display only one ad - memoize to avoid recreating on every render
  const getMobileFooterAds = useMemo(() => {
    return (footerAds: Ad[]): Ad[] => {
      if (!footerAds) return [];
      return getVisibleAds(footerAds, currentFooterIndex, 1);
    };
  }, [currentFooterIndex, getVisibleAds]);

  // Service section component that will go into plinkoinfowrapper
  const ServicesComponent = () => (
    <div className={styles.servicesGrid}>
    <div className={styles.serviceCard}>
      <div className={styles.serviceIcon}>🎮</div>
      <h3 className={styles.serviceTitle}>Game Features</h3>
      <p className={styles.serviceText}>
      16 rows of precision-engineered pegs, 17 scoring buckets with multipliers from 0.2x to 16x,
      Physics-based ball movement, Real-time probability display
      </p>
    </div>
    <div className={styles.serviceCard}>
      <div className={styles.serviceIcon}>📊</div>
      <h3 className={styles.serviceTitle}>Win Probabilities</h3>
      <p className={styles.serviceText}>
      Center (8): 16.8%, Peak (7,9): 12.5%, Elite (6,10): 9.7%, Premium (5,11): 7.45%, High Value (4,12): 7.0%
      </p>
    </div>
    <div className={styles.serviceCard}>
      <div className={styles.serviceIcon}>🔒</div>
      <h3 className={styles.serviceTitle}>Practice in a fun filled simulated and secure environment</h3>
      <p className={styles.serviceText}>
      This is a fun filled simulated environment so must enjoy. Your data and privacy are our priority
        with industry-standard security measures.
      </p>
    </div>
  </div>
  );

  // Stable main content elements to avoid recreating
  const mainPageContent = useMemo(() => (
    <div className={styles.contentWrapper}>
      <div className={styles.mainContent}>
        {/* Hero Section */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
            Master the Drop in <span className={styles.heroTitleAccent}>Plinko</span>
            </h1>
            <p className={styles.heroText}>
            Experience the thrill of strategic gameplay with our modern Plinko. 
                              Watch as each drop creates a unique path, with multipliers that can 
                              lead to exciting wins. Perfect your technique in our refined gaming environment.
            </p>
            <Link to="/game" className={styles.ctaButton}>
            ✨ Start Playing ✨
            </Link>
          </div>
        </div>

        {/* Game and Services wrapped in gameandplinkoinfowrapper like in GamePage */}
        <div className={styles.gameandplinkoinfowrapper}>
          <div className={styles.titleanddivider}>
            <h2 className={styles.formTitle}>
              Try Your Strategy
            </h2>
            <div className={styles.dividerContainer}>
              <div className={styles.divider} />
            </div>
          </div>

          <div className={styles.dividerandentirewrapper}>
            <div className={styles.plinkoinfowrapper}>
              <div className={styles.innerContainer}>
                <ServicesComponent />
              </div>
            </div> 
            <div className={styles.gameWrapper}>
              <Demo />
            </div>
          </div>
        </div>
      </div>
    </div>
  ), []);

  // Define render ad props interface
  interface RenderAdProps {
    headerAds: Ad[];
    sidebarAds: Ad[];
    mainContentAds: Ad[];
    footerAds: Ad[];
  }

  // Use a render prop function that doesn't change
  const renderAds = useMemo(() => {
    return ({ headerAds, sidebarAds, mainContentAds, footerAds }: RenderAdProps) => (
      <div className={styles.whole2}>
        <div className={styles.whole1}>
          <div className={styles.whole}>
            {/* Apply transition class conditionally */}
            <div className={`${styles.headerAds} ${isMobile && isTransitioning ? styles.adTransition : ''}`}>
              {isMobile 
                ? getMobileAds(headerAds, sidebarAds).map((ad: Ad) => (
                    <StandardAdCard key={`${ad._id}-mobile-${mobileRotationPhase}-${currentHeaderIndex}-${currentSidebarIndex}`} ad={ad} />
                  ))
                : getVisibleAds(headerAds, currentHeaderIndex, adSettings.standardAdCount).map((ad: Ad) => (
                    <StandardAdCard key={`${ad._id}-${currentHeaderIndex}`} ad={ad} />
                  ))
              }
            </div>
            
            {mainPageContent}
            
            <div className={styles.maincontentaaaaa}>
              <div className={styles.mainContentAds1}> 
                <div className={styles.mainContentAds}>
                  <RotatingMainContentAds ads={mainContentAds} />
                </div>
              </div>

              <div className={styles.conta}>
                <div className={styles.contentSection}>
                  <div className={styles.contentItem}>
                    <div className={styles.contentText}>
                      <p>
                        Plinko has become a casino gambling and arcade favorite that combines elements of chance with the illusion of skill. 
                        The game features a vertical board where players drop disks (or virtual disks in digital versions) that bounce off 
                        strategically placed pegs before landing in prize slots at the bottom.
                      </p>
                      <p>
                        While the game appears simple, there are several 
                        key aspects players should understand. The physics of the pegs means that even small differences in drop position can 
                        lead to wildly different outcomes - a disk that starts just millimeters to the left or right may end up in a completely 
                        different slot. The bottom slots typically follow a pattern where the highest-value prizes are in the center, with lower 
                        values toward the edges, encouraging players to aim for the middle.
                      </p>
                      <p>
                        Most casino versions offer payouts ranging from 0x to around 1000x your bet, though the exact amounts vary by establishment. 
                        The house edge is built into the peg layout and prize distribution - while big wins are possible, the game is designed so 
                        that over time, the house maintains an advantage. Players should be aware that despite any perceived patterns or "hot spots," 
                        each drop is an independent event with no memory of previous results. Some may develop theories about optimal drop positions, 
                        but the chaotic nature of the bounces means no strategy can consistently predict where a disk will land.
                      </p>
                      <p>
                        Digital and mobile versions of Plinko have exploded in popularity, especially on gambling websites and apps. These versions 
                        use random number generators to simulate the physics of the original game, though players should verify they're playing on 
                        legitimate, licensed platforms to ensure fair odds. Whether playing physically or digitally, it's crucial to set strict 
                        betting limits and treat Plinko as entertainment rather than a reliable way to win money, as the random nature of the game 
                        means streaks of both wins and losses are common. 
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Hide sidebar on mobile */}
          {!isMobile && (
            <div className={styles.rsb}>
              <div className={styles.rightSidebar}>
                {getVisibleAds(sidebarAds, currentSidebarIndex, adSettings.sidebarAdCount).map((ad: Ad) => (
                  <SidebarAdCard key={`${ad._id}-${currentSidebarIndex}`} ad={ad} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.foota}>
          <div className={`${styles.footerAds} ${isFooterMobile ? styles.mobileFooterAds : ''}`}>
            {isFooterMobile 
              ? getMobileFooterAds(footerAds).map((ad: Ad) => (
                  <FooterAdCard key={`${ad._id}-mobile-footer-${currentFooterIndex}`} ad={ad} />
                ))
              : getVisibleAds(footerAds, currentFooterIndex, adSettings.footerAdCount).map((ad: Ad) => (
                  <FooterAdCard key={`${ad._id}-${currentFooterIndex}`} ad={ad} />
                ))
            }
          </div>
        </div>
      </div>
    );
  }, [
    isMobile, 
    isFooterMobile, 
    isTransitioning, 
    mobileRotationPhase, 
    currentHeaderIndex, 
    currentSidebarIndex, 
    currentFooterIndex, 
    adSettings, 
    getVisibleAds, 
    getMobileAds, 
    getMobileFooterAds,
    mainPageContent
  ]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.paga}>
        <AdContainer renderAds={renderAds}>
          <div className={styles.gameWrapper}></div>
        </AdContainer>
      </div>
    </div>
  );
};

export default MainPage;