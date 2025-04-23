import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Folder } from '../../types';

interface FolderListProps {
  folders: Folder[];
  loading: boolean;
  onFolderClick: (folderId: string) => void;
  onFolderDeleted?: (folderId: string) => void;
}

const FolderList: React.FC<FolderListProps> = ({
  folders,
  loading,
  onFolderClick,
  onFolderDeleted,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (folders.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No folders yet
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {folders.map((folder) => (
        <React.Fragment key={folder.id}>
          <ListItem
            button
            onClick={() => onFolderClick(folder.id)}
          >
            <ListItemIcon>
              <FolderIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={folder.name}
              secondary={new Date(folder.created_at).toLocaleDateString()}
            />
            {onFolderDeleted && (
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent folder click
                  onFolderDeleted(folder.id);
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </ListItem>
          <Divider component="li" />
        </React.Fragment>
      ))}
    </List>
  );
};

export default FolderList; 