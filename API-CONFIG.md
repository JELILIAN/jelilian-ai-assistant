# JELILIAN AI API配置说明

## 🔑 阿里千问API密钥配置

### 1. 获取API密钥
1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 登录你的阿里云账号
3. 进入"API-KEY管理"页面
4. 创建新的API密钥，复制密钥值

### 2. 配置服务器
编辑 `.env` 文件，将你的API密钥填入：

```env
# 将下面的 your_qwen_api_key_here 替换为你的真实API密钥
QWEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_PROVIDER=qwen
ENABLE_API_KEY_INPUT=false
```

### 3. 重启服务器
```bash
npm install  # 安装新依赖
npm start    # 重启服务器
```

## 🌐 网站访问权限说明

### 本地访问 (http://localhost:3000)
- **仅限本机访问**: 只有你的电脑可以访问
- **局域网访问**: 同一WiFi下的设备可以通过你的IP访问
- **外网无法访问**: 互联网用户无法直接访问

### 公网访问选项

#### 选项1: Vercel部署 (推荐)
- **全球访问**: 任何人都可以访问
- **免费**: Vercel提供免费托管
- **域名**: https://jelilian-ai.vercel.app
- **自动部署**: GitHub更新后自动部署

#### 选项2: 内网穿透工具
使用ngrok等工具临时开放访问：
```bash
# 安装ngrok
npm install -g ngrok

# 开放3000端口
ngrok http 3000
```

#### 选项3: 云服务器部署
- 阿里云ECS
- 腾讯云CVM  
- AWS EC2

## 🔒 安全建议

### API密钥安全
- ✅ 使用环境变量存储API密钥
- ✅ 不要将API密钥提交到GitHub
- ✅ 定期更换API密钥
- ❌ 不要在前端代码中硬编码API密钥

### 访问控制
- 考虑添加用户认证
- 设置API调用频率限制
- 监控API使用量和费用

## 📊 当前配置状态

运行测试查看当前配置：
- 访问: http://localhost:3000/final-test.html
- 检查API配置是否正确
- 验证所有功能是否正常

## 🆘 常见问题

### Q: API密钥无效
A: 检查密钥格式，确保以"sk-"开头

### Q: 网站无法访问
A: 确保服务器正在运行，检查端口3000是否被占用

### Q: AI回复失败
A: 检查API密钥余额，确保网络连接正常

---
*配置完成后，用户访问网站时将自动使用你配置的API密钥，无需再次输入*