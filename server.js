// JELILIAN 后端服务器 - Node.js + Express
const express = require('express');
const cors = require('cors');
const path = require('path');

// 动态导入 node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// 生产环境配置
if (process.env.NODE_ENV === 'production') {
    // 信任代理
    app.set('trust proxy', 1);
}

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.static('.')); // 提供静态文件服务

// API配置
const API_CONFIGS = {
    qwen: {
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        headers: (apiKey) => {
            // 清理API密钥，移除非法字符
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
    },
    
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        headers: (apiKey) => {
            // 清理API密钥，移除非法字符
            const cleanApiKey = cleanAPIKey(apiKey);
            if (!cleanApiKey) {
                throw new Error('API密钥格式不正确');
            }
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cleanApiKey}`
            };
        },
        formatRequest: (message, options = {}) => ({
            model: options.model || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are JELILIAN AI assistant, helping users build websites, create content, and solve problems. Please respond in Chinese.'
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            max_tokens: options.maxTokens || 1500,
            temperature: options.temperature || 0.7
        }),
        parseResponse: (data) => {
            if (data.choices && data.choices[0]) {
                return {
                    success: true,
                    text: data.choices[0].message.content,
                    tokens: data.usage ? data.usage.total_tokens : 0,
                    model: data.model
                };
            }
            throw new Error('Invalid response format');
        }
    }
};

// 路由：首页 - 直接显示主应用
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public-client.html'));
});

// 路由：AI聊天接口
app.post('/api/chat', async (req, res) => {
    try {
        const { message, provider = 'qwen', apiKey, options = {} } = req.body;
        
        // 验证必要参数
        if (!message) {
            return res.status(400).json({
                success: false,
                error: '消息内容不能为空'
            });
        }
        
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API密钥不能为空'
            });
        }
        
        // 清理和验证API密钥
        const cleanApiKey = cleanAPIKey(apiKey);
        if (!cleanApiKey) {
            return res.status(400).json({
                success: false,
                error: 'API密钥格式不正确'
            });
        }
        
        // 检查支持的服务商
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
        
        // 处理API错误
        if (!response.ok) {
            let errorMessage = data.message || data.error || `HTTP ${response.status}`;
            
            // 特定错误处理
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
                responseTime: responseTime,
                debug: {
                    status: response.status,
                    statusText: response.statusText,
                    apiKeyLength: cleanApiKey.length,
                    apiKeyPrefix: cleanApiKey.substring(0, 8) + '...'
                }
            });
        }
        
        // 解析成功响应
        const result = config.parseResponse(data);
        
        res.json({
            ...result,
            provider: provider,
            responseTime: responseTime,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('API调用错误:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            provider: req.body.provider || 'unknown',
            debug: {
                errorType: error.constructor.name,
                stack: error.stack.split('\n')[0]
            }
        });
    }
});

// API密钥清理函数
function cleanAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return null;
    }
    
    // 移除前后空格和换行符
    let cleaned = apiKey.trim().replace(/\s+/g, '');
    
    // 检查基本格式
    if (!cleaned.startsWith('sk-')) {
        return null;
    }
    
    // 只移除明显的非法字符，保留API密钥可能包含的所有合法字符
    // API密钥通常包含: 字母、数字、连字符、下划线
    cleaned = cleaned.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    // 验证长度
    if (cleaned.length < 20 || cleaned.length > 200) {
        return null;
    }
    
    return cleaned;
}

// 路由：测试API连接
app.post('/api/test', async (req, res) => {
    try {
        const { provider = 'qwen', apiKey } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API密钥不能为空'
            });
        }
        
        // 清理和验证API密钥
        const cleanApiKey = cleanAPIKey(apiKey);
        if (!cleanApiKey) {
            return res.status(400).json({
                success: false,
                error: 'API密钥格式不正确，应该以"sk-"开头',
                debug: {
                    originalLength: apiKey.length,
                    startsWithSk: apiKey.startsWith('sk-'),
                    hasInvalidChars: /[^\w\-\.]/.test(apiKey)
                }
            });
        }
        
        // 发送简单的测试消息
        const testMessage = provider === 'qwen' ? '你好' : 'Hello';
        
        const chatResponse = await fetch(`http://localhost:${PORT}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: testMessage,
                provider: provider,
                apiKey: cleanApiKey,
                options: { maxTokens: 50 }
            })
        });
        
        const result = await chatResponse.json();
        
        if (result.success) {
            res.json({
                success: true,
                message: '连接测试成功',
                provider: provider,
                responseTime: result.responseTime,
                testResponse: result.text.substring(0, 100) + '...',
                apiKeyStatus: {
                    length: cleanApiKey.length,
                    prefix: cleanApiKey.substring(0, 8) + '...',
                    isValid: true
                }
            });
        } else {
            res.status(400).json(result);
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            debug: {
                errorType: error.constructor.name
            }
        });
    }
});

// 路由：获取支持的AI服务商
app.get('/api/providers', (req, res) => {
    const providers = Object.keys(API_CONFIGS).map(key => ({
        id: key,
        name: key === 'qwen' ? '阿里千问' : key === 'openai' ? 'OpenAI' : key,
        description: key === 'qwen' ? '阿里云大模型，中文理解优秀' : 
                    key === 'openai' ? 'OpenAI GPT模型，功能强大' : '其他AI服务商'
    }));
    
    res.json({
        success: true,
        providers: providers
    });
});

// 路由：批量对比不同AI的响应
app.post('/api/compare', async (req, res) => {
    try {
        const { message, providers = ['qwen'], apiKeys = {} } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: '消息内容不能为空'
            });
        }
        
        const results = {};
        
        // 并行调用多个AI服务商
        const promises = providers.map(async (provider) => {
            const apiKey = apiKeys[provider];
            if (!apiKey) {
                return { provider, error: 'API密钥缺失' };
            }
            
            try {
                const response = await fetch(`http://localhost:${PORT}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        provider: provider,
                        apiKey: apiKey
                    })
                });
                
                const result = await response.json();
                return { provider, ...result };
                
            } catch (error) {
                return { provider, success: false, error: error.message };
            }
        });
        
        const responses = await Promise.all(promises);
        
        // 整理结果
        responses.forEach(response => {
            results[response.provider] = response;
        });
        
        res.json({
            success: true,
            message: message,
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JELILIAN 服务器已启动`);
    console.log(`📍 本地地址: http://localhost:${PORT}`);
    console.log(`🔧 API端点: http://localhost:${PORT}/api/chat`);
    console.log(`📚 支持的服务商: ${Object.keys(API_CONFIGS).join(', ')}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;