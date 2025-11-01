import axios from 'axios';

// const axiosInstance = axios.create({
//   baseURL: 'http://localhost:4000',
//   timeout: 20000
// });
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://bfbf-deployment.onrender.com',
  timeout: 20000,
});


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;


