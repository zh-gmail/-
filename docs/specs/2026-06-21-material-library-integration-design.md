# 素材库与照片变换/提取集成设计

## 概述

将本地素材库与 TransformPage（照片变换）和 ExtractPage（素材提取）打通，让素材库成为所有 AI 变换操作的视觉参考源，同时完善素材提取的自动化流程。

---

## 一、类型改动 (types.ts)

### HairstyleItem 增加 gender 字段

```ts
interface HairstyleItem {
  id: string;
  name: string;
  category: AssetCategory;
  type: string;
  colorName: string;
  colorHex: string;
  description: string;
  previewUrl: string;
  createdAt: number;
  gender: 'male' | 'female' | 'unisex';  // 新增
}
```

### HairstyleGenOptions 增加 referenceImageUrl 字段

```ts
interface HairstyleGenOptions {
  customPrompt?: string;
  existingAnalysis?: string;
  hairstyleColor?: string;
  hairstyleColorHex?: string;
  category?: AnalysisCategory;
  recommendations?: StyleRecommendation[];
  referenceImageBase64?: string;
  referenceImageUrl?: string;  // 新增：从素材库选取时传 URL
}
```

---

## 二、素材库数据 (mockLibrary.ts)

给现有 4 个发型素材添加 gender 标签：

| id | name | gender |
|----|------|--------|
| h1 | 清爽短发 | unisex |
| h2 | 复古羊毛卷 | female |
| h3 | 硬汉寸头 | male |
| h4 | 气质法式波波头 | female |

妆容和穿搭默认为 unisex。

---

## 三、TransformPage 改造

### 3.1 右侧面板替换为素材库来源

移除：
- 硬编码 `HAIR_STYLE_OPTIONS`（波波头/法式卷）
- 独立的"参考素材上传"区域

新增：
- 从 `AppContext.library` 读取素材，按 `activeTab` 过滤
- 显示为 3 列卡片网格（所有分类都有预览图）
- 性别筛选按钮：[男] [女] [全部]
- 自动性别匹配（AI 分析结果含性别时自动过滤）

### 3.2 选择→生成流程

1. 用户上传照片
2. 右侧自动显示素材库中匹配 tab+性别的项
3. 用户点击素材卡片
4. 素材的 `previewUrl` 转为 base64 作为 `referenceImageBase64` 传给 AI
5. 素材的 `name` + `description` 构建 prompt
6. AI 生成时同时看到文字描述 + 视觉参考
7. 结果左侧展示 before/after 对比，右侧显示结果缩略图

### 3.3 布局修复

- 确保选中推荐后右侧面板内容高度变化不导致布局抖动
- 生成过程中保持左右面板尺寸稳定

---

## 四、ExtractPage 改造

### 4.1 交互流程

```
上传照片 → 点击分类按钮(发型/妆容/穿搭)
         → AI 仅分析该类别
         → 返回风格名称 + 描述
         → AI 生成示意图
         → 自动保存到素材库
         → 右侧显示结果卡片
```

### 4.2 分类触发

- 三个分类按钮（发型/妆容/穿搭）即提取触发器
- 无独立"提取"按钮 — 点击分类即执行
- 提取中按钮显示 loading 状态
- 同一分类二次点击 = 重新提取（覆盖之前结果）

### 4.3 AI 提取逻辑

修改 `extractStyle` 支持单分类提取：
- 接收 `category?: 'hairstyle' | 'makeup' | 'outfit'` 参数
- prompt 聚焦指定类别，而非一次分析全部
- 返回只包含该类别的结果

### 4.4 示意图生成

对每个提取到的风格名称，调用 AI 生成示意图：
- 用 `qwen-image-2.0-pro` 文生图或图生图
- prompt: `"时尚摄影，模特展示[风格名称]，[描述]，干净背景，半身人像，高质量"`
- 生成的图片转为 base64 作为 `previewUrl` 存入素材库

### 4.5 自动保存

- 提取后自动调用 `addToLibrary`
- 保存字段：`name`=风格名称，`category`=当前分类，`previewUrl`=生成的示意图
- 右侧结果卡片显示 ✅已保存

---

## 五、AI Provider 改动 (aliProvider.ts)

### 新增方法或改造现有

1. **`extractStyle` 支持单分类提取** — 通过可选参数控制分析的类别
2. **`generateStyleSample` 新增** — 根据风格名称+描述生成示意图
3. **参考图管道** — 确保素材库 URL（可能为远程 URL 或 data URI）可转为 base64

---

## 六、Prompt 改动 (prompts.ts)

- 提取 prompt 增加性别识别指令
- 变换 prompt 在提供参考图时明确指示"参考图2的风格应用到图1上"（已有此逻辑）

---

## 七、实现顺序

1. 类型定义（gender 字段 + referenceImageUrl）
2. 素材库数据加 gender 标签
3. TransformPage：读取 library、展示网格、选中传参、移除硬编码
4. ExtractPage：点击分类触发、单分类提取、示意图生成、自动保存
5. AI Provider：extractStyle 单分类支持 + generateStyleSample
6. 测试验证
