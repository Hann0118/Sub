export function registerAuthRoutes(app) {
    app.post('/login', async (c) => {
        const { password } = await c.req.json();
        return c.json({ success: password === c.env.ADMIN_PASSWORD })
    })
}
