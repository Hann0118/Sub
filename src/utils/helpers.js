import { useMainStore } from '../stores/main.js'

// Toast 通知
export function showToast(message, type = 'success') {
    const store = useMainStore()
    store.toast.show = true
    store.toast.message = message
    store.toast.type = type
    setTimeout(() => { store.toast.show = false }, 2500)
}

// 复制到剪贴板
export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text)
        showToast('已复制到剪贴板')
    } catch (e) {
        showToast('复制失败', 'error')
    }
}

// 进度条颜色
export function getProgressClass(count) {
    if (count >= 50) return 'progress-success'
    if (count >= 20) return 'progress-info'
    if (count >= 5) return 'progress-warning'
    return 'progress-error'
}

// 判断是否过期
export function isExpired(dateStr) {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
}

// 格式化时间
export function formatTime(dateStr) {
    if (!dateStr) return '从未'
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return d.toLocaleDateString('zh-CN')
}

// 从链接提取名称
export function getNameFromLink(link) {
    if (!link) return ''
    try {
        if (link.startsWith('vmess://')) {
            const json = JSON.parse(atob(link.replace('vmess://', '')))
            return json.ps || ''
        }
        const hashIdx = link.indexOf('#')
        if (hashIdx !== -1) return decodeURIComponent(link.slice(hashIdx + 1))
    } catch (e) { }
    return ''
}

// 更新链接名称
export function updateLinkName(link, newName) {
    if (!link || !newName) return link
    try {
        if (link.startsWith('vmess://')) {
            const json = JSON.parse(atob(link.replace('vmess://', '')))
            json.ps = newName
            return 'vmess://' + btoa(JSON.stringify(json))
        }
        const hashIdx = link.indexOf('#')
        const base = hashIdx !== -1 ? link.slice(0, hashIdx) : link
        return base + '#' + encodeURIComponent(newName)
    } catch (e) { return link }
}
