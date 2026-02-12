// BiaoSUB 远程订阅获取模块
// 负责从远程 URL 获取订阅内容并解析节点

import { generateNodeLink } from './generator.js';

/**
 * 获取远程订阅内容
 * @param {string} url 远程订阅 URL
 * @returns {Promise<{content: string, subInfo: object}>}
 */
export const fetchSubscription = async (url, ua) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': ua || 'clash-verge/v1.7.7',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            },
            redirect: 'follow'
        });

        clearTimeout(timeout);

        if (res.status === 403 || res.status === 401) {
            throw new Error(`远程服务器拒绝访问(${res.status})，可能是机场屏蔽了云服务器IP。建议手动复制订阅内容后以"节点"类型粘贴导入。`);
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const content = await res.text();

        // 解析 Subscription-Userinfo 响应头（流量/到期信息）
        const subInfo = {};
        const userinfo = res.headers.get('Subscription-Userinfo');
        if (userinfo) {
            const parts = userinfo.split(';').map(s => s.trim());
            for (const part of parts) {
                const [key, val] = part.split('=').map(s => s.trim());
                if (key && val) subInfo[key] = parseInt(val) || val;
            }
        }

        // 读取订阅名称
        const disposition = res.headers.get('Content-Disposition');
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
            if (match) {
                try {
                    subInfo.fileName = decodeURIComponent(match[1].replace(/\.yaml$/i, ''));
                } catch (e) {
                    subInfo.fileName = match[1];
                }
            }
        }

        return { content, subInfo };
    } catch (e) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
            throw new Error('请求超时（15秒）');
        }
        throw e;
    }
};

/**
 * 获取远程订阅并解析节点
 * @param {string} url 远程订阅 URL
 * @param {Function} parseNodesCommon 节点解析函数 (可以是 parser.js 的也可以是 parser-remote.js 的)
 * @returns {Promise<{nodes: Array, nodeLinks: string, subInfo: object}>}
 */
export const processRemoteSubscription = async (url, parseNodesCommon, ua) => {
    const { content, subInfo } = await fetchSubscription(url, ua);

    if (!content || content.trim().length === 0) {
        throw new Error('远程订阅返回内容为空');
    }

    // 解析节点
    const nodes = parseNodesCommon(content);

    if (nodes.length === 0) {
        throw new Error('未从远程订阅中解析到任何节点');
    }

    // 生成本地存储格式（标准节点链接，换行分隔）
    const nodeLinks = nodes.map(n => n.link || generateNodeLink(n)).join('\n');

    // 记录节点数量到 subInfo
    subInfo.nodeCount = nodes.length;

    return { nodes, nodeLinks, subInfo };
};
