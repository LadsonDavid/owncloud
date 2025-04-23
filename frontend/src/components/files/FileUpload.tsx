import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { filesAPI } from '../../services/api';

interface FileUploadProps {
  onFileUploaded: () => void;
  currentFolderId?: string | null;
  enhanced?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, currentFolderId, enhanced }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setSuccess(null);
    
    if (acceptedFiles.length === 0) {
      return;
    }

    try {
      setUploading(true);
      
      console.log("Uploading files to folder ID:", currentFolderId);
      
      // Process each file
      for (const file of acceptedFiles) {
        try {
          console.log(`Starting upload for ${file.name} to folder: ${currentFolderId || 'root'}`);
          
          // Use the API service instead of direct fetch
          const result = await filesAPI.uploadFile(file, currentFolderId);
          console.log(`Upload result:`, result);
          setSuccess(`${file.name} uploaded successfully!`);
        } catch (err: any) {
          console.error('File upload error:', err);
          setError(`Failed to upload ${file.name}: ${err.message}`);
        }
      }
      
      // Refresh file list after upload
      onFileUploaded();
    } catch (err: any) {
      console.error('Error during file upload:', err);
      const errorMessage = typeof err.response?.data?.detail === 'object'
        ? JSON.stringify(err.response?.data?.detail)
        : err.response?.data?.detail || err.message || 'Failed to upload files';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded, currentFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: enhanced, // Allow multiple files when enhanced mode is enabled
  });

  return (
    <Paper elevation={2} sx={{ p: 3, mb: enhanced ? 0 : 3 }}>
      <Typography variant="h6" gutterBottom>
        {enhanced ? 'Enhanced File Upload' : 'Upload File'}
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: enhanced ? 4 : 3,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 2,
          bgcolor: (theme) => isDragActive ? theme.palette.action.hover : 'transparent',
          transition: 'background-color 0.3s ease',
          '&:hover': {
            bgcolor: (theme) => theme.palette.action.hover,
          },
        }}
      >
        <input {...getInputProps()} multiple={enhanced} />
        <UploadIcon sx={{ fontSize: enhanced ? 64 : 48, color: 'primary.main', mb: 1 }} />
        
        {uploading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography>Uploading...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              {isDragActive ? 'Drop the file here' : `Drag & drop ${enhanced ? 'files' : 'a file'} here, or click to select`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {enhanced ? 'Multiple files supported' : 'Any file type is supported'}
            </Typography>
          </>
        )}
      </Box>
      
      <Button
        variant="contained"
        component="label"
        startIcon={<UploadIcon />}
        disabled={uploading}
        fullWidth
      >
        {enhanced ? 'Select Files' : 'Select File'}
        <input
          type="file"
          hidden
          multiple={enhanced}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onDrop(Array.from(e.target.files));
            }
          }}
        />
      </Button>
    </Paper>
  );
};

export default FileUpload; 