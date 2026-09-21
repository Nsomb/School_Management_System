export const authHeader = (): { Authorization: string } | {} => {
  const token = localStorage.getItem('authToken');   // <-- Changed from 'token' to 'authToken'
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};