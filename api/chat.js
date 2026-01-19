// Vercel API Route for Chat
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 默认API配置
const DEFAULT_QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || 'qwen';
const ENABLE_API_KEY_INPUT = process.env.ENABLE_API_KEY_INPUT === 'true';

// 使用次数限制配置
const FREE_USAGE_LIMIT = 1;
const userUsageMap = new Map();

// API配置
const API_CONFIGS = {
    qwen: {
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        headers: (apiKey) => {
            const cleanApiKey = cleanAPIKey(apiKey);
            if (!cleanApiKey) {
                throw new Error('API密钥格式不正确');
            }
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cleanApiKey}`,
                'X-DashScope-SSE': 'disable'
            };
        },
        formatRequest: (message, options = {}) => ({
            model: options.model || 'qwen-turbo',
            input: {
                messages: [
                    {
                        role: 'system',
                        content: '你是JELILIAN AI助手，一个帮助用户构建网站、创作内容和解决问题的智能助手。请用中文回复。'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ]
            },
            parameters: {
                result_format: 'message',
                max_tokens: options.maxTokens || 1500,
                temperature: options.temperature || 0.8,
                top_p: 0.8
            }
        }),
        parseResponse: (data) => {
            if (data.output && data.output.choices && data.output.choices[0]) {
                return {
                    success: true,
                    text: data.output.choices[0].message.content,
                    tokens: data.usage ? data.usage.total_tokens : 0,
                    model: data.output.choices[0].message.role || 'qwen-turbo'
                };
            }
            throw new Error('Invalid response format');
        }
    }
};

// API密钥清理函数
function cleanAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return null;
    }
    
    let cleaned = apiKey.trim().replace(/\s+/g, '');
    
    if (!cleaned.startsWith('sk-')) {
        return null;
    }
    
    cleaned = cleaned.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    if (cleaned.length < 20 || cleaned.length > 200) {
        return null;
    }
    
    return cleaned;
}

// 使用次数检查
function checkUsageLimit(req) {
    const userIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const userKey = `${userIP}_${userAgent.substring(0, 50)}`;
    
    let userUsage = userUsageMap.get(userKey);
    
    if (!userUsage) {
        userUsage = {
            count: 0,
            firstUse: Date.now(),
            lastUse: Date.now()
        };
        userUsageMap.set(userKey, userUsage);
    }
    
    if (userUsage.count >= FREE_USAGE_LIMIT) {
        return {
            allowed: false,
            usageInfo: {
                used: userUsage.count,
                limit: FREE_USAGE_LIMIT,
                firstUse: new Date(userUsage.firstUse).toLocaleString('zh-CN'),
                lastUse: new Date(userUsage.lastUse).toLocaleString('zh-CN')
            }
        };
    }
    
    userUsage.count++;
    userUsage.lastUse = Date.now();
    userUsageMap.set(userKey, userUsage);
    
    return {
        allowed: true,
        userUsage: userUsage
    };
}

module.exports = async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        // 检查使用次数限制
        const usageCheck = checkUsageLimit(req);
        if (!usageCheck.allowed) {
            return res.status(429).json({
                success: false,
                error: '免费使用次数已用完',
                message: '您已使用完免费额度，请联系管理员获取更多使用次数',
                usageInfo: usageCheck.usageInfo,
                upgradeInfo: {
                    contact: '联系管理员获取付费版本',
                    features: ['无限制使用', '更快响应速度', '优先客服支持']
                }
            });
        }
        
        const { message, provider = DEFAULT_PROVIDER, apiKey, options = {} } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: '消息内容不能为空'
            });
        }
        
        // 使用默认API密钥或用户提供的密钥
        let finalApiKey = apiKey;
        if (!finalApiKey && DEFAULT_QWEN_API_KEY) {
            finalApiKey = DEFAULT_QWEN_API_KEY;
        }
        
        if (!finalApiKey) {
            return res.status(400).json({
                success: false,
                error: 'API密钥未配置，请联系管理员'
            });
        }
        
        const cleanApiKey = cleanAPIKey(finalApiKey);
        if (!cleanApiKey) {
            return res.status(400).json({
                success: false,
                error: 'API密钥格式不正确'
            });
        }
        
        if (!API_CONFIGS[provider]) {
            return res.status(400).json({
                success: false,
                error: `不支持的服务商: ${provider}`
            });
        }
        
        const config = API_CONFIGS[provider];
        const startTime = Date.now();
        
        // 发起API请求
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: config.headers(cleanApiKey),
            body: JSON.stringify(config.formatRequest(message, options))
        });
        
        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        if (!response.ok) {
            let errorMessage = data.message || data.error || `HTTP ${response.status}`;
            
            if (response.status === 401) {
                errorMessage = 'API密钥无效或已过期';
            } else if (response.status === 403) {
                errorMessage = 'API密钥权限不足或账户余额不足';
            } else if (response.status === 429) {
                errorMessage = 'API调用频率超限，请稍后重试';
            }
            
            return res.status(response.status).json({
                success: false,
                error: errorMessage,
                provider: provider,
                responseTime: responseTime
            });
        }
        
        const result = config.parseResponse(data);
        
        res.json({
            ...result,
            provider: provider,
            responseTime: responseTime,
            timestamp: new Date().toISOString(),
            usage: {
                used: usageCheck.userUsage.count,
                remaining: Math.max(0, FREE_USAGE_LIMIT - usageCheck.userUsage.count),
                limit: FREE_USAGE_LIMIT
            }
        });
        
    } catch (error) {
        console.error('API调用错误:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            provider: req.body?.provider || 'unknown'
        });
    }
};