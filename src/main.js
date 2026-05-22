import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 不需要等待了，让 Live2DView 自己处理
const app = createApp(App)
app.use(router)
app.mount('#app')