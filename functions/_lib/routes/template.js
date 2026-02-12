export function registerTemplateRoutes(app) {
    // 获取模板列表
    app.get('/templates', async (c) => {
        try {
            await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                header TEXT,
                groups TEXT,
                rules TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`).run();
            const { results } = await c.env.DB.prepare("SELECT * FROM templates ORDER BY id DESC").all();
            return c.json({
                success: true, data: results.map(t => ({
                    ...t,
                    groups: t.groups ? JSON.parse(t.groups) : []
                }))
            });
        } catch (e) { return c.json({ success: false, error: e.message }) }
    })

    // 新增模板
    app.post('/templates', async (c) => {
        const b = await c.req.json();
        await c.env.DB.prepare("INSERT INTO templates (name, header, groups, rules) VALUES (?, ?, ?, ?)")
            .bind(b.name, b.header || '', JSON.stringify(b.groups || []), b.rules || '').run();
        return c.json({ success: true });
    })

    // 更新模板
    app.put('/templates/:id', async (c) => {
        const b = await c.req.json(); const id = c.req.param('id');
        await c.env.DB.prepare("UPDATE templates SET name=?, header=?, groups=?, rules=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(b.name, b.header || '', JSON.stringify(b.groups || []), b.rules || '', id).run();
        return c.json({ success: true });
    })

    // 删除模板
    app.delete('/templates/:id', async (c) => {
        await c.env.DB.prepare("DELETE FROM templates WHERE id=?").bind(c.req.param('id')).run();
        return c.json({ success: true })
    })
}
