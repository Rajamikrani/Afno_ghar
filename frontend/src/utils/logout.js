import { logoutUser } from '../service/api';

export const handleLogout = async (navigate) => {
  // Clear localStorage FIRST before API call
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  
  try {
    await logoutUser();
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    navigate('/');
  }
};