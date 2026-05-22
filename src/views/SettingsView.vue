<template>
  <div class="settings">
    <h2>🎵 音色设置</h2>
    <p class="hint">配置参考音频和模型，AI 会模仿选中的音色说话</p>

    <!-- 参考音频 -->
    <div class="form-group">
      <label>参考音频</label>
      <select v-model="form.ref_audio_path">
        <option value="">-- 请选择参考音频 --</option>
        <option v-for="f in refAudios" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>参考文本（音频里说的内容）</label>
      <input v-model="form.prompt_text" placeholder="输入参考音频对应的文字" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>参考音频语言</label>
        <select v-model="form.prompt_lang">
          <option value="zh">中文</option>
          <option value="en">英文</option>
          <option value="ja">日文</option>
        </select>
      </div>
      <div class="form-group">
        <label>合成语言</label>
        <select v-model="form.text_lang">
          <option value="zh">中文</option>
          <option value="en">英文</option>
          <option value="ja">日文</option>
        </select>
      </div>
    </div>

    <hr />

    <!-- 模型选择 -->
    <h3>🤖 模型设置</h3>

    <div class="form-group">
      <label>GPT 模型</label>
      <select v-model="selectedGpt">
        <option value="">-- 默认 --</option>
        <option v-for="m in gptModels" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>SoVITS 模型</label>
      <select v-model="selectedSovits">
        <option value="">-- 默认 --</option>
        <option v-for="m in sovitsModels" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <div class="btn-row">
      <button class="btn-switch" @click="applyModel">🔄 应用模型</button>
    </div>

    <hr />

    <!-- 操作按钮 -->
    <div class="btn-row">
      <button class="btn-save" @click="saveSettings">💾 保存设置</button>
      <button class="btn-test" @click="testVoice" :disabled="testing">
        {{ testing ? '测试中...' : '🔊 测试音色' }}
      </button>
    </div>

    <div v-if="msg" :class="['msg', msgType]">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { getModels, switchModel, testVoice as testVoiceApi, getAudioUrl } from '@/api'

const voiceConfig = inject('voiceConfig')
const form = voiceConfig

const gptModels = ref([])
const sovitsModels = ref([])
const refAudios = ref([])
const selectedGpt = ref('')
const selectedSovits = ref('')
const testing = ref(false)
const msg = ref('')
const msgType = ref('')

// 加载模型列表
onMounted(async () => {
  try {
    const res = await getModels()
    gptModels.value = res.data.gpt_models
    sovitsModels.value = res.data.sovits_models
    refAudios.value = res.data.ref_audios
  } catch (e) {
    console.error('加载模型列表失败', e)
  }
})

function saveSettings() {
  localStorage.setItem('voiceConfig', JSON.stringify(form.value))
  showMsg('✅ 设置已保存', 'success')
}

async function applyModel() {
  try {
    const res = await switchModel(selectedGpt.value, selectedSovits.value)
    showMsg('✅ ' + res.data.results.join(', '), 'success')
  } catch (e) {
    showMsg('❌ 切换失败', 'error')
  }
}

async function testVoice() {
  if (!form.value.ref_audio_path) {
    showMsg('⚠️ 请先选择参考音频', 'error')
    return
  }
  if (!form.value.prompt_text) {
    showMsg('⚠️ 请填写参考文本', 'error')
    return
  }
  testing.value = true
  try {
    const res = await testVoiceApi(form.value)
    const audio = new Audio(getAudioUrl(res.data.audio_file))
    audio.play()
    showMsg('✅ 播放测试语音...', 'success')
  } catch (e) {
    showMsg('❌ 测试失败', 'error')
  } finally {
    testing.value = false
  }
}

function showMsg(text, type) {
  msg.value = text
  msgType.value = type
  setTimeout(() => { msg.value = '' }, 3000)
}
</script>

<style scoped>
.settings { max-width: 650px; margin: 0 auto; padding: 20px 0; }
h2 { margin-bottom: 4px; }
h3 { margin: 16px 0 12px; }
.hint { color: #888; font-size: 13px; margin-bottom: 24px; }
hr { border: none; border-top: 1px solid #0f3460; margin: 20px 0; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #ccc; }
.form-group input, .form-group select {
  width: 100%; padding: 10px 14px; border: 1px solid #0f3460;
  border-radius: 8px; background: #16213e; color: #eee; font-size: 14px; outline: none;
}
.form-group input:focus, .form-group select:focus { border-color: #e94560; }
.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }

.btn-row { display: flex; gap: 12px; margin-top: 16px; }
.btn-save, .btn-test, .btn-switch {
  flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;
}
.btn-save { background: #0f3460; color: #fff; }
.btn-test { background: #e94560; color: #fff; }
.btn-switch { background: #16213e; color: #e94560; border: 1px solid #e94560; }
.btn-test:disabled { opacity: 0.5; cursor: not-allowed; }

.msg { margin-top: 16px; padding: 10px; border-radius: 8px; font-size: 14px; }
.msg.success { background: #16213e; color: #4CAF50; }
.msg.error { background: #16213e; color: #e94560; }
</style>