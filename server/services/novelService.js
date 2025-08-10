const { OpenAI } = require('openai');

// 从main.py复制的人物数据
const 人物s = [
  {
    "基本信息": "主人公小叶，一个现代都市的高中生，宅男，比较瘦弱，因为意外，唯一的亲人只剩母亲",
    "性格": "内向，喜欢独处，不善言辞",
    "背景故事": [
      "看起来有点高冷，但有时也会内心戏很多",
      "过去的十几年过着两点一线的普通高中生活，看起来和别人没什么不一样，在班里没什么存在感",
      "但有一天睡醒突然莫名其妙觉醒了读心术，能听到别人心里在想什么，他一直隐藏着这个能力，但也因此更对世间冷暖看淡，对人际关系不再抱有期待，看起来更加冷漠孤僻了"
    ],
    "人际关系": []
  },
  {
    "基本信息": "小叶的母亲",
    "性格": "很年轻有活力，又有些幽默和乐观，看起来有点天然",
    "背景故事": [
      "过着一个普通的都市家庭主妇的生活"
    ],
    "人际关系": []
  },
  {
    "基本信息": "小叶的同桌小七",
    "性格": "活泼开朗，成绩优异，在班级里很受欢迎",
    "背景故事": [
      "对所有人都很友好",
      "注意到小叶的与众不同，对他产生了好奇",
      "经常主动找小叶说话，但总是得不到太多回应"
    ],
    "人际关系": []
  },
  {
    "基本信息": "神秘的超能力组织的头目",
    "性格": "神出鬼没，有点喜欢玩弄人心",
    "背景故事": [
      "暗中观察着所有超能力者的动向",
      "拥有强大的精神控制能力",
      "表面上经营着一家心理咨询诊所作为掩护"
    ],
    "人际关系": [
      "与多个超能力者保持联系，但从不透露自己的身份",
      "对小叶的能力特别关注，但还未主动接触"
    ]
  },
  {
    "基本信息": "小叶的班主任大刘",
    "性格": "严肃认真，对学生要求严格",
    "背景故事": [
      "对小叶的冷漠态度感到困惑"
    ],
    "人际关系": []
  },
  {
    "基本信息": "小叶的同桌的朋友小晴",
    "性格": "活泼开朗，成绩优异，在班级里很受欢迎",
    "背景故事": [
      "对所有人都很友好",
      "同样也是超能力者，但和小叶并不相识",
      "从属于神秘的超能力组织，经常消失一段时间去完成特殊任务"
    ],
    "人际关系": []
  }
];

class NovelService {
  constructor() {
    this.client = new OpenAI({
      apiKey: "sk-48d5645fd30347fe905e51c2d431113f",
      baseURL: "https://api.deepseek.com"
    });
    
    this.novelState = {
      currentStory: '',
      choices: [],
      votes: {},
      userVotes: {},
      isVoting: false,
      votingEndTime: null,
      storyHistory: []
    };
    
    this.io = null;
    this.votingTimer = null;
  }

  // 初始化小说
  async initializeNovel(io) {
    this.io = io;
    try {
      console.log('正在生成初始故事...');
      const initialStory = await this.生成初始故事();
      console.log('初始故事生成完成');
      
      const processed = this.处理回答(initialStory);
      this.novelState.currentStory = processed.story;
      this.novelState.choices = processed.choices;
      this.novelState.isVoting = true;
      this.novelState.votes = {};
      this.novelState.userVotes = {};
      
      this.startVotingTimer();
      
      // 广播初始状态
      if (this.io) {
        this.io.emit('novel_state', this.getNovelState());
      }
      
    } catch (error) {
      console.error('初始化小说失败:', error);
    }
  }

  // 生成初始故事
  async 生成初始故事() {
    const role = "你是一个高水平小说作家";
    const prompt = `请根据以下信息写一个小说的开头，直到小叶遇到了人生轨迹转折点，面临关键抉择时停下，并给出几个可能的选项供我选择，以主人公的第一视角叙事，
人物：${JSON.stringify(人物s)}
我会给出选择并让你续写。主人公的选择会严重影响他的人生轨迹和整个故事的发展，甚至整个故事的结局和世界的走向都会因为主人公选择的不同而改变，保持一定的叙事节奏，不要提前透露所有世界观设定和人物信息，而是随着故事发展才逐渐揭露信息，选择不同，揭露信息的顺序和程度也不同，故事的发展方向也不同，给出选项即可，无需给出每个选项可能的后续发展
你的输出格式：
小说正文
["选项1","选项2",...]
不要输出格式外的任何无关内容`;

    try {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: role },
          { role: "user", content: prompt }
        ],
        stream: false
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('生成初始故事失败:', error);
      throw error;
    }
  }

  // 继续故事
  async 继续故事(选择的选项) {
    const role = "你是一个高水平小说作家";
    const prompt = `请根据主人公上一次的抉择，续写小说，直到主人公面临新的抉择时停下。
一些信息:
人物：${JSON.stringify(人物s)}
世界观：暂无
之前的故事：${this.novelState.storyHistory.join('\n\n')}
上一次的抉择：${选择的选项}

主人公的选择会严重影响他的人生轨迹和整个故事的发展，甚至整个故事的结局和世界的走向都会因为主人公选择的不同而改变，保持一定的叙事节奏，不要提前透露所有世界观设定和人物信息，而是随着故事发展才逐渐揭露信息，选择不同，揭露信息的顺序和程度也不同，故事的发展方向也不同，给出选项即可，无需给出每个选项可能的后续发展
你的输出格式：
小说正文
["选项1","选项2",...]
不要输出格式外的任何无关内容`;

    try {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: role },
          { role: "user", content: prompt }
        ],
        stream: false
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('继续故事失败:', error);
      throw error;
    }
  }

  // 处理AI回答
  处理回答(回答) {
    try {
      const parts = 回答.split('[');
      const story = parts[0].trim();
      const choicesStr = '[' + parts[1];
      const choices = JSON.parse(choicesStr);
      
      return { story, choices };
    } catch (error) {
      console.error('处理回答失败:', error);
      // 如果解析失败，返回默认选项
      return {
        story: 回答,
        choices: ["继续", "暂停思考", "选择其他方向"]
      };
    }
  }

  // 添加投票
  addVote(userId, choice) {
    if (!this.novelState.isVoting) {
      return { success: false, message: '当前不在投票阶段' };
    }

    if (!this.novelState.choices.includes(choice)) {
      return { success: false, message: '无效的选项' };
    }

    // 移除用户之前的投票
    const previousVote = this.novelState.userVotes[userId];
    if (previousVote && this.novelState.votes[previousVote]) {
      this.novelState.votes[previousVote]--;
    }

    // 添加新投票
    this.novelState.userVotes[userId] = choice;
    this.novelState.votes[choice] = (this.novelState.votes[choice] || 0) + 1;

    return { 
      success: true, 
      votes: this.novelState.votes,
      message: '投票成功'
    };
  }

  // 开始投票计时器
  startVotingTimer() {
    const VOTING_DURATION = 5 * 60 * 1000; // 5分钟
    this.novelState.votingEndTime = Date.now() + VOTING_DURATION;

    if (this.votingTimer) {
      clearTimeout(this.votingTimer);
    }

    this.votingTimer = setTimeout(async () => {
      await this.processVotingResult();
    }, VOTING_DURATION);

    // 广播投票开始
    if (this.io) {
      this.io.emit('voting_started', {
        endTime: this.novelState.votingEndTime,
        choices: this.novelState.choices
      });
    }
  }

  // 处理投票结果
  async processVotingResult() {
    this.novelState.isVoting = false;
    
    // 统计投票结果
    let winningChoice = '';
    let maxVotes = 0;
    
    for (const [choice, votes] of Object.entries(this.novelState.votes)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningChoice = choice;
      }
    }

    // 如果没有投票，选择第一个选项
    if (maxVotes === 0) {
      winningChoice = this.novelState.choices[0];
      console.log('没有投票，延长5分钟');
      
      // 延长5分钟
      this.startVotingTimer();
      if (this.io) {
        this.io.emit('voting_extended', {
          message: '没有人投票，投票时间延长5分钟',
          endTime: this.novelState.votingEndTime
        });
      }
      return;
    }

    console.log(`投票结果: ${winningChoice} (${maxVotes}票)`);

    try {
      // 保存当前故事到历史
      this.novelState.storyHistory.push(this.novelState.currentStory);

      // 生成下一段故事
      const nextStory = await this.继续故事(winningChoice);
      const processed = this.处理回答(nextStory);

      // 更新状态
      this.novelState.currentStory = processed.story;
      this.novelState.choices = processed.choices;
      this.novelState.votes = {};
      this.novelState.userVotes = {};
      this.novelState.isVoting = true;

      // 广播新故事
      if (this.io) {
        this.io.emit('story_updated', {
          story: processed.story,
          choices: processed.choices,
          winningChoice,
          votes: this.novelState.votes
        });
      }

      // 开始新的投票
      this.startVotingTimer();

    } catch (error) {
      console.error('生成下一段故事失败:', error);
      
      // 如果生成失败，重新开始投票
      this.novelState.isVoting = true;
      this.startVotingTimer();
      
      if (this.io) {
        this.io.emit('story_error', {
          message: '故事生成失败，请重新投票'
        });
      }
    }
  }

  // 获取当前小说状态
  getNovelState() {
    return {
      ...this.novelState,
      timeRemaining: this.novelState.votingEndTime ? 
        Math.max(0, this.novelState.votingEndTime - Date.now()) : 0
    };
  }
}

// 单例实例
const novelService = new NovelService();

module.exports = {
  initializeNovel: (io) => novelService.initializeNovel(io),
  getNovelState: () => novelService.getNovelState(),
  addVote: (userId, choice) => novelService.addVote(userId, choice)
};