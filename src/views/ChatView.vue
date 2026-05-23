<template>
  <div class="chat-layout">
  <div class="chat-container">
    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
          <div class="message-footer">
            <span class="message-time">{{ formatTime(msg.created_at) }}</span>
            <button v-if="msg.audio_path" class="btn-play" @click="playAudio(msg.audio_path, true)">
              🔊 播放
            </button>
          </div>
        </div>
      </div>
      <div v-if="isLoading" class="message assistant loading">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-row">
        <textarea
            v-model="inputMessage"
            @keydown.enter.prevent="sendMessage"
            placeholder="输入消息... (Enter 发送)"
            rows="1"
        ></textarea>
        <button class="btn-send" @click="sendMessage" :disabled="isLoading || !inputMessage.trim()">
          📤 发送
        </button>
      </div>
      <div class="input-hint">
        <span>💡 Enter 发送</span>
      </div>
    </div>
  </div>
    <!-- 右侧 Live2D 区域 -->
    <div class="live2d-sidebar">
      <div class="live2d-header">
        <span>🎨 虚拟形象</span>
        <div class="live2d-header-actions">
          <button class="btn-header-action" @click="zoomOutLive2D" title="缩小">➖</button>
          <button class="btn-header-action" @click="zoomInLive2D" title="放大">➕</button>
          <button
            class="btn-header-action"
            @click="toggleDragMode"
            :class="{ active: isDragMode }"
            :title="isDragMode ? '锁定位置' : '拖拽调整位置'"
          >{{ isDragMode ? '📍' : '✋' }}</button>
          <button
            class="btn-header-action"
            @click="resetLive2DPosition"
            title="重置位置"
          >🔄</button>
        </div>
      </div>
      <div class="live2d-container">
        <Live2DView ref="live2dRef" v-if="showLive2D" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, nextTick, watch } from 'vue'
import Live2DView from '@/components/Live2DView.vue'  // 导入Live2D组件
import { sendMessage as sendMessageApi, getAudioUrl } from '@/api'

const voiceConfig = inject('voiceConfig')
const autoRead = inject('autoRead', ref(true))
const showLive2D = ref(true)  // 控制Live2D显示状态
const live2dRef = ref(null)  // Live2D组件引用
const isDragMode = ref(false)  // 拖拽模式

function toggleDragMode() {
  isDragMode.value = !isDragMode.value
  if (live2dRef.value) {
    live2dRef.value.setDragMode(isDragMode.value)
  }
}

function resetLive2DPosition() {
  if (live2dRef.value) {
    live2dRef.value.resetPosition()
  }
}

function zoomInLive2D() {
  if (live2dRef.value) live2dRef.value.adjustScale(0.1)
}

function zoomOutLive2D() {
  if (live2dRef.value) live2dRef.value.adjustScale(-0.1)
}

const inputMessage = ref('')
const messages = ref([])
const isLoading = ref(false)
const messageListRef = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

async function playAudio(audioPath, isReplay = false) {
  try {
    const audioUrl = getAudioUrl(audioPath)
    console.log('🎵 准备播放音频:', audioUrl)
    
    const audio = new Audio(audioUrl)
    
    // 音频开始播放时触发表情
    audio.addEventListener('play', () => {
      console.log('🔊 音频开始播放' + (isReplay ? ' (重播)' : ''))
      if (live2dRef.value) {
        console.log('✅ 调用 startTalking')
        live2dRef.value.startTalking()
      } else {
        console.warn('⚠️ live2dRef 不存在')
      }
    })
    
    // 音频结束时停止表情
    audio.addEventListener('ended', () => {
      console.log('🔇 音频播放结束')
      if (live2dRef.value) {
        console.log('✅ 500ms后调用 stopTalking')
        setTimeout(() => {
          live2dRef.value.stopTalking()
        }, 500)  // 延迟500ms停止，让最后一个动作播放完
      }
    })
    
    // 错误处理
    audio.addEventListener('error', (e) => {
      console.error('❌ 音频播放错误:', e)
    })
    
    await audio.play()
    console.log('▶️ audio.play() 已调用')
  } catch (error) {
    console.error('播放失败:', error)
  }
}

async function sendMessage() {
  const text = inputMessage.value.trim()
  if (!text || isLoading.value) return

  messages.value.push({
    role: 'user',
    content: text,
    created_at: new Date().toISOString()
  })
  scrollToBottom()

  inputMessage.value = ''
  isLoading.value = true

  try {
    const res = await sendMessageApi(text, voiceConfig.value)

    const aiMessage = {
      role: 'assistant',
      content: res.data.reply,
      audio_path: res.data.audio_file,
      created_at: new Date().toISOString()
    }
    messages.value.push(aiMessage)
    scrollToBottom()

    if (autoRead?.value !== false) {
      await playAudio(res.data.audio_file)
    }

  } catch (error) {
    console.error('发送失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，出了点问题，请稍后再试。',
      created_at: new Date().toISOString()
    })
    scrollToBottom()
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const savedMessages = localStorage.getItem('chatMessages')
  if (savedMessages) {
    try {
      messages.value = JSON.parse(savedMessages)
      scrollToBottom()
    } catch (e) {}
  }
})

watch(messages, (newMessages) => {
  const toSave = newMessages.slice(-50)
  localStorage.setItem('chatMessages', JSON.stringify(toSave))
}, { deep: true })
</script>

<style scoped>
/* ═══════════════════════════════
   主布局容器 - flex 横向排列
═══════════════════════════════ */
.chat-layout {
  display: flex;
  height: calc(100vh - 60px - 48px);
  width: 100%;
  gap: 0;
}

/* ═══════════════════════════════
   聊天区域
═══════════════════════════════ */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 22, 0.60);
  backdrop-filter: blur(12px);
  border-radius: 16px 0 0 16px;
  border: 1px solid rgba(102, 126, 234, 0.12);
  border-right: none;
  min-width: 0;
  overflow: hidden;
  transition: border-color 0.35s ease;
}
.chat-container:hover {
  border-color: rgba(102, 126, 234, 0.20);
}

/* ═══════════════════════════════
   消息列表
═══════════════════════════════ */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 滚动条 */
.message-list::-webkit-scrollbar {
  width: 4px;
}
.message-list::-webkit-scrollbar-track {
  background: transparent;
}
.message-list::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 2px;
}

/* ═══════════════════════════════
   消息气泡
═══════════════════════════════ */
.message {
  display: flex;
  animation: msgFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes msgFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 18px;
  border-radius: 20px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  transition: all 0.2s;
}

/* 用户消息 - 紫蓝渐变 */
.message.user .message-content {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.30);
}

/* AI 消息 - 深色磨砂玻璃 */
.message.assistant .message-content {
  background: rgba(15, 20, 50, 0.85);
  backdrop-filter: blur(8px);
  color: #e2e8f0;
  border: 1px solid rgba(102, 126, 234, 0.18);
  border-bottom-left-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ═══════════════════════════════
   消息底部 (时间 + 播放按钮)
═══════════════════════════════ */
.message-footer {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.40);
}

.btn-play {
  padding: 5px 14px;
  font-size: 12px;
  background: rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.22);
  border-radius: 20px;
  color: #a0a0ff;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  font-weight: 500;
}
.btn-play:hover {
  background: rgba(102, 126, 234, 0.22);
  border-color: rgba(102, 126, 234, 0.50);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.22);
}
.btn-play:active {
  transform: scale(0.96);
}

/* ═══════════════════════════════
   正在输入指示器
═══════════════════════════════ */
.message.loading .message-content {
  padding: 16px 20px;
}

.typing-indicator {
  display: flex;
  gap: 5px;
  align-items: center;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  background: rgba(102, 126, 234, 0.70);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%           { transform: translateY(-8px); opacity: 1; }
}

/* ═══════════════════════════════
   输入区域
═══════════════════════════════ */
.input-area {
  padding: 16px 20px;
  background: rgba(8, 10, 25, 0.80);
  border-top: 1px solid rgba(102, 126, 234, 0.12);
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

textarea {
  flex: 1;
  padding: 12px 18px;
  border: 1px solid rgba(102, 126, 234, 0.20);
  border-radius: 24px;
  background: rgba(15, 20, 50, 0.70);
  color: #e2e8f0;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  outline: none;
  transition: all 0.25s;
  line-height: 1.5;
}

textarea::placeholder {
  color: #4a5568;
}

textarea:focus {
  border-color: rgba(102, 126, 234, 0.60);
  background: rgba(15, 20, 50, 0.90);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.10);
}

/* 发送按钮 */
.btn-send {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 24px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.30);
  white-space: nowrap;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

.btn-send::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transition: left 0.4s ease;
}

.btn-send:hover:not(:disabled)::before {
  left: 100%;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.45);
}

.btn-send:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
}

.btn-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.input-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #4a5568;
  display: flex;
  justify-content: space-between;
}

/* ═══════════════════════════════
   右侧 Live2D 区域
═══════════════════════════════ */
.live2d-sidebar {
  width: 360px;
  background: rgba(6, 6, 18, 0.65);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.10);
  border-left: none;
  border-radius: 0 16px 16px 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: border-color 0.35s ease;
}
.live2d-sidebar:hover {
  border-color: rgba(102, 126, 234, 0.18);
}

.live2d-header {
  padding: 14px 18px;
  background: rgba(12, 16, 40, 0.70);
  border-bottom: 1px solid rgba(102, 126, 234, 0.10);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #667eea, #a0a0ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.live2d-header-actions {
  display: flex;
  gap: 6px;
}

.btn-header-action {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(102, 126, 234, 0.20);
  border-radius: 50%;
  background: rgba(15, 20, 50, 0.70);
  color: #a0a0ff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  padding: 0;
  line-height: 1;
}

.btn-header-action:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.50);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.18);
}

.btn-header-action:active {
  transform: scale(0.92);
}

.btn-header-action.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.35);
}

.live2d-container {
  flex: 1;
  min-height: 400px;
  background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.04) 0%, rgba(4, 4, 14, 0.50) 70%);
  position: relative;
  overflow: hidden;
}
</style>