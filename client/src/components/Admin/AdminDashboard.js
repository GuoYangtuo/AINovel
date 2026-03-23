import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  MenuBook,
  People,
  AutoAwesome,
  ArrowBack,
  Dashboard
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AdminNovelManagement from './AdminNovelManagement';
import AdminUserManagement from './AdminUserManagement';
import AdminTemplateManagement from './AdminTemplateManagement';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const response = await axios.get('/api/admin/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      setStatsError('获取统计信息失败');
      console.error('获取统计信息失败:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleBack = () => {
    navigate('/');
  };

  const statCards = [
    { label: '总用户数', value: stats?.totalUsers ?? '-', icon: <People />, color: '#4fc3f7' },
    { label: '总模板数', value: stats?.totalTemplates ?? '-', icon: <AutoAwesome />, color: '#ba68c8' },
    { label: '总房间数', value: stats?.totalRooms ?? '-', icon: <MenuBook />, color: '#81c784' },
    { label: '活跃房间', value: stats?.activeRooms ?? '-', icon: <MenuBook />, color: '#ffb74d' },
    { label: '在线人数', value: stats?.totalOnlineUsers ?? '-', icon: <People />, color: '#4dd0e1' },
    { label: '总投票数', value: stats?.totalVotes ?? '-', icon: <Dashboard />, color: '#e57373' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 顶部导航栏 */}
      <AppBar position="fixed" sx={{ bgcolor: 'rgba(0,0,0,0)', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#ff9800' }}>
            管理面板
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            管理员: {user?.username}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: 12, pb: 4 }}>
        {/* 统计卡片 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
            系统概览
          </Typography>
          {loadingStats ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={24} />
            </Box>
          ) : statsError ? (
            <Alert severity="error">{statsError}</Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
              {statCards.map((card, idx) => (
                <Paper
                  key={idx}
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Box sx={{ color: card.color, display: 'flex' }}>{card.icon}</Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: card.color, lineHeight: 1 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {card.label}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>

        {/* 标签页 */}
        <Paper
          sx={{
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: '#ff9800' } }}
              sx={{
                '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' },
                '& .Mui-selected': { color: '#ff9800 !important' }
              }}
            >
              <Tab icon={<MenuBook />} iconPosition="start" label="小说管理" {...a11yProps(0)} />
              <Tab icon={<People />} iconPosition="start" label="用户管理" {...a11yProps(1)} />
              <Tab icon={<AutoAwesome />} iconPosition="start" label="模板管理" {...a11yProps(2)} />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <TabPanel value={currentTab} index={0}>
              <AdminNovelManagement />
            </TabPanel>
            <TabPanel value={currentTab} index={1}>
              <AdminUserManagement />
            </TabPanel>
            <TabPanel value={currentTab} index={2}>
              <AdminTemplateManagement />
            </TabPanel>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
