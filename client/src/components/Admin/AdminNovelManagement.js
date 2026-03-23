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
  Tooltip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Refresh,
  Delete,
  Visibility,
  Save,
  ExpandMore,
  PeopleAlt,
  History,
  HowToVote,
  Description,
  FolderOpen,
  AutoAwesome,
  Download
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
}

function DetailPanel({ roomId, detail, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [logContent, setLogContent] = useState('');
  const [dataContent, setDataContent] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`/api/admin/novels/${roomId}/logs`);
      if (res.data.success) {
        setLogContent(res.data.content);
      }
    } catch {
      toast.error('获取日志失败');
    } finally {
      setLoadingLogs(false);
    }
  }, [roomId]);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await axios.get(`/api/admin/novels/${roomId}/data`);
      if (res.data.success) {
        setDataContent(res.data.data);
      }
    } catch {
      toast.error('获取数据文件失败');
    } finally {
      setLoadingData(false);
    }
  }, [roomId]);

  const handleDownloadData = () => {
    if (!dataContent) return;
    const blob = new Blob([JSON.stringify(dataContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roomId}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeTab === 1 && !logContent) fetchLogs();
    if (activeTab === 2 && !dataContent) fetchData();
  }, [activeTab, logContent, dataContent, fetchLogs, fetchData]);

  const votingState = detail?.votingState || {};
  const storyHistory = detail?.storyHistory || [];

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(30, 30, 40, 0.98)',
          border: '1px solid rgba(255,255,255,0.15)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          房间详情: {detail?.title || roomId}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          模板: {detail?.templateName} | 故事段落: {storyHistory.length}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: '#ff9800' } }}
          sx={{
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', minHeight: 48 },
            '& .Mui-selected': { color: '#ff9800 !important' }
          }}
        >
          <Tab icon={<History />} iconPosition="start" label="投票记录" />
          <Tab icon={<Description />} iconPosition="start" label="日志文件" />
          <Tab icon={<FolderOpen />} iconPosition="start" label="数据文件" />
        </Tabs>

        {/* 投票记录 Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
            {/* 当前投票状态 */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>
              当前投票状态
            </Typography>
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box>投票中: <Chip label={votingState.isVoting ? '是' : '否'} size="small" color={votingState.isVoting ? 'success' : 'default'} /></Box>
                <Box>截止时间: {votingState.votingEndTime ? formatTime(new Date(votingState.votingEndTime).toISOString()) : '-'}</Box>
                <Box>选项数: {votingState.choices?.length || 0}</Box>
                <Box>自定义选项: {votingState.customOptions?.length || 0}</Box>
              </Box>
              {votingState.choices?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>选项: </Typography>
                  {votingState.choices.map((c, i) => (
                    <Chip key={i} label={c} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              )}
              {votingState.customOptions?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>自定义选项: </Typography>
                  {votingState.customOptions.map((o, i) => (
                    <Chip key={i} label={o.content} size="small" color="warning" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              )}
            </Paper>

            {/* 当前投票 */}
            {Object.keys(votingState.votes || {}).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>当前票数分布</Typography>
                {Object.entries(votingState.votes || {}).map(([choice, count]) => (
                  <Box key={choice} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ width: 200, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {choice}
                    </Typography>
                    <Box sx={{ flex: 1, height: 20, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden', mx: 1 }}>
                      <Box sx={{ width: `${Math.min(100, count * 10)}%`, height: '100%', bgcolor: '#4fc3f7', borderRadius: 1, transition: 'width 0.3s' }} />
                    </Box>
                    <Typography variant="body2" sx={{ width: 30, textAlign: 'right', fontSize: '0.8rem' }}>{count}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* 历史投票 */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>
              故事历史 ({storyHistory.length} 段落)
            </Typography>
            {storyHistory.length === 0 && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>暂无历史记录</Typography>}
            {storyHistory.map((seg, idx) => (
              <Accordion key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.03)', mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    段落{idx + 1}: {seg.winningChoice?.substring(0, 50) || '未知'}... ({seg.votes ? Object.values(seg.votes).reduce((a, b) => a + b, 0) : 0} 票)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ fontSize: '0.75rem' }}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#ff9800' }}>故事摘要:</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {seg.story?.substring(0, 300) || '-'}...
                    </Typography>
                  </Box>
                  {seg.votes && Object.keys(seg.votes).length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#ff9800' }}>投票结果:</Typography>
                      {Object.entries(seg.votes).map(([c, cnt]) => (
                        <Typography key={c} variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                          {c}: {cnt} 票
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {seg.discussion?.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#ff9800' }}>讨论 ({seg.discussion.length} 条):</Typography>
                      {seg.discussion.slice(-3).map((msg, mi) => (
                        <Typography key={mi} variant="body2" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                          [{msg.username}]: {msg.message?.substring(0, 80)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* 日志文件 Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
            {!logContent ? (
              loadingLogs ? <CircularProgress /> :
                <Button onClick={fetchLogs}>加载日志</Button>
            ) : (
              <Box
                dangerouslySetInnerHTML={{ __html: logContent }}
                sx={{
                  '& *': { color: 'inherit !important', fontFamily: 'Consolas, monospace !important' },
                  '& body': { backgroundColor: '#1e1e1e !important' },
                  p: 2,
                  bgcolor: '#1e1e1e',
                  borderRadius: 1
                }}
              />
            )}
          </Box>
        )}

        {/* 数据文件 Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
            {!dataContent ? (
              loadingData ? <CircularProgress /> : <Button onClick={fetchData}>加载数据</Button>
            ) : (
              <>
                <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<Download />} onClick={handleDownloadData}>
                    下载 JSON
                  </Button>
                </Box>
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: '#1e1e1e',
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: '50vh',
                    fontSize: '0.7rem',
                    fontFamily: 'Consolas, monospace',
                    color: 'rgba(255,255,255,0.8)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                >
                  {JSON.stringify(dataContent, null, 2)}
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

const AdminNovelManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, room: null, deleteData: false });

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/admin/novels');
      if (res.data.success) {
        setRooms(res.data.rooms || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || '获取房间列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleViewDetail = async (roomId) => {
    setSelectedRoom(roomId);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`/api/admin/novels/${roomId}`);
      if (res.data.success) {
        setDetail(res.data.room);
      }
    } catch {
      toast.error('获取房间详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveRoom = async (roomId) => {
    try {
      const res = await axios.post(`/api/admin/novels/${roomId}/save`);
      if (res.data.success) {
        toast.success('房间数据已保存');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDeleteRoom = async () => {
    const { room } = deleteDialog;
    if (!room) return;
    try {
      const res = await axios.delete(`/api/admin/novels/${room.roomId}?deleteData=${deleteDialog.deleteData}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setDeleteDialog({ open: false, room: null, deleteData: false });
        fetchRooms();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '删除失败');
    }
  };

  const handleDetailClose = () => {
    setSelectedRoom(null);
    setDetail(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          当前共有 {rooms.length} 个房间
        </Typography>
        <Button startIcon={<Refresh />} onClick={fetchRooms} size="small" variant="outlined">
          刷新
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : rooms.length === 0 ? (
        <Alert severity="info">暂无房间数据</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                <TableCell>房间ID</TableCell>
                <TableCell>标题</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>在线人数</TableCell>
                <TableCell>模板</TableCell>
                <TableCell>故事段落</TableCell>
                <TableCell>日志文件</TableCell>
                <TableCell>数据文件</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <TableRow
                  key={room.roomId}
                  sx={{
                    '& td': { color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                  }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important' }}>{room.roomId}</TableCell>
                  <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</TableCell>
                  <TableCell>
                    <Chip label={room.isActive ? '活跃' : '非活跃'} size="small" color={room.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleAlt fontSize="small" />
                      {room.connectedUsers}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={room.templateName || '未知'} arrow>
                      <span>{room.templateName || '-'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{room.storyHistoryLength || 0}</TableCell>
                  <TableCell>
                    {room.logFileExists ? (
                      <Typography variant="caption" sx={{ color: '#4caf50' }}>{formatBytes(room.logFileSize)}</Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>无</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {room.dataFileExists ? (
                      <Typography variant="caption" sx={{ color: '#4caf50' }}>{formatBytes(room.dataFileSize)}</Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>无</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem !important' }}>{formatTime(room.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="保存数据">
                        <IconButton size="small" onClick={() => handleSaveRoom(room.roomId)}>
                          <Save fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="查看详情">
                        <IconButton size="small" onClick={() => handleViewDetail(room.roomId)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除房间">
                        <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, room, deleteData: false })}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 详情弹窗 */}
      {selectedRoom && (
        <DetailPanel roomId={selectedRoom} detail={detail} onClose={handleDetailClose} />
      )}

      {/* 删除确认弹窗 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, room: null, deleteData: false })}
        PaperProps={{ sx: { bgcolor: 'rgba(30,30,40,0.98)', border: '1px solid rgba(255,255,255,0.15)' } }}
      >
        <DialogTitle>确认删除房间</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            确定要删除房间 <strong>{deleteDialog.room?.roomId}</strong> ({deleteDialog.room?.title}) 吗？
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.6)' }}>
            此操作不可恢复。
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type="checkbox"
              id="deleteDataCheckbox"
              checked={deleteDialog.deleteData}
              onChange={(e) => setDeleteDialog(prev => ({ ...prev, deleteData: e.target.checked }))}
            />
            <label htmlFor="deleteDataCheckbox" style={{ color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
              同时删除数据文件和日志文件
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, room: null, deleteData: false })}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDeleteRoom}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminNovelManagement;
