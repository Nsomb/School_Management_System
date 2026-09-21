// src/features/teachers/utils/debugUtils.ts
export const debugApiResponse = (response: any, endpoint: string) => {
  console.group(`API Response - ${endpoint}`);
  console.log('Status:', response.status);
  console.log('Data:', response.data);
  console.log('Headers:', response.headers);
  console.groupEnd();
  return response;
};

export const debugApiError = (error: any, endpoint: string) => {
  console.group(`API Error - ${endpoint}`);
  console.error('Error:', error);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
    console.error('Response headers:', error.response.headers);
  } else if (error.request) {
    console.error('No response received:', error.request);
  } else {
    console.error('Error message:', error.message);
  }
  console.groupEnd();
  throw error;
};