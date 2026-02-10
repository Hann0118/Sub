// BiaoSUB 远程订阅管理模块
import { API } from '../config.js'
import { remoteModal } from '../store.js'
import { authFetch, loadResources } from '../api.js'
import { showToast } from '../utils.js'

// 打开远程订阅弹窗
export const openRemoteModal = () => {
    remoteModal.url = ''
    remoteModal.name = ''
    remoteModal.content = ''
    remoteModal.mode = 'auto'
    remoteModal.loading = false
    remoteModal.show = true
}

// 保存远程订阅（自动获取模式）
export const saveRemoteSubscription = async () => {
    // 手动粘贴模式
    if (remoteModal.mode === 'manual') {
        return saveManualSubscription()
    }

    // 自动获取模式
    if (!remoteModal.url || !remoteModal.url.trim()) {
        showToast('请输入订阅链接', 'error')
        return
    }

    remoteModal.loading = true
    try {
        const res = await authFetch(API + '/remote', {
            method: 'POST',
            body: JSON.stringify({
                url: remoteModal.url.trim(),
                name: remoteModal.name.trim()
            })
        })

        if (!res) return

        const data = await res.json()
        if (data.success) {
            showToast(`导入成功！解析到 ${data.data.nodeCount} 个节点`, 'success')
            remoteModal.show = false
            loadResources()
        } else {
            showToast('导入失败: ' + (data.error || '未知错误'), 'error')
        }
    } catch (e) {
        showToast('导入失败: ' + e.message, 'error')
    }
    remoteModal.loading = false
}

// 手动粘贴模式保存
const saveManualSubscription = async () => {
    if (!remoteModal.content || !remoteModal.content.trim()) {
        showToast('请粘贴订阅内容', 'error')
        return
    }

    remoteModal.loading = true
    try {
        const name = remoteModal.name.trim() || '手动导入订阅'

        // 直接作为 group 类型资源保存（复用现有资源添加接口）
        const res = await authFetch(API + '/subs', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                url: remoteModal.content.trim(),
                type: 'group',
                params: {},
                source_url: remoteModal.url.trim() || ''  // 可选记录源 URL
            })
        })

        if (!res) return

        const data = await res.json()
        if (data.success) {
            showToast('手动导入成功！', 'success')
            remoteModal.show = false
            loadResources()
        } else {
            showToast('导入失败: ' + (data.error || '未知错误'), 'error')
        }
    } catch (e) {
        showToast('导入失败: ' + e.message, 'error')
    }
    remoteModal.loading = false
}

// 刷新远程订阅
export const refreshRemote = async (item) => {
    if (item.type !== 'remote') return

    item.refreshing = true
    try {
        const res = await authFetch(`${API}/remote/refresh/${item.id}`, {
            method: 'POST'
        })

        if (!res) return

        const data = await res.json()
        if (data.success) {
            showToast(`刷新成功！当前 ${data.data.nodeCount} 个节点`, 'success')
            loadResources()
        } else {
            showToast('刷新失败: ' + (data.error || '未知错误'), 'error')
        }
    } catch (e) {
        showToast('刷新失败: ' + e.message, 'error')
    }
    item.refreshing = false
}
