import { deepBase64Decode, safeBase64Decode } from './utils.js';
import { generateNodeLink } from './generator.js';

// --- 远程订阅专用解析器 ---
// 智能识别 YAML, Base64, URI 列表等格式，并行解析取最优结果
export const parseRemoteContent = (text) => {
    let content = text || "";
    // 1. 深度 Base64 解码
    // 很多订阅是 Base64 编码的 URI 列表，或者 Base64 编码的 YAML
    const decoded = deepBase64Decode(content);

    // 简单的启发式检查：如果解码后的内容像是一个配置 (包含 :// 或 proxies: 或 name:)，则采纳解码内容
    if (decoded && decoded.length > 10 && (decoded.includes('://') || decoded.includes('proxies:') || decoded.includes('name:'))) {
        content = decoded;
    }

    // 2. 并行尝试多种解析策略
    const uriNodes = parseUriList(content);
    const yamlNodes = parseClashYaml(content);

    // 3. 决策逻辑
    // 如果解析出 YAML 节点且数量可观 (>= URI 节点)，优先使用 YAML
    // 因为 YAML 通常包含更多元数据 (如 UDP, TFO, 证书配置等) 且格式更标准
    if (yamlNodes.length > 0 && yamlNodes.length >= uriNodes.length) {
        return yamlNodes;
    }

    // 否则回退到 URI 解析结果
    // 注意：URI 解析器也能处理 V2RayN/Clash 混合的 base64 订阅
    if (uriNodes.length > 0) return uriNodes;

    // 兜底：如果 URI 解析为空，且 content 被 Base64 解码过
    // 尝试对原始文本进行 URI 解析 (防止 Base64 误判把文本搞乱了)
    if (content !== text) {
        const rawUriNodes = parseUriList(text);
        if (rawUriNodes.length > 0) return rawUriNodes;
    }

    return [];
};

// ==========================================
// 策略 A: URI 列表解析
// ==========================================
const parseUriList = (text) => {
    const nodes = [];
    const linkExtract = /(vmess|vless|ss|trojan|hysteria2|hysteria|hy2|hy|tuic|anytls):\/\/[^\s\n"']+/gi;

    const matches = text.match(linkExtract);
    if (!matches) return [];

    const linkSet = new Set();

    for (const link of matches) {
        if (linkSet.has(link)) continue;
        linkSet.add(link);
        try {
            const node = parseSingleUriNode(link);
            if (node) nodes.push(node);
        } catch (e) { }
    }
    return nodes;
};

// 单个 URI 解析 (逻辑复用并增强)
const parseSingleUriNode = (link) => {
    const trimLine = link.trim();
    let node = { origLink: trimLine, type: 'raw' };

    // VMess (Base64 JSON)
    if (trimLine.startsWith('vmess://')) {
        const b64 = trimLine.substring(8);
        try {
            const c = JSON.parse(safeBase64Decode(b64));
            node.name = c.ps; node.type = 'vmess';
            node.server = c.add; node.port = parseInt(c.port) || c.port; node.uuid = c.id;
            node.cipher = c.scy || "auto"; node.alterId = parseInt(c.aid) || 0;
            node.tls = c.tls === "tls" || c.tls === true;
            node.network = c.net || 'tcp';
            node.sni = c.sni || '';
            node['skip-cert-verify'] = c.insecure === '1' || c.insecure === 1 || c.insecure === true;
            if (c.net === 'ws' || node.network === 'ws') {
                node['ws-opts'] = { path: c.path || '/', headers: { Host: c.host || c.sni || '' } };
            }
            if (c.net === 'grpc') {
                node['grpc-opts'] = { 'grpc-service-name': c.path || '' };
            }
            node.link = generateNodeLink(node);
            return node;
        } catch (e) { return null; }
    }

    // URL Protocol
    try {
        const url = new URL(trimLine);
        node.name = decodeURIComponent(url.hash.substring(1) || 'Node');
        node.type = url.protocol.replace(':', '');
        if (node.type === 'hy2' || node.type === 'hy') node.type = 'hysteria2';

        node.server = url.hostname; node.port = parseInt(url.port) || 443;
        const params = url.searchParams;

        // 通用参数
        if (params.has('sni')) node.sni = params.get('sni');
        if (params.has('peer')) node.sni = params.get('peer'); // Troajn/VLESS 可能用 peer

        // TLS / Security
        if (params.has('security')) {
            const sec = params.get('security');
            node.tls = sec === 'tls' || sec === 'reality';
            if (sec === 'reality') node.realityEnabled = true;
        }

        // Network / Type
        if (params.has('type')) node.network = params.get('type');

        // Insecure
        if (params.has('insecure') || params.has('allowInsecure')) {
            node['skip-cert-verify'] = params.get('insecure') === '1' || params.get('allowInsecure') === '1';
        }

        // Fingerprint
        if (params.has('fp')) node['client-fingerprint'] = params.get('fp');
        if (params.has('alpn')) node.alpn = params.get('alpn');
        if (params.has('flow')) node.flow = params.get('flow');

        // Parameter Mapping
        if (params.has('pbk')) { node.reality = { publicKey: params.get('pbk'), shortId: params.get('sid') || '' }; node.tls = true; }

        // WS
        if (params.has('path')) {
            if (!node['ws-opts']) node['ws-opts'] = { headers: {} };
            node['ws-opts'].path = params.get('path');
        }
        if (params.has('host')) {
            if (!node['ws-opts']) node['ws-opts'] = { headers: {} };
            if (!node['ws-opts'].headers) node['ws-opts'].headers = {};
            node['ws-opts'].headers.Host = params.get('host');
        }

        // VLESS / Trojan Specifics
        if ((node.type === 'vless' || node.type === 'trojan') && (node.network === 'grpc' || params.has('serviceName'))) {
            node.network = 'grpc';
            node['grpc-opts'] = {
                'grpc-service-name': params.get('serviceName') || params.get('path') || '',
                'mode': params.get('mode') || 'gun'
            };
        }

        if (node.type === 'vless') {
            node.uuid = url.username;
            if (!node.network) node.network = 'tcp';
        }
        else if (node.type === 'trojan') {
            node.password = decodeURIComponent(url.username);
            if (!node.tls) node.tls = true;
        }
        else if (node.type === 'ss') {
            // 增强的 SS 解析，处理 base64 编码的 userInfo (SIP002)
            let rawUser = url.username;
            // 尝试检测是否 Base64 编码 (SIP002: ss://base64(method:password)@server:port)
            if (!rawUser.includes(':') && /^[A-Za-z0-9+/=]+$/.test(rawUser)) {
                try {
                    const decoded = safeBase64Decode(rawUser);
                    if (decoded.includes(':')) {
                        const idx = decoded.indexOf(':');
                        node.cipher = decoded.substring(0, idx);
                        node.password = decoded.substring(idx + 1);
                    } else {
                        node.password = rawUser; // Fallback
                    }
                } catch (e) { node.password = rawUser; }
            } else {
                // 明文 method:password
                node.password = decodeURIComponent(url.password || "");
                if (rawUser.includes(':')) {
                    const [m, ...p] = rawUser.split(':');
                    node.cipher = m;
                    // 如果 URL 解析把部分密码当成了 password 属性，这里需要拼回去？
                    // 通常 URL parser 会正确分割 username:password
                    node.password = p.join(':');
                    if (url.password) node.password += ":" + decodeURIComponent(url.password); // 极少见
                } else {
                    // 可能是 method 在 username, password 在 password
                    node.cipher = rawUser;
                }
            }
            // 最后检查：如果 password 依然包含 : 且没有 cipher，尝试分割
            if (!node.cipher && node.password && node.password.includes(':')) {
                const idx = node.password.indexOf(':');
                node.cipher = node.password.substring(0, idx);
                node.password = node.password.substring(idx + 1);
            }
        }
        else if (node.type === 'hysteria2') {
            node.password = decodeURIComponent(url.username);
            if (params.has('obfs')) node.obfs = params.get('obfs');
            if (params.has('obfs-password')) node['obfs-password'] = params.get('obfs-password');
        }
        else if (node.type === 'tuic') {
            if (url.username.includes(':')) {
                const [u, ...p] = url.username.split(':');
                node.uuid = u; node.password = p.join(':');
            } else {
                node.uuid = url.username; node.password = decodeURIComponent(url.password || '');
            }
            if (params.has('congestion_control')) node['congestion-controller'] = params.get('congestion_control');
            if (params.has('udp_relay_mode')) node['udp-relay-mode'] = params.get('udp_relay_mode');
        }
        else if (node.type === 'anytls') {
            node.password = decodeURIComponent(url.username);
            node.udp = true;
            if (!node['client-fingerprint']) node['client-fingerprint'] = 'chrome';
        }

        node.link = generateNodeLink(node);
        return node;
    } catch (e) { return null; }
};


// ==========================================
// 策略 B: Clash YAML 解析 (增强版)
// ==========================================
const parseClashYaml = (text) => {
    if (!text.includes('proxies:')) return [];

    const nodes = [];
    const lines = text.split(/\r?\n/);

    let inProxiesBlock = false;
    let currentBlock = [];
    let baseIndent = -1;

    // 辅助：处理单个节点块
    const processBlock = (blockLines) => {
        try {
            const raw = blockLines.join('\n');
            const get = (k) => {
                // 匹配 key: value，支持引号，忽略注释，排除逗号和右括号(用于 Flow 风格)
                const reg = new RegExp(`(?:^|\\s)${k}:\\s*(?:['"](.+?)['"]|([^\\s#,\\}\\]\\n]+))`);
                const m = raw.match(reg);
                return m ? (m[1] || m[2]) : undefined;
            };

            const type = get('type');
            if (!type || ['selector', 'url-test', 'fallback', 'direct', 'reject', 'load-balance', 'compatible'].includes(type)) return;

            // 提取基础字段
            const portStr = get('port');
            const port = portStr ? parseInt(portStr) : 0;

            const node = {
                name: get('name'), type,
                server: get('server'), port: port, // 确保端口是数字
                uuid: get('uuid'), cipher: get('cipher'), password: get('password'),
                udp: get('udp') === 'true', tls: get('tls') === 'true',
                'skip-cert-verify': get('skip-cert-verify') === 'true',
                sni: get('sni') || get('servername'),
                network: get('network'),
                'client-fingerprint': get('client-fingerprint') || get('fingerprint'),
                flow: get('flow')
            };

            // 补充字段 extraction
            if (node.network === 'ws' || raw.includes('ws-opts')) {
                node.network = 'ws';
                node['ws-opts'] = {
                    path: get('path') || '/',
                    headers: { Host: get('Host') || '' }
                };
            }
            if (raw.includes('grpc-opts')) {
                node.network = 'grpc';
                node['grpc-opts'] = {
                    'grpc-service-name': get('grpc-service-name') || '',
                    'mode': 'gun'
                };
            }
            if (raw.includes('reality-opts') || raw.includes('public-key')) {
                node.tls = true;
                node.realityEnabled = true;
                node.reality = { publicKey: get('public-key'), shortId: get('short-id') };
            }

            // Hysteria2
            if (type === 'hysteria2') {
                node.obfs = get('obfs');
                node['obfs-password'] = get('obfs-password');
            }

            if (node.server && node.port) {
                node.link = generateNodeLink(node);
                nodes.push(node);
            }
        } catch (e) { }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim() || line.trim().startsWith('#')) continue;

        if (line.includes('proxies:')) {
            inProxiesBlock = true;
            continue;
        }

        if (inProxiesBlock) {
            const currentIndent = line.search(/\S/);
            // 遇到新块开始 (- name: ...)
            if (line.trim().startsWith('-')) {
                if (currentBlock.length > 0) processBlock(currentBlock);
                currentBlock = [line];
                baseIndent = currentIndent;
            }
            // 块内容 (缩进必须大于 baseIndent)
            else if (currentBlock.length > 0 && currentIndent > baseIndent) {
                currentBlock.push(line);
            }
            // 缩进回退，意味着 block 结束或 proxies 结束
            else if (currentIndent <= baseIndent && baseIndent !== -1) {
                inProxiesBlock = false;
                if (currentBlock.length > 0) processBlock(currentBlock);
                currentBlock = [];
                baseIndent = -1;
            }
        }
    }
    // 处理最后一个块
    if (currentBlock.length > 0) processBlock(currentBlock);

    return nodes;
};
