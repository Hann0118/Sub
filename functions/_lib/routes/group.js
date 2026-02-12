import { generateToken } from '../utils.js';
import { assembleGroupConfig } from '../generator.js';
import { parseNodesCommon } from '../parser.js';

export function registerGroupRoutes(app) {
    // 获取所有聚合组
    app.get('/groups', async (c) => {
        const { results } = await c.env.DB.prepare("SELECT * FROM groups ORDER BY sort_order ASC, id DESC").all();

        const { results: allSubs } = await c.env.DB.prepare("SELECT id FROM subscriptions").all();
        const validIds = new Set(allSubs.map(s => s.id));

        const cleanupUpdates = [];

        const data = results.map(g => {
            const config = JSON.parse(g.config || '[]');
            const clashConfig = g.clash_config ? JSON.parse(g.clash_config) : { mode: 'generate', header: "", groups: [], rules: "", resources: [], raw_yaml: "" };

            const cleanedConfig = config.filter(c => validIds.has(c.subId));
            if (clashConfig.resources) {
                clashConfig.resources = clashConfig.resources.filter(r => validIds.has(r.subId));
            }

            if (cleanedConfig.length !== config.length) {
                cleanupUpdates.push(
                    c.env.DB.prepare("UPDATE groups SET config = ?, clash_config = ? WHERE id = ?")
                        .bind(JSON.stringify(cleanedConfig), JSON.stringify(clashConfig), g.id)
                );
            }

            return { ...g, config: cleanedConfig, clash_config: clashConfig };
        });

        if (cleanupUpdates.length > 0) {
            c.executionCtx.waitUntil(c.env.DB.batch(cleanupUpdates));
        }

        return c.json({ success: true, data });
    })

    // 新建聚合组
    app.post('/groups', async (c) => {
        const b = await c.req.json();
        const token = generateToken();
        const clashConfig = b.clash_config || { mode: 'generate', header: "", groups: [], rules: "", resources: [], raw_yaml: "" };

        await c.env.DB.prepare("INSERT INTO groups (name, token, config, clash_config, status, sort_order) VALUES (?, ?, ?, ?, 1, 0)")
            .bind(b.name, token, JSON.stringify(b.config || []), JSON.stringify(clashConfig)).run();

        const yaml = await assembleGroupConfig(c.env.DB, token, parseNodesCommon);
        if (yaml) {
            await c.env.DB.prepare("UPDATE groups SET cached_yaml = ? WHERE token = ?").bind(yaml, token).run();
        }

        return c.json({ success: true })
    })

    // 更新聚合组
    app.put('/groups/:id', async (c) => {
        const b = await c.req.json(); const id = c.req.param('id');
        let parts = ["updated_at=CURRENT_TIMESTAMP"]; let args = [];

        if (b.name !== undefined) { parts.push("name=?"); args.push(b.name) }
        if (b.config !== undefined) { parts.push("config=?"); args.push(JSON.stringify(b.config)) }
        if (b.clash_config !== undefined) { parts.push("clash_config=?"); args.push(JSON.stringify(b.clash_config)) }
        if (b.status !== undefined) { parts.push("status=?"); args.push(parseInt(b.status)) }

        let newToken = null;
        if (b.refresh_token) {
            newToken = generateToken();
            parts.push("token=?"); args.push(newToken);
        }

        const shouldRefreshCache = b.config !== undefined || b.clash_config !== undefined || b.refresh_token;

        const query = `UPDATE groups SET ${parts.join(', ')} WHERE id=?`; args.push(id);
        await c.env.DB.prepare(query).bind(...args).run();

        if (shouldRefreshCache) {
            const group = await c.env.DB.prepare("SELECT token FROM groups WHERE id = ?").bind(id).first();
            if (group) {
                const yaml = await assembleGroupConfig(c.env.DB, group.token, parseNodesCommon);
                if (yaml) {
                    await c.env.DB.prepare("UPDATE groups SET cached_yaml = ? WHERE id = ?").bind(yaml, id).run();
                }
            }
        }

        return c.json({ success: true })
    })

    // 删除聚合组
    app.delete('/groups/:id', async (c) => {
        await c.env.DB.prepare("DELETE FROM groups WHERE id=?").bind(c.req.param('id')).run();
        return c.json({ success: true });
    })

    // 聚合组排序
    app.post('/groups/reorder', async (c) => {
        const { order } = await c.req.json();
        if (!order || !Array.isArray(order)) return c.json({ success: false, error: 'Invalid order' });
        const stmt = c.env.DB.prepare("UPDATE groups SET sort_order=? WHERE id=?");
        await c.env.DB.batch(order.map((id, idx) => stmt.bind(idx, id)));
        return c.json({ success: true });
    })
}
