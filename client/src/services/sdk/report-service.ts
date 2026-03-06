import { Platform } from 'react-native';
import apiClient from './api-client';

export enum ReportType {
    UNSAFE_DRIVING = 'Unsafe Driving',
    DRIVER_MISCONDUCT = 'Driver Misconduct',
    OVERCHARGING = 'Overcharging',
    ROUTE_DEVIATION = 'Route Deviation',
    VEHICLE_ISSUE = 'Vehicle Issue',
    HARASSMENT = 'Harassment',
    THEFT_ROBBERY = 'Theft/Robbery',
    OTHER = 'Other',
}

export interface ReportLocation {
    latitude: number;
    longitude: number;
    street: string;
    lga: string;
    state: string;
    landmark?: string;
}

export interface CreateReportDto {
    type: ReportType;
    location: ReportLocation;
    description: string;
    media: string[];
    otherTitle?: string;
}

export class ReportService {
    static async uploadMedia(uri: string, type: 'image' | 'video'): Promise<string> {
        const formData = new FormData();
        const filename = uri.split('/').pop() || (type === 'video' ? 'video.mp4' : 'image.jpg');
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `${type}/${match[1]}` : type;

        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('file', blob, filename);
        } else {
            // @ts-ignore - React Native FormData is different from browser
            formData.append('file', {
                uri,
                name: filename,
                type: fileType,
            });
        }

        const { data } = await apiClient.post<{ url: string }>('/media/upload', formData, {
            headers: {
                // Do NOT set Content-Type manually, axios/runtime will set it with the correct boundary
                'Content-Type': undefined,
            },
        });
        return data.url;
    }

    static async createReport(reportData: CreateReportDto): Promise<any> {
        const { data } = await apiClient.post('/reports', reportData);
        return data;
    }
}
