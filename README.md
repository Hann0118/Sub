# ⚡ BiaoSUB

轻量级订阅聚合管理面板，基于 Cloudflare Pages + D1 数据库，零成本部署。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-orange.svg)

## ✨ 功能特性

- 🔗 **多协议支持** - VMess、VLESS、Trojan、Shadowsocks、Hysteria2、TUIC、AnyTLS
- 📦 **资源池管理** - 统一管理的节点组和独立节点
- 🔀 **聚合订阅** - 将多个资源组合成一个订阅链接
- ⚙️ **Clash 配置生成** - 自动生成策略组和分流规则
- 📝 **模板系统** - 保存和复用自定义配置模板
- 🌐 **托管模式** - 直接上传完整 YAML 配置
- 🔐 **密码保护** - 管理面板安全访问
- 💾 **数据备份** - 导出/导入配置数据

## 🚀 部署教程 (Cloudflare Pages)

### 前置要求

- GitHub 账号
- Cloudflare 账号

### 第一步：Fork 项目

1. 访问 [BiaoSUB GitHub 仓库](https://github.com/0xdabiaoge/Biao-Sub)
2. 点击右上角 **Fork** 按钮
3. 将项目 Fork 到自己的 GitHub 账号

### 第二步：创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单选择 **存储和数据库** → **D1 SQL 数据库**
3. 点击 **创建数据库**
4. 输入数据库名称（自定义名称即可）
5. 点击 **创建**

### 第三步：初始化数据库表

在 D1 数据库控制台中，进入 **控制台** 标签，执行以下 SQL 命令（直接复制粘贴执行即可）：

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source_url TEXT,
    type TEXT DEFAULT 'subscription',
    info TEXT,
    params TEXT DEFAULT '{}',
    status INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    config TEXT,
    clash_config TEXT,
    cached_yaml TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    status INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    header TEXT,
    groups TEXT,
    rules TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 第四步：创建 Pages 项目

1. 在左侧栏中，选择 **计算和AI**
2. 点击 **创建应用程序** → **点击底部的开始使用** → **导入现有 Git 存储库**
3. 选择 **GitHub**，授权并选择你 Fork 的 **Biao-Sub仓库** → **开始设置**
4. 配置构建设置：
   - **项目名称**：自定义输入
   - **生产分支**：`main`
   - **框架预设**：无
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist`
5. 点击 **保存并部署**

### 第五步：绑定 D1 数据库

1. 进入刚创建的 Pages 项目
2. 点击 **设置** → **绑定** → **添加**
3. 点击 **D1 数据库**：
   - **变量名称**：`DB`（必须是 `DB`，大写）
   - **D1 数据库**：选择之前创建的数据库
4. 点击 **保存**

### 第六步：配置环境变量

1. 在 Pages 项目中，点击 **设置** → **变量和机密**
2. 点击 **添加**：
   - **变量名称**：`ADMIN_PASSWORD`
   - **值**：设置你的管理密码
3. 点击 **保存**

### 第七步：重新部署

1. 进入 **部署** 标签页
2. 找到最新的部署，点击右侧 **...** → **重试部署**
3. 等待部署完成

### 第八步：访问面板

- 访问：`最新部署的：https://你的项目名.pages.dev`
- 输入管理密码登录

---

## 📖 使用说明

### 添加资源

1. 点击 **资源池** → **添加资源**
2. 类型选择：
   - **节点组** - 多个节点链接组合成一个节点组
   - **单独节点** - 单个或多个节点链接
3. 填写名称和链接，保存

### 创建聚合组

1. 点击 **聚合订阅组** → **新建聚合组**
2. 选择配置模板：
   - **默认模板** - 预置规则和策略组
   - **空白模板** - 完全自定义
   - **托管配置** - 上传完整 YAML
   - **我的模板** - 使用已保存的模板
3. 选择要包含的资源
4. 配置策略组和规则
5. 保存后复制订阅链接

### 订阅格式

- **Clash 格式**：`https://域名/api/g/TOKEN`
- **Base64 格式**：`https://域名/api/g/TOKEN?format=base64`

---

## 🛠️ 技术栈

- **前端**：Vue 3 + Tailwind CSS + DaisyUI
- **后端**：Cloudflare Pages Functions (Hono)
- **数据库**：Cloudflare D1 (SQLite)
- **拖拽排序**：SortableJS

---

## 🙏 结语

- 本项目完全由调教AI所得，并由CF部署驱动，可能会存在诸多深层次的BUG和问题没有被发现，仍需要时间去实际测试使用。欢迎Fork进行二次创造！
- **最后**，本项目需要对Clash Yaml配置文件有一定的熟悉了解，不太熟悉的话，配置起来会比较难以实行，建议多找AI沟通。


## 📝 更新日志

### 2026.02.04
- **彻底重构**：原始版本存在诸多问题，且代码间互联性太强，修改一个极容易导致其他功能受到影响，故此彻底重构拆分。
- **优化节点协议解析**：大部分常用的节点协议及类型均以支持，除部分冷门节点类型尚未支持解析，基本日常使用都能够应付。
- **拖拽排序再次优化**：目前拖拽排序功能基本完好，排序好的节点或者节点组，在yaml配置文件中也会跟随排序。

### 2026.02.06
- **新增节点订阅监控**：显示单独节点、节点组、聚合订阅、节点总数。
- **修复单独节点名称**：此前测试遗漏的BUG：单独节点更换节点链接后，没有同步节点链接的名称。目前已修复。
- **链式代理开关修复**：在已有订阅组的情况下，全选资源组会出现链式代理开关被重置，目前已修复，单独节点或者节点组开启链式代理开关会永久保存。

### 2026.02.07
- **优化Clash Verge导入速度**：目前采用yaml配置文件静态缓存生成模式，每次保存聚合订阅组后，后端会自动编译成一份完整的yaml配置文件存在数据库当中，旧的yaml配置文件会被新的自动替换掉。Clash Verge等软件导入订阅链接时，直接从数据库中拉取yaml配置文件，不再进行获取请求后再去编译，速度会快很多。
- **新增亮色主题**：面板右上角新增主题切换，支持亮色和深色主题切换。
- **面板再次优化**：优化了诸多方面，流畅性提高了，目前仍需进行更详细、更深度的测试使用，才能继续找出更多未解决和发现的问题。

### 2026.02.10
- **修复BUG**：修复了几个隐藏的BUG。
- **新增订阅使用统计**：订阅被成功拉取一次则计数+1并显示拉取时间。
- **新增远程订阅源导入**：新增导入订阅按钮，可导入机场订阅Url链接，由于项目是CF部署搭建，有一些机场订阅Url在获取的时候默认屏蔽了CF出站IP，需要在网页访问机场订阅Url获取Base64编码，复制后使用手动导入（弊端就是无法实时更新）。由于目前新增的远程订阅源导入属于实验性功能，可能会有远程订阅源节点获取不完整等情况出现。

### **2026.02.13（全面重构更新）**
- **全面重构**：由于之前的版本存在诸多不合理，且不利于后期维护及功能更新。目前重构版将诸多功能全部打碎成模块化，虽然说有时候会出现一些小卡顿（无伤大雅），总体上进化了蛮多的，便于后期维护和新功能开发。
- **新增手动 UA 选择**：远程订阅导入时可选客户端标识（Clash / v2rayNG / Meta），解决机场等远程订阅链接导入的UA识别问题。
- **部署建议**：由于重构了众多代码文件，需要部署的地方也增加了一些，如果不嫌麻烦的话，建议全部删除重新部署。如果不想重新部署的话，旧版本面板的资源和聚合订阅，全部删除后，查看本README中的：第三步：初始化数据库表和第四步：创建 Pages 项目，需要重新执行SQL命令和重新选择配置构建设置。