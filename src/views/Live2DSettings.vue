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
.live2d-settings {
  max-width: 750px;
  margin: 0 auto;
  padding: 20px 0;
}

h2 {
  margin-bottom: 4px;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #e94560;
}

.hint {
  color: #888;
  font-size: 13px;
  margin-bottom: 24px;
}

.hint-sm {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.model-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(233, 69, 96, 0.1);
  border-left: 3px solid #e94560;
  border-radius: 4px;
}

.model-description {
  font-size: 12px;
  color: #aaa;
}

.settings-section {
  background: #0a0f1a;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #ccc;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #0f3460;
  border-radius: 8px;
  background: #16213e;
  color: #eee;
  font-size: 14px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #e94560;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

input[type="range"] {
  width: calc(100% - 50px);
  padding: 0;
  height: 4px;
  -webkit-appearance: none;
  background: #0f3460;
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
  background: #e94560;
  cursor: pointer;
}

.value-display {
  display: inline-block;
  margin-left: 12px;
  width: 45px;
  color: #e94560;
  font-size: 13px;
}

/* 开关样式 */
.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.switch-text {
  font-size: 14px;
  color: #eee;
}

.switch {
  position: relative;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #0f3460;
  border-radius: 24px;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .slider {
  background-color: #e94560;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* 预览区域 */
.preview-section {
  background: linear-gradient(135deg, #0a0f1a 0%, #0a0a1a 100%);
}

.preview-container {
  min-height: 250px;
  background: #16213e;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-placeholder {
  color: #666;
  text-align: center;
  padding: 40px;
}

.preview-live2d {
  width: 100%;
  text-align: center;
}

.live2d-preview {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  background: rgba(233, 69, 96, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.live2d-preview::before {
  content: "🎨";
  font-size: 48px;
  opacity: 0.3;
}

.preview-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

.preview-controls button {
  padding: 6px 12px;
  background: #0f3460;
  border: none;
  border-radius: 20px;
  color: #eee;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-controls button:hover {
  background: #e94560;
  transform: scale(1.02);
}

/* 按钮 */
.btn-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-reset {
  flex: 1;
  padding: 12px;
  background: #0f3460;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: #e94560;
}

.msg {
  margin-top: 16px;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
}

.msg.success {
  background: #16213e;
  color: #4CAF50;
}

.msg.error {
  background: #16213e;
  color: #e94560;
}

/* 禁用状态 */
select:disabled,
input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>