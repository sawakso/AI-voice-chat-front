<template>
  <div id="app">
    <!-- 顶部导航 -->
    <nav class="navbar">
      <h1>🤖 AI 语音对话</h1>
      <div class="nav-links">
        <router-link to="/">💬 对话</router-link>
        <router-link to="/settings">⚙️ 设置</router-link>
      </div>
    </nav>

    <!-- 页面内容 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'

// ========== 全局音色配置（所有页面共享） ==========
const voiceConfig = ref({
  ref_audio_path: '',
  prompt_text: '',
  prompt_lang: 'zh',
  text_lang: 'zh'
})

// 提供给所有子组件
provide('voiceConfig', voiceConfig)

// 从 localStorage 恢复上次的设置
onMounted(() => {
  const saved = localStorage.getItem('voiceConfig')
  if (saved) {
    try {
      Object.assign(voiceConfig.value, JSON.parse(saved))
    } catch (e) {}
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', sans-serif;
  background: #1a1a2e;
  color: #eee;
  min-height: 100vh;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 顶部导航 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

.navbar h1 {
  font-size: 18px;
  color: #e94560;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-links a {
  color: #aaa;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-exact-active {
  color: #fff;
  background: #0f3460;
}

/* 主区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
}
</style>