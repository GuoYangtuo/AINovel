import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Delete,
  ExpandMore,
  Preview,
  Save,
  PlayArrow,
  ContentCopy,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const CreateRoom = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [promptPreview, setPromptPreview] = useState('');
  const [previewType, setPreviewType] = useState('initial');

  // 房间基本信息
  const [roomInfo, setRoomInfo] = useState({
    roomId: '',
    title: '',
    description: '',
    tags: []
  });

  // 模板数据
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    tags: [],
    worldSetting: {
      background: '',
      setting: '',
      rules: '',
      atmosphere: ''
    },
    characters: [],
    promptTemplate: {
      systemPrompt: '你是一个高水平小说作家',
      initialPrompt: '',
      continuePrompt: '',
      formatInstructions: '输出格式说明：故事正文在前，选项数组在后，选项用JSON数组格式，不要包含任何其他内容'
    },
    settings: {
      votingDuration: 60000,
      maxChoices: 3,
      minChoices: 2,
      storyLength: 'medium',
      perspective: 'first_person'
    }
  });

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 加载模板列表
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('加载模板列表失败:', error);
    }
  };

  // 从模板加载数据
  const loadFromTemplate = async (templateId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();
      if (data.success) {
        setTemplateData(data.template);
        setRoomInfo({
          ...roomInfo,
          title: data.template.name,
          description: data.template.description,
          tags: data.template.tags
        });
        setSelectedTemplate(data.template);
        setSuccess('模板加载成功！');
      }
    } catch (error) {
      setError('加载模板失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 添加角色
  const addCharacter = () => {
    setTemplateData({
      ...templateData,
      characters: [
        ...templateData.characters,
        {
          name: '',
          role: '',
          basicInfo: '',
          personality: '',
          backgroundStory: [''],
          relationships: []
        }
      ]
    });
  };

  // 删除角色
  const removeCharacter = (index) => {
    const newCharacters = templateData.characters.filter((_, i) => i !== index);
    setTemplateData({
      ...templateData,
      characters: newCharacters
    });
  };

  // 更新角色信息
  const updateCharacter = (index, field, value) => {
    const newCharacters = [...templateData.characters];
    if (field === 'backgroundStory') {
      newCharacters[index][field] = value.split('\n').filter(line => line.trim());
    } else if (field === 'relationships') {
      newCharacters[index][field] = value.split('\n').filter(line => line.trim());
    } else {
      newCharacters[index][field] = value;
    }
    setTemplateData({
      ...templateData,
      characters: newCharacters
    });
  };

  // 添加标签
  const addTag = (newTag) => {
    if (newTag && !roomInfo.tags.includes(newTag)) {
      setRoomInfo({
        ...roomInfo,
        tags: [...roomInfo.tags, newTag]
      });
    }
  };

  // 删除标签
  const removeTag = (tagToRemove) => {
    setRoomInfo({
      ...roomInfo,
      tags: roomInfo.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // 预览提示词
  const previewPrompt = async (type = 'initial') => {
    try {
      const response = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateData,
          promptType: type,
          storyHistory: type === 'continue' ? [
            { story: '这是一个示例故事段落...', winningChoice: '示例选择' }
          ] : []
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setPromptPreview(data.preview);
        setPreviewType(type);
        setPreviewDialog(true);
      }
    } catch (error) {
      setError('预览失败：' + error.message);
    }
  };

  // 生成房间ID
  const generateRoomId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6);
    setRoomInfo({
      ...roomInfo,
      roomId: `room-${timestamp}-${random}`
    });
  };

  // 创建房间
  const createRoom = async () => {
    try {
      if (!roomInfo.roomId.trim() || !roomInfo.title.trim()) {
        setError('房间ID和标题不能为空');
        return;
      }

      setLoading(true);
      setError('');

      // 如果是从模板创建，使用模板API
      if (selectedTemplate) {
        const response = await fetch(`/api/templates/${selectedTemplate.id}/create-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roomId: roomInfo.roomId,
            title: roomInfo.title,
            saveAsTemplate
          })
        });

        const data = await response.json();
        if (data.success) {
          setSuccess('房间创建成功！小说正在初始化，请稍候跳转...');
          // 稍微延长等待时间，让小说有时间初始化
          setTimeout(() => {
            navigate(`/novel/${roomInfo.roomId}`);
          }, 3000);
        } else {
          setError(data.message || '创建失败');
        }
      } else {
        // 创建新模板然后创建房间
        const templateResponse = await fetch('/api/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: roomInfo.title,
            description: roomInfo.description,
            tags: roomInfo.tags,
            ...templateData
          })
        });

        const templateData_result = await templateResponse.json();
        if (templateData_result.success) {
          const roomResponse = await fetch(`/api/templates/${templateData_result.template.id}/create-room`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              roomId: roomInfo.roomId,
              title: roomInfo.title
            })
          });

          const roomData = await roomResponse.json();
          if (roomData.success) {
            setSuccess('房间创建成功！小说正在初始化，请稍候跳转...');
            setTimeout(() => {
              navigate(`/novel/${roomInfo.roomId}`);
            }, 3000);
          } else {
            setError(roomData.message || '创建房间失败');
          }
        } else {
          setError(templateData_result.message || '创建模板失败');
        }
      }
    } catch (error) {
      setError('创建失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar position="fixed" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            创建新房间
          </Typography>
          <Button
            color="inherit"
            onClick={() => previewPrompt(previewType)}
            startIcon={<Preview />}
            sx={{ mr: 2 }}
          >
            预览提示词
          </Button>
          <Button
            color="inherit"
            onClick={createRoom}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {loading ? '创建中...' : '创建房间'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3, pt: 10 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="fullWidth"
          >
            <Tab label="基本设置" />
            <Tab label="世界观设定" />
            <Tab label="人物设定" />
            <Tab label="提示词模板" />
          </Tabs>
        </Paper>

        {/* 基本设置 */}
        {currentTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本设置
              </Typography>

              {/* 模板选择 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  从案例模板开始（可选）
                </Typography>
                <Grid container spacing={2}>
                  {templates.map((template) => (
                    <Grid item xs={12} md={6} key={template.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          cursor: 'pointer',
                          border: selectedTemplate?.id === template.id ? 2 : 1,
                          borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider'
                        }}
                        onClick={() => loadFromTemplate(template.id)}
                      >
                        <CardContent>
                          <Typography variant="h6">{template.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {template.description}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {template.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 房间信息 */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="房间ID"
                    value={roomInfo.roomId}
                    onChange={(e) => setRoomInfo({ ...roomInfo, roomId: e.target.value })}
                    helperText="房间的唯一标识符，用于加入房间"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={generateRoomId}
                    startIcon={<Refresh />}
                    sx={{ height: '56px' }}
                  >
                    生成ID
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="房间标题"
                    value={roomInfo.title}
                    onChange={(e) => setRoomInfo({ ...roomInfo, title: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="房间描述"
                    value={roomInfo.description}
                    onChange={(e) => setRoomInfo({ ...roomInfo, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="添加标签（回车添加）"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTag(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <Box sx={{ mt: 1 }}>
                    {roomInfo.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    />
                  }
                  label="将此配置保存为新的案例模板"
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 世界观设定 */}
        {currentTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                世界观设定
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="世界背景"
                    value={templateData.worldSetting.background}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      worldSetting: {
                        ...templateData.worldSetting,
                        background: e.target.value
                      }
                    })}
                    helperText="描述故事发生的世界背景和时代设定"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="具体场景"
                    value={templateData.worldSetting.setting}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      worldSetting: {
                        ...templateData.worldSetting,
                        setting: e.target.value
                      }
                    })}
                    helperText="故事的主要发生地点和环境"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="世界规则"
                    value={templateData.worldSetting.rules}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      worldSetting: {
                        ...templateData.worldSetting,
                        rules: e.target.value
                      }
                    })}
                    helperText="这个世界的特殊规则、法则或限制"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="氛围基调"
                    value={templateData.worldSetting.atmosphere}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      worldSetting: {
                        ...templateData.worldSetting,
                        atmosphere: e.target.value
                      }
                    })}
                    helperText="故事的整体氛围和情感基调"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 人物设定 */}
        {currentTab === 2 && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  人物设定
                </Typography>
                <Button
                  variant="contained"
                  onClick={addCharacter}
                  startIcon={<Add />}
                >
                  添加人物
                </Button>
              </Box>

              {templateData.characters.map((character, index) => (
                <Accordion key={index} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>
                      {character.name || `人物 ${index + 1}`} - {character.role || '未设定角色'}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="人物姓名"
                          value={character.name}
                          onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="角色定位"
                          value={character.role}
                          onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                          helperText="如：主人公、重要配角、反派等"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="基本信息"
                          value={character.basicInfo}
                          onChange={(e) => updateCharacter(index, 'basicInfo', e.target.value)}
                          helperText="年龄、身份、外貌等基本信息"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="性格特点"
                          value={character.personality}
                          onChange={(e) => updateCharacter(index, 'personality', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="背景故事"
                          value={character.backgroundStory.join('\n')}
                          onChange={(e) => updateCharacter(index, 'backgroundStory', e.target.value)}
                          helperText="每行一个要点，描述人物的过去和经历"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="人际关系"
                          value={character.relationships.join('\n')}
                          onChange={(e) => updateCharacter(index, 'relationships', e.target.value)}
                          helperText="每行一个关系，描述与其他人物的关系"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          color="error"
                          onClick={() => removeCharacter(index)}
                          startIcon={<Delete />}
                        >
                          删除此人物
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}

              {templateData.characters.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    还没有添加任何人物，点击上方按钮开始添加
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* 提示词模板 */}
        {currentTab === 3 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                提示词模板设置
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="系统提示词"
                    value={templateData.promptTemplate.systemPrompt}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      promptTemplate: {
                        ...templateData.promptTemplate,
                        systemPrompt: e.target.value
                      }
                    })}
                    helperText="定义AI的角色和基本行为"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label="初始故事生成提示词"
                    value={templateData.promptTemplate.initialPrompt}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      promptTemplate: {
                        ...templateData.promptTemplate,
                        initialPrompt: e.target.value
                      }
                    })}
                    helperText="用于生成故事开头的提示词模板。可以使用变量：{characters}, {worldSetting}"
                  />
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => previewPrompt('initial')}
                      startIcon={<Preview />}
                    >
                      预览初始提示词
                    </Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label="续写故事提示词"
                    value={templateData.promptTemplate.continuePrompt}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      promptTemplate: {
                        ...templateData.promptTemplate,
                        continuePrompt: e.target.value
                      }
                    })}
                    helperText="用于续写故事的提示词模板。可以使用变量：{characters}, {worldSetting}, {storyHistory}"
                  />
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => previewPrompt('continue')}
                      startIcon={<Preview />}
                    >
                      预览续写提示词
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="格式说明"
                    value={templateData.promptTemplate.formatInstructions}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      promptTemplate: {
                        ...templateData.promptTemplate,
                        formatInstructions: e.target.value
                      }
                    })}
                    helperText="告诉AI如何格式化输出"
                  />
                </Grid>

                {/* 高级设置 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    高级设置
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="投票时长 (毫秒)"
                    value={templateData.settings.votingDuration}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      settings: {
                        ...templateData.settings,
                        votingDuration: parseInt(e.target.value) || 60000
                      }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>叙述视角</InputLabel>
                    <Select
                      value={templateData.settings.perspective}
                      onChange={(e) => setTemplateData({
                        ...templateData,
                        settings: {
                          ...templateData.settings,
                          perspective: e.target.value
                        }
                      })}
                    >
                      <MenuItem value="first_person">第一人称</MenuItem>
                      <MenuItem value="third_person">第三人称</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="最少选项数"
                    value={templateData.settings.minChoices}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      settings: {
                        ...templateData.settings,
                        minChoices: parseInt(e.target.value) || 2
                      }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="最多选项数"
                    value={templateData.settings.maxChoices}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      settings: {
                        ...templateData.settings,
                        maxChoices: parseInt(e.target.value) || 3
                      }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>故事长度</InputLabel>
                    <Select
                      value={templateData.settings.storyLength}
                      onChange={(e) => setTemplateData({
                        ...templateData,
                        settings: {
                          ...templateData.settings,
                          storyLength: e.target.value
                        }
                      })}
                    >
                      <MenuItem value="short">短篇</MenuItem>
                      <MenuItem value="medium">中篇</MenuItem>
                      <MenuItem value="long">长篇</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Container>

      {/* 提示词预览对话框 */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle>
          提示词预览 - {previewType === 'initial' ? '初始生成' : '故事续写'}
          <IconButton
            onClick={() => {
              navigator.clipboard.writeText(promptPreview);
            }}
            sx={{ float: 'right' }}
          >
            <ContentCopy />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={promptPreview}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.9rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateRoom;