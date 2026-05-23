<template>
  <div id="app">
    <!-- Canvas 动态背景 -->
    <canvas ref="bgCanvas" class="bg-canvas"></canvas>

    <!-- 顶部导航 -->
    <nav class="navbar">
      <h1>🤖 AI 语音对话</h1>
      <div class="nav-links">
        <router-link to="/">💬 对话</router-link>
        <router-link to="/settings">⚙️ 音色设置</router-link>
        <router-link to="/live2d">🎨 Live2D 设置</router-link>
      </div>
    </nav>

    <!-- 页面内容 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted, nextTick } from 'vue'

// ========== Canvas 动态背景 ==========
const bgCanvas = ref(null)
let animFrameId = null

const shapes = []
const particles = []
const palette = ['#667eea', '#a0a0ff', '#00d9c0', '#ffb347', '#ba55d3']

function randomBetween(a, b) { return a + Math.random() * (b - a) }

function initShapes(w, h) {
  shapes.length = 0
  for (let i = 0; i < 30; i++) {
    const types = ['rect', 'circle', 'triangle']
    shapes.push({
      type: types[Math.floor(Math.random() * types.length)],
      x: Math.random() * w,
      y: Math.random() * h,
      size: randomBetween(40, 160),
      color: palette[Math.floor(Math.random() * palette.length)],
      baseAlpha: randomBetween(0.02, 0.12),
      phase: Math.random() * Math.PI * 2,
      vx: randomBetween(-0.1, 0.1),
      vy: randomBetween(-0.1, 0.1),
      angle: Math.random() * Math.PI * 2,
      vr: randomBetween(-0.0004, 0.0004)
    })
  }
}

function initParticles(w, h) {
  particles.length = 0
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: randomBetween(0.5, 3),
      baseAlpha: randomBetween(0.02, 0.4),
      phase: Math.random() * Math.PI * 2
    })
  }
}

function drawBackground() {
  const canvas = bgCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width = window.innerWidth
  const h = canvas.height = window.innerHeight

  if (shapes.length === 0) {
    initShapes(w, h)
    initParticles(w, h)
  }

  const time = performance.now()

  function frame() {
    ctx.clearRect(0, 0, w, h)

    // 底色
    ctx.fillStyle = 'rgba(7, 7, 13, 1)'
    ctx.fillRect(0, 0, w, h)

    const t = performance.now()

    // 绘制几何图形
    for (const s of shapes) {
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.angle)

      const glow = Math.sin(t / 3000 + s.phase) * 0.04
      const alpha = s.baseAlpha + glow
      ctx.globalAlpha = Math.max(0.01, Math.min(0.18, alpha))
      ctx.fillStyle = s.color
      ctx.shadowColor = s.color
      ctx.shadowBlur = 30

      ctx.beginPath()
      if (s.type === 'circle') {
        ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2)
      } else if (s.type === 'triangle') {
        ctx.moveTo(0, -s.size / 2)
        ctx.lineTo(s.size / 2, s.size / 2)
        ctx.lineTo(-s.size / 2, s.size / 2)
        ctx.closePath()
      } else {
        const r = s.size / 8
        ctx.moveTo(-s.size / 2 + r, -s.size / 2)
        ctx.lineTo(s.size / 2 - r, -s.size / 2)
        ctx.arcTo(s.size / 2, -s.size / 2, s.size / 2, -s.size / 2 + r, r)
        ctx.lineTo(s.size / 2, s.size / 2 - r)
        ctx.arcTo(s.size / 2, s.size / 2, s.size / 2 - r, s.size / 2, r)
        ctx.lineTo(-s.size / 2 + r, s.size / 2)
        ctx.arcTo(-s.size / 2, s.size / 2, -s.size / 2, s.size / 2 - r, r)
        ctx.lineTo(-s.size / 2, -s.size / 2 + r)
        ctx.arcTo(-s.size / 2, -s.size / 2, -s.size / 2 + r, -s.size / 2, r)
        ctx.closePath()
      }
      ctx.fill()
      ctx.shadowBlur = 0

      // 更新位置和旋转
      s.x += s.vx
      s.y += s.vy
      s.angle += s.vr

      // 循环边界
      if (s.x < -s.size) s.x = w + s.size
      if (s.x > w + s.size) s.x = -s.size
      if (s.y < -s.size) s.y = h + s.size
      if (s.y > h + s.size) s.y = -s.size

      ctx.restore()
    }

    // 绘制光点
    for (const p of particles) {
      const flicker = Math.sin(t / 2000 + p.phase) * 0.1
      const alpha = p.baseAlpha + flicker
      ctx.globalAlpha = Math.max(0.01, Math.min(0.5, alpha))

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }

    animFrameId = requestAnimationFrame(frame)
  }

  frame()
}

function stopAnimation() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
}

// ========== 全局音色配置 ==========
const voiceConfig = ref({
  ref_audio_path: '',
  aux_ref_audio_paths: [],
  prompt_text: '',
  prompt_lang: 'zh',
  text_lang: 'zh',
  tts_params: {
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
})

provide('voiceConfig', voiceConfig)

// Canvas 背景启动
onMounted(() => {
  nextTick(() => {
    drawBackground()
  })
  window.addEventListener('resize', () => {
    stopAnimation()
    shapes.length = 0
    particles.length = 0
    drawBackground()
  })
})

onUnmounted(() => {
  stopAnimation()
})

// 加载音色配置
onMounted(() => {
  const saved = localStorage.getItem('voiceConfig')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.tts_params) {
        voiceConfig.value.tts_params = { ...voiceConfig.value.tts_params, ...parsed.tts_params }
      }
      voiceConfig.value.ref_audio_path = parsed.ref_audio_path || ''
      voiceConfig.value.aux_ref_audio_paths = parsed.aux_ref_audio_paths || []
      voiceConfig.value.prompt_text = parsed.prompt_text || ''
      voiceConfig.value.prompt_lang = parsed.prompt_lang || 'zh'
      voiceConfig.value.text_lang = parsed.text_lang || 'zh'
    } catch (e) {
      console.error('恢复配置失败', e)
    }
  }
})
</script>

<style>
/* ═══════════════════════════════
   全局重置 & 基础
═══════════════════════════════ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', 'Segoe UI', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif;
  background: #07070d;
  color: #e2e8f0;
  min-height: 100vh;
  overflow-x: hidden;
}

/* 全局滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #0d0d1a;
}
::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.4);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.7);
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
}

/* ═══════════════════════════════
   Canvas 动态背景
═══════════════════════════════ */
.bg-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}

/* ═══════════════════════════════
   路由页面过渡动画 (fade)
═══════════════════════════════ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ═══════════════════════════════
   导航栏
═══════════════════════════════ */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  height: 60px;
  background: rgba(7, 7, 13, 0.80);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(102, 126, 234, 0.15);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar h1 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, #667eea, #a0a0ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ═══════════════════════════════
   导航链接
═══════════════════════════════ */
.nav-links {
  display: flex;
  gap: 6px;
}

.nav-links a {
  color: #94a3b8;
  text-decoration: none;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s ease;
  border: 1px solid transparent;
  position: relative;
}

.nav-links a:hover {
  color: #c4b5fd;
  background: rgba(102, 126, 234, 0.10);
  border-color: rgba(102, 126, 234, 0.20);
}

.nav-links a.router-link-exact-active {
  color: #fff;
  background: rgba(102, 126, 234, 0.18);
  border-color: rgba(102, 126, 234, 0.40);
  box-shadow: 0 0 16px rgba(102, 126, 234, 0.15);
}

/* ═══════════════════════════════
   主内容区
═══════════════════════════════ */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 24px;
  position: relative;
  z-index: 1;
}
</style>