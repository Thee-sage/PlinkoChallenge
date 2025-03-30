import { useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../../../utils';
import { Ad } from '../types';
import styles from './AdContainer.module.css';
import { useAuth } from '../../../contexts/authcontext';

interface AdContainerProps {
  renderAds: (props: {
    headerAds: Ad[];
    sidebarAds: Ad[];
    mainContentAds: Ad[];
    footerAds: Ad[];
  }) => React.ReactNode;
  children: React.ReactNode;
}

export const AdContainer = ({ renderAds, children }: AdContainerProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [mainContentAds, setMainContentAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');

    const fetchAds = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = {
          Authorization: token ? `Bearer ${token}` : '',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        };

        const [regularResponse, mainContentResponse] = await Promise.all([
          axios.get<Ad[]>(`${baseURL}/public`, {
            headers,
            withCredentials: true
          }),
          axios.get<Ad[]>(`${baseURL}/public/main-content`, {
            headers,
            withCredentials: true
          })
        ]);

        if (!isMounted) return;

        const regularAds = Array.isArray(regularResponse.data) ? regularResponse.data : [];
        const mainContentData = Array.isArray(mainContentResponse.data) ? mainContentResponse.data : [];

        setAds(regularAds);
        setMainContentAds(mainContentData.filter(ad => ad.location === "MainContent"));

      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching ads:", error);
        setError("Failed to load advertisements");
        setAds([]);
        setMainContentAds([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchAds();


  }, [user, profile]); // Depend on both user and profile

  const refreshAds = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      const [regularResponse, mainContentResponse] = await Promise.all([
        axios.get<Ad[]>(`${baseURL}/public`, {
          headers,
          withCredentials: true
        }),
        axios.get<Ad[]>(`${baseURL}/public/main-content`, {
          headers,
          withCredentials: true
        })
      ]);

      const regularAds = Array.isArray(regularResponse.data) ? regularResponse.data : [];
      const mainContentData = Array.isArray(mainContentResponse.data) ? mainContentResponse.data : [];

      setAds(regularAds);
      setMainContentAds(mainContentData.filter(ad => ad.location === "MainContent"));
      setError(null);
    } catch (error) {
      console.error("Error refreshing ads:", error);
      setError("Failed to refresh advertisements");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Loading ads...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        {error}
        <button onClick={refreshAds} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  const headerAds = Array.isArray(ads) ? ads.filter(ad => ad?.location === "Header") : [];
  const sidebarAds = Array.isArray(ads) ? ads.filter(ad => ad?.location === "Sidebar") : [];
  const footerAds = Array.isArray(ads) ? ads.filter(ad => ad?.location === "Footer") : [];

  return (
    <div className={styles.pageWrapper}>
      {renderAds({
        headerAds,
        sidebarAds,
        mainContentAds,
        footerAds,
      })}
      {children}
    </div>
  );
};