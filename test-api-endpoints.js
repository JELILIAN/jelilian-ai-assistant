// Node.js脚本测试API端点
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://jelilian-smart-ai.vercel.app';

async function testAPI() {
    console.log('🔍 开始测试 JELILIAN AI API...\n');
    
    // 1. 测试API配置
    console.log('1️⃣ 测试 /api/config');
    try {
        const response = await fetch(`${BASE_URL}/api/config`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ API配置测试成功');
            console.log('📊 配置信息:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ API配置测试失败');
            console.log('状态码:', response.status);
            console.log('错误信息:', data);
        }
    } catch (error) {
        console.log('❌ API配置请求失败:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. 测试使用状态
    console.log('2️⃣ 测试 /api/usage');
    try {
        const response = await fetch(`${BASE_URL}/api/usage`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 使用状态测试成功');
            console.log('📊 使用信息:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ 使用状态测试失败');
            console.log('状态码:', response.status);
            console.log('错误信息:', data);
        }
    } catch (error) {
        console.log('❌ 使用状态请求失败:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. 测试AI聊天
    console.log('3️⃣ 测试 /api/chat');
    try {
        const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: '你好，请简单介绍一下自己',
                provider: 'qwen',
                options: { maxTokens: 200 }
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ AI聊天测试成功');
            console.log('🤖 AI回复:', data.text);
            console.log('⏱️ 响应时间:', data.responseTime + 'ms');
            console.log('📊 使用情况:', data.usage);
        } else {
            console.log('❌ AI聊天测试失败');
            console.log('状态码:', response.status);
            console.log('错误信息:', data.error || '未知错误');
            console.log('完整响应:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.log('❌ AI聊天请求失败:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🏁 测试完成！');
}

// 运行测试
testAPI().catch(console.error);