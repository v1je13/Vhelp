import { useState, useEffect, createContext, useContext } from 'react';
import { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('vhelp_token');
        if (token) {
          const userData = await api.getCurrentUser();
          setUser(userData);
        } else {
          // Try VK Bridge auth
          const launchParams = parseURLSearchParamsForGetLaunchParams(window.location.search);
          if (launchParams.vk_user_id) {
            const authData = await api.vkAuth({
              vk_user_id: launchParams.vk_user_id,
              vk_first_name: launchParams.vk_first_name || '',
              vk_last_name: launchParams.vk_last_name || '',
              vk_avatar: launchParams.vk_avatar || '',
              sign: launchParams.sign || '',
            });
            setUser(authData.user);
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        api.clearToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (vkData) => {
    try {
      const authData = await api.vkAuth(vkData);
      setUser(authData.user);
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
