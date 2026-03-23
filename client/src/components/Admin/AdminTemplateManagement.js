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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
} from '@mui/material';
import {
  Refresh,
  Delete,
  Visibility,
  AutoAwesome,
  ContentCopy,
  ExpandMore,
  FormatListBulleted
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

function formatTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
}

function TemplatePreviewDialog({ template, onClose }) {
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    axios.post(`/api/admin/templates/${template.id}/preview`)
      .then(res => {
        if (res.data.success) setPreview(res.data.preview);
      })
      .catch(() => toast.error('预览失败'))
      .finally(() => setLoading(false));
  }, [template.id]);

  const handleCopy = () => {
    let textToCopy = '';
    switch (activeTab) {
      case 0: textToCopy = preview; break;
      case 1: textToCopy = template.promptTemplate?.systemPrompt || ''; break;
      case 2: textToCopy = template.promptTemplate?.initialPrompt || ''; break;
      case 3: textToCopy = template.promptTemplate?.continuePrompt || ''; break;
      default: textToCopy = preview;
    }
    navigator.clipboard.writeText(textToCopy);
    toast.success('已复制到剪贴板');
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(30,30,40,0.98)',
          border: '1px solid rgba(255,255,255,0.15)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          模板详情: {template.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {template.description || '无描述'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: '#ff9800' } }}
            sx={{
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', minHeight: 44, fontSize: '0.8rem' },
              '& .Mui-selected': { color: '#ff9800 !important' }
            }}
          >
            <Tab label="AI续写预览" />
            <Tab label="System Prompt" />
            <Tab label="初始提示词" />
            <Tab label="续写提示词" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopy} variant="outlined">
                  复制
                </Button>
              </Box>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: '#1e1e1e',
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: activeTab === 0 ? 300 : 400,
                  fontSize: '0.78rem',
                  fontFamily: 'Consolas, monospace',
                  color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                {activeTab === 0 && (preview || '无预览内容')}
                {activeTab === 1 && (template.promptTemplate?.systemPrompt || '无')}
                {activeTab === 2 && (template.promptTemplate?.initialPrompt || '无')}
                {activeTab === 3 && (template.promptTemplate?.continuePrompt || '无')}
              </Box>
            </>
          )}

          {!loading && (
            <Box sx={{ mt: 2 }}>
              {/* 基本信息 */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2, fontSize: '0.82rem' }}>
                <Box><strong>ID:</strong> <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{template.id}</span></Box>
                <Box><strong>创建时间:</strong> {formatTime(template.createdAt)}</Box>
                {template.tags?.length > 0 && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <strong>标签:</strong>{' '}
                    {template.tags.map((t, i) => <Chip key={i} label={t} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                  </Box>
                )}
              </Box>

              {/* 世界观 */}
              {template.worldSetting && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>世界观设置</Typography>
                  {Object.entries(template.worldSetting).map(([key, value]) => (
                    value && (
                      <Box key={key} sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                        <strong>{key}:</strong> {value}
                      </Box>
                    )
                  ))}
                </Box>
              )}

              {/* 角色 */}
              {template.characters?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>
                    角色列表 ({template.characters.length})
                  </Typography>
                  {template.characters.map((char, idx) => (
                    <Accordion key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.03)', mb: 0.5 }}>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 36 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          {char.name} — {char.role}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ fontSize: '0.78rem' }}>
                        {char.basicInfo && <Box sx={{ mb: 0.5 }}><strong>基本信息:</strong> {char.basicInfo}</Box>}
                        {char.personality && <Box sx={{ mb: 0.5 }}><strong>性格:</strong> {char.personality}</Box>}
                        {char.backgroundStory?.length > 0 && (
                          <Box sx={{ mb: 0.5 }}>
                            <strong>背景故事:</strong> {Array.isArray(char.backgroundStory) ? char.backgroundStory.join(' ') : char.backgroundStory}
                          </Box>
                        )}
                        {char.relationships?.length > 0 && (
                          <Box><strong>人际关系:</strong> {Array.isArray(char.relationships) ? char.relationships.join(', ') : char.relationships}</Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}

              {/* 格式说明 */}
              {template.promptTemplate?.formatInstructions && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>格式说明</Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.5,
                      bgcolor: '#1e1e1e',
                      borderRadius: 1,
                      fontSize: '0.78rem',
                      fontFamily: 'Consolas, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: 'rgba(255,255,255,0.7)'
                    }}
                  >
                    {template.promptTemplate.formatInstructions}
                  </Box>
                </Box>
              )}

              {/* 设置 */}
              {template.settings && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff9800' }}>模板设置</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, fontSize: '0.82rem' }}>
                    <Box><strong>投票时长:</strong> {(template.settings.votingDuration / 60000).toFixed(0)}分钟</Box>
                    <Box><strong>最大选项:</strong> {template.settings.maxChoices}</Box>
                    <Box><strong>故事长度:</strong> {template.settings.storyLength}</Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

const AdminTemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewDialog, setPreviewDialog] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/admin/templates');
      if (res.data.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || '获取模板列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`确定要删除模板 "${template.name}" 吗？此操作不可恢复。`)) return;
    setDeleting(template.id);
    try {
      const res = await axios.delete(`/api/admin/templates/${template.id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchTemplates();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '删除失败');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          当前共有 {templates.length} 个模板
        </Typography>
        <Button startIcon={<Refresh />} onClick={fetchTemplates} size="small" variant="outlined">
          刷新
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : templates.length === 0 ? (
        <Alert severity="info">暂无模板数据</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                <TableCell>模板名称</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>标签</TableCell>
                <TableCell>角色数</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  sx={{
                    '& td': { color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesome fontSize="small" sx={{ color: '#ba68c8' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {template.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={template.description || '无描述'} arrow>
                      <span>{template.description || '无描述'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {template.tags?.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {template.tags.slice(0, 3).map((tag, idx) => (
                          <Chip key={idx} label={tag} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        ))}
                        {template.tags.length > 3 && (
                          <Chip label={`+${template.tags.length - 3}`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FormatListBulleted fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
                      {template.characters?.length || 0}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem !important' }}>
                    {formatTime(template.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="预览/查看详情">
                        <IconButton size="small" onClick={() => setPreviewDialog(template)} sx={{ color: '#4fc3f7' }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除模板">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTemplate(template)}
                          disabled={deleting === template.id}
                        >
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

      {/* 预览/详情弹窗 */}
      {previewDialog && (
        <TemplatePreviewDialog template={previewDialog} onClose={() => setPreviewDialog(null)} />
      )}
    </Box>
  );
};

export default AdminTemplateManagement;
