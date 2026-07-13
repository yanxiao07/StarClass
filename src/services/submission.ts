import { apiClient } from './client';

export interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  content?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  files?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  status: 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  homeworkCompletion?: number;
  accuracy?: number;
  participation?: number;
  creativity?: number;
  teamwork?: number;
  improvement?: number;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  homework?: {
    id: string;
    title: string;
  };
}

export const submissionApi = {
  getSubmissions: async (homeworkId?: string): Promise<Submission[]> => {
    const url = homeworkId ? `/api/submissions?homeworkId=${homeworkId}` : '/api/submissions';
    return apiClient.get<Submission[]>(url);
  },

  createSubmission: async (data: {
    homeworkId: string;
    content?: string | null;
    imageUrl?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    files?: File[];
  }): Promise<Submission> => {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      formData.append('homeworkId', data.homeworkId);
      if (data.content) formData.append('content', data.content);
      if (data.imageUrl) formData.append('imageUrl', data.imageUrl);
      if (data.fileUrl) formData.append('fileUrl', data.fileUrl);
      if (data.fileName) formData.append('fileName', data.fileName);
      
      data.files.forEach((file) => {
        formData.append('files', file);
      });
      
      return apiClient.postFormData<Submission>('/api/submissions', formData);
    } else {
      return apiClient.post<Submission>('/api/submissions', data);
    }
  },

  gradeSubmission: async (
    id: string,
    data: { 
      grade: number; 
      feedback: string;
      homeworkCompletion?: number | null;
      accuracy?: number | null;
      participation?: number | null;
      creativity?: number | null;
      teamwork?: number | null;
      improvement?: number | null;
    }
  ): Promise<Submission> => {
    return apiClient.put<Submission>(`/api/submissions/${id}/grade`, data);
  },
};
