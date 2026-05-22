<template>
  <div class="settings">
    <h2>🎵 音色设置</h2>
    <p class="hint">配置参考音频和模型，AI 会模仿选中的音色说话</p>

    <!-- 角色选择 -->
    <div class="form-group">
      <label>角色</label>
      <select v-model="selectedCharacter" @change="onCharacterChange">
        <option value="">-- 请选择角色 --</option>
        <option v-for="c in refAudios" :key="c.character" :value="c.character">
          {{ c.character }}
        </option>
      </select>
    </div>

    <!-- 主参考音频 -->
    <div class="form-group">
      <label>主参考音频</label>
      <div class="audio-row">
        <select v-model="form.ref_audio_path" @change="onAudioChange">
          <option value="">-- 请选择 --</option>
          <option v-for="f in currentFiles" :key="f.path" :value="f.path">{{ f.name }}</option>
        </select>
        <button class="btn-preview" @click="previewAudio(form.ref_audio_path)" :disabled="!form.ref_audio_path">🔊</button>
      </div>
    </div>

    <!-- 辅助参考音频列表 -->
    <div v-for="(aux, index) in form.aux_ref_audio_paths" :key="index" class="form-group">
      <label>辅助参考音频 {{ index + 1 }}</label>
      <div class="audio-row">
        <select v-model="form.aux_ref_audio_paths[index]" @change="onAuxAudioChange(index)">
          <option value="">-- 请选择 --</option>
          <option v-for="f in currentFiles" :key="f.path" :value="f.path">{{ f.name }}</option>
        </select>
        <button class="btn-preview" @click="previewAudio(form.aux_ref_audio_paths[index])" :disabled="!form.aux_ref_audio_paths[index]">🔊</button>
        <button class="btn-remove" @click="removeAuxAudio(index)">✕</button>
      </div>
    </div>

    <button class="btn-add" @click="addAuxAudio">+ 添加辅助参考音频</button>

    <!-- 参考文本 -->
    <div class="form-group">
      <label>参考文本（音频里说的内容）</label>
      <input v-model="form.prompt_text" placeholder="选择音频后自动填充" />
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

    <!-- ========== 高级参数区域 ========== -->
    <details class="advanced-section">
      <summary>⚙️ 高级参数 (TTS 调节)</summary>

      <div class="advanced-content">
        <div class="form-row">
          <div class="form-group">
            <label>Temperature (温度) {{ form.tts_params.temperature }}</label>
            <input type="range" v-model.number="form.tts_params.temperature" min="0" max="1" step="0.01" />
            <p class="hint-sm">越低越稳定/像原声，越高越有变化/随机性</p>
          </div>

          <div class="form-group">
            <label>Top K {{ form.tts_params.top_k }}</label>
            <input type="range" v-model.number="form.tts_params.top_k" min="1" max="50" step="1" />
            <p class="hint-sm">采样范围，值越小声音越稳定</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Top P {{ form.tts_params.top_p }}</label>
            <input type="range" v-model.number="form.tts_params.top_p" min="0" max="1" step="0.01" />
            <p class="hint-sm">核采样概率阈值</p>
          </div>

          <div class="form-group">
            <label>重复惩罚 {{ form.tts_params.repetition_penalty }}</label>
            <input type="range" v-model.number="form.tts_params.repetition_penalty" min="1" max="2" step="0.01" />
            <p class="hint-sm">值越大，越不容易重复用词</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>语速 {{ form.tts_params.speed_factor }}</label>
            <input type="range" v-model.number="form.tts_params.speed_factor" min="0.5" max="1.5" step="0.01" />
            <p class="hint-sm">1.0 为正常速</p>
          </div>

          <div class="form-group">
            <label>采样步数 {{ form.tts_params.sample_steps }}</label>
            <input type="range" v-model.number="form.tts_params.sample_steps" min="16" max="64" step="4" />
            <p class="hint-sm">步数越高质量越好，速度越慢</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>片段间隔 {{ form.tts_params.fragment_interval }}</label>
            <input type="range" v-model.number="form.tts_params.fragment_interval" min="0.1" max="0.5" step="0.01" />
            <p class="hint-sm">句子间的停顿间隔</p>
          </div>

          <div class="form-group">
            <label>随机种子</label>
            <input type="number" v-model.number="form.tts_params.seed" />
            <p class="hint-sm">-1=随机，其他固定值可复现结果</p>
          </div>
        </div>

        <div class="form-row checkbox-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.tts_params.parallel_infer" />
            并行推理（加速）
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.tts_params.split_bucket" />
            分桶处理
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.tts_params.super_sampling" />
            超采样（V3模型）
          </label>
        </div>

        <div class="btn-row">
          <button class="btn-default" @click="resetAdvancedParams">重置默认值</button>
          <button class="btn-apply-params" @click="applyAdvancedParams">✨ 应用并保存</button>
        </div>
      </div>
    </details>

    <hr />

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

// 确保 aux_ref_audio_paths 存在
if (!form.value.aux_ref_audio_paths) {
  form.value.aux_ref_audio_paths = []
}

// 确保 tts_params 存在
if (!form.value.tts_params) {
  form.value.tts_params = {
    top_k: 15,
    top_p: 1.0,
    temperature: 0.1,
    repetition_penalty: 1.35,
    speed_factor: 1.0,
    sample_steps: 32,
    fragment_interval: 0.3,
    seed: -1,
    parallel_infer: true,
    split_bucket: true,
    super_sampling: false
  }
}

// ========== 默认值（用于重置） ==========
const DEFAULT_TTS_PARAMS = {
  top_k: 15,
  top_p: 1.0,
  temperature: 0.1,
  repetition_penalty: 1.35,
  speed_factor: 1.0,
  sample_steps: 32,
  fragment_interval: 0.3,
  seed: -1,
  parallel_infer: true,
  split_bucket: true,
  super_sampling: false
}

// ========== 数据 ==========
const gptModels = ref([])
const sovitsModels = ref([])
const refAudios = ref([])
const selectedGpt = ref('')
const selectedSovits = ref('')
const selectedCharacter = ref('')
const currentFiles = ref([])
const testing = ref(false)
const msg = ref('')
const msgType = ref('')

// ========== 方法 ==========

// 重置高级参数
function resetAdvancedParams() {
  form.value.tts_params = { ...DEFAULT_TTS_PARAMS }
  saveSettings()
  showMsg('✅ 高级参数已重置为默认值', 'success')
}

// 应用高级参数
function applyAdvancedParams() {
  saveSettings()
  showMsg('✨ 高级参数已应用并保存', 'success')
}

// 保存设置（只有一个版本）
function saveSettings() {
  const configToSave = {
    ref_audio_path: form.value.ref_audio_path,
    aux_ref_audio_paths: form.value.aux_ref_audio_paths,
    prompt_text: form.value.prompt_text,
    prompt_lang: form.value.prompt_lang,
    text_lang: form.value.text_lang,
    tts_params: { ...form.value.tts_params }
  }
  localStorage.setItem('voiceConfig', JSON.stringify(configToSave))
  showMsg('✅ 设置已保存', 'success')
}

// 测试音色
async function testVoice() {
  // console.log('🔧 当前TTS参数:', JSON.stringify(form.value.tts_params, null, 2))

  if (!form.value.ref_audio_path) {
    showMsg('⚠️ 请选择主参考音频', 'error')
    return
  }
  if (!form.value.prompt_text) {
    showMsg('⚠️ 请填写参考文本', 'error')
    return
  }

  testing.value = true
  try {
    const payload = {
      ref_audio_path: form.value.ref_audio_path,
      aux_ref_audio_paths: form.value.aux_ref_audio_paths,
      prompt_text: form.value.prompt_text,
      prompt_lang: form.value.prompt_lang,
      text_lang: form.value.text_lang,
      tts_params: { ...form.value.tts_params }  // 深拷贝确保传递最新值
    }

    // console.log('📤 发送请求:', JSON.stringify(payload, null, 2))

    const res = await testVoiceApi(payload)
    const audio = new Audio(getAudioUrl(res.data.audio_file))
    audio.play()
    showMsg('✅ 播放测试语音...', 'success')
  } catch (e) {
    console.error('测试失败:', e)
    showMsg('❌ 测试失败', 'error')
  } finally {
    testing.value = false
  }
}

// 应用模型
async function applyModel() {
  try {
    const res = await switchModel(selectedGpt.value, selectedSovits.value)
    showMsg('✅ ' + res.data.results.join(', '), 'success')
  } catch (e) {
    showMsg('❌ 切换失败', 'error')
  }
}

// 预览音频
function previewAudio(path) {
  if (!path) return
  const audio = new Audio(`/api/ref-audio-preview?path=${encodeURIComponent(path)}`)
  audio.play().catch(() => showMsg('⚠️ 播放失败', 'error'))
}

// 角色切换
function onCharacterChange() {
  const char = refAudios.value.find(c => c.character === selectedCharacter.value)
  currentFiles.value = char ? char.files : []
  form.value.ref_audio_path = ''
  form.value.aux_ref_audio_paths = []
  form.value.prompt_text = ''
}

// 主音频切换
function onAudioChange() {
  const file = currentFiles.value.find(f => f.path === form.value.ref_audio_path)
  if (file) {
    if (file.prompt_text) form.value.prompt_text = file.prompt_text
    if (file.lang) {
      const lang = file.lang.toLowerCase()
      if (['zh', 'en', 'ja'].includes(lang)) form.value.prompt_lang = lang
    }
  }
}

// 辅助音频切换
function onAuxAudioChange(index) {
  // 可选：自动填充辅助音频的参考文本
}

// 添加辅助音频
function addAuxAudio() {
  if (!form.value.aux_ref_audio_paths) {
    form.value.aux_ref_audio_paths = []
  }
  form.value.aux_ref_audio_paths.push('')
}

// 移除辅助音频
function removeAuxAudio(index) {
  form.value.aux_ref_audio_paths.splice(index, 1)
}

// 显示消息
function showMsg(text, type) {
  msg.value = text
  msgType.value = type
  setTimeout(() => { msg.value = '' }, 3000)
}

// ========== 生命周期 ==========
onMounted(async () => {
  try {
    const res = await getModels()
    gptModels.value = res.data.gpt_models
    sovitsModels.value = res.data.sovits_models
    refAudios.value = res.data.ref_audios

    // 加载保存的设置
    const saved = localStorage.getItem('voiceConfig')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        // 合并音色配置
        if (config.ref_audio_path) form.value.ref_audio_path = config.ref_audio_path
        if (config.aux_ref_audio_paths) form.value.aux_ref_audio_paths = config.aux_ref_audio_paths
        if (config.prompt_text) form.value.prompt_text = config.prompt_text
        if (config.prompt_lang) form.value.prompt_lang = config.prompt_lang
        if (config.text_lang) form.value.text_lang = config.text_lang
        // 合并 TTS 参数
        if (config.tts_params) {
          form.value.tts_params = { ...DEFAULT_TTS_PARAMS, ...config.tts_params }
        }
      } catch (e) {
        console.error('解析保存的配置失败', e)
      }
    }

    // 恢复角色选择显示
    if (form.value.ref_audio_path) {
      for (const char of refAudios.value) {
        const found = char.files.find(f => f.path === form.value.ref_audio_path)
        if (found) {
          selectedCharacter.value = char.character
          currentFiles.value = char.files
          break
        }
      }
    }
  } catch (e) {
    console.error('加载失败', e)
  }
})
</script>

<style scoped>
.settings { max-width: 750px; margin: 0 auto; padding: 20px 0; }
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

.audio-row { display: flex; gap: 6px; align-items: center; }
.audio-row select { flex: 1; }
.btn-preview {
  width: 40px; height: 40px; border: none; border-radius: 8px;
  background: #0f3460; color: #fff; cursor: pointer; font-size: 16px; flex-shrink: 0;
}
.btn-preview:hover { background: #e94560; }
.btn-preview:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-remove {
  width: 40px; height: 40px; border: none; border-radius: 8px;
  background: transparent; color: #e94560; cursor: pointer; font-size: 16px; flex-shrink: 0;
}
.btn-remove:hover { background: #2a1a1a; }

.btn-add {
  padding: 8px 16px; border: 1px dashed #0f3460; border-radius: 8px;
  background: transparent; color: #888; cursor: pointer; font-size: 13px;
  margin-bottom: 16px; width: 100%;
}
.btn-add:hover { border-color: #e94560; color: #e94560; }

.btn-row { display: flex; gap: 12px; margin-top: 16px; }
.btn-save, .btn-test, .btn-switch, .btn-default, .btn-apply-params {
  padding: 10px 16px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;
}
.btn-save { background: #0f3460; color: #fff; }
.btn-test { background: #e94560; color: #fff; flex: 1; }
.btn-switch { background: #16213e; color: #e94560; border: 1px solid #e94560; }
.btn-default { background: #1a2a4a; color: #aaa; }
.btn-apply-params { background: #e94560; color: #fff; }
.btn-test:disabled { opacity: 0.5; cursor: not-allowed; }

.advanced-section {
  margin: 20px 0;
  background: #0a0f1a;
  border-radius: 8px;
}
.advanced-section summary {
  cursor: pointer;
  color: #e94560;
  font-weight: bold;
  padding: 12px;
  user-select: none;
}
.advanced-section summary:hover {
  background: #0f1420;
  border-radius: 8px;
}
.advanced-content {
  padding: 16px;
  border-top: 1px solid #1a2a4a;
}

.checkbox-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin: 16px 0;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #ccc;
}
.checkbox-label input {
  width: auto;
  margin: 0;
}

.hint-sm {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

input[type="range"] {
  padding: 0;
  height: 4px;
  -webkit-appearance: none;
  background: #0f3460;
  border-radius: 2px;
}
input[type="range"]:focus {
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e94560;
  cursor: pointer;
}

.msg { margin-top: 16px; padding: 10px; border-radius: 8px; font-size: 14px; }
.msg.success { background: #16213e; color: #4CAF50; }
.msg.error { background: #16213e; color: #e94560; }
</style>