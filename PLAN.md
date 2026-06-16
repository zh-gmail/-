# AI Hair Stylist Pro — 项目现状报告

> 生成日期: 2026-06-11
> 用途: 当前项目完整状态快照，供后续开发参考

---

## 一、项目概览

AI 虚拟换发型 Web 应用，核心功能链：**AR 实时面部追踪 + 3D 发型叠加 + AI 照片换发 + 手势交互**。

| 维度 | 状态 |
|------|------|
| UI 框架 | ✅ React 19 + Vite 6 + Tailwind v4 + motion |
| 状态管理 | ✅ React Context + localStorage 持久化 |
| 语言 | 全界面中文 |
| 包管理 | npm, 依赖已安装 |
| 构建 | `npm run build` 成功, `dist/` 存在 |
| AR 引擎 | **MindAR** v1.2.5（开源 MediaPipe 面部追踪 + Three.js 渲染） |
| 版本控制 | ❌ 无 git 仓库(建议初始化) |

---

## 二、功能模块详细状态

### 2.1 AR 实时试戴 (LiveCamera) — ✅ MindAR 引擎运行正常

**2026-06-11：从 DeepAR SDK 迁移到 MindAR（开源）+ Three.js**

| 子功能 | 状态 | 说明 |
|--------|------|------|
| 面部追踪 | ✅ 完成 | MindAR (MediaPipe FaceLandmarker)，200ms 轮询检测 |
| 3D 渲染 | ✅ 完成 | Three.js r184，requestAnimationFrame 渲染循环 |
| 发型切换 | ✅ 完成 | GLTFLoader 加载 .glb 模型到面部锚点 (anchor 10) |
| 发色调整 | ✅ 完成 | setHairColor() 遍历 mesh 修改 material.color |
| 错误处理 | ✅ 完成 | 设备占用/权限拒绝/超时 三类中文错误提示 |
| 摄像头管理 | ✅ 完成 | MindAR 内置，含 getUserMedia 异常处理 |
| 发型库侧边栏 | ✅ 完成 | 可折叠，点击切换发型 |
| 手势识别 | ✅ 完成 | MediaPipe HandLandmarker，滑动切换发型 |

**已解决的关键 Bug：**

| Bug | 根因 | 修复 |
|-----|------|------|
| 初始化崩溃 `appendChild of null` | StrictMode destroy() 在 async init 中途 null 掉 container | 局部变量暂存 containerEl |
| 全黑画面（面部检测正常） | 视频 z-index:-2 被容器 bg-black 遮挡；Three.js 未渲染 | z-index 修复(0/1) + render loop + clearAlpha(0) |
| "未知错误"无信息 | MindAR `t()` 不带错误参数 reject | 传入 DOMException + 错误提取容错 |
| 页面残留多个 video/canvas | StrictMode 双挂载 destroy() 时 null 访问 | stop() 增加 null 安全检查 |
| 视频未填满容器 | _resize() 时序不稳定 | 显式调用 _resize() |

**剩余缺口：**
- **GLB 发型模型文件** — 当前 3 个测试模型为简单 box 几何体，需替换为真实 3D 发型
- **发色调色板 UI** — 颜色选择器未接入
- **AR 截图按钮** — `takeScreenshot()` 已实现，缺 UI

### 2.2 AI 照片换发 (PhotoEdit) — ✅ 已实现

| 子功能 | 状态 | 说明 |
|--------|------|------|
| 上传照片 + 预览 | ✅ 完成 | |
| 百度文心一言 API | ✅ 完成 | baiduProvider.ts (分析 + 文生图) |
| 阿里通义万相 API | ✅ 完成 | aliProvider.ts (VL 分析 + 异步生成) |
| 多结果展示 | ✅ 完成 | 2/3/4 列网格 |
| 保存到素材库 | ✅ 完成 | Bookmark 按钮调用 addToLibrary |
| 无 Key 降级 | ✅ 完成 | setTimeout + 硬编码 Unsplash 占位图 |

### 2.3 发型素材提取 (Extraction) — ✅ 已实现

| 子功能 | 状态 | 说明 |
|--------|------|------|
| 上传 + 预览 | ✅ 完成 | 双栏布局 |
| AI 提取流程 | ✅ 完成 | 与 PhotoEdit 共享 imageGenClient |
| 保存到素材库 | ✅ 完成 | 可自定义颜色名称 |

### 2.4 素材库 (Library) — ✅ 已实现

| 子功能 | 状态 | 说明 |
|--------|------|------|
| 网格展示 | ✅ 完成 | 含缩略图、名称、色点、类型标签 |
| 搜索过滤 | ✅ 完成 | `filteredLibrary` 按 name/colorName/type 过滤 |
| 点击"前往试戴" | ✅ 完成 | 跳转 LiveCamera |
| 持久化 | ⚠️ localStorage | 刷新不丢，但大量数据建议 IndexedDB |

### 2.5 手势识别 — ✅ 已实现

| 子功能 | 状态 | 说明 |
|--------|------|------|
| MediaPipe HandLandmarker | ✅ 完成 | 食指指尖追踪 + 滑动窗口速度检测 |
| 灵敏度阈值 | ✅ 已调优 | VELOCITY=0.45, DISPLACEMENT=0.1, MAX_VELOCITY=5.0 |
| 350ms 防抖 | ✅ 完成 | |
| 跨 tab 持久化 | ✅ 完成 | AppContext + localStorage |
| 键盘降级 | ✅ 完成 | MediaPipe 初始化失败时降级到 ArrowUp/Down |
| 清理逻辑 | ✅ 完成 | 停止帧循环、关闭模型、停止摄像头 |

### 2.6 设置页面 — ✅ 已实现

| 子功能 | 状态 | 说明 |
|--------|------|------|
| API Key 输入 | ✅ 完成 | 密码框 + 状态徽章 |
| 图像 API Key/Secret 输入 | ✅ 完成 | 百度和阿里切换 |
| 服务商切换 | ✅ 完成 | 按钮组 |
| 测试连接 | ✅ 完成 | 调用 imageGenClient.testConnection() |
| 自动保存 | ✅ 完成 | localStorage |

### 2.7 语音控制 — ❌ 已删除

语音控制模块 (Web Speech API + useVoiceControl hook) 已全部删除，无残留。

---

## 三、架构说明

```
App (AppProvider)
├── LiveCamera          ← AR/手势/发型库
│   ├── useAREngine     → arEngine.ts (MindAR + Three.js)
│   └── useHandTracking → @mediapipe/tasks-vision
├── PhotoEdit           ← AI 换发
│   └── imageGenClient  → baiduProvider | aliProvider
├── Extraction          ← AI 提取
│   └── imageGenClient  → baiduProvider | aliProvider
├── Library             ← 素材库
├── Settings            ← 配置
└── Navigation          ← 底部 5 Tab 导航
```

**数据流**:
- `AppContext` (Context + localStorage): settings, library, isHandTracking
- `arEngine.ts`: 每次 useAREngine 创建新 MindAREngine 实例（非单例）
- `imageGenClient` 单例: 运行时切换百度/阿里 Provider

**AR 管道**:
```
摄像头 → MindAR (MediaPipe face tracking) → 面部 anchor 矩阵更新
                                             → Three.js 渲染循环 (scene → camera → renderer)
                                             → clearAlpha(0) 透明背景，摄像头画面透过显示
```

**关键文件行数**:

| 文件 | 行数 | 用途 |
|------|------|------|
| src/services/arEngine.ts | 252 | MindAR + Three.js 引擎实现 |
| src/vendor/mindar-face-three.js | 150 | MindARThree 类（已打补丁） |
| src/hooks/useHandTracking.ts | 221 | MediaPipe 手势追踪 |
| src/hooks/useAREngine.ts | 117 | AR 引擎 React hook |
| src/components/tabs/LiveCamera.tsx | ~197 | 摄像头主界面 |
| src/store/AppContext.tsx | 103 | 全局状态 |
| src/data/hairstyleAssets.ts | 45 | 发型资产注册表 |
| src/services/imageGenClient.ts | 58 | AI 图像客户端 |
| src/services/providers/baiduProvider.ts | 126 | 百度 API |
| src/services/providers/aliProvider.ts | 128 | 阿里 API |

---

## 四、3D 发型资产

引擎已从 DeepAR SDK 迁移到 **MindAR（开源） + Three.js**，3D 模型格式为 **GLB**。

**当前发型资产**（`src/data/hairstyleAssets.ts`）：
| 发型 | 文件 | 状态 |
|------|------|------|
| 清爽短发 | `/assets/hairstyles/short-hair.glb` | ⚠️ 测试用 box 几何体 |
| 复古羊毛卷 | `/assets/hairstyles/long-hair.glb` | ⚠️ 测试用 box 几何体 |
| 硬汉寸头 | `/assets/hairstyles/bob-hair.glb` | ⚠️ 测试用 box 几何体 |
| 气质法式波波头 | `/assets/hairstyles/bob-hair.glb` | ⚠️ 测试用 box 几何体 |

**获取真实 GLB 发型的途径：**

| 方案 | 成本 | 说明 |
|------|------|------|
| Sketchfab / CGTrader 购买 | 付费 | 搜索 "hair glb" 或 "hairstyle 3d model" |
| Tripo AI 生成 | 免费/付费 | Tripo 生成 glTF → Blender 优化 |
| Blender 自制 | 免费 | 需 3D 建模技能 |
| Ready Player Me | 免费 | 支持发型导出 |

**模型放置路径**: `public/assets/hairstyles/` → 构建后复制到 `dist/assets/hairstyles/`

---

## 五、次要问题清单

| 问题 | 位置 | 影响 | 建议 |
|------|------|------|------|
| 页面标题未改 | index.html:6 | 低 | "My Google AI Studio App" → "AI Hair Stylist Pro" |
| 发色调整无 UI | LiveCamera.tsx | 中 | 接入颜色选择器 |
| AR 截图无按钮 | LiveCamera.tsx | 低 | 接入 takeScreenshot() |
| 3D 发型模型 | data/hairstyleAssets.ts | 高 | 替换 test box 为真实发型 |
| 无 git 仓库 | 根目录 | 低 | `git init` 保护代码 |

---

## 六、后续开发建议

### 短期
1. **替换 GLB 发型模型** — 获取真实 3D 发型文件放入 `public/assets/hairstyles/`
2. **调整模型 scale/position** — 根据真实模型大小和位置微调（arEngine.ts 中 scale/position 参数）
3. **发色调色板 UI** — 添加颜色选择器
4. **AR 截图按钮** — 接入 takeScreenshot()
5. **git init** — 初始化版本控制

### 中期
1. **素材库 IndexedDB** — 替代 localStorage
2. **更多手势指令** — 左右滑动、手掌等
3. **模型 LOD / 压缩** — gLTF transform / draco 压缩

### 长期
1. **测试** — Vitest + Testing Library
2. **Docker 部署** — 多阶段构建
3. **CI/CD** — GitHub Actions

---

## 七、技术债务

| 债务 | 位置 | 说明 |
|------|------|------|
| 发型索引取模映射 | LiveCamera.tsx | 库数量与发型资产数量可能不一致 |
| 默认 API Key 明文硬编码 | AppContext.tsx | 应移入 .env |
| HandTracking 键盘降级用全局变量 | useHandTracking.ts | `window.__handKeyboardCleanup` |
| ColorHex 使用 RGBA | Extraction.tsx | 类型标注为 hex 但实际存 rgba() |
| MindAR 内部强依赖 landmark 10 | arEngine.ts | 额头锚点，不同脸型可能需调整 |
| render loop 无帧率限制 | arEngine.ts | requestAnimationFrame 全速运行，低端设备可能过热 |
