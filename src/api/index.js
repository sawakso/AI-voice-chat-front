import axios from 'axios'

// 使用 Vite 环境变量
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 180000
})

export function sendMessage(message, voiceConfig) {
    return api.post('/api/chat', {
        message,
        ref_audio_path: voiceConfig.ref_audio_path,
        aux_ref_audio_paths: voiceConfig.aux_ref_audio_paths || [],
        prompt_text: voiceConfig.prompt_text,
        prompt_lang: voiceConfig.prompt_lang || 'zh',
        text_lang: voiceConfig.text_lang || 'zh',
        tts_params: voiceConfig.tts_params || null
    })
}

export function getAudioUrl(filename) {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    return `${base}/api/audio/${filename}`
}

export function getModels() {
    return api.get('/api/models')
}

export function switchModel(gptModel, sovitsModel) {
    return api.post('/api/model/switch', {
        gpt_model: gptModel || '',
        sovits_model: sovitsModel || ''
    })
}

export function testVoice(voiceConfig) {
    return api.post('/api/voice/test', voiceConfig)
}