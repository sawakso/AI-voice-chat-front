import axios from 'axios'

const api = axios.create({
    baseURL: '',          // 空，走 vite proxy
    timeout: 180000
})

export function sendMessage(message, voiceConfig) {
    return api.post('/api/chat', {
        message,
        ref_audio_path: voiceConfig.ref_audio_path,
        prompt_text: voiceConfig.prompt_text,
        prompt_lang: voiceConfig.prompt_lang || 'zh',
        text_lang: voiceConfig.text_lang || 'zh'
    })
}

export function getAudioUrl(filename) {
    return `/api/audio/${filename}`
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