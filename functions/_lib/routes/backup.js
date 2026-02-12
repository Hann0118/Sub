export function registerBackupRoutes(app) {
    // 导出备份
    app.get('/backup', async (c) => {
        try {
            const subs = (await c.env.DB.prepare("SELECT * FROM subscriptions").all()).results;
            const groups = (await c.env.DB.prepare("SELECT * FROM groups").all()).results;
            const templates = (await c.env.DB.prepare("SELECT * FROM templates").all()).results;

            return c.json({
                success: true,
                data: {
                    items: subs.map(s => { try { s.info = JSON.parse(s.info); } catch (e) { s.info = {}; } return s; }),
                    groups: groups.map(g => {
                        try {
                            g.config = JSON.parse(g.config || '[]');
                            g.clash_config = JSON.parse(g.clash_config || '{}');
                        } catch (e) {
                            g.config = []; g.clash_config = {};
                        }
                        return g;
                    }),
                    templates: templates.map(t => {
                        try {
                            t.groups = JSON.parse(t.groups || '[]');
                        } catch (e) {
                            t.groups = [];
                        }
                        return t;
                    })
                }
            });
        } catch (e) { return c.json({ success: false, error: e.message }) }
    })

    // 恢复备份
    app.post('/restore', async (c) => {
        const { items, groups, templates } = await c.req.json();
        try {
            const batch = [];
            if (items && Array.isArray(items)) {
                const s = c.env.DB.prepare("INSERT INTO subscriptions (name, url, source_url, type, info, params, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                items.forEach(i => batch.push(s.bind(i.name, i.url, i.source_url || null, i.type || 'subscription', JSON.stringify(i.info || {}), JSON.stringify(i.params || {}), i.status ?? 1, i.sort_order ?? 0)));
            }
            if (groups && Array.isArray(groups)) {
                const s = c.env.DB.prepare("INSERT INTO groups (name, token, config, clash_config, cached_yaml, access_count, last_accessed, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                groups.forEach(g => batch.push(s.bind(g.name, g.token, JSON.stringify(g.config || []), JSON.stringify(g.clash_config || {}), g.cached_yaml || null, g.access_count || 0, g.last_accessed || null, g.status ?? 1, g.sort_order ?? 0)));
            }
            if (templates && Array.isArray(templates)) {
                const s = c.env.DB.prepare("INSERT INTO templates (name, header, groups, rules) VALUES (?, ?, ?, ?)");
                templates.forEach(t => batch.push(s.bind(t.name, t.header || '', JSON.stringify(t.groups || []), t.rules || '')));
            }

            if (batch.length > 0) await c.env.DB.batch(batch);
            return c.json({ success: true });
        } catch (e) { return c.json({ success: false, error: e.message }) }
    })
}
