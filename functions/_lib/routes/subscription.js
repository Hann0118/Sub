import { parseNodesCommon } from '../parser.js';
import { assembleGroupConfig } from '../generator.js';

// 辅助函数：刷新包含指定资源ID的聚合组缓存，并清理已删除资源的引用
export const refreshGroupCacheByResourceIds = async (db, resourceIds) => {
    try {
        const idSet = new Set(resourceIds.map(id => String(id)));
        const allGroups = await db.prepare("SELECT id, token, config, clash_config FROM groups WHERE status = 1").all();
        const batchUpdates = [];

        for (const g of allGroups.results) {
            const config = JSON.parse(g.config || '[]');
            const clashConfig = g.clash_config ? JSON.parse(g.clash_config) : {};
            const resources = clashConfig.resources || [];

            const isAffected = config.some(c => idSet.has(String(c.subId))) ||
                resources.some(r => idSet.has(String(r.subId)));

            if (isAffected) {
                const newConfig = config.filter(c => !idSet.has(String(c.subId)));
                if (clashConfig.resources) {
                    clashConfig.resources = resources.filter(r => !idSet.has(String(r.subId)));
                }
                const newYaml = await assembleGroupConfig(db, g.token, parseNodesCommon);
                batchUpdates.push(
                    db.prepare("UPDATE groups SET config = ?, clash_config = ?, cached_yaml = ? WHERE id = ?")
                        .bind(JSON.stringify(newConfig), JSON.stringify(clashConfig), newYaml || '', g.id)
                );
            }
        }

        const BATCH_SIZE = 50;
        for (let i = 0; i < batchUpdates.length; i += BATCH_SIZE) {
            const chunk = batchUpdates.slice(i, i + BATCH_SIZE);
            await db.batch(chunk);
        }
    } catch (e) {
        console.error('Refresh group cache failed:', e.message);
    }
};

export function registerSubRoutes(app) {
    // 获取所有资源
    app.get('/subs', async (c) => {
        const { results } = await c.env.DB.prepare("SELECT * FROM subscriptions ORDER BY sort_order ASC, id DESC").all();
        return c.json({ success: true, data: results.map(i => { try { i.info = JSON.parse(i.info); } catch (e) { i.info = {}; } return i; }) })
    })

    // 新增资源
    app.post('/subs', async (c) => {
        const b = await c.req.json();
        const type = b.type || 'sub';
        const content = b.url || "";
        const nodes = parseNodesCommon(content);

        if (type === 'node' && nodes.length > 1) {
            const stmt = c.env.DB.prepare("INSERT INTO subscriptions (name,url,type,params,info,sort_order,status) VALUES (?,?,?,?,?,0,1)");
            const batch = nodes.map((n, i) => {
                let name = b.name ? ((i === 0 && nodes.length === 1) ? b.name : `${b.name} ${i + 1}`) : n.name;
                let url = n.link;
                let info = JSON.stringify({ nodeCount: 1 });
                return stmt.bind(name, url, 'node', JSON.stringify({}), info);
            });
            await c.env.DB.batch(batch);
            return c.json({ success: true, count: nodes.length });
        }

        let info = b.info || {};
        info.nodeCount = nodes.length;
        const sortOrder = (type === 'node') ? 0 : 9999;
        await c.env.DB.prepare("INSERT INTO subscriptions (name,url,type,params,info,sort_order,status) VALUES (?,?,?,?,?,?,1)")
            .bind(b.name || (nodes.length > 0 ? nodes[0].name : 'New Resource'), b.url, type, JSON.stringify({}), JSON.stringify(info), sortOrder).run();
        return c.json({ success: true });
    })

    // 更新资源
    app.put('/subs/:id', async (c) => {
        const b = await c.req.json(); const id = c.req.param('id');

        if (b.url !== undefined) {
            const nodes = parseNodesCommon(b.url);
            if (!b.info) b.info = {};
            b.info.nodeCount = nodes.length;
        }

        let parts = ["updated_at=CURRENT_TIMESTAMP"]; let args = [];
        if (b.name !== undefined) { parts.push("name=?"); args.push(b.name) } if (b.url !== undefined) { parts.push("url=?"); args.push(b.url) }
        if (b.type !== undefined) { parts.push("type=?"); args.push(b.type) } if (b.status !== undefined) { parts.push("status=?"); args.push(parseInt(b.status)) }
        if (b.info) { parts.push("info=?"); args.push(JSON.stringify(b.info)) }
        const query = `UPDATE subscriptions SET ${parts.join(', ')} WHERE id=?`; args.push(id);
        await c.env.DB.prepare(query).bind(...args).run();

        try {
            const affectedGroups = await c.env.DB.prepare("SELECT id, token FROM groups").all();
            const batchUpdates = [];
            for (const g of affectedGroups.results) {
                const fullGroup = await c.env.DB.prepare("SELECT config, clash_config FROM groups WHERE id = ?").bind(g.id).first();
                const config = JSON.parse(fullGroup.config || '[]');
                const clashConfig = fullGroup.clash_config ? JSON.parse(fullGroup.clash_config) : {};
                const resources = clashConfig.resources || [];
                const isUsed = config.some(c => c.subId == id) || resources.some(r => r.subId == id);
                if (isUsed) {
                    const newYaml = await assembleGroupConfig(c.env.DB, g.token, parseNodesCommon);
                    if (newYaml) {
                        batchUpdates.push(c.env.DB.prepare("UPDATE groups SET cached_yaml = ? WHERE id = ?").bind(newYaml, g.id));
                    }
                }
            }
            if (batchUpdates.length > 0) await c.env.DB.batch(batchUpdates);
        } catch (e) { console.error('Refresh related groups failed:', e.message); }

        return c.json({ success: true })
    })

    // 删除资源
    app.delete('/subs/:id', async (c) => {
        const id = c.req.param('id');
        await c.env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(id).run();
        await refreshGroupCacheByResourceIds(c.env.DB, [id]);
        return c.json({ success: true });
    })

    // 批量删除
    app.post('/subs/delete', async (c) => {
        const { ids } = await c.req.json();
        if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ success: true });
        const BATCH_SIZE = 50;
        const stmt = c.env.DB.prepare("DELETE FROM subscriptions WHERE id = ?");
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const chunk = ids.slice(i, i + BATCH_SIZE);
            await c.env.DB.batch(chunk.map(id => stmt.bind(id)));
        }
        await refreshGroupCacheByResourceIds(c.env.DB, ids);
        return c.json({ success: true });
    })

    // 排序
    app.post('/sort', async (c) => { const { ids } = await c.req.json(); const s = c.env.DB.prepare("UPDATE subscriptions SET sort_order=? WHERE id=?"); await c.env.DB.batch(ids.map((id, i) => s.bind(i, id))); return c.json({ success: true }) })
    app.post('/subs/reorder', async (c) => { const { order } = await c.req.json(); const s = c.env.DB.prepare("UPDATE subscriptions SET sort_order=? WHERE id=?"); await c.env.DB.batch(order.map((id, i) => s.bind(i, id))); return c.json({ success: true }) })

    // 检查节点
    app.post('/check', async (c) => {
        const { url, type } = await c.req.json();
        try {
            let content = url || "";
            const nodes = parseNodesCommon(content);
            return c.json({ success: true, data: { valid: true, nodeCount: nodes.length, nodes } });
        } catch (e) { return c.json({ success: false, error: e.message }) }
    })
}
