<template>
  <div class="live2d-wrapper" ref="wrapperRef">
    <canvas
      ref="canvasRef"
      class="live2d-canvas"
      :class="{ 'canvas-draggable': dragMode }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @click="onCanvasClick"
    ></canvas>
    <div v-if="loading" class="loading-indicator">加载中...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="dragMode" class="drag-hint">拖拽调整位置 · 点击下方按钮锁定</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

window.PIXI = PIXI

const canvasRef = ref(null)
const wrapperRef = ref(null)
let app = null
let model = null
let resizeObserver = null
let talkingInterval = null
let nativeModelWidth = 500
let nativeModelHeight = 500

const props = defineProps({
  visible: { type: Boolean, default: true },
  modelPath: { type: String, default: '' }
})

const loading = ref(false)
const error = ref('')

// ========== 设置读取 ==========
function loadLive2DSettings() {
  try {
    const saved = localStorage.getItem('live2dSettings')
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return null
}

const live2DSettings = ref(loadLive2DSettings())

const actualModelPath = computed(() => {
  return props.modelPath || live2DSettings.value?.modelPath || '/models/hiyori_free_zh/runtime/hiyori_free_t08.model3.json'
})

// ========== 位置偏移（持久化） ==========
function loadPosition() {
  try {
    const saved = localStorage.getItem('live2dPosition')
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return { x: 0, y: 0 }
}

const offsetX = ref(0)
const offsetY = ref(0)

function savePosition() {
  localStorage.setItem('live2dPosition', JSON.stringify({ x: offsetX.value, y: offsetY.value }))
}

function resetPosition() {
  offsetX.value = 0
  offsetY.value = 0
  savePosition()
  updateModelPosition()
}

// ========== 拖拽模式 ==========
const dragMode = ref(false)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let dragOffsetStartX = 0
let dragOffsetStartY = 0

function setDragMode(val) {
  dragMode.value = val
  isDragging.value = false
}

function onMouseDown(e) {
  if (!dragMode.value || !model) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragOffsetStartX = offsetX.value
  dragOffsetStartY = offsetY.value
  e.preventDefault()
}

function onMouseMove(e) {
  if (!isDragging.value || !model) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  offsetX.value = dragOffsetStartX + dx
  offsetY.value = dragOffsetStartY + dy
  updateModelPosition()
}

function onMouseUp() {
  if (isDragging.value) {
    savePosition()
  }
  isDragging.value = false
}

function onCanvasClick(e) {
  // 非拖拽模式下，点击触发 Tap 动作
  if (isDragging.value || !model) return
  try {
    model.motion('Tap')
  } catch (_) {}
}

function updateModelPosition() {
  if (!model || !canvasRef.value) return
  const container = canvasRef.value.parentElement
  const width = container?.clientWidth || 360
  const height = container?.clientHeight || 400
  model.x = width / 2 + offsetX.value
  model.y = height / 2 + offsetY.value
}

// ========== Talking 动画 ==========
function startTalking() {
  if (!model) return
  stopTalking()

  const motions = ['Tap', 'Flick', 'Tap', 'FlickDown']
  let idx = 0
  talkingInterval = setInterval(() => {
    if (!model) {
      clearInterval(talkingInterval)
      talkingInterval = null
      return
    }
    try {
      model.motion(motions[idx % motions.length])
    } catch (_) {}
    idx++
  }, 750)
}

function stopTalking() {
  if (talkingInterval) {
    clearInterval(talkingInterval)
    talkingInterval = null
  }
}

// ========== 模型加载 ==========
async function loadModel() {
  if (!props.visible || !canvasRef.value) return

  const canvas = canvasRef.value
  const container = canvas.parentElement
  const width = container?.clientWidth || 360
  const height = container?.clientHeight || 400

  if (width <= 0 || height <= 0) {
    console.warn('⚠️ 容器尺寸为零，跳过 Live2D 加载')
    return
  }

  loading.value = true
  error.value = ''

  try {
    cleanup()

    app = new PIXI.Application({
      view: canvas,
      width,
      height,
      backgroundColor: 0x1a1a2e,
      backgroundAlpha: 0.45,
      autoStart: true,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    model = await Live2DModel.from(actualModelPath.value)

    // 获取模型的原始尺寸（缩放前）
    nativeModelWidth = model.width || 500
    nativeModelHeight = model.height || 500

    // 计算自适应缩放：先拟合容器，再乘以用户设置的 scale
    const userScale = live2DSettings.value?.scale || 1.0
    const fitScale = Math.min(width / nativeModelWidth, height / nativeModelHeight) * 0.80
    const finalScale = fitScale * userScale

    model.scale.set(finalScale)
    model.anchor.set(0.5, 0.5)
    model.x = width / 2 + offsetX.value
    model.y = height / 2 + offsetY.value

    app.stage.addChild(model)
    loading.value = false
    console.log(`✅ Live2D 加载成功 | 容器:${width}x${height} | 缩放:${finalScale.toFixed(3)} (fit:${fitScale.toFixed(3)} × user:${userScale}) | 偏移:(${offsetX.value},${offsetY.value})`)
  } catch (err) {
    console.error('Live2D 加载失败:', err)
    error.value = `加载失败: ${err.message}`
    loading.value = false
  }
}

function cleanup() {
  stopTalking()
  if (app) {
    try {
      app.destroy(true, { children: true, texture: true })
    } catch (e) {}
    app = null
  }
  model = null
}

// ========== 自适应大小 ==========
function handleResize() {
  if (!app || !canvasRef.value || !model) return

  const container = canvasRef.value.parentElement
  const newWidth = container?.clientWidth || 360
  const newHeight = container?.clientHeight || 400

  app.renderer.resize(newWidth, newHeight)

  // 重新计算缩放
  const userScale = live2DSettings.value?.scale || 1.0
  const fitScale = Math.min(newWidth / nativeModelWidth, newHeight / nativeModelHeight) * 0.80
  const finalScale = fitScale * userScale

  model.scale.set(finalScale)
  updateModelPosition()
}

// ========== 缩放调节（不重载模型） ==========
function adjustScale(delta) {
  if (!model) return

  const settings = loadLive2DSettings() || {}
  const currentScale = settings.scale || 1.0
  const newScale = Math.max(0.3, Math.min(2.0, Math.round((currentScale + delta) * 10) / 10))
  if (newScale === currentScale) return

  settings.scale = newScale
  localStorage.setItem('live2dSettings', JSON.stringify(settings))
  live2DSettings.value = settings

  const container = canvasRef.value?.parentElement
  const cw = container?.clientWidth || 360
  const ch = container?.clientHeight || 400
  const fitScale = Math.min(cw / nativeModelWidth, ch / nativeModelHeight) * 0.80
  model.scale.set(fitScale * newScale)
}

function onSettingsChanged(e) {
  const newSettings = e.detail
  live2DSettings.value = newSettings
  console.log('🔄 Live2D 设置已更新，重新加载模型...')
  nextTick(() => {
    loadModel()
  })
}

// ========== 生命周期 ==========
onMounted(() => {
  const pos = loadPosition()
  offsetX.value = pos.x
  offsetY.value = pos.y

  loadModel()

  // 监听容器尺寸变化
  if (canvasRef.value?.parentElement) {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(canvasRef.value.parentElement)
  }

  // 监听设置变更
  window.addEventListener('live2d-settings-changed', onSettingsChanged)
})

onUnmounted(() => {
  cleanup()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('live2d-settings-changed', onSettingsChanged)
})

defineExpose({
  setDragMode,
  adjustScale,
  startTalking,
  stopTalking,
  resetPosition
})
</script>

<style scoped>
.live2d-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.live2d-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
  transition: cursor 0.2s;
}

.live2d-canvas.canvas-draggable {
  cursor: grab;
}

.live2d-canvas.canvas-draggable:active {
  cursor: grabbing;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 8px;
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ff6b6b;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px 15px;
  border-radius: 8px;
  text-align: center;
  max-width: 90%;
}

.drag-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.50);
  background: rgba(0, 0, 0, 0.50);
  padding: 4px 12px;
  border-radius: 10px;
  pointer-events: none;
  animation: hintFade 2s ease;
}

@keyframes hintFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
