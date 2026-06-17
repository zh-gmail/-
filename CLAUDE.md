# AI Hair Stylist Pro — 项目规则与全局状态

---

## 一、项目概览

AI 虚拟换发型 Web 应用，核心功能链：AR 实时面部追踪 + 3D 发型叠加 + AI 照片换发 + 手势交互。

| 维度 | 状态 |
|------|------|
| UI 框架 | React 19 + Vite 6 + Tailwind v4 + motion |
| 状态管理 | React Context + localStorage 持久化 |
| 语言 | 全界面中文 |
| 包管理 | npm, 依赖已安装 |
| 构建 | `npm run build` 成功 |
| AR 引擎 | MindAR v1.2.5（开源，MediaPipe 面部追踪 + Three.js 渲染） |
| 版本控制 | 无 git 仓库 |

---

## 二、功能模块状态

### ✅ 已完成
- **AR 实时试戴 (LiveCamera)**: MindAR 面部追踪 + Three.js 渲染，摄像头管理，发型切换（GLB）
- **AI 照片换发 (PhotoEdit)**: 百度文心一言 API + 阿里通义万相 API，无 Key 降级
- **发型素材提取 (Extraction)**: 上传提取 + 保存到素材库
- **素材库 (Library)**: 网格展示、搜索过滤、跳转试戴、IndexedDB 持久化
- **设置页面**: API Key 管理、服务商切换、测试连接
- **发型库侧边栏**: 可折叠左侧栏 (104px)，点击切换预览

### ⚠️ 已实现但有缺口
- **3D 发型 GLB 文件**: Blender 发片（hair cards）方式生成，覆盖头顶+后脑+刘海（~11-14KB/个），支持发色调整
- **发色实时调整**: `arEngine.ts` 中 `setHairColor()` 已实现 + UI 颜色选择器（8 色预设）
- **AR 截图保存**: `takeScreenshot()` 已实现 + UI 截图按钮

### ❌ 已删除
- **DeepAR SDK**: 已全部迁移到 MindAR + Three.js 开源方案
- **语音控制**: 全部删除 (Web Speech API + useVoiceControl hook)，无残留
- **手势控制**: 全部删除 (MediaPipe HandLandmarker + useHandTracking hook)，无残留

---

## 三、架构与关键文件

```
App (AppProvider)
├── LiveCamera          ← AR/发型库
│   └── useAREngine     → arEngine.ts (MindAR + Three.js)
├── PhotoEdit           ← AI 换发
│   └── imageGenClient  → baiduProvider | aliProvider | falProvider
├── Extraction          ← AI 提取
│   └── imageGenClient  → baiduProvider | aliProvider
├── Library             ← 素材库 (IndexedDB)
├── Settings            ← 配置 (API Key 管理)
└── Navigation          ← 底部 5 Tab 导航
```

### 关键文件说明

| 文件 | 行数 | 用途 |
|------|------|------|
| src/services/arEngine.ts | 252 | MindAR + Three.js 引擎 (MindAREngine) |
| src/vendor/mindar-face-three.js | 150 | MindARThree 类（已打补丁：z-index、StrictMode 安全、错误传递） |
| src/hooks/useAREngine.ts | 117 | AR 引擎 React hook |
| src/components/tabs/LiveCamera.tsx | ~197 | 摄像头主界面 |
| src/store/AppContext.tsx | 103 | 全局状态 |
| src/data/hairstyleAssets.ts | 45 | 发型资产注册表（GLB 模型） |
| src/services/imageGenClient.ts | 58 | AI 图像客户端 |
| src/services/providers/baiduProvider.ts | 126 | 百度 API |
| src/services/providers/aliProvider.ts | 128 | 阿里 API |

### 架构关键决策
1. **arEngine.ts 非单例**: `useAREngine` 每次创建新 `MindAREngine` 实例，StrictMode 通过局部变量 `containerEl` 竞争条件销毁/初始化
2. **条件渲染**: `{activeTab === 'live' && <LiveCamera />}` — Tab 切换组件卸载/重建
3. **渲染循环**: `requestAnimationFrame` 手动驱动 Three.js 渲染（MindAR 不自渲染）
4. **透明叠加**: `renderer.setClearAlpha(0)` + 视频 `z-index:0` / 画布 `z-index:1` 实现摄像头画面 + 3D 叠加
5. **imageGenClient 单例**: 运行时切换百度/阿里/FAL Provider
6. **IndexedDB 素材库**: `libraryDB.ts` 封装 IndexedDB 操作，替代 localStorage 5MB 限制
7. **Chunk 分包**: `vite.config.ts` 中手动将 three、mindar、mediapipe 拆分为独立 chunk

---

## 四、待办事项 (按优先级)

### P0 — 核心体验补完
- [x] **生成真实发型 GLB 文件** — Three.js LatheGeometry 程序化生成 3 个发型模型（short/long/bob），double-layer + 发束细节 + PBR 材质
- [x] **调整模型 scale/position** — 每发型独立 scale/position 配置，anchor 10 额头顶点对齐
- [x] **index.html:6**: 标题 "My Google AI Studio App" → "AI Hair Stylist Pro"

### P1 — AR 试戴增强
- [x] **发色调整 UI**: LiveCamera 中加颜色选择器，调用 `useAREngine.setHairColor()`
- [x] **AR 截图按钮**: 调用 `useAREngine.takeScreenshot()`

### P2 — 质量提升
- [ ] **验证百度/阿里 API 身份保持效果** — 竞品 ai-hairstyle 的核心卖点
- [ ] **考虑 FAL AI / Runway API 作为补充**

### P3 — 技术债务
- [x] **素材库 IndexedDB**: `libraryDB.ts` 封装，替代 localStorage 5MB 限制
- [x] **默认 SDK Key 移入 .env**: 已从 AppContext.tsx 中提取
- [x] **git init**: 已初始化并做初始提交
- [ ] **测试**: Vitest + Testing Library
- [ ] **noUnusedLocals / noUnusedParameters 编译检查**: tsconfig 已配，需修复类型错误
- [ ] **npm install 同步 lockfile**: 清理已移除的依赖

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
1. 不要自作主张降级技术方案（如 3D → 2D），技术选型必须回溯原始需求
2. 不要擅自添加用户明确删除过的功能 -- 自动化流程必须首先读取 CLAUDE.md 验证任务是否与项目方向一致
3. 自动化发现的"改进点"需要人工确认后再执行，不能自己决定加功能
4. MindAR 视频默认 z-index:-2 会被容器背景遮挡，需同步修复视频 z-index 和 Three.js 画布 z-index 堆叠

---

## 七、记忆管理

Memory 文件位于 `C:\Users\Admin\.claude\projects\d--------\memory\`，包含：
- `project_ai_hair_stylist.md` — 项目背景
- `deepar_auth_code.md` — DeepAR SDK 授权码

更新 memory 时需同步 MEMORY.md 索引。

---

## 八、参考资源

### 关键文档
- [PLAN.md](./PLAN.md) — 详细项目状态报告
- [NEXT.md](./NEXT.md) — 后续计划
- [RESEARCH.md](./RESEARCH.md) — 行业调研

### 竞争项目
- HairFastGAN — NeurIPS 2024 发型迁移
- ai-hairstyle (Hairroom) — Cloudflare Serverless AI 换发，最接近的商业对标
- Runway Hair Makeover Demo — Runway API 演示
- Barber AI — 理发店 B 端方案
- StyleBlend — 脸型推荐 + 发型匹配

### MindAR / Three.js 资源
- MindAR GitHub: https://github.com/hiukim/mind-ar-js
- Three.js r184: https://threejs.org/
- GLB 发型模型: Sketchfab / CGTrader 搜索 "hair glb"
- 3D 模型生成: Tripo AI (https://www.tripo3d.ai/)
