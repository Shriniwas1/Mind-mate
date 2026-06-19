import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { initializeSocket, disconnectSocket } from '../utils/socket';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;


const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const getStoredToken = () =>
    localStorage.getItem('mindmate_token') ||
    sessionStorage.getItem('mindmate_token');

  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
      initializeSocket(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // const fetchUserProfile = async (activeToken) => {
  //   try {
  //     const response = await axios.get(`${API}/user/profile`, {
  //       headers: { Authorization: `Bearer ${activeToken}` },
  //     });
  //     setUser(response.data.user);
  //   } catch (error) {
  //     console.error('Session invalid or expired, logging out...');
  //     logout();
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const fetchUserProfile = async (activeToken) => {
  try {
    const response = await axios.get(`${API}/user/profile`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    // Check this log specifically after you refresh the page
    console.log("FRESH DATA FROM DB:", response.data.user);
    
    const rawUser = response.data.user;
    // Normalize: profile route returns Mongoose doc (_id) but not id. Align both.
    const normalizedUser = { ...rawUser, _id: rawUser._id || rawUser.id, id: rawUser.id || rawUser._id };
    setUser(normalizedUser);
  } catch (error) {
    console.error('Session invalid or expired, logging out...');
    logout();
  } finally {
    setLoading(false);
  }
};
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API}/user/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data && response.data.user) {
        const rawUser = response.data.user;
        const normalizedUser = { ...rawUser, _id: rawUser._id || rawUser.id, id: rawUser.id || rawUser._id };
        // TRIGGER: Updates state so components like the Banner hide instantly
        setUser(normalizedUser); 
        return response.data;
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const login = async (email, password, rememberMe = false) => {
    const response = await axios.post(`${API}/auth/login`, {
      email,
      password,
    });

    const { token: newToken, user: rawUser } = response.data;
    // Normalize: backend returns `id` from auth routes but `_id` from profile.
    // Ensure both are always present so any downstream consumer works.
    const userData = { ...rawUser, _id: rawUser._id || rawUser.id, id: rawUser.id || rawUser._id };
    setToken(newToken);
    setUser(userData);

    if (rememberMe) {
      localStorage.setItem('mindmate_token', newToken);
      sessionStorage.removeItem('mindmate_token');
    } else {
      sessionStorage.setItem('mindmate_token', newToken);
      localStorage.removeItem('mindmate_token');
    }

    initializeSocket(newToken);
    return userData;
  };

  const register = async (email, password, name, emergencyContact) => {
  const response = await axios.post(`${API}/auth/register`, {
    email,
    password,
    name,
    emergencyContact, // New object included in payload
    profileCompleted: true // Since they are filling it now
  });

  const { token: newToken, user: rawUser } = response.data;
  // Normalize: backend returns `id` from auth routes but `_id` from profile.
  const userData = { ...rawUser, _id: rawUser._id || rawUser.id, id: rawUser.id || rawUser._id };
  setToken(newToken);
  setUser(userData);

  sessionStorage.setItem('mindmate_token', newToken);
  localStorage.removeItem('mindmate_token');

  initializeSocket(newToken);
  return userData;
};

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mindmate_token');
    sessionStorage.removeItem('mindmate_token');
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { API, BACKEND_URL };