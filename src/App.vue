<template>
  <div id="app">
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
      <router-view />
    </main>


  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'

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
/* 样式保持不变 */
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

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 20px;
}
</style>