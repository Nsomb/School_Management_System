import axios from 'axios';
import type { Subject } from '../types';
import { authHeader } from '../api/authHeader';

// Define the interfaces locally since they're not exported from types
interface SubjectClass {
  id: string;
  subject_id: string;
  class_name: string;
  created_at?: string;
  updated_at?: string;
}

interface BatchSubjectClass {
  subject_id: string;
  class_names: string[];
}

const API_URL = '/api/subject-classes';

// Implement the functions
const getDistinctClassNames = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${API_URL}/distinct-class-names`, {
      headers: authHeader()
    });
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.classNames) {
      return response.data.classNames;
    } else if (response.data?.data?.classNames) {
      return response.data.data.classNames;
    }
    
    console.warn('Unexpected response format for class names:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching distinct class names:', error);
    return [];
  }
};

const getAllSubjectClasses = async (): Promise<SubjectClass[]> => {
  try {
    const response = await axios.get(`${API_URL}/all`, {
      headers: authHeader()
    });
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.subjectClasses) {
      return response.data.subjectClasses;
    } else if (response.data?.data?.subjectClasses) {
      return response.data.data.subjectClasses;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching subject classes:', error);
    return [];
  }
};

const createSubjectClass = async (linkData: Omit<SubjectClass, 'id'>): Promise<SubjectClass> => {
  try {
    const response = await axios.post(`${API_URL}`, linkData, {
      headers: authHeader()
    });
    
    if (response.data?.subjectClass) {
      return response.data.subjectClass;
    } else if (response.data?.data?.subjectClass) {
      return response.data.data.subjectClass;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating subject-class link:', error);
    throw new Error('Failed to create subject-class link');
  }
};

const createBatchSubjectClasses = async (batchData: BatchSubjectClass): Promise<SubjectClass[]> => {
  try {
    const response = await axios.post(`${API_URL}/batch`, batchData, {
      headers: authHeader()
    });
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.subjectClasses) {
      return response.data.subjectClasses;
    } else if (response.data?.data?.subjectClasses) {
      return response.data.data.subjectClasses;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating batch subject-class links:', error);
    throw new Error('Failed to create batch links');
  }
};

const deleteSubjectClass = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/${id}`, {
      headers: authHeader()
    });
  } catch (error) {
    console.error(`Error deleting subject-class link ${id}:`, error);
    throw new Error('Failed to delete subject-class link');
  }
};

const getSubjectsForClass = async (className: string): Promise<Subject[]> => {
  try {
    const response = await axios.get(`${API_URL}/subjects-for/${className}`, {
      headers: authHeader()
    });
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.subjects) {
      return response.data.subjects;
    } else if (response.data?.data?.subjects) {
      return response.data.data.subjects;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching subjects for class ${className}:`, error);
    throw new Error('Failed to fetch subjects for class');
  }
};

// Export the service object
export const subjectClassService = {
  getDistinctClassNames,
  getAllSubjectClasses,
  createSubjectClass,
  createBatchSubjectClasses,
  deleteSubjectClass,
  getSubjectsForClass
};