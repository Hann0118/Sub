import { parseRemoteContent } from '../parser-remote.js';
import { processRemoteSubscription } from '../fetcher.js';
import { refreshGroupCacheByResourceIds } from './subscription.js';

export function registerRemoteRoutes(app) {
    // 导入远程订阅
    app.post('/remote', async (c) => {
        const b = await c.req.json();
        const sourceUrl = b.url;
        const name = b.name || '';
        const ua = b.ua || 'clash-verge/v1.7.7'; // 获取 UA，默认为 Clash

        if (!sourceUrl) return c.json({ success: false, error: '请输入订阅链接' }, 400);

        try {
            // 使用自定义 UA 和增强版解析器
            const { nodes, nodeLinks, subInfo } = await processRemoteSubscription(sourceUrl, parseRemoteContent, ua);
            const finalName = name || subInfo.fileName || `远程订阅 (${nodes.length}个节点)`;

            await c.env.DB.prepare(
                "INSERT INTO subscriptions (name, url, source_url, type, params, info, sort_order, status) VALUES (?,?,?,?,?,?,9999,1)"
            ).bind(
                finalName, nodeLinks, sourceUrl, 'remote',
                JSON.stringify({ ua }), // 持久化保存 UA，供后续刷新使用
                JSON.stringify(subInfo)
            ).run();

            return c.json({ success: true, data: { name: finalName, nodeCount: nodes.length, subInfo } });
        } catch (e) {
            return c.json({ success: false, error: e.message }, 500);
        }
    })

    // 刷新远程订阅
    app.post('/remote/refresh/:id', async (c) => {
        const id = c.req.param('id');

        try {
            const sub = await c.env.DB.prepare("SELECT * FROM subscriptions WHERE id = ? AND type = 'remote'").bind(id).first();
            if (!sub) return c.json({ success: false, error: '资源不存在或不是远程订阅类型' }, 404);

            // 读取保存的 UA
            let params = {};
            try { params = JSON.parse(sub.params || '{}'); } catch (e) { }
            const ua = params.ua || 'clash-verge/v1.7.7';

            // 使用保存的 UA 刷新
            const { nodes, nodeLinks, subInfo } = await processRemoteSubscription(sub.source_url, parseRemoteContent, ua);

            await c.env.DB.prepare(
                "UPDATE subscriptions SET url = ?, info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).bind(nodeLinks, JSON.stringify(subInfo), id).run();

            await refreshGroupCacheByResourceIds(c.env.DB, [id]);

            return c.json({ success: true, data: { nodeCount: nodes.length, subInfo } });
        } catch (e) {
            return c.json({ success: false, error: e.message }, 500);
        }
    })
}
