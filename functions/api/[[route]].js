import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/cloudflare-pages'

import { registerSubRoutes } from '../_lib/routes/subscription.js'
import { registerGroupRoutes } from '../_lib/routes/group.js'
import { registerOutputRoutes } from '../_lib/routes/output.js'
import { registerRemoteRoutes } from '../_lib/routes/remote.js'
import { registerTemplateRoutes } from '../_lib/routes/template.js'
import { registerAuthRoutes } from '../_lib/routes/auth.js'
import { registerBackupRoutes } from '../_lib/routes/backup.js'

const app = new Hono().basePath('/api')

// --- 表结构迁移（只执行一次）---
let migrationDone = false;
app.use('/*', async (c, next) => {
    if (!migrationDone) {
        const migrations = [
            `ALTER TABLE groups ADD COLUMN cached_yaml TEXT`,
            `ALTER TABLE groups ADD COLUMN access_count INTEGER DEFAULT 0`,
            `ALTER TABLE groups ADD COLUMN last_accessed TEXT`,
            `ALTER TABLE subscriptions ADD COLUMN source_url TEXT`,
            `ALTER TABLE subscriptions ADD COLUMN params TEXT DEFAULT '{}'`
        ];
        for (const sql of migrations) {
            try { await c.env.DB.prepare(sql).run(); } catch (e) { /* 字段已存在则忽略 */ }
        }
        migrationDone = true;
    }
    await next();
})

app.use('/*', cors())

// --- 鉴权中间件 ---
app.use('/*', async (c, next) => {
    const path = c.req.path
    if (path.endsWith('/login') || path.includes('/g/')) return await next()
    const authHeader = c.req.header('Authorization')
    if (authHeader !== c.env.ADMIN_PASSWORD) return c.json({ success: false, error: 'Unauthorized' }, 401)
    await next()
})
app.onError((err, c) => c.json({ error: err.message }, 500))

// --- 注册路由模块 ---
registerOutputRoutes(app)
registerSubRoutes(app)
registerGroupRoutes(app)
registerRemoteRoutes(app)
registerTemplateRoutes(app)
registerAuthRoutes(app)
registerBackupRoutes(app)

export const onRequest = handle(app)
