import axios from 'axios';
import { authService } from '../AuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach Firebase ID token
apiClient.interceptors.request.use(async (config) => {
    try {
        const token = await authService.getIdToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Error getting auth token:', error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor to handle 401 Unauthorized
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        if (error.response?.status === 401) {
            try {
                await authService.signOut();
            } catch (signOutError) {
                console.error('Error signing out after 401:', signOutError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
