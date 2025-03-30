import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import axios from "axios";
import { baseURL } from "../utils";
import { useAdminAuth } from "../contexts/admincontext";
import styles from "./styles/GameSettings.module.css";

// Add descriptions for each setting
const settingDescriptions = {
  ballLimit: "Maximum number of balls a player can have in their inventory at once. This helps control game economy and prevents hoarding.",
  initialBalance: "Starting balance for new players when they first join the game. This amount should be enough to get them started but not too much to affect the economy.",
  demoInitialBalance: "Starting balance for demo players. This amount will be used for temporary demo accounts. Must be less than or equal to the main initial balance.",
  maxBallPrice: "Maximum price that can be set for a single ball. This prevents inflation and keeps the game balanced.",
  dropResetTime: "Time in milliseconds before the drop area resets. This controls how frequently players can drop balls.",
  totalCasinoADCycleTime: "Total time in milliseconds for one complete rotation of all ads. Higher priority ads will be shown for longer portions of this cycle.",
  // New ad rotation settings descriptions
  standardAdRotationInterval: "Time in milliseconds before standard header ads rotate to the next set. Lower values mean faster rotation.",
  sidebarAdRotationInterval: "Time in milliseconds before sidebar ads rotate to the next set. Lower values mean faster rotation.",
  footerAdRotationInterval: "Time in milliseconds before footer ads rotate to the next set. Lower values mean faster rotation.",
  mobileAdRotationInterval: "Time in milliseconds before mobile ads rotate between header and sidebar sets. Lower values mean faster rotation.",
  // New ad count settings descriptions
  standardAdCount: "Maximum number of standard header ads to display at once. Maximum value is 5.",
  sidebarAdCount: "Maximum number of sidebar ads to display at once. Maximum value is 5.",
  footerAdCount: "Maximum number of footer ads to display at once. Maximum value is 3.",
  mobileAdCount: "Maximum number of ads to display on mobile devices at once. Maximum value is 2."
};

interface GameSettingsData {
  ballLimit: number;
  initialBalance: number;
  demoInitialBalance: number;
  maxBallPrice: number;
  dropResetTime: number;
  totalCycleTime: number;
  // New ad rotation settings
  standardAdRotationInterval: number;
  sidebarAdRotationInterval: number;
  footerAdRotationInterval: number;
  mobileAdRotationInterval: number;
  // New ad count settings
  standardAdCount: number;
  sidebarAdCount: number;
  footerAdCount: number;
  mobileAdCount: number;
  lastSignedInBy: string;
}

const FormField = ({ 
  name, 
  label, 
  value, 
  onChange,
  description,
  disabled = false,
  max
}: { 
  name: keyof GameSettingsData;
  label: string;
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  description: string;
  disabled?: boolean;
  max?: number;
}) => (
  <div className={styles.formGroup}>
    <div className={styles.labelGroup}>
      <label className={styles.label}>
        {label}
      </label>
      <div className={styles.tooltipContainer}>
        <button 
          type="button" 
          className={styles.tooltipButton}
          aria-label={`Info about ${label}`}
        >
          ?
          <span className={styles.tooltip}>
            {description}
          </span>
        </button>
      </div>
    </div>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      className={styles.input}
      disabled={disabled}
      max={max}
    />
  </div>
);

export const GameSettings = () => {
  const { token, adminData } = useAdminAuth();
  const [settings, setSettings] = useState<GameSettingsData>({
    ballLimit: 100,
    initialBalance: 200,
    demoInitialBalance: 100,
    maxBallPrice: 20,
    dropResetTime: 60000,
    totalCycleTime: 600000,
    // Initialize new ad rotation settings
    standardAdRotationInterval: 50000,
    sidebarAdRotationInterval: 75000,
    footerAdRotationInterval: 100000,
    mobileAdRotationInterval: 10000,
    // Initialize new ad count settings
    standardAdCount: 4,
    sidebarAdCount: 4,
    footerAdCount: 3,
    mobileAdCount: 2,
    lastSignedInBy: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseURL}/settings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSettings(response.data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to fetch settings. Please try again.");
        }
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSettings();
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (!adminData || !(adminData as any)?.email) {
        throw new Error('Admin data not available');
      }

      // Validate demo balance
      if (settings.demoInitialBalance > settings.initialBalance) {
        throw new Error('Demo initial balance cannot exceed main game initial balance');
      }

      // Validate ad count limits
      if (settings.standardAdCount > 5) {
        throw new Error('Standard ad count cannot exceed 5');
      }
      if (settings.sidebarAdCount > 5) {
        throw new Error('Sidebar ad count cannot exceed 5');
      }
      if (settings.footerAdCount > 3) {
        throw new Error('Footer ad count cannot exceed 3');
      }
      if (settings.mobileAdCount > 2) {
        throw new Error('Mobile ad count cannot exceed 2');
      }

      const updatedSettings = {
        ...settings,
        lastSignedInBy: (adminData as any)?.email
      };

      const response = await axios.post(
        `${baseURL}/settings`,
        updatedSettings,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage("Settings updated successfully!");
      setSettings(response.data.settings);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Error updating settings:", err);
        setError(err.message);
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to update settings. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  if (!token) {
    return (
      <div className={`${styles.message} ${styles.error}`}>
        You must be logged in as an admin to access this page.
      </div>
    );
  }

  return (
    <>
      <h2 className={styles.title}>Game Settings</h2>
      <div className={styles.container}>
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        )}
        
        {message && (
          <div className={`${styles.message} ${styles.success}`}>
            {message}
          </div>
        )}
        
        {error && (
          <div className={`${styles.message} ${styles.error}`}>
            {error}
          </div>
        )}
  
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Game Economy Settings</h3>
            <FormField
              name="ballLimit"
              label="Ball Limit"
              value={settings.ballLimit}
              onChange={handleInputChange}
              description={settingDescriptions.ballLimit}
            />

            <FormField
              name="initialBalance"
              label="Initial Balance"
              value={settings.initialBalance}
              onChange={handleInputChange}
              description={settingDescriptions.initialBalance}
            />

            <FormField
              name="demoInitialBalance"
              label="Demo Initial Balance"
              value={settings.demoInitialBalance}
              onChange={handleInputChange}
              description={settingDescriptions.demoInitialBalance}
              max={settings.initialBalance}
            />

            <FormField
              name="maxBallPrice"
              label="Max Ball Price"
              value={settings.maxBallPrice}
              onChange={handleInputChange}
              description={settingDescriptions.maxBallPrice}
            />

            <FormField
              name="dropResetTime"
              label="Drop Reset Time (ms)"
              value={settings.dropResetTime}
              onChange={handleInputChange}
              description={settingDescriptions.dropResetTime}
            />

            
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Advertisement Rotation Settings</h3>
            <FormField
              name="totalCycleTime"
              label="Total Cycle Time for Casino Ads (ms)"
              value={settings.totalCycleTime}
              onChange={handleInputChange}
              description={settingDescriptions.totalCasinoADCycleTime}
            />
            
            <FormField
              name="standardAdRotationInterval"
              label="Standard Ad Rotation Interval (ms)"
              value={settings.standardAdRotationInterval}
              onChange={handleInputChange}
              description={settingDescriptions.standardAdRotationInterval}
            />

            <FormField
              name="sidebarAdRotationInterval"
              label="Sidebar Ad Rotation Interval (ms)"
              value={settings.sidebarAdRotationInterval}
              onChange={handleInputChange}
              description={settingDescriptions.sidebarAdRotationInterval}
            />

            <FormField
              name="footerAdRotationInterval"
              label="Footer Ad Rotation Interval (ms)"
              value={settings.footerAdRotationInterval}
              onChange={handleInputChange}
              description={settingDescriptions.footerAdRotationInterval}
            />

            <FormField
              name="mobileAdRotationInterval"
              label="Mobile Ad Rotation Interval (ms)"
              value={settings.mobileAdRotationInterval}
              onChange={handleInputChange}
              description={settingDescriptions.mobileAdRotationInterval}
            />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Advertisement Display Counts</h3>
            <FormField
              name="standardAdCount"
              label="Standard Ad Count"
              value={settings.standardAdCount}
              onChange={handleInputChange}
              description={settingDescriptions.standardAdCount}
              max={5}
            />

            <FormField
              name="sidebarAdCount"
              label="Sidebar Ad Count"
              value={settings.sidebarAdCount}
              onChange={handleInputChange}
              description={settingDescriptions.sidebarAdCount}
              max={5}
            />

            <FormField
              name="footerAdCount"
              label="Footer Ad Count"
              value={settings.footerAdCount}
              onChange={handleInputChange}
              description={settingDescriptions.footerAdCount}
              max={3}
            />

            <FormField
              name="mobileAdCount"
              label="Mobile Ad Count"
              value={settings.mobileAdCount}
              onChange={handleInputChange}
              description={settingDescriptions.mobileAdCount}
              max={2}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Updating...' : 'Update Settings'}
          </button>
        </form>
  
        {settings.lastSignedInBy && (
          <div className={styles.lastUpdated}>
            Last updated by: {settings.lastSignedInBy}
          </div>
        )}
      </div>
    </>
  );
};

export default GameSettings;