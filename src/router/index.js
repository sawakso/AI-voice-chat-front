import { createRouter, createWebHashHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'
import SettingsView from '@/views/SettingsView.vue'

const routes = [
    { path: '/', component: ChatView },
    { path: '/settings', component: SettingsView }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router