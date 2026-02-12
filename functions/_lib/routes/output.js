import { safeBase64Encode } from '../utils.js';
import { generateNodeLink, assembleGroupConfig } from '../generator.js';
import { parseNodesCommon } from '../parser.js';

export function registerOutputRoutes(app) {
    app.get('/g/:token', async (c) => {
        const token = c.req.param('token');
        const format = c.req.query('format') || 'base64';

        try {
            const group = await c.env.DB.prepare("SELECT name, cached_yaml, clash_config, config FROM groups WHERE token = ? AND status = 1").bind(token).first();
            if (!group) return c.text('Invalid Group Token', 404);

            c.executionCtx.waitUntil(
                c.env.DB.prepare("UPDATE groups SET access_count = COALESCE(access_count, 0) + 1, last_accessed = datetime('now') WHERE token = ?")
                    .bind(token).run()
            );

            const filename = encodeURIComponent(group.name || 'GroupConfig');
            c.header('Content-Disposition', `attachment; filename*=UTF-8''${filename}.yaml; filename="${filename}.yaml"`);
            c.header('Subscription-Userinfo', 'upload=0; download=0; total=1073741824000000; expire=0');

            let yamlContent = "";

            if (format === 'clash' && group.cached_yaml) {
                return c.text(group.cached_yaml, 200, { 'Content-Type': 'text/yaml; charset=utf-8' });
            }

            yamlContent = await assembleGroupConfig(c.env.DB, token, parseNodesCommon);
            if (yamlContent === null) return c.text('Generate Failed', 500);

            if (format === 'clash') {
                await c.env.DB.prepare("UPDATE groups SET cached_yaml = ? WHERE token = ?").bind(yamlContent, token).run();
                return c.text(yamlContent, 200, { 'Content-Type': 'text/yaml; charset=utf-8' });
            }

            // Base64 输出
            const clashConfig = group.clash_config ? JSON.parse(group.clash_config) : { mode: 'generate' };
            let targetConfig = JSON.parse(group.config || '[]');
            if (clashConfig.resources && clashConfig.resources.length > 0) targetConfig = clashConfig.resources;

            let allLinks = [];
            for (const item of targetConfig) {
                const sub = await c.env.DB.prepare("SELECT url FROM subscriptions WHERE id = ?").bind(item.subId).first();
                if (sub && sub.url) {
                    const nodes = parseNodesCommon(sub.url);
                    nodes.forEach(n => allLinks.push(generateNodeLink(n)));
                }
            }
            return c.text(safeBase64Encode(allLinks.join('\n')), 200, { 'Content-Type': 'text/plain; charset=utf-8' });

        } catch (e) { return c.text(e.message, 500); }
    })
}
