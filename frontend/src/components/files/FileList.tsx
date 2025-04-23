import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Stack,
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
} from '@mui/icons-material';
import { filesAPI } from '../../services/api';
import { File } from '../../types';

interface FileListProps {
  files: File[];
  onFileDeleted: () => void;
  loading: boolean;
}

const FileList: React.FC<FileListProps> = ({ files, onFileDeleted, loading }) => {
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<{ [key: string]: boolean }>({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <ImageIcon />;
    if (contentType.startsWith('audio/')) return <AudioIcon />;
    if (contentType.startsWith('video/')) return <VideoIcon />;
    if (contentType === 'application/pdf') return <PdfIcon />;
    return <FileIcon />;
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
      setError(`Failed to download ${file.filename}: ${err.response?.data?.detail || err.message}`);
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
      setError(`Failed to delete ${file.filename}: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionInProgress({ ...actionInProgress, [file.id]: false });
    }
  };

  // Function to get shareable link (just a mock for now)
  const getShareableLink = (file: File) => {
    alert(`Share link (mock): ${window.location.origin}/share/${file.id}`);
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
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No files uploaded yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Upload a file to see it here
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        // Mobile view: Cards
        <Stack spacing={2}>
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getFileIcon(file.content_type)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {file.filename}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Size: {formatFileSize(file.size)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Uploaded: {formatDate(file.created_at)}
                </Typography>
              </CardContent>
              <CardActions>
                <Tooltip title="Download">
                  <IconButton 
                    onClick={() => handleDownload(file)}
                    disabled={actionInProgress[file.id]}
                  >
                    {actionInProgress[file.id] ? <CircularProgress size={24} /> : <DownloadIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton 
                    onClick={() => handleDelete(file)}
                    disabled={actionInProgress[file.id]}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share Link">
                  <IconButton onClick={() => getShareableLink(file)}>
                    <LinkIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop view: Table
        <TableContainer component={Paper} elevation={2}>
          <Table aria-label="files table">
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getFileIcon(file.content_type)}
                      <Typography sx={{ ml: 1 }}>{file.filename}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={file.content_type} 
                      size="small" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>{formatDate(file.created_at)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Download">
                      <IconButton 
                        onClick={() => handleDownload(file)}
                        disabled={actionInProgress[file.id]}
                      >
                        {actionInProgress[file.id] ? <CircularProgress size={24} /> : <DownloadIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        onClick={() => handleDelete(file)}
                        disabled={actionInProgress[file.id]}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Share Link">
                      <IconButton onClick={() => getShareableLink(file)}>
                        <LinkIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default FileList; 