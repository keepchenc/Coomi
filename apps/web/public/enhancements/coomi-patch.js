
// ============================================
// Coomi ChatView Comprehensive Patch
// 包含所有优化功能
// ============================================

(function() {
  'use strict';
  
  // 等待 Vue 应用加载完成
  function waitForApp() {
    return new Promise(resolve => {
      const check = () => {
        const app = document.querySelector('#app');
        if (app && app.__vue_app__) {
          resolve(app);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
  
  // 初始化所有增强功能
  waitForApp().then(() => {
    console.log('[Coomi Enhancements] 初始化优化功能...');
    initAllEnhancements();
  });
  
  function initAllEnhancements() {
    // 1. DeepTrace 深迹
    initDeepTrace();
    
    // 2. 输入气泡动画
    initInputBubbleAnimation();
    
    // 3. 流式输出动画
    initStreamingAnimation();
    
    // 4. Tokens/s 速度显示
    initTokensSpeedDisplay();
    
    // 5. 主界面样式优化已通过 CSS 实现
    
    console.log('[Coomi Enhancements] 所有优化功能已加载');
  }
  
  // ==========================================
  // 1. DeepTrace 深迹
  // ==========================================
  function initDeepTrace() {
    // 创建 DeepTrace 状态存储
    const store = {
      traces: [],
      metrics: {
        totalRequests: 0,
        totalTokens: 0,
        avgLatency: 0,
        tokensPerSecond: 0,
        errorRate: 0
      },
      isVisible: false,
      maxTraces: 50,
      
      addTrace(type, name, meta = {}) {
        const trace = {
          id: Date.now() + Math.random(),
          type,
          name,
          meta,
          timestamp: Date.now()
        };
        this.traces.unshift(trace);
        if (this.traces.length > this.maxTraces) {
          this.traces.pop();
        }
        this.updateMetrics();
        return trace;
      },
      
      updateMetrics() {
        const responses = this.traces.filter(t => t.type === 'response');
        this.metrics.totalRequests = this.traces.filter(t => t.type === 'request').length;
        this.metrics.totalTokens = responses.reduce((sum, r) => sum + (r.meta.tokens || 0), 0);
        
        const latencies = responses.map(r => r.meta.latency || 0).filter(l => l > 0);
        if (latencies.length > 0) {
          this.metrics.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        }
        
        const recent = responses.slice(0, 5);
        if (recent.length > 0) {
          const tokens = recent.reduce((sum, r) => sum + (r.meta.tokens || 0), 0);
          const time = recent.reduce((sum, r) => sum + (r.meta.latency || 0), 0) / 1000;
          this.metrics.tokensPerSecond = time > 0 ? Math.round(tokens / time) : 0;
        }
        
        const errors = this.traces.filter(t => t.type === 'error');
        this.metrics.errorRate = this.traces.length > 0 ? (errors.length / this.traces.length * 100) : 0;
      },
      
      clear() {
        this.traces = [];
        this.metrics = { totalRequests: 0, totalTokens: 0, avgLatency: 0, tokensPerSecond: 0, errorRate: 0 };
      }
    };
    
    window.CoomiDeepTrace = store;
    
    // 创建面板 DOM
    const panel = document.createElement('div');
    panel.className = 'deeptrace-panel';
    panel.id = 'deeptrace-panel';
    panel.innerHTML = `
      <div class="deeptrace-header" onclick="document.getElementById('deeptrace-body').style.display=document.getElementById('deeptrace-body').style.display==='none'?'block':'none'">
        <div class="deeptrace-title">
          <span class="dot"></span>
          <span>DeepTrace 深迹</span>
        </div>
        <svg class="deeptrace-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="deeptrace-body" id="deeptrace-body" style="display:none;">
        <div class="deeptrace-metrics">
          <div class="deeptrace-metric">
            <div class="deeptrace-metric-value" id="dt-requests">0</div>
            <div class="deeptrace-metric-label">请求数</div>
          </div>
          <div class="deeptrace-metric">
            <div class="deeptrace-metric-value" id="dt-tokens">0</div>
            <div class="deeptrace-metric-label">总Tokens</div>
          </div>
          <div class="deeptrace-metric">
            <div class="deeptrace-metric-value" id="dt-latency">0ms</div>
            <div class="deeptrace-metric-label">平均延迟</div>
          </div>
        </div>
        <div class="deeptrace-traces" id="dt-traces"></div>
      </div>
    `;
    
    // 插入到聊天区域
    const chatArea = document.querySelector('.chat');
    if (chatArea) {
      chatArea.insertBefore(panel, chatArea.firstChild);
    }
    
    // 更新 UI
    setInterval(() => {
      const reqEl = document.getElementById('dt-requests');
      const tokEl = document.getElementById('dt-tokens');
      const latEl = document.getElementById('dt-latency');
      const tracesEl = document.getElementById('dt-traces');
      
      if (reqEl) reqEl.textContent = store.metrics.totalRequests;
      if (tokEl) tokEl.textContent = store.metrics.totalTokens.toLocaleString();
      if (latEl) latEl.textContent = Math.round(store.metrics.avgLatency) + 'ms';
      
      if (tracesEl && store.traces.length > 0) {
        const iconMap = { request: '→', response: '←', tool: '⚡', error: '✕' };
        tracesEl.innerHTML = store.traces.slice(0, 10).map(trace => {
          const time = new Date(trace.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
          return `
            <div class="deeptrace-trace">
              <span class="deeptrace-trace-icon ${trace.type}">${iconMap[trace.type] || '?'}</span>
              <div class="deeptrace-trace-info">
                <div class="deeptrace-trace-name">${trace.name}</div>
                <div class="deeptrace-trace-meta">${time} ${trace.meta.latency ? trace.meta.latency + 'ms' : ''}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }, 500);
    
    // 拦截 WebSocket 消息进行追踪
    interceptWebSocket(store);
  }
  
  function interceptWebSocket(store) {
    const OriginalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
      const ws = new OriginalWebSocket(url, protocols);
      
      const originalSend = ws.send.bind(ws);
      ws.send = function(data) {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'command' && msg.payload?.text) {
            store.addTrace('request', 'User Message', {
              tokens: msg.payload.text.length
            });
          }
        } catch (e) {}
        return originalSend(data);
      };
      
      ws.addEventListener('message', function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.event_type === 'text_chunk') {
            store.addTrace('response', 'Text Chunk', {
              tokens: data.content?.length || 0,
              latency: data.latency || 0
            });
          } else if (data.event_type === 'tool_start') {
            store.addTrace('tool', data.tool_name || 'Tool', {
              arguments: data.arguments
            });
          } else if (data.event_type === 'turn_end') {
            store.addTrace('response', 'Turn Complete', {
              tokens: data.usage?.output_tokens || 0
            });
          }
        } catch (e) {}
      });
      
      return ws;
    };
    
    // 复制原始 WebSocket 的属性
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
  }
  
  // ==========================================
  // 2. 输入气泡动画
  // ==========================================
  function initInputBubbleAnimation() {
    const input = document.querySelector('.input');
    if (!input) return;
    
    let typingTimer = null;
    let bubbleContainer = null;
    
    input.addEventListener('input', function() {
      const field = input.closest('.field');
      if (!field) return;
      
      field.classList.add('typing');
      
      if (!bubbleContainer) {
        bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'bubble-particles';
        for (let i = 0; i < 5; i++) {
          const particle = document.createElement('span');
          particle.className = 'bubble-particle';
          bubbleContainer.appendChild(particle);
        }
        field.appendChild(bubbleContainer);
      }
      
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        field.classList.remove('typing');
        if (bubbleContainer) {
          bubbleContainer.remove();
          bubbleContainer = null;
        }
      }, 1500);
    });
  }
  
  // ==========================================
  // 3. 流式输出动画
  // ==========================================
  function initStreamingAnimation() {
    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              applyStreamAnimation(node);
            }
          });
        }
      });
    });
    
    // 观察整个聊天区域
    const chatArea = document.querySelector('.stream');
    if (chatArea) {
      observer.observe(chatArea, {
        childList: true,
        subtree: true
      });
    }
  }
  
  function applyStreamAnimation(element) {
    // 为文本节点添加动画
    const textNodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim() && !node.dataset.streamAnimated) {
        textNodes.push(node);
      }
    }
    
    textNodes.forEach(textNode => {
      textNode.dataset.streamAnimated = 'true';
      const text = textNode.textContent;
      const parent = textNode.parentNode;
      
      // 分割文本为单词
      const parts = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      
      parts.forEach((part, index) => {
        if (part.trim()) {
          const span = document.createElement('span');
          span.className = 'stream-word';
          span.style.animationDelay = (index * 0.03) + 's';
          span.textContent = part;
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      
      parent.replaceChild(fragment, textNode);
    });
  }
  
  // ==========================================
  // 4. Tokens/s 速度显示
  // ==========================================
  function initTokensSpeedDisplay() {
    const capsule = document.createElement('div');
    capsule.className = 'tokens-speed-capsule';
    capsule.id = 'tokens-speed-capsule';
    capsule.innerHTML = `
      <span class="tokens-speed-label">⚡ Speed</span>
      <span class="tokens-speed-value" id="tokens-speed-value">0 t/s</span>
      <div class="tokens-speed-marquee">
        <div class="tokens-speed-marquee-inner">
          <span class="tokens-speed-item">🚀 实时速度监控</span>
          <span class="tokens-speed-item">📊 基于最近5次响应</span>
          <span class="tokens-speed-item">⚡ 实时速度监控</span>
          <span class="tokens-speed-item">📊 基于最近5次响应</span>
        </div>
      </div>
    `;
    
    const composer = document.querySelector('.composer');
    if (composer) {
      composer.insertBefore(capsule, composer.firstChild);
    }
    
    // 更新速度
    setInterval(() => {
      const store = window.CoomiDeepTrace;
      const speedEl = document.getElementById('tokens-speed-value');
      
      if (store && speedEl) {
        const speed = store.metrics.tokensPerSecond;
        speedEl.textContent = speed + ' t/s';
        
        if (speed > 50) {
          speedEl.style.color = 'var(--ok,#1f9d6b)';
        } else if (speed > 20) {
          speedEl.style.color = 'var(--blue,#2d61c6)';
        } else {
          speedEl.style.color = 'var(--orange,#d47458)';
        }
      }
    }, 300);
  }
  
})();
