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
/*  页面容器 */
.settings {
  max-width: 760px;
  margin: 0 auto;
  padding: 4px 0 32px;
}

h2 {
  margin-bottom: 6px;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #a0a0ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h3 {
  margin: 20px 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #a0a0ff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 28px;
}

hr {
  border: none;
  border-top: 1px solid rgba(102, 126, 234, 0.12);
  margin: 24px 0;
}

/* ═══════════════════════════════
   表单分组
═══════════════════════════════ */
.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(102, 126, 234, 0.20);
  border-radius: 10px;
  background: rgba(15, 20, 50, 0.70);
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: all 0.25s;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: rgba(102, 126, 234, 0.60);
  background: rgba(15, 20, 50, 0.90);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.10);
}

.form-group select option {
  background: #0f1428;
  color: #e2e8f0;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

/* ═══════════════════════════════
   音频行
═══════════════════════════════ */
.audio-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audio-row select {
  flex: 1;
}

.btn-preview {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(102, 126, 234, 0.22);
  border-radius: 20px;
  background: rgba(102, 126, 234, 0.08);
  color: #a0a0ff;
  cursor: pointer;
  font-size: 15px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}
.btn-preview:hover {
  background: rgba(102, 126, 234, 0.20);
  border-color: rgba(102, 126, 234, 0.50);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.20);
}
.btn-preview:active {
  transform: translateY(0) scale(0.95);
}
.btn-preview:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-remove {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(239, 68, 68, 0.20);
  border-radius: 20px;
  background: transparent;
  color: rgba(239, 68, 68, 0.60);
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}
.btn-remove:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.45);
  color: #ef4444;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.15);
}
.btn-remove:active {
  transform: translateY(0) scale(0.95);
}

/* ═══════════════════════════════
   添加辅助音频按钮
═══════════════════════════════ */
.btn-add {
  padding: 10px 16px;
  border: 1px dashed rgba(102, 126, 234, 0.25);
  border-radius: 20px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  margin-bottom: 18px;
  width: 100%;
  transition: all 0.25s ease;
}
.btn-add:hover {
  border-color: rgba(102, 126, 234, 0.55);
  border-style: solid;
  color: #a0a0ff;
  background: rgba(102, 126, 234, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.10);
}
.btn-add:active {
  transform: translateY(0) scale(0.98);
}

/* ═══════════════════════════════
   按钮行
═══════════════════════════════ */
.btn-row {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.btn-save,
.btn-test,
.btn-switch,
.btn-default,
.btn-apply-params {
  padding: 10px 24px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  white-space: nowrap;
}

/* 保存按钮 */
.btn-save {
  background: transparent;
  color: #a0a0ff;
  border: 1px solid rgba(102, 126, 234, 0.35);
}
.btn-save:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.60);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.20);
}
.btn-save:active {
  transform: translateY(0) scale(0.96);
}

/* 测试按钮 - 主色渐变 */
.btn-test {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  flex: 1;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.30);
  position: relative;
  overflow: hidden;
}
.btn-test::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transition: left 0.4s ease;
}
.btn-test:hover:not(:disabled)::before { left: 100%; }
.btn-test:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.45);
}
.btn-test:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
}
.btn-test:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* 切换模型按钮 */
.btn-switch {
  background: transparent;
  color: #a0a0ff;
  border: 1px solid rgba(102, 126, 234, 0.35);
}
.btn-switch:hover {
  background: rgba(102, 126, 234, 0.12);
  border-color: rgba(102, 126, 234, 0.65);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}
.btn-switch:active {
  transform: translateY(0) scale(0.96);
}

/* 默认/重置按钮 */
.btn-default {
  background: rgba(255, 255, 255, 0.03);
  color: #64748b;
  border: 1px solid rgba(255, 255, 255, 0.10);
}
.btn-default:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.btn-default:active {
  transform: translateY(0) scale(0.97);
}

/* 应用参数按钮 */
.btn-apply-params {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
  position: relative;
  overflow: hidden;
}
.btn-apply-params::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  transition: left 0.4s ease;
}
.btn-apply-params:hover::before { left: 100%; }
.btn-apply-params:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.40);
}
.btn-apply-params:active {
  transform: translateY(0) scale(0.97);
}

/* ═══════════════════════════════
   高级参数折叠区
═══════════════════════════════ */
.advanced-section {
  margin: 20px 0;
  background: rgba(5, 8, 20, 0.60);
  border: 1px solid rgba(102, 126, 234, 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.advanced-section summary {
  cursor: pointer;
  color: #a0a0ff;
  font-weight: 600;
  font-size: 14px;
  padding: 14px 18px;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s ease;
  border-radius: 12px;
}

.advanced-section summary:hover {
  background: rgba(102, 126, 234, 0.06);
}

.advanced-section summary::-webkit-details-marker {
  display: none;
}

.advanced-section[open] summary {
  border-bottom: 1px solid rgba(102, 126, 234, 0.12);
}

.advanced-content {
  animation: detailsExpand 0.3s ease;
  padding: 18px 18px;
}

/* ═══════════════════════════════
   复选框行
═══════════════════════════════ */
.checkbox-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin: 16px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #94a3b8;
  transition: color 0.2s;
}

.checkbox-label:hover {
  color: #e2e8f0;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(102, 126, 234, 0.40);
  background: rgba(15, 20, 50, 0.70);
  accent-color: #667eea;
  cursor: pointer;
  margin: 0;
}

/* ═══════════════════════════════
   提示文字
═══════════════════════════════ */
.hint-sm {
  font-size: 11px;
  color: #475569;
  margin-top: 5px;
  line-height: 1.5;
}

/* ═══════════════════════════════
   Slider 滑块
═══════════════════════════════ */
input[type="range"] {
  padding: 0;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(102, 126, 234, 0.20);
  border-radius: 2px;
  width: 100%;
}

input[type="range"]:focus {
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.40);
  transition: transform 0.2s;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  cursor: pointer;
  border: none;
}

/* ═══════════════════════════════
   消息提示
═══════════════════════════════ */
.msg {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  animation: msgSlideIn 0.3s ease;
}

@keyframes detailsExpand {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes msgSlideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.msg.success {
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(74, 222, 128, 0.25);
  color: #4ade80;
}

.msg.error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
}
</style>