/**
 * 动态加载一个外部 JavaScript 文件
 * @param {string} src 脚本文件的 URL 地址
 * @returns {Promise} 返回一个 Promise，加载成功时 resolve，失败时 reject
 */
export function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 检查是否已经加载过
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}