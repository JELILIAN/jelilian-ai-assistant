// Vercel API Route for Config
const DEFAULT_QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || 'qwen';
const ENABLE_API_KEY_INPUT = process.env.ENABLE_API_KEY_INPUT === 'true';
const FREE_USAGE_LIMIT = 1;

// 用户使用状态存储
const userUsageMap = new Map();

function getUserUsageStatus(req) {
    const userIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const userKey = `${userIP}_${userAgent.substring(0, 50)}`;
    
    const userUsage = userUsageMap.get(userKey);
    
    if (!userUsage) {
        return {
            used: 0,
            remaining: FREE_USAGE_LIMIT,
            limit: FREE_USAGE_LIMIT,
            isNewUser: true
        };
    }
    
    return {
        used: userUsage.count,
        remaining: Math.max(0, FREE_USAGE_LIMIT - userUsage.count),
        limit: FREE_USAGE_LIMIT,
        firstUse: new Date(userUsage.firstUse).toLocaleString('zh-CN'),
        lastUse: new Date(userUsage.lastUse).toLocaleString('zh-CN'),
        isNewUser: false
    };
}

module.exports = async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    const usageStatus = getUserUsageStatus(req);
    
    res.json({
        success: true,
        config: {
            enableApiKeyInput: ENABLE_API_KEY_INPUT,
            defaultProvider: DEFAULT_PROVIDER,
            hasDefaultApiKey: !!DEFAULT_QWEN_API_KEY,
            supportedProviders: ['qwen'],
            freeUsageLimit: FREE_USAGE_LIMIT
        },
        usage: usageStatus
    });
};