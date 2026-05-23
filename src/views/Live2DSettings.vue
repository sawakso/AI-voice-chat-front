<template>
  <div class="live2d-settings">
    <h2>🎨 Live2D 设置</h2>
    <p class="hint">配置虚拟形象的外观和行为</p>

    <!-- 基础开关 -->
    <div class="settings-section">
      <h3>基础设置</h3>

      <div class="form-group">
        <label class="switch-label">
          <span class="switch-text">✨ 启用 Live2D 角色</span>
          <div class="switch">
            <input type="checkbox" v-model="settings.enabled" @change="saveSettings" />
            <span class="slider"></span>
          </div>
        </label>
        <p class="hint-sm">开启后，对话页面会显示虚拟形象</p>
      </div>
    </div>

    <!-- 模型选择 -->
    <div class="settings-section">
      <h3>角色模型</h3>

      <div class="form-group">
        <label>选择模型</label>
        <select v-model="settings.modelPath" @change="saveSettings" :disabled="!settings.enabled">
          <option value="">-- 请选择模型 --</option>
          <option v-for="model in availableModels" :key="model.path" :value="model.path">
            {{ model.name }}
          </option>
        </select>
        <p class="hint-sm">已检测到 {{ availableModels.length }} 个可用模型</p>
        
        <!-- 显示当前选中模型的描述 -->
        <div v-if="currentModelInfo" class="model-info">
          <span class="model-description">{{ currentModelInfo.description }}</span>
        </div>
      </div>
    </div>

    <!-- 显示位置 -->
    <div class="settings-section">
      <h3>显示设置</h3>

      <div class="form-group">
        <label>大小缩放</label>
        <input type="range" v-model.number="settings.scale" min="0.3" max="2.0" step="0.1" @change="saveSettings" />
        <span class="value-display">{{ Math.round(settings.scale * 100) }}%</span>
        <p class="hint-sm">调整模型显示大小</p>
      </div>
    </div>

    <!-- 动画行为 -->
    <div class="settings-section">
      <h3>动画行为</h3>

      <div class="form-group">
        <label class="switch-label">
          <span class="switch-text">👀 跟随鼠标</span>
          <div class="switch">
            <input type="checkbox" v-model="settings.followMouse" @change="saveSettings" />
            <span class="slider"></span>
          </div>
        </label>
        <p class="hint-sm">角色的眼睛会跟随鼠标移动</p>
      </div>

      <div class="form-group">
        <label>空闲动画间隔</label>
        <select v-model="settings.idleInterval" @change="saveSettings">
          <option value="0">禁用空闲动画</option>
          <option value="5">5 秒</option>
          <option value="10">10 秒</option>
          <option value="15">15 秒</option>
          <option value="30">30 秒</option>
        </select>
        <p class="hint-sm">角色空闲时自动播放随机动画</p>
      </div>
    </div>

    <!-- 预览区域 -->
    <div class="settings-section preview-section">
      <h3>实时预览</h3>
      <div class="preview-container">
        <div class="preview-placeholder" v-if="!settings.enabled || !settings.modelPath">
          <span>⚙️ 请先启用并选择模型</span>
        </div>
        <div class="preview-live2d" v-else>
          <div class="live2d-preview" ref="previewRef"></div>
          <div class="preview-controls">
            <button @click="testBlink">😉 眨眼</button>
            <button @click="testExpression('happy')">😊 开心</button>
            <button @click="testExpression('sad')">😢 难过</button>
            <button @click="testExpression('surprised')">😲 惊讶</button>
            <button @click="testTalk">🗣️ 测试说话</button>
            <button @click="debugModel" style="background: #ff6b6b;">🔍 调试模型</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 重置按钮 -->
    <div class="btn-row">
      <button class="btn-reset" @click="resetToDefault">🔄 重置全部设置</button>
    </div>

    <div v-if="msg" :class="['msg', msgType]">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// 挂载 PIXI 到 window
window.PIXI = PIXI

// ========== 默认设置 ==========
const DEFAULT_SETTINGS = {
  enabled: false,
  modelPath: '/models/hiyori_free_zh/runtime/hiyori_free_t08.model3.json',
  scale: 1.0,
  followMouse: true,
  idleInterval: 10
}

// ========== 状态 ==========
const settings = ref({ ...DEFAULT_SETTINGS })
const msg = ref('')
const msgType = ref('')
const previewRef = ref(null)
let previewApp = null  // PixiJS 应用
let previewModel = null  // Live2D 模型

// 可用模型列表
const availableModels = ref([])

// 当前选中的模型信息
const currentModelInfo = computed(() => {
  return availableModels.value.find(m => m.path === settings.value.modelPath) || null
})

// ========== 方法 ==========

// 扫描并识别可用模型
async function scanAvailableModels() {
  try {
    const models = []
    
    // 递归扫描 /models 目录下的所有 model3.json 文件
    async function scanDirectory(dirPath) {
      try {
        // 这里需要通过 API 或其他方式获取文件列表
        // 目前使用手动配置的已知模型
        const knownModels = [
          {
            name: 'Hikari (默认)',
            path: '/models/hiyori_free_zh/runtime/hiyori_free_t08.model3.json',
            description: '免费角色模型 - 适合聊天场景'
          }
        ]
        
        models.push(...knownModels)
      } catch (err) {
        console.error('扫描目录失败:', err)
      }
    }
    
    await scanDirectory('/models')
    availableModels.value = models
    console.log('🔍 已识别模型:', models.length, '个')
  } catch (err) {
    console.error('扫描模型失败:', err)
  }
}

// 保存设置
function saveSettings() {
  // watch 会自动保存到 localStorage 并触发事件
  showMsg('✅ Live2D 设置已保存', 'success')
}

// 重置为默认
function resetToDefault() {
  settings.value = { ...DEFAULT_SETTINGS }
  saveSettings()
  showMsg('🔄 已重置为默认设置', 'success')
}

// 显示消息
function showMsg(text, type) {
  msg.value = text
  msgType.value = type
  setTimeout(() => { msg.value = '' }, 3000)
}

// ========== 预览功能 ==========

// 加载预览模型
async function loadPreviewModel() {
  if (!previewRef.value || !settings.value.enabled || !settings.value.modelPath) return
  
  // 清理旧模型
  if (previewApp) {
    previewApp.destroy(true)
    previewApp = null
    previewModel = null
  }
  
  try {
    const container = previewRef.value
    const width = container.clientWidth || 200
    const height = container.clientHeight || 200
    
    // 创建 PixiJS 应用
    previewApp = new PIXI.Application({
      width: width,
      height: height,
      backgroundColor: 0x16213e,
      backgroundAlpha: 0.5,
      antialias: true
    })
    
    container.appendChild(previewApp.view)
    
    const modelPath = settings.value.modelPath
    console.log('加载预览模型:', modelPath)
    
    // 加载模型
    previewModel = await Live2DModel.from(modelPath, {
      autoInteract: true,
      autoUpdate: true
    })
    
    // 设置缩放和位置
    const scale = Math.min(width / previewModel.width, height / previewModel.height) * settings.value.scale
    previewModel.scale.set(scale)
    previewModel.anchor.set(0.5, 0.5)
    previewModel.x = width / 2
    previewModel.y = height / 2
    
    previewApp.stage.addChild(previewModel)
    
    console.log('✅ 预览模型加载成功')
    showMsg('✅ 模型加载成功', 'success')
  } catch (err) {
    console.error('❌ 预览模型加载失败:', err)
    showMsg('❌ 模型加载失败: ' + err.message, 'error')
  }
}

// 测试眨眼
async function testBlink() {
  console.log('👆 点击了眨眼按钮')
  
  if (!settings.value.enabled) {
    console.warn('⚠️ Live2D 未启用')
    showMsg('⚠️ 请先启用 Live2D', 'error')
    return
  }
  
  if (!previewModel) {
    console.warn('⚠️ 预览模型未加载')
    showMsg('⚠️ 模型未加载', 'error')
    return
  }
  
  console.log('✅ 开始播放 Tap 动作（更明显）')
  try {
    // 使用 Tap 动作，它比 Idle 更明显
    if (previewModel.motion) {
      console.log('🎭 调用 previewModel.motion("Tap", 0)')
      const result = await previewModel.motion('Tap', 0)
      console.log('✅ Tap 动作播放完成，返回值:', result)
      showMsg('😊 Tap 动画播放中', 'success')
    } else {
      console.warn('⚠️ 模型不支持 motion 方法')
      showMsg('⚠️ 模型不支持此动作', 'error')
    }
  } catch (err) {
    console.error('❌ 动作失败:', err)
    showMsg('❌ 动画播放失败: ' + err.message, 'error')
  }
}

// 测试表情
async function testExpression(expression) {
  if (!settings.value.enabled) {
    showMsg('⚠️ 请先启用 Live2D', 'error')
    return
  }
  
  if (!previewModel) {
    showMsg('⚠️ 模型未加载', 'error')
    return
  }
  
  try {
    // 映射表情到动作名称
    const expressionMap = {
      'happy': 'Tap',
      'sad': 'FlickDown',
      'surprised': 'Flick'
    }
    
    const motionName = expressionMap[expression]
    if (motionName && previewModel.motion) {
      await previewModel.motion(motionName)
      showMsg(`✨ ${expression} 表情播放中`, 'success')
    } else {
      showMsg('⚠️ 模型不支持此表情', 'error')
    }
  } catch (err) {
    console.error('表情失败:', err)
    showMsg('❌ 表情播放失败', 'error')
  }
}

// 测试说话
async function testTalk() {
  if (!settings.value.enabled) {
    showMsg('⚠️ 请先启用 Live2D', 'error')
    return
  }
  
  if (!previewModel) {
    showMsg('⚠️ 模型未加载', 'error')
    return
  }
  
  try {
    // 模拟说话动画（快速播放多个动作）
    if (previewModel.motion) {
      await previewModel.motion('Tap')
      setTimeout(() => previewModel.motion('Flick'), 500)
      showMsg('🗣️ 说话动画播放中', 'success')
    } else {
      showMsg('⚠️ 模型不支持动画', 'error')
    }
  } catch (err) {
    console.error('说话动画失败:', err)
    showMsg('❌ 动画播放失败', 'error')
  }
}

// 调试模型
function debugModel() {
  if (!previewModel) {
    showMsg('⚠️ 模型未加载', 'error')
    return
  }
  
  console.log('🔍 预览模型调试信息:', {
    hasMotion: typeof previewModel.motion === 'function',
    hasInternalModel: !!previewModel.internalModel,
    internalModelType: previewModel.internalModel?.constructor?.name,
    motionManager: previewModel.internalModel?.motionManager ? '存在' : '不存在'
  })
  
  if (previewModel.internalModel?.motionManager) {
    const mm = previewModel.internalModel.motionManager
    console.log('🎭 动作管理器方法:', {
      startMotion: typeof mm.startMotion === 'function',
      playMotion: typeof mm.playMotion === 'function',
      methods: Object.keys(mm).slice(0, 15)
    })
  }
  
  showMsg('🔍 调试信息已输出到控制台', 'success')
}

// ========== 生命周期 ==========
onMounted(() => {
  // 扫描可用模型
  scanAvailableModels()
  
  // 加载保存的设置
  const saved = localStorage.getItem('live2dSettings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      settings.value = { ...DEFAULT_SETTINGS, ...parsed }
    } catch (e) {}
  }
  
  // 如果已启用且选择了模型，加载预览模型
  if (settings.value.enabled && settings.value.modelPath) {
    nextTick(() => {
      loadPreviewModel()
    })
  }
})

// 组件卸载时清理
onUnmounted(() => {
  if (previewApp) {
    previewApp.destroy(true)
    previewApp = null
    previewModel = null
  }
})

// 监听 settings 变化，保存到 localStorage 并触发更新
watch(settings, (newVal) => {
  console.log('📝 设置已变化，保存到 localStorage:', newVal)
  localStorage.setItem('live2dSettings', JSON.stringify(newVal))
  // 触发全局更新事件
  const event = new CustomEvent('live2d-settings-changed', { detail: newVal })
  window.dispatchEvent(event)
  console.log('📢 已触发 live2d-settings-changed 事件')
  
  // 如果启用状态或模型路径改变，重新加载预览模型
  if (newVal.enabled && newVal.modelPath && previewRef.value) {
    nextTick(() => {
      loadPreviewModel()
    })
  }
}, { deep: true })
</script>

<style scoped>
/* ═══════════════════════════════
   页面容器
═══════════════════════════════ */
.live2d-settings {
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
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #a0a0ff;
  letter-spacing: 0.3px;
}

.hint {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 28px;
}

.hint-sm {
  font-size: 11px;
  color: #475569;
  margin-top: 5px;
  line-height: 1.5;
}

/* ═══════════════════════════════
   模型信息提示
═══════════════════════════════ */
.model-info {
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(102, 126, 234, 0.06);
  border-left: 3px solid rgba(102, 126, 234, 0.50);
  border-radius: 0 6px 6px 0;
}

.model-description {
  font-size: 12px;
  color: #94a3b8;
}

/* ═══════════════════════════════
   设置分区卡片
═══════════════════════════════ */
.settings-section {
  background: rgba(5, 8, 20, 0.60);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(102, 126, 234, 0.12);
  border-radius: 14px;
  padding: 22px 22px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}
.settings-section:hover {
  border-color: rgba(102, 126, 234, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* ═══════════════════════════════
   表单组
═══════════════════════════════ */
.form-group {
  margin-bottom: 18px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.form-group input[type="text"],
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

/* 禁用状态 */
select:disabled,
input:disabled {
  opacity: 0.40;
  cursor: not-allowed;
}

/* ═══════════════════════════════
   Slider 滑块 + 值显示
═══════════════════════════════ */
input[type="range"] {
  width: calc(100% - 60px);
  padding: 0;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(102, 126, 234, 0.20);
  border-radius: 2px;
  vertical-align: middle;
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

.value-display {
  display: inline-block;
  margin-left: 12px;
  width: 48px;
  color: #a0a0ff;
  font-size: 13px;
  font-weight: 500;
  vertical-align: middle;
}

/* ═══════════════════════════════
   Toggle 开关
═══════════════════════════════ */
.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.switch-text {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.switch {
  position: relative;
  width: 52px;
  height: 26px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.20);
  border-radius: 26px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: #94a3b8;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

input:checked + .slider {
  background: rgba(102, 126, 234, 0.30);
  border-color: rgba(102, 126, 234, 0.60);
  box-shadow: 0 0 12px rgba(102, 126, 234, 0.20);
}

input:checked + .slider:before {
  transform: translateX(26px);
  background: linear-gradient(135deg, #667eea, #a0a0ff);
}

/* ═══════════════════════════════
   预览区域
═══════════════════════════════ */
.preview-section {
  background: linear-gradient(135deg, rgba(5, 8, 20, 0.80) 0%, rgba(8, 5, 25, 0.80) 100%);
  transition: border-color 0.35s ease, box-shadow 0.35s ease;
}

.preview-container {
  min-height: 260px;
  background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.06) 0%, rgba(5, 5, 15, 0.80) 70%);
  border: 1px solid rgba(102, 126, 234, 0.12);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-placeholder {
  color: #475569;
  text-align: center;
  padding: 40px;
  font-size: 14px;
}

.preview-live2d {
  width: 100%;
  text-align: center;
}

.live2d-preview {
  width: 220px;
  height: 220px;
  margin: 0 auto;
  background: rgba(102, 126, 234, 0.06);
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.live2d-preview::before {
  content: "🎨";
  font-size: 48px;
  opacity: 0.20;
}

/* ═══════════════════════════════
   预览控制按钮
═══════════════════════════════ */
.preview-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
  padding: 0 12px 12px;
}

.preview-controls button {
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.18);
  border-radius: 20px;
  color: #a0a0ff;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}
.preview-controls button:hover {
  background: rgba(102, 126, 234, 0.20);
  border-color: rgba(102, 126, 234, 0.50);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.20);
}
.preview-controls button:active {
  transform: translateY(0) scale(0.95);
}

/* 调试按钮特殊样式 */
.preview-controls button[style*="ff6b6b"],
.preview-controls button:last-child {
  background: rgba(239, 68, 68, 0.10) !important;
  border-color: rgba(239, 68, 68, 0.25) !important;
  color: #f87171 !important;
}

.preview-controls button:last-child:hover {
  background: rgba(239, 68, 68, 0.20) !important;
  border-color: rgba(239, 68, 68, 0.50) !important;
  color: #fff !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.18) !important;
}
.preview-controls button:last-child:active {
  transform: translateY(0) scale(0.95) !important;
}

/* ═══════════════════════════════
   重置按钮
═══════════════════════════════ */
.btn-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-reset {
  flex: 1;
  padding: 12px;
  background: rgba(102, 126, 234, 0.06);
  border: 1px solid rgba(102, 126, 234, 0.18);
  border-radius: 20px;
  color: #94a3b8;
  font-size: 14px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}
.btn-reset:hover {
  background: rgba(102, 126, 234, 0.14);
  border-color: rgba(102, 126, 234, 0.45);
  color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.15);
}
.btn-reset:active {
  transform: translateY(0) scale(0.97);
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