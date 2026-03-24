import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  LiveTv,
  Link,
  LinkOff,
  Refresh,
  Delete,
  Videocam,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const PLATFORM_LABELS = {
  bilibili: 'B站',
  douyin: '抖音',
  kuaishou: '快手',
};

const PLATFORM_COLORS = {
  bilibili: '#00A1D6',
  douyin: '#000000',
  kuaishou: '#FF6C00',
};

function LiveBridgeDialog({ open, onClose, roomId, roomTitle }) {
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'bilibili',
    idCode: 'FGAIJ5Z73HTS0',
    appId: '1777549858214',
    key: 'L9mNDCQ14ylFemim89CU7K3F',
    secret: 'jgYj05e7qzM1yzBeqY0qgTDyIjsWkz',
    host: 'https://live-open.biliapi.com',
    liveRoomId: '',
  });

  const fetchBridges = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/bridges/room/${roomId}`);
      if (res.data.success) {
        setBridges(res.data.bridges || []);
      }
    } catch (err) {
      toast.error('获取桥接器状态失败');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (open && roomId) {
      fetchBridges();
    }
  }, [open, roomId, fetchBridges]);

  const handleConnect = async () => {
    if (!formData.idCode || !formData.appId || !formData.key || !formData.secret) {
      toast.error('请填写完整的鉴权信息');
      return;
    }

    setConnecting(true);
    try {
      const res = await axios.post('/api/admin/bridges/connect', {
        platform: formData.platform,
        novelRoomId: roomId,
        credentials: {
          idCode: formData.idCode,
          appId: parseInt(formData.appId, 10),
          key: formData.key,
          secret: formData.secret,
          host: formData.host,
        },
        liveRoomId: formData.liveRoomId,
      });

      if (res.data.success) {
        toast.success('直播桥接器连接成功');
        setConnectDialogOpen(false);
        // 直接用后端返回的最新状态更新列表
        if (res.data.bridges) {
          setBridges(res.data.bridges);
        } else if (res.data.bridge) {
          setBridges(prev => {
            const filtered = prev.filter(b => b.bridgeId !== res.data.bridge.bridgeId);
            return [...filtered, res.data.bridge];
          });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (bridgeId) => {
    try {
      const res = await axios.post('/api/admin/bridges/disconnect', { bridgeId });
      if (res.data.success) {
        toast.success('已断开桥接器');
        fetchBridges();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '断开失败');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(20, 20, 30, 0.98)',
          border: '1px solid rgba(255,255,255,0.15)',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <LiveTv sx={{ color: '#ff9800' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          直播桥接管理
        </Typography>
        <Chip label={roomTitle || roomId} size="small" sx={{ ml: 1 }} />
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* 桥接器列表 */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              已连接的直播 ({bridges.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" startIcon={<Refresh />} onClick={fetchBridges} variant="outlined">
                刷新
              </Button>
              <Button
                size="small"
                startIcon={<Link />}
                onClick={() => setConnectDialogOpen(true)}
                variant="contained"
                sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
              >
                连接直播间
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
          ) : bridges.length === 0 ? (
            <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
              暂无连接的直播间。用户可在直播间发送弹幕或赠送礼物来参与投票。
              <br />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
                弹幕内容与投票选项匹配即可自动投票；礼物将转换为票数自动投给当前最高票选项。
              </Typography>
            </Alert>
          ) : (
            <List dense sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
              {bridges.map((bridge) => (
                <ListItem
                  key={bridge.bridgeId}
                  sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                    <Videocam sx={{ color: PLATFORM_COLORS[bridge.platform] || '#888', fontSize: 20 }} />
                    <Chip
                      label={PLATFORM_LABELS[bridge.platform] || bridge.platform}
                      size="small"
                      sx={{
                        bgcolor: PLATFORM_COLORS[bridge.platform] || '#888',
                        color: '#fff',
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {bridge.credentials?.liveRoomId ? `直播间: ${bridge.credentials.liveRoomId}` : 'B站直播'}
                        </Typography>
                        {bridge.running ? (
                          <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label="已连接" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
                        ) : (
                          <Chip icon={<Cancel sx={{ fontSize: '14px !important' }} />} label="已断开" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                        ID: {bridge.bridgeId} &nbsp;|&nbsp; 已桥接投票: {bridge.voteCount} &nbsp;|&nbsp; 连接于: {bridge.connectedAt ? new Date(bridge.connectedAt).toLocaleString('zh-CN') : '-'}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="断开连接">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDisconnect(bridge.bridgeId)}
                      >
                        <LinkOff fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* 连接对话框 */}
        <Dialog
          open={connectDialogOpen}
          onClose={() => setConnectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { bgcolor: 'rgba(20, 20, 30, 0.98)', border: '1px solid rgba(255,255,255,0.15)' },
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Link sx={{ color: '#ff9800' }} />
              连接直播间
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
              连接后，用户在该直播间的弹幕和礼物将自动桥接到小说房间的投票中。
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="平台"
                  value={formData.platform}
                  disabled
                  fullWidth
                  size="small"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="主播身份码 (idCode)"
                  value={formData.idCode}
                  onChange={(e) => setFormData({ ...formData, idCode: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="例如: FGAIJ5Z73HTS0"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="应用ID (appId)"
                  value={formData.appId}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="例如: 1777549858214"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Access Key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="例如: L9mNDCQ14ylFemim89CU7K3F"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Access Key Secret"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="例如: jgYj05e7qzM1yzBeqY0qgTDyIjsWkz"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="API 地址 (可选)"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="https://live-open.biliapi.com"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="直播间ID (可选)"
                  value={formData.liveRoomId}
                  onChange={(e) => setFormData({ ...formData, liveRoomId: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="部分平台可能需要"
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
            <Button onClick={() => setConnectDialogOpen(false)}>取消</Button>
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={connecting}
              startIcon={connecting ? <CircularProgress size={16} /> : <Link />}
              sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
            >
              {connecting ? '连接中...' : '连接'}
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

export default LiveBridgeDialog;
