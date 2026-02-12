import { useMainStore } from '../stores/main.js'
import { API } from './config.js'

// 封装授权请求
export async function authFetch(url, options = {}) {
    const store = useMainStore()
    const headers = { ...options.headers, 'Authorization': localStorage.getItem('auth_token') || '' }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(options.body)
    }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
        store.isLoggedIn = false
        localStorage.removeItem('auth_token')
        throw new Error('Unauthorized')
    }
    return res.json()
}

// 加载资源列表
export async function loadResources() {
    const store = useMainStore()
    try {
        const data = await authFetch(`${API}/subs`)
        if (data.success) store.resources = data.data
    } catch (e) { console.error('loadResources failed:', e) }
}

// 加载聚合组
export async function loadGroups() {
    const store = useMainStore()
    try {
        const data = await authFetch(`${API}/groups`)
        if (data.success) store.groups = data.data
    } catch (e) { console.error('loadGroups failed:', e) }
}

// 加载模板
export async function loadTemplates() {
    const store = useMainStore()
    try {
        const data = await authFetch(`${API}/templates`)
        if (data.success) store.userTemplates = data.data
    } catch (e) { console.error('loadTemplates failed:', e) }
}

// 检查资源节点数
export async function checkResource(url) {
    const data = await authFetch(`${API}/check`, {
        method: 'POST',
        body: { url }
    })
    return data
}
