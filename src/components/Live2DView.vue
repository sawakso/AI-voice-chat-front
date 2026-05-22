<template>
  <div class="live2d-wrapper">
    <canvas ref="canvasRef" class="live2d-canvas"></canvas>
    <div v-if="loading" class="loading-indicator">加载中...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// 挂载到 window
window.PIXI = PIXI

const canvasRef = ref(null)
let app = null
let model = null
let talkingInterval = null

const props = defineProps({
  visible: { type: Boolean, default: true },
  modelPath: { type: String, default: '' }
})

const loading = ref(false)
const error = ref('')

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

defineExpose({
  startTalking() {
    if (!model) return
    if (talkingInterval) clearInterval(talkingInterval)
    if (model.motion) {
      try {
        model.motion('Tap', 0)
      } catch (e) {}
    }
    talkingInterval = setInterval(() => {
      if (model && model.motion) {
        try {
          model.motion('Idle', 0)
        } catch (e) {}
      }
    }, 1500)
  },
  stopTalking() {
    if (talkingInterval) {
      clearInterval(talkingInterval)
      talkingInterval = null
    }
  }
})

async function loadModel() {
  if (!props.visible || !canvasRef.value) return

  const canvas = canvasRef.value
  const container = canvas.parentElement
  const width = container?.clientWidth || 300
  const height = container?.clientHeight || 300

  loading.value = true
  error.value = ''

  try {
    app = new PIXI.Application({
      view: canvas,
      width: width,
      height: height,
      backgroundColor: 0x1a1a2e,
      backgroundAlpha: 1,
      autoStart: true,
      antialias: true
    })

    console.log('加载模型:', actualModelPath.value)
    model = await Live2DModel.from(actualModelPath.value)

    const scale = 0.25
    model.scale.set(scale)
    model.anchor.set(0.5, 0.5)
    model.x = width / 2
    model.y = height / 2

    app.stage.addChild(model)
    loading.value = false
    console.log('✅ Live2D 模型加载成功')
  } catch (err) {
    console.error('模型加载失败:', err)
    error.value = `加载失败: ${err.message}`
    loading.value = false
  }
}

function cleanup() {
  if (talkingInterval) clearInterval(talkingInterval)
  if (app) {
    app.destroy(true)
    app = null
  }
  model = null
}

onMounted(() => {
  loadModel()
})

onUnmounted(() => {
  cleanup()
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
</style>