import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  Delete,
  Edit,
  MonetizationOn,
  AdminPanelSettings,
  Person
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

function formatTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
}

const AdminUserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coinDialog, setCoinDialog] = useState({ open: false, user: null });
  const [coinForm, setCoinForm] = useState({ coins: 0, operation: 'set' });
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCoinDialog = (user) => {
    setCoinDialog({ open: true, user });
    setCoinForm({ coins: user.coins || 0, operation: 'set' });
  };

  const handleCloseCoinDialog = () => {
    setCoinDialog({ open: false, user: null });
  };

  const handleCoinSubmit = async () => {
    if (!coinDialog.user) return;
    if (coinForm.coins < 0) {
      toast.error('金币数量不能为负数');
      return;
    }
    try {
      const res = await axios.put(`/api/admin/users/${coinDialog.user.id}/coins`, {
        coins: parseInt(coinForm.coins) || 0,
        operation: coinForm.operation
      });
      if (res.data.success) {
        toast.success(res.data.message);
        handleCloseCoinDialog();
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '修改失败');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '修改失败');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`确定要删除用户 "${user.username}" 吗？此操作不可恢复。`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await axios.delete(`/api/admin/users/${user.id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          当前共有 {users.length} 个用户
        </Typography>
        <Button startIcon={<Refresh />} onClick={fetchUsers} size="small" variant="outlined">
          刷新
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : users.length === 0 ? (
        <Alert severity="info">暂无用户数据</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                <TableCell>用户名</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>金币</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>主题</TableCell>
                <TableCell>注册时间</TableCell>
                <TableCell>最后更新</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{
                    '& td': { color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
                      <Typography variant="body2" sx={{ fontWeight: currentUser?.userId === user.id ? 'bold' : 'normal' }}>
                        {user.username}
                        {currentUser?.userId === user.id && (
                          <Chip label="自己" size="small" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                        )}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.5) !important', fontSize: '0.75rem !important' }}>
                    {user.email || '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MonetizationOn sx={{ color: '#ffd700', fontSize: 16 }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ffd700' }}>
                        {(user.coins || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Chip
                        icon={<AdminPanelSettings sx={{ fontSize: 14 }} />}
                        label="管理员"
                        size="small"
                        sx={{ bgcolor: 'rgba(255,152,0,0.2)', color: '#ff9800', borderColor: '#ff9800' }}
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="普通用户" size="small" variant="outlined" sx={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.2)' }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.5) !important', fontSize: '0.75rem !important' }}>
                    {user.theme || 'default'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem !important' }}>
                    {formatTime(user.createdAt)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem !important' }}>
                    {formatTime(user.updatedAt)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {/* 修改金币 */}
                      <Tooltip title="修改金币">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenCoinDialog(user)}
                          sx={{ color: '#ffd700' }}
                        >
                          <MonetizationOn fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* 修改角色 */}
                      <Tooltip title="修改角色">
                        <IconButton
                          size="small"
                          onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          sx={{ color: user.role === 'admin' ? '#ff9800' : 'rgba(255,255,255,0.4)' }}
                        >
                          <AdminPanelSettings fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* 删除用户 - 不能删除自己 */}
                      {currentUser?.userId !== user.id && (
                        <Tooltip title="删除用户">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(user)}
                            disabled={deleting}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 修改金币弹窗 */}
      <Dialog
        open={coinDialog.open}
        onClose={handleCloseCoinDialog}
        PaperProps={{ sx: { bgcolor: 'rgba(30,30,40,0.98)', border: '1px solid rgba(255,255,255,0.15)' } }}
      >
        <DialogTitle>
          修改用户金币
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.5)' }}>
            用户: {coinDialog.user?.username}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <FormControl fullWidth size="small">
              <InputLabel>操作类型</InputLabel>
              <Select
                value={coinForm.operation}
                label="操作类型"
                onChange={(e) => setCoinForm(prev => ({ ...prev, operation: e.target.value }))}
              >
                <MenuItem value="set">设置为</MenuItem>
                <MenuItem value="add">增加</MenuItem>
                <MenuItem value="subtract">减少</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="金币数量"
              type="number"
              size="small"
              fullWidth
              value={coinForm.coins}
              onChange={(e) => setCoinForm(prev => ({ ...prev, coins: Math.max(0, parseInt(e.target.value) || 0) }))}
              inputProps={{ min: 0 }}
            />
            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                当前金币: {(coinDialog.user?.coins || 0).toLocaleString()}<br />
                操作后金币:
                {' '}
                {coinForm.operation === 'add'
                  ? ((coinDialog.user?.coins || 0) + (coinForm.coins || 0)).toLocaleString()
                  : coinForm.operation === 'subtract'
                  ? Math.max(0, (coinDialog.user?.coins || 0) - (coinForm.coins || 0)).toLocaleString()
                  : (coinForm.coins || 0).toLocaleString()
                }
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCoinDialog}>取消</Button>
          <Button onClick={handleCoinSubmit} variant="contained" sx={{ bgcolor: '#ffd700', color: '#000', '&:hover': { bgcolor: '#ffca28' } }}>
            确认修改
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUserManagement;
