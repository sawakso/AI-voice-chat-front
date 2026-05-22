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
      <div class="live2d-header">🎨 虚拟形象</div>
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
/* 主布局容器 - 使用flex横向排列聊天区和Live2D区 */
.chat-layout {
  display: flex;
  height: calc(100vh - 56px - 40px);
  width: 100%;
}

/* 聊天区域 */
.chat-container {
  flex: 1;  /* 占据剩余空间 */
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  min-width: 0;  /* 防止内容溢出 */
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background: #16213e;
  color: #eee;
}

.message.user .message-content {
  background: #e94560;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: #0f3460;
  border-bottom-left-radius: 4px;
}

.message-text {
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-footer {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.btn-play {
  padding: 4px 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 20px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-play:hover {
  background: rgba(255, 255, 255, 0.2);
}

.message.loading .message-content {
  padding: 16px 20px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #888;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-10px); opacity: 1; }
}

.input-area {
  padding: 16px 20px;
  background: #16213e;
  border-top: 1px solid #0f3460;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

textarea {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #0f3460;
  border-radius: 24px;
  background: #0f3460;
  color: #eee;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

textarea:focus {
  border-color: #e94560;
}

.btn-send {
  padding: 12px 24px;
  background: #e94560;
  border: none;
  border-radius: 24px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: #ff6b8a;
  transform: scale(1.02);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
  display: flex;
  justify-content: space-between;
}

/* 右侧 Live2D 区域 */
.live2d-sidebar {
  width: 350px;  /* 增加宽度以更好显示模型 */
  background: #0f1219;
  border-left: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;  /* 防止被压缩 */
}

.live2d-header {
  padding: 12px 16px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  font-size: 14px;
  font-weight: bold;
  color: #e94560;
}

.live2d-container {
  flex: 1;  /* 占据剩余高度 */
  min-height: 400px;  /* 最小高度 */
  background: #1a1a2e;
  position: relative;
  overflow: hidden;  /* 隐藏溢出内容 */
}
</style>