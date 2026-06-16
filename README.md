# AI Hair Stylist Pro

AI 虚拟换发型 Web 应用 — AR 面部追踪 + 3D 发型叠加 + AI 照片换发

## 启动

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 生产构建
```

## 测试

```bash
npm test        # vitest 单元测试
npm run lint    # TypeScript 类型检查
```

## 技术栈

- React 19 + Vite 6 + Tailwind v4 + motion
- MindAR v1.2.5（MediaPipe 面部追踪 + Three.js 渲染）
- 百度文心一言 / 阿里通义万相 / FAL AI 换发 API

## 已知问题

### esbuild 高严重性漏洞（GHSA-gv7w-rqvm-qjhr）
- **影响**: esbuild 0.17.0-0.28.0 在 Deno 模块中缺少二进制完整性校验，可通过 NPM_CONFIG_REGISTRY 实现 RCE
- **当前状态**: esbuild 是 vite 的间接依赖，修复需 `npm audit fix --force` 升级 vite 到 8.x（breaking change），暂未修复
- **缓解措施**: 确保 CI/CD 中 NPM_CONFIG_REGISTRY 指向受控的 registry
- **计划**: 下次升级 vite 大版本时自动修复
