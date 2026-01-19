# 🔧 快速修复 - Vercel运行时错误

## ❌ 错误信息
`Function Runtimes must have a valid version, for example 'now-php@1.0.0'.`

## 🎯 问题原因
vercel.json中的运行时版本格式不正确

## ✅ 修复方案

### 方法1: 使用简化配置 (推荐)

将 `vercel.json` 内容替换为：

```json
{
  "name": "jelilian-ai-2025",
  "env": {
    "QWEN_API_KEY": "sk-bddda4e9e2ef4aa5acdb773207ac4036",
    "DEFAULT_PROVIDER": "qwen",
    "ENABLE_API_KEY_INPUT": "false",
    "NODE_ENV": "production"
  }
}
```

### 方法2: 删除vercel.json文件

完全删除 `vercel.json` 文件，让Vercel使用默认配置。

## 🚀 重新部署步骤

### 在Vercel控制台中：

1. **访问**: https://vercel.com/dashboard
2. **找到项目**: `jelilian-ai-2025` 或 `jelilian-smart-ai`
3. **Settings** → **Environment Variables**
4. **手动添加环境变量**:
   - `QWEN_API_KEY` = `sk-bddda4e9e2ef4aa5acdb773207ac4036`
   - `DEFAULT_PROVIDER` = `qwen`
   - `ENABLE_API_KEY_INPUT` = `false`
   - `NODE_ENV` = `production`
5. **Deployments** → **Redeploy**

### 或者重新导入：

1. **删除当前项目** (如果存在)
2. **访问**: https://vercel.com/new
3. **导入**: `JELILIAN/jelilian-ai-assistant`
4. **项目名**: `jelilian-ai-2025-fixed`
5. **环境变量**: 手动添加上述变量
6. **Deploy**

## 🔍 为什么这样修复？

- **简化配置**: 移除了复杂的函数配置
- **默认运行时**: 让Vercel自动选择合适的Node.js版本
- **环境变量**: 保持API密钥等重要配置
- **避免版本冲突**: 不指定具体的运行时版本

## 📊 预期结果

修复后应该：
- ✅ 部署成功，无运行时错误
- ✅ API路由自动识别 (`/api/chat.js`, `/api/config.js`, `/api/usage.js`)
- ✅ 环境变量正确加载
- ✅ AI功能正常工作

---

**🎯 推荐使用方法1，在Vercel控制台中手动设置环境变量并重新部署！**