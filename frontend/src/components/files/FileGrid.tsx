import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Chip,
  Stack,
  useTheme,
  Divider,
  alpha,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  AudioFile as AudioIcon,
  VideoFile as VideoIcon,
  MoreHoriz as MoreIcon,
  OpenInNew as OpenIcon,
  FileCopy as CopyIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { filesAPI } from '../../services/api';
import { File } from '../../types';

interface FileGridProps {
  files: File[];
  onFileDeleted: () => void;
  loading: boolean;
}

const FileGrid: React.FC<FileGridProps> = ({ files, onFileDeleted, loading }) => {
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<{ [key: string]: boolean }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const theme = useTheme();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getFileIcon = (contentType: string, size = 48) => {
    if (contentType.startsWith('image/')) return <ImageIcon sx={{ fontSize: size }} />;
    if (contentType.startsWith('audio/')) return <AudioIcon sx={{ fontSize: size }} />;
    if (contentType.startsWith('video/')) return <VideoIcon sx={{ fontSize: size }} />;
    if (contentType === 'application/pdf') return <PdfIcon sx={{ fontSize: size }} />;
    return <FileIcon sx={{ fontSize: size }} />;
  };

  const getFileColor = (contentType: string) => {
    if (contentType.startsWith('image/')) return theme.palette.success.main;
    if (contentType.startsWith('audio/')) return theme.palette.warning.main;
    if (contentType.startsWith('video/')) return theme.palette.error.main;
    if (contentType === 'application/pdf') return theme.palette.info.main;
    return theme.palette.primary.main;
  };

  const getContentTypeLabel = (contentType: string): string => {
    const parts = contentType.split('/');
    if (parts.length === 2) {
      return parts[1].toUpperCase();
    }
    return contentType;
  };

  const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toUpperCase();
  };

  const handleDownload = async (file: File) => {
    try {
      setActionInProgress({ ...actionInProgress, [file.id]: true });
      
      const blob = await filesAPI.downloadFile(file.id);
      
      // Create a download link and click it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? JSON.stringify(err.response?.data?.detail) 
        : err.response?.data?.detail || err.message || `Failed to download ${file.filename}`;
      setError(errorMessage);
    } finally {
      setActionInProgress({ ...actionInProgress, [file.id]: false });
    }
  };

  const handleDelete = async (file: File) => {
    if (!window.confirm(`Are you sure you want to delete ${file.filename}?`)) {
      return;
    }
    
    try {
      setActionInProgress({ ...actionInProgress, [file.id]: true });
      await filesAPI.deleteFile(file.id);
      onFileDeleted();
    } catch (err: any) {
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? JSON.stringify(err.response?.data?.detail) 
        : err.response?.data?.detail || err.message || `Failed to delete ${file.filename}`;
      setError(errorMessage);
    } finally {
      setActionInProgress({ ...actionInProgress, [file.id]: false });
    }
  };

  // Function to get shareable link
  const getShareableLink = (file: File) => {
    // Create a dummy shareable link for demonstration
    const shareLink = `${window.location.origin}/share/${file.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareLink).then(() => {
      alert('Link copied to clipboard: ' + shareLink);
    });
  };

  const handlePreview = (file: File) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleInfoOpen = (file: File) => {
    setSelectedFile(file);
    setInfoOpen(true);
  };

  const canPreview = (file: File): boolean => {
    return file.content_type.startsWith('image/') || 
           file.content_type.startsWith('video/') ||
           file.content_type.startsWith('audio/') ||
           file.content_type === 'application/pdf';
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    if (selectedFile.content_type.startsWith('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, maxHeight: '80vh', overflow: 'auto' }}>
          <img 
            src={`http://localhost:8000/download/${selectedFile.id}`} 
            alt={selectedFile.filename}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        </Box>
      );
    }

    if (selectedFile.content_type.startsWith('video/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <video 
            controls 
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
            src={`http://localhost:8000/download/${selectedFile.id}`}
          >
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    }

    if (selectedFile.content_type.startsWith('audio/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <audio 
            controls
            style={{ width: '100%' }}
            src={`http://localhost:8000/download/${selectedFile.id}`}
          >
            Your browser does not support the audio tag.
          </audio>
        </Box>
      );
    }

    if (selectedFile.content_type === 'application/pdf') {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, height: '70vh' }}>
          <iframe
            src={`http://localhost:8000/download/${selectedFile.id}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={selectedFile.filename}
          />
        </Box>
      );
    }

    // For other file types, show icon
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        p: 4 
      }}>
        <Box sx={{ 
          p: 3, 
          borderRadius: '50%', 
          backgroundColor: alpha(getFileColor(selectedFile.content_type), 0.1),
          mb: 2
        }}>
          {getFileIcon(selectedFile.content_type, 96)}
        </Box>
        <Typography variant="h6" gutterBottom>
          {selectedFile.filename}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This file type cannot be previewed.
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<DownloadIcon />} 
          sx={{ mt: 2 }}
          onClick={() => handleDownload(selectedFile)}
        >
          Download to view
        </Button>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (files.length === 0) {
    return (
      <Card sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
        <Box sx={{ py: 4 }}>
          <Box sx={{ mb: 2, opacity: 0.7 }}>
            <FileIcon sx={{ fontSize: 64, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" color="text.secondary">
            No files uploaded yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Upload a file to see it here
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {files.map((file) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
            <Card 
              elevation={1}
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                }
              }}
            >
              <Box 
                sx={{ 
                  backgroundColor: alpha(getFileColor(file.content_type), 0.1),
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 140,
                  position: 'relative',
                  cursor: canPreview(file) ? 'pointer' : 'default'
                }}
                onClick={() => canPreview(file) && handlePreview(file)}
              >
                {getFileIcon(file.content_type)}
                
                <Chip 
                  label={getFileExtension(file.filename)}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    borderRadius: 1,
                    fontSize: '0.7rem'
                  }}
                />
                
                {canPreview(file) && (
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                    }}
                  >
                    <Tooltip title="Preview">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                      >
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="body1" noWrap title={file.filename}>
                  {file.filename}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {new Date(file.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
              
              <CardActions disableSpacing>
                <Tooltip title="Download">
                  <IconButton 
                    onClick={() => handleDownload(file)}
                    disabled={actionInProgress[file.id]}
                    size="small"
                  >
                    {actionInProgress[file.id] ? <CircularProgress size={20} /> : <DownloadIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                  <IconButton onClick={() => getShareableLink(file)} size="small">
                    <LinkIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Details">
                  <IconButton onClick={() => handleInfoOpen(file)} size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Delete">
                  <IconButton 
                    onClick={() => handleDelete(file)}
                    disabled={actionInProgress[file.id]}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* File Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedFile?.filename}
          <IconButton
            aria-label="close"
            onClick={() => setPreviewOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {renderFilePreview()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          {selectedFile && (
            <Button 
              onClick={() => handleDownload(selectedFile)} 
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* File Info Dialog */}
      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          File Details
          <IconButton
            aria-label="close"
            onClick={() => setInfoOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedFile && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  backgroundColor: alpha(getFileColor(selectedFile.content_type), 0.1) 
                }}>
                  {getFileIcon(selectedFile.content_type, 40)}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" noWrap>
                    {selectedFile.filename}
                  </Typography>
                  <Chip 
                    label={getContentTypeLabel(selectedFile.content_type)}
                    size="small"
                    color="primary"
                    sx={{ borderRadius: 1, mt: 0.5 }}
                  />
                </Box>
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Size
                </Typography>
                <Typography variant="body1">
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Uploaded
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedFile.created_at)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  File Type
                </Typography>
                <Typography variant="body1">
                  {selectedFile.content_type}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  File ID
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ mr: 1, fontSize: '0.875rem' }}>
                    {selectedFile.id}
                  </Typography>
                  <Tooltip title="Copy ID">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFile.id);
                        alert('File ID copied to clipboard');
                      }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Close</Button>
          {selectedFile && (
            <Button 
              onClick={() => handleDownload(selectedFile)}
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileGrid; 