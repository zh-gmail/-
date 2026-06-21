# AI Hair Stylist Pro — 项目规则与全局状态

---

## 一、项目概览

AI 虚拟换发型 Web 应用，核心功能：**上传照片 → AI 换发**。

| 维度 | 状态 |
|------|------|
| UI 框架 | React 19 + Vite 6 + Tailwind v4 |
| 状态管理 | React Context + localStorage 持久化 |
| 语言 | 全界面中文 |
| 包管理 | npm, 依赖已安装 |
| 构建 | `npm run build` 成功 |

---

## 二、功能模块状态

### ✅ 已完成
- **AI 照片换发 (PhotoEdit)**: 上传正脸照片 → AI 识别人脸与原生发型区域 → 生成适配脸型的发型和发色（支持百度文心一言、阿里通义万相、FAL AI 三个 Provider）
- **发型素材提取 (Extraction)**: 上传照片 → AI 提取人物发型 → 调整发色/细节 → 保存到素材库
- **素材库 (Library)**: 网格展示、搜索过滤、IndexedDB 持久化
- **设置页面**: API Key 管理、服务商切换、测试连接
- **无 Key 降级**: 未配置 API Key 时展示占位示意合成图

### ⚠️ 已知缺口
- API Key 需用户在设置页手动配置，.env 默认空
- 各 Provider 的身份保持效果（identity preservation）未经过端到端验证

### ❌ 已删除
- **语音控制、手势控制**: 全部删除

---

## 三、架构与关键文件

```
App (AppProvider)
├── PhotoEdit           ← AI 换发（核心）
│   └── imageGenClient  → baiduProvider | aliProvider | falProvider
├── Extraction          ← AI 提取
│   └── imageGenClient  → baiduProvider | aliProvider
├── Library             ← 素材库 (IndexedDB)
├── Settings            ← 配置 (API Key 管理)
└── Navigation          ← 底部 4 Tab 导航
```

### 关键文件说明

| 文件 | 行数 | 用途 |
|------|------|------|
| src/services/imageGenClient.ts | ~58 | AI 图像客户端（Provider 路由） |
| src/services/providers/baiduProvider.ts | ~130 | 百度 ERNIE Vision + SDXL 换发 |
| src/services/providers/aliProvider.ts | ~130 | 阿里通义万相换发 |
| src/services/providers/falProvider.ts | ~70 | FAL AI (Flux) 换发 |
| src/components/tabs/PhotoEdit.tsx | ~280 | 核心页面：上传 → 换发 → 保存 |
| src/store/AppContext.tsx | ~160 | 全局状态 + IndexedDB 素材库 |

### 架构关键决策
1. **imageGenClient 单例**: 运行时切换百度/阿里/FAL Provider
2. **IndexedDB 素材库**: `libraryDB.ts` 封装 IndexedDB 操作
3. **条件渲染**: `{activeTab === 'photo' && <PhotoEdit />}` — Tab 切换组件卸载/重建
4. **无 Key 降级**: 未配置 API Key 时，2s 延迟后显示占位图（示意效果，非真实生成）

---

## 四、待办事项 (按优先级)

### P0 — 核心体验优化
- [ ] **before/after 对比滑块** — 生成结果后支持滑动对比原图与效果图
- [ ] **文本提示词输入** — 生成前用户可输入自定义发型描述
- [ ] **脸型分析推荐** — 利用 VLM 分析脸型，推荐适配发型

### P1 — 功能增强
- [ ] **身份保持效果验证** — 各 Provider 端到端验证
- [ ] **单张结果重试** — 对某张结果"再来一张类似的"
- [ ] **结果对比页** — 多张结果 grid 对比/收藏/删除

### P2 — 技术债务
- [ ] **测试覆盖** — 补充 Vitest 集成测试
- [ ] **noUnusedLocals / noUnusedParameters 编译检查**: tsconfig 已配，需修复类型错误

---

## 五、上下文管理

- **70% 压缩规则**: 上下文窗口使用率达到 70% 时，执行 `/compact` 压缩，避免接近上限时丢失信息。
- 压缩后不要追问用户"是否继续"，直接恢复工作状态。
- 当前对话的完整历史记录在 `C:\Users\Admin\.claude\projects\d--------\1d551821-fcc8-4a2e-92c2-abcc5f611443.jsonl`

---

## 六、行为准则

### 代码修改
- **简单优先**: 不添加过度抽象，三行重复优于工厂模式
- **精准修改**: 只改请求范围，不碰相邻代码
- **避免范围蔓延**: 不"顺手"重构未请求的代码
- **无注释原则**: 代码自解释，不为 WHAT 写注释；仅在 WHY 不显然时写一行短注释

### 交互方式
- **回复简洁**: 用户偏好简短直接的回答，不要总结性段落
- **探索先行**: 探索性需求先给选项 → 用户选再深入，不直接进 Plan Mode
- **先分析后实现**: 修 bug / 技术选型先给 2-3 方案 + 优缺点对比
- **任务切换果断**: 用户换方向时快速跟进，不追问前序任务中断原因

### 已知教训 (避免重复)
1. 不要擅自添加用户明确删除过的功能 -- 自动化流程必须首先读取 CLAUDE.md 验证任务是否与项目方向一致
2. 自动化发现的"改进点"需要人工确认后再执行，不能自己决定加功能

---

## 七、记忆管理

Memory 文件位于 `C:\Users\Admin\.claude\projects\d--------\memory\`，包含：
- `project_ai_hair_stylist.md` — 项目背景

更新 memory 时需同步 MEMORY.md 索引。

---

## 八、参考资源

### 竞争项目
- HairFastGAN — NeurIPS 2024 发型迁移
- ai-hairstyle (Hairroom) — Cloudflare Serverless AI 换发，最接近的商业对标
- Runway Hair Makeover Demo — Runway API 演示
- Barber AI — 理发店 B 端方案
- StyleBlend — 脸型推荐 + 发型匹配
