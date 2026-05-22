<template>
  <div class="chat-container">
    <!-- 消息列表 -->
    <div class="messages" ref="msgBox">
      <div v-for="msg in messages" :key="msg.id" :class="['msg', msg.role]">
        <div class="content">{{ msg.content }}</div>
        <button v-if="msg.audio" class="play-btn" @click="playAudio(msg.audio)">
          🔊 播放
        </button>
      </div>
      <div v-if="loading" class="msg ai">
        <div class="content">思考中...</div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <input
          v-model="inputText"
          @keyup.enter="send"
          placeholder="输入消息..."
          :disabled="loading"
      />
      <button @click="send" :disabled="loading || !inputText.trim()">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, nextTick } from 'vue'
import { sendMessage, getAudioUrl } from '@/api'

const voiceConfig = inject('voiceConfig')
const messages = ref([])
const inputText = ref('')
const loading = ref(false)

async function send() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  messages.value.push({ id: Date.now(), role: 'user', content: text })
  inputText.value = ''
  loading.value = true

  try {
    const res = await sendMessage(text, voiceConfig.value)
    messages.value.push({
      id: Date.now(),
      role: 'ai',
      content: res.data.reply,
      audio: res.data.audio_file
    })
  } catch (e) {
    messages.value.push({
      id: Date.now(),
      role: 'ai',
      content: '❌ 错误: ' + (e.response?.data?.detail || e.message)
    })
  } finally {
    loading.value = false
    nextTick(() => {
      const box = document.querySelector('.messages')
      if (box) box.scrollTop = box.scrollHeight
    })
  }
}

function playAudio(filename) {
  const audio = new Audio(getAudioUrl(filename))
  audio.play()
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 96px);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  max-width: 80%;
  padding: 10px 16px;
  border-radius: 12px;
  line-height: 1.6;
}

.msg.user {
  align-self: flex-end;
  background: #0f3460;
}

.msg.ai {
  align-self: flex-start;
  background: #16213e;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
}

.play-btn {
  margin-top: 6px;
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: #e94560;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.input-area {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid #0f3460;
}

.input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #0f3460;
  border-radius: 8px;
  background: #16213e;
  color: #eee;
  font-size: 14px;
  outline: none;
}

.input-area input:focus {
  border-color: #e94560;
}

.input-area button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #e94560;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>