import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import logo from "../assets/logo.svg";
import { baseURL } from "../utils";
import AccountManagement from "../accountmangement/accountmangement";
import { useWallet } from "../contexts/Walletcontext";
import { useAuth } from "../contexts/authcontext";
import styles from "./page.module.css";
import { Sun, Moon } from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";

const socket = io(baseURL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    autoConnect: false
});

const Navbar: React.FC = () => {
  const location = useLocation();
  const requestFormRef = useRef<HTMLDivElement>(null);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isDemo = ['/auth/login', '/auth/signup'].includes(location.pathname) || 
               location.pathname.startsWith('/auth/');
  const { remainingZixos, setRemainingZixos } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const [requestMessage, setRequestMessage] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isRequestOpen, setIsRequestOpen] = useState<boolean>(false);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState<boolean>(false);
  const [_isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Reset wallet display when user logs out
  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      setRemainingZixos(null);
      setIsInitialFetchDone(false);
    }
  }, [user, setRemainingZixos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('button[data-toggle]')) {
        return;
      }

      if (requestFormRef.current && !requestFormRef.current.contains(event.target as Node)) {
        setIsRequestOpen(false);
        setIsModalOpen(false);
        document.body.classList.remove('modal-open');
      }
      
      if (
        burgerMenuRef.current && 
        menuButtonRef.current &&
        !burgerMenuRef.current.contains(event.target as Node) &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        document.body.classList.remove('menu-open');
      }
    };

    // Handle escape key to close modals and menus
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isRequestOpen) {
          setIsRequestOpen(false);
          setIsModalOpen(false);
          document.body.classList.remove('modal-open');
        }
        
        if (isExpanded) {
          setIsExpanded(false);
          document.body.classList.remove('menu-open');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
      // Ensure body classes are removed when component unmounts
      document.body.classList.remove('modal-open');
      document.body.classList.remove('menu-open');
    };
  }, [isRequestOpen, isExpanded]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return () => {
      socket.off("connect_error");
      socket.off("error");
      socket.off("walletRequestApproved");
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  const fetchWalletBalance = async () => {
    if (!user) return;

    try {
      const response = await axios.get(`${baseURL}/user-wallet`, {
        params: { uid: user, t: new Date().getTime() },
        withCredentials: true
      });
      setWalletBalance(response.data.balance);
      setIsInitialFetchDone(true);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  useEffect(() => {
    if (!isInitialFetchDone && user) {
      fetchWalletBalance();
    }
  }, [isInitialFetchDone, user]);

  useEffect(() => {
    if (isInitialFetchDone && remainingZixos !== null && walletBalance !== remainingZixos) {
      setWalletBalance(remainingZixos);
    }
  }, [isInitialFetchDone, remainingZixos, walletBalance]);

  useEffect(() => {
    const handleWalletRequestApproved = (data: { uid: string }) => {
      if (data.uid === user) {
        fetchWalletBalance();
        setRequestMessage("Your request was approved!");
      }
    };

    socket.on("walletRequestApproved", handleWalletRequestApproved);

    return () => {
      socket.off("walletRequestApproved", handleWalletRequestApproved);
    };
  }, [user]);

  const handleRequestMoney = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!user) return;

      const response = await axios.post(`${baseURL}/wallet/request`, {
        uid: user,
        requestedAmount: requestAmount,
      }, {
        withCredentials: true
      });

      setRequestMessage(response.data.message);
      setTimeout(() => fetchWalletBalance(), 1000);
    } catch (error) {
      const axiosError = error as any;
      setRequestMessage(axiosError.response?.data?.error || "An error occurred");
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
    
    // When opening menu, prevent body scroll on mobile
    if (!isExpanded) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  };

  const handleRequestButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRequestOpen(true);
    setIsModalOpen(true);
    document.body.classList.add('modal-open'); // Prevents background scrolling
  };

  const handleCloseRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRequestOpen(false);
    setIsModalOpen(false);
    setRequestMessage("");
    setRequestAmount(0);
    document.body.classList.remove('modal-open');
  };

  const renderRequestForm = () => {
    if (!user) {
      return (
        <div ref={requestFormRef} className={`${styles.requestForm} ${isRequestOpen ? styles.show : ""}`}>
          <div className={styles.loginRequired}>
            <h4 className={styles.formTitle}>Login Required</h4>
            <p className={styles.loginMessage}>
              Please login or create an account to request Zixos and access all game features.
            </p>
            <div className={styles.loginButtons}>
              <Link to="/auth/login" className={styles.loginButton}>
                Login
              </Link>
              <Link to="/auth/signup" className={styles.signupButton}>
                Sign Up
              </Link>
            </div>
            <button 
              onClick={handleCloseRequest}
              className={styles.closeButton}
              data-toggle="request"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (requestMessage) {
      return (
        <div ref={requestFormRef} className={`${styles.requestForm} ${isRequestOpen ? styles.show : ""}`}>
          <h4 className={styles.formTitle}>Request Status</h4>
          <p className={styles.message}>{requestMessage}</p>
          <button 
            onClick={handleCloseRequest}
            className={styles.closeButton}
            data-toggle="request"
          >
           <div  className={styles.closeButton1}>Close</div> 
          </button>
        </div>
      );
    }
  
    return (
      <div ref={requestFormRef} className={`${styles.requestForm} ${isRequestOpen ? styles.show : ""}`}>
        <h4 className={styles.formTitle}>Request More Zixos</h4>
        <input
          type="number"
          value={requestAmount}
          onChange={(e) => setRequestAmount(Number(e.target.value))}
          placeholder="Enter amount"
          className={styles.formInput}
          min="1"
        />
        <button 
          onClick={handleRequestMoney}
          className={styles.submitButton}
          data-toggle="request"
        >
          Submit Request
        </button>
        <button 
          onClick={handleCloseRequest}
          className={styles.closeButton}
          data-toggle="request"
        >
          Close
        </button>
      </div>
    );
  };

  const renderRequestButton = () => (
    <div className={styles.requestContainer}>
      <button 
        onClick={handleRequestButtonClick}
        className={styles.requestButton}
        disabled={isDemo}
        data-toggle="request"
      >
        {!user ? 'Login to Request Zixos' : 'Request Zixos'}
      </button>
    </div>
  );

  const renderBurgerMenu = () => (
    <div className={styles.menu}>
      <motion.button
        ref={menuButtonRef}
        className={styles.buttonOne}
        aria-controls="primary-navigation"
        aria-expanded={isExpanded}
        onClick={toggleMenu}
        data-toggle="menu"
        initial={false}
      >
        <motion.svg
          className={styles.hamburger}
          viewBox="0 0 100 100"
          width="50"
          height="50"
          initial={false}
          animate={{
            rotate: isExpanded ? 180 : 0,
            transition: { duration: 0.7 }
          }}
        >
          <motion.rect
            className={`${styles.line} ${styles.top}`}
            width="80"
            height="10"
            x={isExpanded ? -5 : 10}
            y={isExpanded ? 30 : 25}
            rx="5"
          />
          <motion.rect
            className={`${styles.line} ${styles.middle}`}
            width="80"
            height="10"
            x="40"
            y="45"
            rx="5"
          />
          <motion.rect
            className={`${styles.line} ${styles.bottom}`}
            width="80"
            height="10"
            x={isExpanded ? -1.8 : 10}
            y={isExpanded ? 60 : 65}
            rx="5"
          />
        </motion.svg>
      </motion.button>
    </div>
  );

  const renderBurgerMenuContent = () => {
    if (isExpanded) {
      return (
        <motion.div
          ref={burgerMenuRef}
          className={`${styles.burgerMenuContent2} ${
            !user ? styles.burgerMenuContent : styles.burgerMenuContent1
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9 }}
        >
          <div className={styles.burgerMenuInner}>
            {!user ? (
              <div className={styles.signn}>
                <Link to="/auth/login" className={styles.menuLink}>
                  Sign In
                </Link>
                <Link to="/auth/signup" className={styles.menuLink}>
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className={styles.accountManagementWrapper}>
                <AccountManagement />
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <>
      <motion.nav className={styles.mainclass}>
        <a href="https://plinkochallenge.com" target="_blank" rel="noopener noreferrer" className={styles.logo1}>
          <img src={logo} alt="Logo" className={styles.logo} />
        </a>
        
        <div className={styles.wallet}>
          <p className={styles.balance}>
            Remaining Zixos: {user ? (walletBalance !== null ? Number(walletBalance).toFixed(2) : "Loading...") : "0.00"}
          </p>
          {renderRequestButton()}
        </div>

        <div className={styles.but}>
          <div className={styles.but1}>
            <button 
              onClick={toggleTheme} 
              className={styles.themeToggle} 
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className={styles.mand}>
              {renderBurgerMenu()}
            </div>
          </div>
        </div>
      </motion.nav>
      
      {/* Menu content moved outside nav for better z-index handling */}
      {isExpanded && renderBurgerMenuContent()}
      
      {/* Moved request form outside the nav for better z-index handling */}
      {isRequestOpen && renderRequestForm()}
      
      {/* Menu backdrop - separate from modal backdrop */}
      <div 
        className={`${styles.menuBackdrop} ${isExpanded ? styles.show : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(false);
          document.body.classList.remove('menu-open');
        }} 
      />
      
      {/* Modal backdrop - separate from menu backdrop */}
      <div 
        className={`${styles.backdrop} ${isRequestOpen ? styles.show : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          setIsRequestOpen(false);
          setIsModalOpen(false);
          document.body.classList.remove('modal-open');
        }} 
      />
    </>
  );
};

export default Navbar;