# AI Hair Stylist Pro

> AI 虚拟换装工作室 — 上传照片，AI 为你换发型、试妆容、搭穿搭

## 功能

- **智能变换** — 上传正脸照片，AI 自动识别人脸与原生区域，生成适配的：
  - 发型 + 发色
  - 妆容
  - 穿搭
- **素材提取** — 上传参考图，AI 提取发型/妆容/穿搭进入个人素材库
- **素材库** — 网格展示、搜索过滤、按品类/性别筛选
- **多 Provider** — 支持阿里通义万相、百度文心一言、FAL AI
- **对比滑块** — 生成结果后滑动对比原图与效果图
- **无 Key 降级** — 未配置 API Key 时自动使用示意效果展示

## 启动

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 生产构建
```

## 配置

1. 打开设置页
2. 填入阿里云通义万相（DASHSCOPE）API Key
3. 点击测试连接验证

或创建 `.env` 文件：

```env
VITE_DASHSCOPE_API_KEY=your_key_here
```

## 技术栈

- React 19 + Vite 6 + Tailwind v4 + daisyUI 5
- 后端：Hono + TypeScript（Node.js）
- AI: 阿里通义万相 qwen-image-2.0-pro / 百度 ERNIE-Vision / FAL AI
