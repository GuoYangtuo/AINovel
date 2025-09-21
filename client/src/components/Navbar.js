import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  ExitToApp,
  Person,
  ArrowBack,
  Add,
  Settings,
  MonetizationOn
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navbar = ({ 
  title, 
  showBackButton = false, 
  onBack = null,
  showUserMenu = true,
  onCreateRoom = null,
  onGoToSettings = null,
  onOpenRecharge = null,
  customStyle = {},
  children
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleLogout = () => {
    logout();
    setLogoutDialog(false);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      // 使用浏览器历史记录返回，如果没有历史记录则返回首页
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  const handleCreateRoom = () => {
    handleUserMenuClose();
    if (onCreateRoom) {
      onCreateRoom();
    } else {
      navigate('/create-room');
    }
  };

  const handleGoToSettings = () => {
    handleUserMenuClose();
    if (onGoToSettings) {
      onGoToSettings();
    } else {
      navigate('/settings');
    }
  };

  const handleOpenRecharge = () => {
    handleUserMenuClose();
    if (onOpenRecharge) {
      onOpenRecharge();
    }
  };

  const defaultStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    ...customStyle
  };

  return (
    <>
      <AppBar position="fixed" sx={defaultStyle}>
        <Toolbar>
          {showBackButton && (
            <IconButton
              color="inherit"
              onClick={handleBackClick}
              sx={{ color: 'white', mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            {title}
          </Typography>

          {children && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
              {children}
            </Box>
          )}
          
          {showUserMenu && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<Person />}
                label={user?.username}
                color="primary"
                variant="outlined"
                onClick={handleUserMenuOpen}
                sx={{ 
                  color: 'white', 
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              />
              
              <IconButton
                color="inherit"
                onClick={() => setLogoutDialog(true)}
                sx={{ color: 'white' }}
              >
                <ExitToApp />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* 用户下拉菜单 */}
      {showUserMenu && (
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          PaperProps={{
            sx: {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              minWidth: 200
            }
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleOpenRecharge}>
            <ListItemIcon>
              <MonetizationOn sx={{ color: '#ffd700' }} />
            </ListItemIcon>
            <ListItemText 
              primary={`金币余额: ${user?.coins || 0}`} 
              sx={{ '& .MuiListItemText-primary': { fontWeight: 'bold' } }}
            />
          </MenuItem>
          <MenuItem onClick={handleCreateRoom}>
            <ListItemIcon>
              <Add sx={{ color: 'white' }} />
            </ListItemIcon>
            <ListItemText primary="创建房间" />
          </MenuItem>
          <MenuItem onClick={handleGoToSettings}>
            <ListItemIcon>
              <Settings sx={{ color: 'white' }} />
            </ListItemIcon>
            <ListItemText primary="用户设置" />
          </MenuItem>
        </Menu>
      )}

      {/* 退出确认对话框 */}
      <Dialog
        open={logoutDialog}
        onClose={() => setLogoutDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }
        }}
      >
        <DialogTitle>确认退出</DialogTitle>
        <DialogContent>
          <Typography>
            你确定要退出登录吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialog(false)}>
            取消
          </Button>
          <Button onClick={handleLogout} color="primary" variant="contained">
            确认退出
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;