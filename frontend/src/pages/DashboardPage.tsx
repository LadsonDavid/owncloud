import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Breadcrumbs,
  Link,
  ToggleButtonGroup,
  ToggleButton,
  Fade,
  useTheme,
  alpha,
  Tooltip,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { 
  CreateNewFolder as FolderIcon, 
  ArrowBack as ArrowBackIcon, 
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  Home as HomeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import FileUpload from '../components/files/FileUpload';
import FileList from '../components/files/FileList';
import FileGrid from '../components/files/FileGrid';
import FolderList from '../components/files/FolderList';
import { filesAPI, foldersAPI } from '../services/api';
import { File, Folder } from '../types';

const DashboardPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const theme = useTheme();

  // Folder navigation state
  const [folderPath, setFolderPath] = useState<Folder[]>([]);

  // Calculate total size
  const calculateTotalSize = useCallback(() => {
    return files.reduce((acc, file) => acc + file.size, 0);
  }, [files]);

  // Format total size
  const formatTotalSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Fetch user files
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await filesAPI.getFiles(currentFolderId);
      setFiles(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      // Handle different error formats properly
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? JSON.stringify(err.response?.data?.detail) 
        : err.response?.data?.detail || err.message || 'Failed to fetch files';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  // Fetch user folders
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await foldersAPI.getFolders(currentFolderId);
      setFolders(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching folders:', err);
      // Handle different error formats properly
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? JSON.stringify(err.response?.data?.detail) 
        : err.response?.data?.detail || err.message || 'Failed to fetch folders';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  // Load files and folders on component mount and when currentFolderId changes
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        try {
          setLoading(true);
          await Promise.all([
            fetchFiles(),
            fetchFolders()
          ]);
        } catch (err: any) {
          console.error("Error loading data:", err);
          setError(err.response?.data?.detail || 'Failed to load data');
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadData();
  }, [isAuthenticated, currentFolderId, fetchFiles, fetchFolders]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Create a new folder
  const handleCreateFolder = async () => {
    setFolderDialogOpen(true);
  };

  const handleFolderDialogClose = () => {
    setFolderDialogOpen(false);
    setNewFolderName('');
  };

  // Handle view mode change
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newViewMode: 'grid' | 'list' | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Create a new folder with better error handling
  const handleFolderDialogSubmit = async () => {
    if (newFolderName.trim() === '') {
      return;
    }

    try {
      setLoading(true);
      console.log("Creating folder:", { name: newFolderName, parentId: currentFolderId });
      const newFolder = await foldersAPI.createFolder(newFolderName, currentFolderId);
      console.log("Folder created:", newFolder);
      await fetchFolders();
      handleFolderDialogClose();
    } catch (err: any) {
      console.error("Error creating folder:", err);
      // Handle different error formats properly
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? JSON.stringify(err.response?.data?.detail) 
        : err.response?.data?.detail || err.message || 'Failed to create folder';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const handleFolderClick = async (folderId: string) => {
    try {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setCurrentFolderId(folderId);
        setFolderPath([...folderPath, folder]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to navigate to folder');
    }
  };

  // Navigate back
  const handleNavigateBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    }
  };

  // Navigate to specific path index
  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Root folder
      setFolderPath([]);
      setCurrentFolderId(null);
    } else if (index < folderPath.length) {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  // Add this new function to handle folder deletion
  const handleFolderDelete = async (folderId: string) => {
    if (window.confirm('Are you sure you want to delete this folder and all its contents? This action cannot be undone.')) {
      try {
        setLoading(true);
        await foldersAPI.deleteFolder(folderId);
        // Refresh folders list
        fetchFolders();
        setError(null);
      } catch (err: any) {
        console.error('Error deleting folder:', err);
        const errorMessage = typeof err.response?.data?.detail === 'object'
          ? JSON.stringify(err.response?.data?.detail)
          : err.response?.data?.detail || err.message || 'Failed to delete folder';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Card */}
      <Fade in timeout={800}>
        <Card 
          elevation={0} 
          sx={{ 
            mb: 4, 
            borderRadius: 4,
            backgroundImage: `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.8)}, ${alpha(theme.palette.secondary.main, 0.8)})`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box 
            sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              opacity: 0.2, 
              transform: 'rotate(-10deg)'
            }}
          >
            <StorageIcon sx={{ fontSize: 150 }} />
          </Box>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Welcome back, {user?.username}!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, maxWidth: '600px' }}>
              Manage your files securely in Malwares. Organize with folders, upload multiple file types, and access from anywhere.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button 
                variant="contained" 
                color="inherit"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ 
                  backgroundColor: 'white', 
                  color: 'primary.main',
                  '&:hover': { backgroundColor: alpha('#ffffff', 0.9) }
                }}
              >
                Upload Files
              </Button>
              <Button 
                variant="outlined" 
                color="inherit"
                startIcon={<FolderIcon />}
                onClick={handleCreateFolder}
                sx={{ borderColor: 'white', color: 'white' }}
              >
                New Folder
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              mb: 4
            }}
          >
            {/* Toolbar */}
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              {/* Folder navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {folderPath.length > 0 ? (
                  <Tooltip title="Back">
                    <IconButton 
                      onClick={handleNavigateBack}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <IconButton disabled size="small" sx={{ mr: 1, opacity: 0.3 }}>
                    <HomeIcon />
                  </IconButton>
                )}
                
                <Breadcrumbs separator="›" aria-label="breadcrumb">
                  <Link
                    color={folderPath.length === 0 ? "primary" : "inherit"}
                    sx={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: folderPath.length === 0 ? 'bold' : 'normal'
                    }}
                    onClick={() => handleNavigateToBreadcrumb(-1)}
                  >
                    <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
                    Root
                  </Link>
                  {folderPath.map((folder, index) => (
                    <Link
                      key={folder.id}
                      color={index === folderPath.length - 1 ? "primary" : "inherit"}
                      sx={{ 
                        cursor: 'pointer',
                        fontWeight: index === folderPath.length - 1 ? 'bold' : 'normal'
                      }}
                      onClick={() => handleNavigateToBreadcrumb(index)}
                    >
                      {folder.name}
                    </Link>
                  ))}
                </Breadcrumbs>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Refresh">
                  <IconButton 
                    onClick={() => { fetchFiles(); fetchFolders(); }}
                    size="small"
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  aria-label="view mode"
                  size="small"
                >
                  <ToggleButton value="grid" aria-label="grid view">
                    <GridViewIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="list" aria-label="list view">
                    <ListViewIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>

                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FolderIcon />}
                  onClick={handleCreateFolder}
                  sx={{ ml: 1 }}
                >
                  New Folder
                </Button>
              </Box>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                onClose={() => setError(null)} 
                sx={{ m: 2, borderRadius: 2 }}
              >
                {error}
              </Alert>
            )}

            {/* Content Area */}
            <Box sx={{ p: 3 }}>
              {/* Folders */}
              {folders.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Folders ({folders.length})
                  </Typography>
                  <FolderList
                    folders={folders}
                    loading={loading}
                    onFolderClick={handleFolderClick}
                    onFolderDeleted={handleFolderDelete}
                  />
                </Box>
              )}

              {/* Files */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Files ({files.length})
                </Typography>
                
                {viewMode === 'grid' ? (
                  <FileGrid 
                    files={files} 
                    onFileDeleted={fetchFiles} 
                    loading={loading} 
                  />
                ) : (
                  <FileList 
                    files={files} 
                    onFileDeleted={fetchFiles} 
                    loading={loading} 
                  />
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Fade in timeout={1000}>
            <Box>
              {/* Storage Stats Card */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Storage Statistics</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ my: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Total Files: {files.length}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Total Folders: {folders.length}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Total Size: {loading ? (
                      <CircularProgress size={16} />
                    ) : (
                      formatTotalSize(calculateTotalSize())
                    )}
                  </Typography>
                </Box>
                
                {/* Storage Usage Bar */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Storage Usage (10GB max)
                  </Typography>
                  <Box 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      overflow: 'hidden',
                      mt: 1
                    }}
                  >
                    <Box 
                      sx={{ 
                        height: '100%', 
                        width: `${Math.min((calculateTotalSize() / (10 * 1024 * 1024 * 1024)) * 100, 100)}%`, 
                        bgcolor: 'primary.main',
                        transition: 'width 0.5s ease-in-out'
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {formatTotalSize(calculateTotalSize())} of 10 GB used
                  </Typography>
                </Box>
              </Paper>

              {/* Quick Upload */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Quick Upload
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Upload files directly to {currentFolderId ? 'current folder' : 'root'}
                  {currentFolderId && (
                    <Typography component="span" fontWeight="bold">
                      {' (' + (folderPath.length > 0 ? folderPath[folderPath.length - 1].name : 'Root') + ')'}
                    </Typography>
                  )}
                </Typography>
                
                <FileUpload 
                  onFileUploaded={fetchFiles} 
                  currentFolderId={currentFolderId} 
                />
              </Paper>
            </Box>
          </Fade>
        </Grid>
      </Grid>

      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onClose={handleFolderDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleFolderDialogClose}>Cancel</Button>
          <Button 
            onClick={handleFolderDialogSubmit} 
            variant="contained"
            disabled={!newFolderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Upload Files
          {currentFolderId && (
            <Typography variant="subtitle1" color="text.secondary">
              to folder: {folderPath.length > 0 ? folderPath[folderPath.length - 1].name : 'Root'}
            </Typography>
          )}
          <IconButton
            aria-label="close"
            onClick={() => setUploadDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <FileUpload 
              onFileUploaded={() => {
                fetchFiles();
                setUploadDialogOpen(false);
              }} 
              currentFolderId={currentFolderId}
              enhanced
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default DashboardPage; 