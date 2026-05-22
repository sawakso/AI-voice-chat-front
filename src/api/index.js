import axios from 'axios'

const api = axios.create({
    baseURL: '',          // 空，走 vite proxy
    timeout: 180000
})

// ✅ 发送聊天消息（带上 tts_params）
export function sendMessage(message, voiceConfig) {
    return api.post('/api/chat', {
        message,
        ref_audio_path: voiceConfig.ref_audio_path,
        aux_ref_audio_paths: voiceConfig.aux_ref_audio_paths || [],
        prompt_text: voiceConfig.prompt_text,
        prompt_lang: voiceConfig.prompt_lang || 'zh',
        text_lang: voiceConfig.text_lang || 'zh',
        tts_params: voiceConfig.tts_params || null   // ✅ 加上这行
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

// ✅ 测试音色（已有，无需改动，因为传整个 voiceConfig）
export function testVoice(voiceConfig) {
    return api.post('/api/voice/test', voiceConfig)
}