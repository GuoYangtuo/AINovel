const fs = require('fs');
const path = require('path');

/**
 * HTML日志记录器类
 * 负责为每个房间生成和管理HTML格式的实时日志
 */
class HtmlLogger {
  constructor(roomId) {
    this.roomId = roomId;
    this.logFilePath = path.join(__dirname, '..', '..', 'data', `room_${roomId}_logs.html`);
    this.initializeLogFile();
  }

  /**
   * 初始化日志文件，创建基础HTML结构
   */
  initializeLogFile() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>房间 ${this.roomId} 日志</title>
    <style>
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background-color: #1e1e1e;
            color: #d4d4d4;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
        }
        .log-entry {
            margin-bottom: 15px;
            padding: 10px;
            border-left: 3px solid #007acc;
            background-color: #2d2d30;
            border-radius: 3px;
        }
        .log-timestamp {
            color: #608b4e;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        .log-type {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .log-prompt {
            color: #ce9178;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
            font-size: 0.9em;
        }
        .log-response {
            color: #9cdcfe;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
            font-size: 0.9em;
        }
        .log-error {
            color: #f44747;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
        }
        .log-info {
            color: #4ec9b0;
        }
        .log-warning {
            color: #dcdcaa;
        }
        .log-success {
            color: #4ec9b0;
        }
        .log-voting {
            color: #dcdcaa;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
        }
        .log-state {
            color: #c586c0;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>房间 ${this.roomId} 实时日志</h1>
    <div id="logs-container">
    </div>
    <script>
        // 自动滚动到最新日志
        function scrollToBottom() {
            window.scrollTo(0, document.body.scrollHeight);
        }
        
        // 页面加载完成后滚动到底部
        window.addEventListener('load', scrollToBottom);
    </script>
</body>
</html>`;

    fs.writeFileSync(this.logFilePath, htmlContent, 'utf8');
  }

  /**
   * 记录日志条目
   * @param {string} type - 日志类型 (prompt, response, error, info, warning, success, voting, state)
   * @param {string} content - 日志内容
   * @param {Object} data - 附加数据 (可选)
   */
  log(type, content, data = null) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const logEntry = this.createLogEntry(type, content, data, timestamp);
    
    // 读取现有内容
    let existingContent = '';
    if (fs.existsSync(this.logFilePath)) {
      existingContent = fs.readFileSync(this.logFilePath, 'utf8');
    }
    
    // 在 </div> 标签前插入新日志
    const insertPosition = existingContent.lastIndexOf('</div>');
    if (insertPosition !== -1) {
      const newContent = existingContent.slice(0, insertPosition) + logEntry + existingContent.slice(insertPosition);
      fs.writeFileSync(this.logFilePath, newContent, 'utf8');
    }
  }

  /**
   * 创建日志条目HTML
   * @param {string} type - 日志类型
   * @param {string} content - 日志内容
   * @param {Object} data - 附加数据
   * @param {string} timestamp - 时间戳
   * @returns {string} HTML字符串
   */
  createLogEntry(type, content, data, timestamp) {
    let logClass = 'log-info';
    let displayContent = content;
    
    switch (type) {
      case 'prompt':
        logClass = 'log-prompt';
        displayContent = `[PROMPT] ${content}`;
        break;
      case 'response':
        logClass = 'log-response';
        displayContent = `[RESPONSE] ${content}`;
        break;
      case 'error':
        logClass = 'log-error';
        displayContent = `[ERROR] ${content}`;
        break;
      case 'warning':
        logClass = 'log-warning';
        displayContent = `[WARNING] ${content}`;
        break;
      case 'success':
        logClass = 'log-success';
        displayContent = `[SUCCESS] ${content}`;
        break;
      case 'voting':
        logClass = 'log-voting';
        displayContent = `[VOTING] ${content}`;
        break;
      case 'state':
        logClass = 'log-state';
        displayContent = `[STATE] ${content}`;
        break;
    }

    let dataSection = '';
    if (data) {
      dataSection = `<div class="log-state">${JSON.stringify(data, null, 2)}</div>`;
    }

    return `
    <div class="log-entry">
        <div class="log-timestamp">${timestamp}</div>
        <div class="log-type ${logClass}">${displayContent}</div>
        ${dataSection}
    </div>`;
  }

  // 便捷方法
  logPrompt(prompt) {
    this.log('prompt', prompt);
  }

  logResponse(response) {
    this.log('response', response);
  }

  logError(error) {
    this.log('error', error.message || error);
  }

  logInfo(info) {
    this.log('info', info);
  }

  logWarning(warning) {
    this.log('warning', warning);
  }

  logSuccess(success) {
    this.log('success', success);
  }

  logVoting(voting) {
    this.log('voting', voting);
  }

  logState(state) {
    this.log('state', '房间状态更新', state);
  }
}

module.exports = HtmlLogger;