import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase'; // Assuming '@/lib/firebase' exports a pre-initialized storage instance

/**
 * Uploads a file to Firebase Storage.
 * @param file - The file to upload.
 * @returns Promise<string> - The public download URL of the uploaded file.
 */
export const uploadFile = async (file: File): Promise<string> => {
  try {
    // Validate file type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Only PDF and Word documents are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    // Create unique filename with timestamp and original name
    const timestamp = Date.now();
    const fileName = `questions/${timestamp}_${file.name.replace(/\s+/g, '_')}`;
    
    // Create storage reference and upload the file
    const storageRef = ref(storage, fileName);
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the public download URL and return it
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('Firebase upload error:', error);
    // Re-throw a standardized error message
    throw new Error(error instanceof Error ? error.message : 'File upload failed');
  }
};

/**
 * Deletes a file from Firebase Storage.
 * @param fileUrl - The URL of the file to delete.
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    // Extract the path from the Firebase URL
    const url = new URL(fileUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
    
    // Create reference and delete
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Firebase delete error:', error);
    throw new Error('Failed to delete file from storage.');
  }
};

/**
 * Extracts the file extension from a filename.
 * @param fileName - The filename to process.
 * @returns string - The file extension in lowercase.
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
};
