
import { logoutUser } from '../service/api';

export const handleLogout = async (navigate) => {
  try {
    await logoutUser();
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    // Always clear localStorage even if API call fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/');
  }
};