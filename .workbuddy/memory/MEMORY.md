# MEMORY.md - ai-voice-chat-front

## 项目概况
- 路径：`E:/github/ai-voice-chat-front`
- 框架：Vue 3 + Vite + Vue Router
- 开发服务器端口：5174
- 参考项目：`E:\github\AI_Animation-master`（第一轮样式）、`D:\Adobe\webstorm\tb-front`（第二轮样式）

## 设计风格
- 底色：`#07070d` 深黑
- Canvas 动态背景：30个几何图形（紫/青/橙/粉）+ 20个光点粒子 + requestAnimationFrame 循环
- 胶囊按钮：`border-radius: 20px`，hover 上抬 `translateY(-1~-2px)`，active 按下 `scale(0.96~0.97)`
- 主色渐变按钮带 shimmer 光扫动效（`::before` 伪元素）
- 路由过渡：fade 模式 `out-in`，opacity + translateY
- 磨砂玻璃效果：`backdrop-filter: blur()` + 半透明背景
- 品牌色系：紫 `#667eea` / 蓝 `#a0a0ff` / 青 `#00d9c0` / 紫粉 `#764ba2`

## 按钮风格规范
- 主色填充按钮：渐变 `linear-gradient(135deg, #667eea, #764ba2)` + shimmer + 发光 box-shadow
- 描边按钮：1px solid 紫蓝边框 + transparent 背景，hover 填充
- 危险按钮：红色半透明 `rgba(239, 68, 68, ...)` 
- 所有按钮：hover 上移 + 阴影，active 缩小

## 已修改文件
- `src/App.vue`：Canvas 背景 + fade 路由过渡
- `src/views/ChatView.vue`：按钮胶囊化 + hover/active 动效
- `src/views/SettingsView.vue`：全部按钮胶囊化 + shimmer + active 动效 + details 展开动画
- `src/views/Live2DSettings.vue`：开关过渡、按钮胶囊化 + hover/active

## 用户偏好
- 只改样式，不改逻辑
- 中文输出
