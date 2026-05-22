<template>
  <div class="live2d-wrapper">
    <!-- Live2D画布 -->
    <canvas ref="canvasRef" class="live2d-canvas"></canvas>
    
    <!-- 散射菜单按钮 -->
    <div 
      class="menu-container" 
      :style="{
        left: menuPosition.x + '%',
        top: menuPosition.y + '%'
      }"
    >
      <!-- 中心按钮 -->
      <button 
        class="menu-center-btn" 
        @click="toggleMenu" 
        @mousedown="handleMenuDragStart"
        @touchstart="handleMenuDragStart"
        :class="{ active: showMenu, dragging: isMenuDragging }"
        title="点击展开/收起菜单，按住可拖动"
      >
        <span class="btn-icon">{{ showMenu ? '✖️' : '⚙️' }}</span>
      </button>
      
      <!-- 散射的菜单按钮 -->
      <transition-group name="spiral">
        <div
          v-for="btn in menuButtons"
          :key="btn.id"
          class="menu-btn"
          :style="{
            left: btn.x + '%',
            top: btn.y + '%',
            animationDelay: btn.delay + 'ms'
          }"
          @click="handleMenuBtnClick($event, btn)"
          :title="btn.label"
        >
          <span class="btn-icon">{{ btn.icon }}</span>
          <span class="btn-label">{{ btn.label }}</span>
        </div>
      </transition-group>
    </div>
    
    <!-- 加载提示 -->
    <div v-if="loading" class="loading-indicator">加载中...</div>
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as PIXI from 'pixi.js'  // 导入PixiJS图形库
// 使用默认导入（支持 Cubism 2/3/4）
import { Live2DModel } from 'pixi-live2d-display'  // 导入Live2D显示库

// 将PIXI挂载到window对象，供Live2D库使用
window.PIXI = PIXI

const canvasRef = ref(null)  // 画布引用
let app = null  // PixiJS应用实例
let model = null  // Live2D模型实例
let resizeObserver = null  // 尺寸观察器
let mouseMoveHandler = null  // 鼠标移动处理器
let idleTimer = null  // 空闲动画定时器

// 散射菜单相关
const showMenu = ref(false)  // 是否显示菜单
const menuButtons = ref([])  // 菜单按钮列表
let isDragging = false  // 是否正在拖拽模型
let dragStartPos = { x: 0, y: 0 }  // 拖拽起始位置

// 菜单容器位置（可拖动）
const menuPosition = ref({ x: 80, y: 50 })  // 百分比位置
let isMenuDragging = false  // 是否正在拖动菜单
let menuDragStart = { x: 0, y: 0 }  // 菜单拖动起始位置

// 定义菜单按钮配置
const MENU_BUTTONS = [
  { id: 'expression-happy', icon: '😊', label: '开心', action: () => playMotion('Tap') },
  { id: 'expression-sad', icon: '😢', label: '难过', action: () => playMotion('FlickDown') },
  { id: 'expression-surprised', icon: '😲', label: '惊讶', action: () => playMotion('Flick') },
  { id: 'blink', icon: '😉', label: '眨眼', action: () => playMotion('Idle') },
  { id: 'move-up', icon: '⬆️', label: '上移', action: () => moveModel(0, -20) },
  { id: 'move-down', icon: '⬇️', label: '下移', action: () => moveModel(0, 20) },
  { id: 'move-left', icon: '⬅️', label: '左移', action: () => moveModel(-20, 0) },
  { id: 'move-right', icon: '➡️', label: '右移', action: () => moveModel(20, 0) },
  { id: 'reset-pos', icon: '🔄', label: '重置位置', action: resetModelPosition },
  { id: 'drag-mode', icon: '✋', label: '拖动模型', action: toggleDragMode }
]

// 播放动作
function playMotion(motionName) {
  if (!model) return
  try {
    if (typeof model.motion === 'function') {
      model.motion(motionName, 0)
      console.log(`🎭 播放动作: ${motionName}`)
    }
  } catch (err) {
    console.error('播放动作失败:', err)
  }
}

// 移动模型
function moveModel(dx, dy) {
  if (!model) return
  model.x += dx
  model.y += dy
  console.log(`📍 模型移动到: (${model.x.toFixed(0)}, ${model.y.toFixed(0)})`)
}

// 重置模型位置
function resetModelPosition() {
  if (!model || !canvasRef.value) return
  const container = canvasRef.value.parentElement
  const width = container?.clientWidth || 300
  const height = container?.clientHeight || 300
  model.x = width / 2
  model.y = height / 2
  console.log('🔄 模型位置已重置')
}

// 切换拖动模式
function toggleDragMode() {
  isDragging = !isDragging
  console.log(isDragging ? '✋ 拖动模式已启用 - 现在可以直接拖动模型' : '✋ 拖动模式已禁用')
}

// 菜单拖动处理
function handleMenuDragStart(e) {
  // 只在按住中心按钮时才能拖动菜单
  if (e.target.closest('.menu-center-btn')) {
    e.preventDefault()
    isMenuDragging = true
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    menuDragStart = {
      x: clientX,
      y: clientY
    }
    
    console.log('🖱️ 开始拖动菜单')
  }
}

function handleMenuDragMove(e) {
  if (!isMenuDragging) return
  
  e.preventDefault()
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  
  // 计算新的百分比位置
  const deltaX = clientX - menuDragStart.x
  const deltaY = clientY - menuDragStart.y
  
  const percentX = (deltaX / rect.width) * 100
  const percentY = (deltaY / rect.height) * 100
  
  menuPosition.value.x = Math.max(10, Math.min(90, menuPosition.value.x + percentX))
  menuPosition.value.y = Math.max(10, Math.min(90, menuPosition.value.y + percentY))
  
  menuDragStart = { x: clientX, y: clientY }
}

function handleMenuDragEnd() {
  if (isMenuDragging) {
    isMenuDragging = false
    console.log('🖱️ 结束拖动菜单')
  }
}

// 模型拖动处理
function handleModelDragStart(e) {
  if (!isDragging || !model) return
  
  // 如果点击的是菜单区域，不处理
  if (e.target.closest('.menu-container')) return
  
  e.preventDefault()
  
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  dragStartPos = {
    x: clientX - rect.left - model.x,
    y: clientY - rect.top - model.y
  }
  
  console.log('🖱️ 开始拖动模型')
}

function handleModelDragMove(e) {
  if (!isDragging || !model) return
  
  e.preventDefault()
  
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  model.x = clientX - rect.left - dragStartPos.x
  model.y = clientY - rect.top - dragStartPos.y
}

function handleModelDragEnd() {
  if (!isDragging) return
  
  console.log('🖱️ 结束拖动模型')
}

// 切换菜单显示
function toggleMenu(e) {
  // 阻止事件传播和默认行为
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  showMenu.value = !showMenu.value
  console.log(showMenu.value ? '📂 菜单已展开' : '📁 菜单已收起')
  
  if (showMenu.value) {
    // 生成螺旋式散射的按钮位置
    generateSpiralPositions()
  }
}

// 处理菜单按钮点击
function handleMenuBtnClick(e, btn) {
  // 阻止事件传播
  e.stopPropagation()
  e.preventDefault()
  
  console.log(`👆 点击了菜单按钮: ${btn.label}`)
  
  // 执行按钮动作
  if (btn.action) {
    btn.action()
  }
}

// 生成螺旋式散射的按钮位置
function generateSpiralPositions() {
  const centerX = 50  // 中心点 X (%)
  const centerY = 50  // 中心点 Y (%)
  const radius = 35   // 半径 (%)
  
  menuButtons.value = MENU_BUTTONS.map((btn, index) => {
    const angle = (index / MENU_BUTTONS.length) * 2 * Math.PI - Math.PI / 2  // 从顶部开始
    return {
      ...btn,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      delay: index * 50  // 动画延迟（毫秒）
    }
  })
}

// 暴露方法给父组件
let talkingInterval = null  // 说话动画定时器

defineExpose({
  // 触发说话动画
  startTalking() {
    console.log('💬 Live2D 开始说话动画')
    if (!model) return
    
    // 清除之前的定时器
    if (talkingInterval) {
      clearInterval(talkingInterval)
    }
    
    // 暂停空闲动画
    if (idleTimer) {
      console.log('⏸️ 暂停空闲动画')
      clearInterval(idleTimer)
      idleTimer = null
    }
    
    // 立即播放一个动作
    try {
      if (typeof model.motion === 'function') {
        const talkingMotions = ['Tap', 'Flick']
        const randomMotion = talkingMotions[Math.floor(Math.random() * talkingMotions.length)]
        model.motion(randomMotion, 0)
        console.log(`🎭 播放说话动作: ${randomMotion}`)
      }
    } catch (err) {
      console.error('说话动画失败:', err)
    }
    
    // 每隔800毫秒随机播放一个动作，模拟持续说话
    talkingInterval = setInterval(() => {
      if (model && typeof model.motion === 'function') {
        const talkingMotions = ['Tap', 'Flick', 'Idle']
        const randomMotion = talkingMotions[Math.floor(Math.random() * talkingMotions.length)]
        try {
          model.motion(randomMotion, 0)
          console.log(`🎭 持续说话动作: ${randomMotion}`)
        } catch (err) {
          console.error('持续说话动画失败:', err)
        }
      }
    }, 800)  // 从1500ms改为800ms，更频繁的动画
  },
  
  // 停止说话动画
  stopTalking() {
    console.log('💬 Live2D 停止说话动画')
    if (talkingInterval) {
      clearInterval(talkingInterval)
      talkingInterval = null
    }
    
    // 恢复空闲动画（如果设置中启用了）
    const idleInterval = live2DSettings.value?.idleInterval || 0
    if (idleInterval > 0) {
      console.log('▶️ 恢复空闲动画，间隔:', idleInterval, '秒')
      setupIdleAnimation(idleInterval)
    }
  }
})

const props = defineProps({
  visible: { type: Boolean, default: true },  // 是否可见
  modelPath: { 
    type: String, 
    default: ''  // 从设置中读取
  }
})

// 从 localStorage 加载 Live2D 设置
function loadLive2DSettings() {
  try {
    const saved = localStorage.getItem('live2dSettings')
    if (saved) {
      console.log('📦 从 localStorage 加载的设置:', JSON.parse(saved))
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('加载Live2D设置失败:', e)
  }
  console.log('⚠️ 未找到保存的设置，使用默认值')
  return null
}

const live2DSettings = ref(loadLive2DSettings())

// 如果 props.modelPath 为空，从设置中读取
const actualModelPath = computed(() => {
  return props.modelPath || live2DSettings.value?.modelPath || '/models/hiyori_free_zh/runtime/hiyori_free_t08.model3.json'
})

const loading = ref(false)  // 加载状态
const error = ref('')  // 错误信息

// 加载Live2D模型的核心函数
async function loadModel() {
  if (!props.visible || !canvasRef.value) return

  const canvas = canvasRef.value
  const container = canvas.parentElement

  // 获取容器实际尺寸，设置默认值300x300
  const width = container?.clientWidth || 300
  const height = container?.clientHeight || 300

  loading.value = true
  error.value = ''

  try {
    console.log('初始化PixiJS应用...')
    
    // 创建PixiJS应用实例
    app = new PIXI.Application({
      view: canvas,
      width: width,
      height: height,
      backgroundColor: 0x1a1a2e,  // 背景色
      backgroundAlpha: 1,  // 背景透明度
      autoStart: false,  // 不自动启动，等模型加载完成后再启动
      antialias: false,  // 禁用抗锯齿以避免渲染问题
      resolution: 1,  // 固定分辨率为1
      autoDensity: false,  // 禁用自动密度调整
      powerPreference: 'low-power'  // 使用低功耗模式
    })

    console.log('加载模型:', actualModelPath.value)
    
    // 从配置文件加载Live2D模型
    // pixi-live2d-display 会自动检测模型版本（Cubism 2/3/4）
    model = await Live2DModel.from(actualModelPath.value, {
      autoInteract: true,  // 启用自动交互
      autoUpdate: true,  // 启用自动更新
      pivot: new PIXI.Point(0.5, 0.5)  // 设置枢轴点为中心
    })

    console.log('模型原始尺寸:', model.width, 'x', model.height)

    // 从设置中获取缩放系数，默认为 0.3
    const settingsScale = live2DSettings.value?.scale || 0.3
    // 计算合适的缩放比例，让模型适应容器
    const scale = Math.min(width / model.width, height / model.height) * settingsScale
    model.scale.set(scale)
    
    console.log('计算的缩放比例:', scale, '(设置系数:', settingsScale, ')')

    // 居中显示模型
    model.anchor.set(0.5, 0.5)  // 设置锚点为中心
    model.x = width / 2
    model.y = height / 2  // 完全居中

    // 将模型添加到舞台
    app.stage.addChild(model)

    // 等待以确保模型完全初始化
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 关键修复：检查并初始化模型参数
    if (model.internalModel?.coreModel) {
      const coreModel = model.internalModel.coreModel
      const paramCount = coreModel.getParameterCount()
      const drawableCount = coreModel.getDrawableCount()
      
      console.log('模型初始化检查:', {
        参数数量: paramCount,
        绘制对象数量: drawableCount
      })
      
      // 如果参数数量为0，说明模型加载有问题
      if (paramCount === 0 || drawableCount === 0) {
        throw new Error(`模型数据不完整: 参数=${paramCount}, 绘制对象=${drawableCount}`)
      }
    }
    
    // 检查模型内部状态
    console.log('模型内部结构检查:', {
      hasInternalModel: !!model.internalModel,
      modelType: model.internalModel?.constructor?.name,
      hasCoreModel: !!model.internalModel?.coreModel,
      hasRenderer: !!model.internalModel?.renderer,
      rendererType: model.internalModel?.renderer?.constructor?.name,
      motionManager: model.internalModel?.motionManager ? '存在' : '不存在',
      parametersCount: model.internalModel?.coreModel?.getParameterCount?.() || 0
    })

    console.log('✅ Live2D模型加载成功', {
      模型尺寸: `${model.width}x${model.height}`,
      缩放比例: scale.toFixed(3),
      位置: `(${model.x}, ${model.y})`,
      锚点: `(${model.anchor.x}, ${model.anchor.y})`
    })

    // 调试：检查模型支持的方法和动作
    console.log('🔍 模型方法检查:', {
      hasMotion: typeof model.motion === 'function',
      hasInternalModel: !!model.internalModel,
      internalModelMethods: model.internalModel ? Object.keys(model.internalModel).filter(k => k.includes('motion') || k.includes('Motion')) : [],
      motionManager: model.internalModel?.motionManager ? '存在' : '不存在'
    })
    
    // 检查内部模型的动作组
    if (model.internalModel?.motionManager) {
      const motionManager = model.internalModel.motionManager
      console.log('🎭 动作管理器:', {
        hasStartMotion: typeof motionManager.startMotion === 'function',
        hasPlayMotion: typeof motionManager.playMotion === 'function',
        methods: Object.keys(motionManager).slice(0, 10)
      })
    }

    // 关键修复：等待几帧后再启动渲染器，确保模型完全初始化
    setTimeout(() => {
      console.log('🚀 启动PixiJS渲染器...')
      
      // 添加错误处理，防止渲染崩溃
      try {
        app.start()
        console.log('✅ 渲染器已启动')
        
        // 应用动画设置（模型加载完成后首次应用）
        console.log('🎨 模型加载完成，应用初始设置:', live2DSettings.value)
        applyAnimationSettings()
      } catch (err) {
        console.error('❌ 渲染器启动失败:', err)
        error.value = '渲染器启动失败，请检查Cubism Core版本兼容性'
      }
    }, 300)

    loading.value = false
  } catch (err) {
    console.error('❌ Live2D模型加载失败:', err)
    error.value = `加载失败: ${err.message}`
    loading.value = false
  }
}

// 调整模型大小以适应新容器尺寸
function resizeModel() {
  if (!app || !model || !canvasRef.value) return
  
  const canvas = canvasRef.value
  const container = canvas.parentElement
  const width = container?.clientWidth || 300
  const height = container?.clientHeight || 300
  
  // 重新设置渲染器大小
  app.renderer.resize(width, height)
  
  // 重新计算缩放和位置（保持与初始加载相同的缩放系数）
  const settingsScale = live2DSettings.value?.scale || 0.3
  const scale = Math.min(width / model.width, height / model.height) * settingsScale
  model.scale.set(scale)
  model.x = width / 2
  model.y = height / 2
  
  console.log('📐 窗口调整:', { width, height, scale: scale.toFixed(3), 模型显示尺寸: `${model.width * scale}x${model.height * scale}` })
}

// 组件挂载时加载模型
onMounted(() => {
  console.log('🚀 Live2DView 组件已挂载')
  
  // 监听 Live2D 设置变化
  const settingsHandler = (event) => {
    console.log('🔄 Live2D 设置已更新:', event.detail)
    live2DSettings.value = event.detail
    // 重新调整模型大小
    if (model) {
      console.log('📐 应用新的缩放系数:', event.detail.scale)
      resizeModel()
      // 重新应用动画设置
      applyAnimationSettings()
    } else {
      console.warn('⚠️ 模型尚未加载，等待模型加载后会自动应用设置')
    }
  }
  
  window.addEventListener('live2d-settings-changed', settingsHandler)
  console.log('✅ 已注册设置变化监听器')
  
  // 最后加载模型
  loadModel()
  
  // 添加模型拖动事件监听
  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('mousedown', handleModelDragStart)
    canvas.addEventListener('mousemove', handleModelDragMove)
    canvas.addEventListener('mouseup', handleModelDragEnd)
    canvas.addEventListener('mouseleave', handleModelDragEnd)
    
    // 触摸支持
    canvas.addEventListener('touchstart', handleModelDragStart)
    canvas.addEventListener('touchmove', handleModelDragMove)
    canvas.addEventListener('touchend', handleModelDragEnd)
  }
  
  // 添加全局菜单拖动监听
  document.addEventListener('mousemove', handleMenuDragMove)
  document.addEventListener('mouseup', handleMenuDragEnd)
  document.addEventListener('touchmove', handleMenuDragMove)
  document.addEventListener('touchend', handleMenuDragEnd)
})

// 监听visible属性变化，控制模型显示/隐藏
watch(() => props.visible, (newVal) => {
  if (newVal && !app) {
    // 重新显示时重新加载
    loadModel()
  } else if (!newVal && app) {
    // 隐藏时销毁
    cleanup()
  }
})

// 设置鼠标跟随
function setupMouseFollow(enabled) {
  if (!model) return
  
  // 清除旧的监听器
  if (mouseMoveHandler) {
    window.removeEventListener('mousemove', mouseMoveHandler)
    mouseMoveHandler = null
  }
  
  if (enabled) {
    mouseMoveHandler = (event) => {
      const canvas = canvasRef.value
      if (!canvas || !model.internalModel?.coreModel) return
      
      const rect = canvas.getBoundingClientRect()
      // 计算鼠标在画布中的相对位置 (-1 到 1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      try {
        const coreModel = model.internalModel.coreModel
        
        // 尝试使用标准参数名
        const eyeBallXId = coreModel.getParameterIndex('ParamEyeBallX')
        const eyeBallYId = coreModel.getParameterIndex('ParamEyeBallY')
        
        if (eyeBallXId >= 0 && eyeBallYId >= 0) {
          // 如果找到参数，更新眼睛位置
          coreModel.setParameterValue(eyeBallXId, x * 0.5)
          coreModel.setParameterValue(eyeBallYId, y * 0.5)
        } else {
          // 如果没有眼球参数，尝试更新头部角度
          const angleXId = coreModel.getParameterIndex('ParamAngleX')
          const angleYId = coreModel.getParameterIndex('ParamAngleY')
          
          if (angleXId >= 0 && angleYId >= 0) {
            coreModel.setParameterValue(angleXId, x * 30)  // 角度范围 -30 到 30
            coreModel.setParameterValue(angleYId, y * 30)
          }
        }
      } catch (err) {
        // 静默失败，不影响其他功能
      }
    }
    
    window.addEventListener('mousemove', mouseMoveHandler)
    console.log('✅ 鼠标跟随已启用')
  } else {
    console.log('❌ 鼠标跟随已禁用')
  }
}

// 设置空闲动画
function setupIdleAnimation(intervalSeconds) {
  // 清除旧的定时器
  if (idleTimer) {
    clearInterval(idleTimer)
    idleTimer = null
  }
  
  if (intervalSeconds > 0 && model) {
    idleTimer = setInterval(() => {
      if (model) {
        try {
          // 尝试不同的方法播放 Idle 动作
          if (typeof model.motion === 'function') {
            // pixi-live2d-display 的 motion 方法，指定索引 0
            console.log('🎭 播放空闲动画: Idle[0]')
            model.motion('Idle', 0)
          } else if (model.internalModel?.motionManager?.startMotion) {
            // 直接使用内部动作管理器
            console.log('🎭 播放空闲动画: Idle (通过 motionManager)')
            model.internalModel.motionManager.startMotion('Idle', 0, 1)  // priority=1
          } else {
            console.warn('⚠️ 模型不支持动作播放')
          }
        } catch (err) {
          console.warn('播放空闲动画失败:', err)
        }
      }
    }, intervalSeconds * 1000)
    console.log('✅ 空闲动画已启用，间隔:', intervalSeconds, '秒')
  } else {
    console.log('❌ 空闲动画已禁用')
  }
}

// 应用所有动画设置
function applyAnimationSettings() {
  if (!live2DSettings.value || !model) {
    console.warn('⚠️ 无法应用动画设置:', { hasSettings: !!live2DSettings.value, hasModel: !!model })
    return
  }
  
  const settings = live2DSettings.value
  console.log('🎨 开始应用动画设置:', {
    followMouse: settings.followMouse,
    idleInterval: settings.idleInterval,
    scale: settings.scale,
    enabled: settings.enabled
  })
  
  // 应用鼠标跟随
  const shouldFollowMouse = settings.followMouse !== false && settings.enabled
  console.log('👀 鼠标跟随判断:', { followMouse: settings.followMouse, enabled: settings.enabled, result: shouldFollowMouse })
  setupMouseFollow(shouldFollowMouse)
  
  // 应用空闲动画
  setupIdleAnimation(settings.idleInterval || 0)
  
  console.log('✅ 动画设置已应用:', {
    鼠标跟随: shouldFollowMouse,
    空闲动画间隔: settings.idleInterval + '秒'
  })
}

// 清理资源
function cleanup() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  
  // 清理鼠标跟随
  if (mouseMoveHandler) {
    window.removeEventListener('mousemove', mouseMoveHandler)
    mouseMoveHandler = null
  }
  
  // 清理空闲动画定时器
  if (idleTimer) {
    clearInterval(idleTimer)
    idleTimer = null
  }
  
  // 清理说话动画定时器
  if (talkingInterval) {
    clearInterval(talkingInterval)
    talkingInterval = null
  }
  
  if (model) {
    model.destroy()
    model = null
  }
  if (app) {
    app.destroy(true, { children: true, texture: true })
    app = null
  }
}

// 组件卸载时清理资源
onUnmounted(() => {
  cleanup()
  
  // 清理事件监听
  document.removeEventListener('mousemove', handleMenuDragMove)
  document.removeEventListener('mouseup', handleMenuDragEnd)
  document.removeEventListener('touchmove', handleMenuDragMove)
  document.removeEventListener('touchend', handleMenuDragEnd)
})
</script>

<style scoped>
/* Live2D容器 */
.live2d-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 画布样式 */
.live2d-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* 菜单容器 */
.menu-container {
  position: absolute;
  width: 200px;
  height: 200px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  cursor: move;  /* 显示可拖动光标 */
}

/* 中心按钮 */
.menu-center-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 3px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 24px;
  cursor: grab;  /* 显示可抓取光标 */
  pointer-events: auto;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 100;
}

.menu-center-btn:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.menu-center-btn:active {
  cursor: grabbing;  /* 拖动时显示抓取中光标 */
}

.menu-center-btn.dragging {
  cursor: grabbing;
  opacity: 0.8;
}

.menu-center-btn.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* 散射菜单按钮 */
.menu-btn {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(79, 172, 254, 0.4);
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
}

.menu-btn:hover {
  transform: translate(-50%, -50%) scale(1.15);
  box-shadow: 0 5px 15px rgba(79, 172, 254, 0.6);
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.menu-btn .btn-icon {
  font-size: 20px;
  line-height: 1;
}

.menu-btn .btn-label {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.menu-btn:hover .btn-label {
  opacity: 1;
}

/* 螺旋散射动画 */
.spiral-enter-active {
  animation: spiral-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.spiral-leave-active {
  animation: spiral-out 0.3s ease-in forwards;
}

@keyframes spiral-in {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(-180deg);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes spiral-out {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(0) rotate(180deg);
    opacity: 0;
  }
}

/* 加载提示样式 */
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

/* 错误提示样式 */
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