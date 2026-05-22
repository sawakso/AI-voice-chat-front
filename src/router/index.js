import { createRouter, createWebHistory } from 'vue-router'
import Chat from '../views/ChatView.vue'
import Settings from '@/views/SettingsView.vue'
import Live2DSettings from '@/views/Live2DSettings.vue'

const routes = [
    { path: '/', name: 'Chat', component: Chat },
    { path: '/settings', name: 'Settings', component: Settings },
    { path: '/live2d', name: 'Live2DSettings', component: Live2DSettings }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router