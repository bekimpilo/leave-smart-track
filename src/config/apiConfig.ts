// src/config/apiConfig.ts
// API configuration for different environments
// Use VITE_API_URL environment variable from production settings
const getApiBaseUrl = () => {
    const viteApiUrl = import.meta.env.VITE_API_URL;

    console.log('Environment variables check:', {
        VITE_API_URL: viteApiUrl,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD
    });

    // If VITE_API_URL is not set, provide fallback based on environment
    if (!viteApiUrl) {
        console.warn('VITE_API_URL environment variable is not set, using fallback');

        // Check if we're in Lovable environment (uses .lovableproject.com)
        if (window.location.host.includes('.lovableproject.com')) {
            // In Lovable environment, use mock data for now
            const fallbackUrl = 'MISSING_API_URL';
            console.log('Using Lovable mock fallback:', fallbackUrl);
            return fallbackUrl;
        }

        // In development, use localhost on port 3001 (where the server runs)
        if (import.meta.env.DEV) {
            const fallbackUrl = 'http://localhost:3001';
            console.log('Using development fallback:', fallbackUrl);
            return fallbackUrl;
        }

        // In production, try to infer the backend URL from the current domain
        // Most Railway deployments follow the pattern: https://[project-name]-production.up.railway.app
        const currentHost = window.location.host;
        const currentProtocol = window.location.protocol;
        
        // Check if we're on a Railway deployment URL pattern
        if (currentHost.includes('.up.railway.app') || currentHost.includes('.railway.app')) {
            // Try to construct the backend URL by replacing 'frontend' with 'backend' or using the same domain
            let backendUrl = `${currentProtocol}//${currentHost}`;
            
            // If the host suggests it's a frontend service, try to get the backend
            if (currentHost.includes('-production')) {
                // For Railway apps, the backend might be on the same domain or a different service
                // We'll try the same domain first as Railway often serves both from one service
                console.log('Using production Railway fallback:', backendUrl);
                return backendUrl;
            }
        }
        
        // Final fallback - use current origin
        const fallbackUrl = window.location.origin;
        console.log('Using current origin as fallback:', fallbackUrl);
        return fallbackUrl;
    }

    console.log('Selected API base URL:', viteApiUrl);
    return viteApiUrl;
};

const API_BASE_URL = getApiBaseUrl();

console.log('Final API Configuration:', {
    API_BASE_URL: API_BASE_URL,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV
});

export const apiConfig = {
    baseURL: API_BASE_URL,
    endpoints: {
        auth: `${API_BASE_URL}/api/auth`,
        users: `${API_BASE_URL}/api/users`,
        leave: `${API_BASE_URL}/api/leave`, // Base URL for general leave operations (if used)
        // REVISED: Corrected endpoint for leave documents
        leaveDocuments: `${API_BASE_URL}/api/leave/documents`,
        balance: `${API_BASE_URL}/api/balance`,
        holiday: `${API_BASE_URL}/api/holiday`,
        rollover: `${API_BASE_URL}/api/rollover`,
        departments: `${API_BASE_URL}/api/departments`
    }
};

interface ApiRequestOptions extends RequestInit {
    responseType?: 'json' | 'blob' | 'text';
}

export const makeApiRequest = async (url: string, options: ApiRequestOptions = {}): Promise<Response> => {
    try {
        console.log('Making API request to:', url);
        console.log('Request options:', options);

        if (url.includes('MISSING_API_URL')) {
            console.warn('API URL not configured, returning mock data');
            return createMockResponse(url, options.responseType);
        }

        const headers: HeadersInit = {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        };

        const token = localStorage.getItem('auth_token');
        if (token && token !== 'mock-admin-token') {
             headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (options.responseType === 'blob') {
            return response;
        }
        return response;

    } catch (error) {
        console.error('API request failed:', error);

        if (error instanceof Error && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
            console.warn('Backend unavailable or network error, falling back to mock data');
            return createMockResponse(url, options.responseType);
        }

        throw error;
    }
};

const createMockResponse = (url: string, responseType?: 'json' | 'blob' | 'text'): Response => {
    let mockData: any = null;
    let contentType = 'application/json';

    // REVISED: Mock data for '/api/leave/documents/:id/download'
    if (url.includes('/api/leave/documents') && url.includes('/download')) {
        if (responseType === 'blob') {
            const mockPdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0>>endobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\ntrailer<</Size 3/Root 1 0 R>>startxref\n104\n%%EOF';
            const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
            return new Response(blob, {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'inline; filename="mock_document.pdf"',
                },
            });
        }
        mockData = {
            success: false,
            message: 'Mock download: Please set responseType to "blob" for actual file content.',
        };
    // REVISED: Mock data for '/api/leave/documents' list
    } else if (url.includes('/api/leave/documents')) {
        mockData = [
            {
                id: 1,
                leave_id: 123,
                original_name: 'medical_certificate.pdf',
                file_name: 'medical_certificate.pdf',
                mime_type: 'application/pdf',
                uploaded_at: '2025-01-26T09:00:00Z',
                employee_name: 'Mock Employee One',
                department_name: 'Engineering',
                employee_id: 101,
            },
            {
                id: 2,
                leave_id: 124,
                original_name: 'travel_booking.docx',
                file_name: 'travel_booking.docx',
                mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                uploaded_at: '2025-01-26T10:30:00Z',
                employee_name: 'Mock Employee Two',
                department_name: 'Marketing',
                employee_id: 102,
            },
            {
                id: 3,
                leave_id: 125,
                original_name: 'payslip.png',
                file_name: 'payslip.png',
                mime_type: 'image/png',
                uploaded_at: '2025-01-27T11:00:00Z',
                employee_name: 'Mock Employee Three',
                department_name: 'Marketing',
                employee_id: 103,
            }
        ];
    } else if (url.includes('/api/leave')) {
        mockData = [
            { id: 1, employeeName: 'John Doe', Requester: 'john.doe@example.com', leaveType: 'Annual Leave', startDate: '2025-01-15', endDate: '2025-01-20', Status: 'approved', daysRequested: 5, manager: 'jane.smith@example.com' },
            { id: 2, employeeName: 'Sarah Wilson', Requester: 'sarah.wilson@example.com', leaveType: 'Sick Leave', startDate: '2025-01-18', endDate: '2025-01-19', Status: 'approved', daysRequested: 2, manager: 'jane.smith@example.com' }
        ];
    } else if (url.includes('/api/balance')) {
        mockData = [
            { email: 'john.doe@example.com', name: 'John Doe', department: 'Engineering', annualLeave: 15.5, sickLeave: 8, familyResponsibility: 3, maternityLeave: 0, paternityLeave: 0, studyLeave: 5 }
        ];
    } else if (url.includes('/api/users')) {
        mockData = [
            { id: 1, email: 'john.doe@example.com', name: 'John Doe', department: 'Engineering', role: 'employee', manager: 'jane.smith@example.com' },
            { id: 2, email: 'sarah.wilson@example.com', name: 'Sarah Wilson', department: 'Marketing', role: 'employee', manager: 'jane.smith@example.com' },
            { id: 3, email: 'jane.smith@example.com', name: 'Jane Smith', department: 'Marketing', role: 'manager', manager: null },
            { id: 4, email: 'admin@example.com', name: 'Admin User', department: 'IT', role: 'admin', manager: null }
        ];
    } else if (url.includes('/api/departments')) {
        mockData = {
            success: true,
            departments: [
                { id: 1, name: 'HR & Operations', description: 'HR department managing personnel and policies', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 2, name: 'Access to Medicines', description: 'HIV Access', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 3, name: 'Finance', description: 'Finance department managing company finances', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 4, name: 'Assistive Technologies', description: 'Assistive technologies team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 5, name: 'SHF', description: 'Health Financing', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 6, name: 'TB', description: 'TB Access', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 7, name: 'HIV Prevention', description: 'HIV team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 8, name: 'Cancer', description: 'Cervical Cancer', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 9, name: 'Global', description: 'Global Team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 10, name: 'FCDO', description: 'FCDO', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 11, name: 'Malaria', description: 'Malaria team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 12, name: 'SRMNH', description: 'HIV team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 13, name: 'Pediatric and Adolescent HIV', description: 'HIV team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 14, name: 'Syphilis', description: 'HIV team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 15, name: 'Senior Leadership', description: 'Senior Leadership', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                { id: 16, name: 'Other', description: 'Any other team', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' }
            ]
        };
    } else {
        mockData = { message: 'Mock data not found for this URL.' };
    }

    return new Response(JSON.stringify(mockData), {
        status: 200,
        statusText: 'OK',
        headers: {
            'Content-Type': contentType,
        },
    });
};