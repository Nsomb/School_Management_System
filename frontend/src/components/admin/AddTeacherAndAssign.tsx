import axios from 'axios';

const AP_LBASE_URL = 'http://your-api-base-url.com/api';

export const loginAdmin = async (credentials: { email: string; password: string }) => {
  const response = await axios.post(`${AP_LBASE_URL}/admin/login`, credentials);
  return response.data;
};

export const loginTeacher = async (credentials: { email: string; password: string }) => {
  const response = await axios.post(`${AP_LBASE_URL}/teacher/login`, credentials);
  return response.data;
};

// Other admin service functions...