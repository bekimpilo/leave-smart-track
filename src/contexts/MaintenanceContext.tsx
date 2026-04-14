import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiConfig, makeApiRequest } from '@/config/apiConfig';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  setMaintenanceMode: (enabled: boolean) => Promise<void>;
  loading: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const useMaintenanceMode = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenanceMode must be used within a MaintenanceProvider');
  }
  return context;
};

interface MaintenanceProviderProps {
  children: ReactNode;
}

export const MaintenanceProvider = ({ children }: MaintenanceProviderProps) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const authToken = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch maintenance mode status on mount
  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await makeApiRequest(`${apiConfig.baseURL}/api/system/maintenance`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsMaintenanceMode(data.maintenanceMode || false);
        }
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error);
        // Default to false if can't fetch
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceStatus();
    
    // Poll for maintenance status every 30 seconds
    const interval = setInterval(fetchMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const setMaintenanceMode = async (enabled: boolean) => {
    try {
      const response = await makeApiRequest(`${apiConfig.baseURL}/api/system/maintenance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ maintenanceMode: enabled })
      });

      if (response.ok) {
        setIsMaintenanceMode(enabled);
      } else {
        throw new Error('Failed to update maintenance mode');
      }
    } catch (error) {
      console.error('Failed to set maintenance mode:', error);
      throw error;
    }
  };

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, setMaintenanceMode, loading }}>
      {children}
    </MaintenanceContext.Provider>
  );
};
