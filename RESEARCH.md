# 行业调研报告 — AI Hair Stylist Pro

> 调研日期: 2026-06-10

---

## 一、同类开源项目对比

五个最相关的开源项目，按与我们的技术栈/目标相似度排序：

### 1. HairFastGAN ⭐ 最成熟的学术方案
- **定位**: StyleGAN 空间的快速发型迁移 (NeurIPS 2024)
- **核心**: 编码器方案，支持形状/颜色分离迁移，一张 V100 上 1 秒内出图
- **技术栈**: PyTorch, StyleGAN2, Hugging Face Demo
- **与我们的关系**: 学术研究项目，不可直接 Web 集成，但**其头发分割 + 形状迁移算法架构值得参考**

### 2. ai-hairstyle (Hairroom) — ⭐ 最接近的商业对标
- **定位**: AI 发型更换 Web App，全栈 Serverless
- **技术栈**: React + Cloudflare Workers/D1/R2/KV + GPT-4o + Flux Kontext
- **核心功能**: 上传自拍 → 选发型 → AI 生成 → 保存历史
- **关键设计原则**: 严格身份保持 — 只换头发，脸/肤色/表情/姿态/背景不变
- **商业化**: 3 次免费试用 → 付费
- **与我们的关系**: 技术栈 (React) 和功能 (AI 换发) 高度重合，但**我们多了 AR 实时试戴，这是差异化优势**

### 3. Runway Hair Makeover API Demo
- **定位**: Runway 官方 API 演示
- **技术栈**: Next.js + Runway API
- **核心**: 上传自拍 → 选发型 → 生成
- **与我们的关系**: 说明**商用 API 集成是这个赛道的标准做法**，与我们集成百度/阿里的思路一致

### 4. Barber AI (barber-ai)
- **定位**: 理发店店内 AI 预览站
- **技术栈**: Streamlit, SSE 流式进度
- **核心**: 店员拍照 → 选店内目录发型 → 生成预览
- **与我们的关系**: B 端场景验证 — 理发店/沙龙是真实付费场景

### 5. StyleBlend (学术论文)
- **定位**: 综合 AI 发型平台 (CNN 脸型分类 + 相似度分析 + 推荐引擎 + StyleGAN 虚拟试戴)
- **数据集**: 400 个发型来自 FFHQ + 开源库
- **与我们的关系**: **"推荐引擎 + 脸型匹配"** 是我们目前完全缺失的功能

### 同类项目功能矩阵

| 功能 | HairFastGAN | ai-hairstyle | Runway | Barber AI | StyleBlend | **我们** |
|------|:-----------:|:------------:|:------:|:---------:|:----------:|:--------:|
| AR 实时试戴 | ✗ | ✗ | ✗ | ✗ | ✗ | **✅** |
| AI 照片换发 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 发型提取 | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ |
| 手势控制 | ✗ | ✗ | ✗ | ✗ | ✗ | **✅** |
| 语音控制 | ✗ | ✗ | ✗ | ✗ | ✗ | **✅** |
| 身份保持 | ✅ | ✅ | ✅ | ✗ | ✅ | ⚠️ 待验证 |
| 脸型推荐 | ✗ | ✗ | ✗ | ✗ | ✅ | ✗ |
| 360° 预览 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 商业化 | ✗ | ✅ | ✅ | ✅ | ✗ | ✗ |

> **我们的独特优势**: AR 实时试戴 + 手势/语音交互是唯一
> **我们的缺口**: 脸型推荐、身份保持质量验证、商业化

---

## 二、商业市场概况

### 市场规模
- 2025 年约 $1.2–18 亿，预计 2032 年 $3.5–6.2B
- CAGR 10.6%–17.5%，亚太地区增长最快 (36.1% 份额)

### 主要商业产品

| 产品 | 公司 | 特点 |
|------|------|------|
| ModiFace | L'Oréal | 行业标准，渲染 <150ms，最广泛品牌集成 |
| YouCam Makeup | Perfect Corp | 东南亚/亚太主导，提供 SDK/API 给第三方品牌 |
| Revieve | Revieve | AI 个性化推荐最强，DTC 染发品牌首选 |
| Meitu | 美图 | 中国主导，集成淘宝直播/抖音/美团 |
| Wella | Coty | 专业沙龙渠道，染发配方模拟 |

### 商业化趋势
1. **API/SDK 授权** — Perfect Corp 和 Revieve 向品牌方收 SDK 授权费
2. **免费试用 → 付费** — 3-5 次免费生成后收费 (ai-hairstyle 模式)
3. **B2B 沙龙方案** — Barber AI、Wella 走理发店/沙龙渠道
4. **电商集成** — 品牌官网嵌 AR 试戴提高转化率

---

## 三、行业技术趋势

| 趋势 | 说明 | 对我们影响 |
|------|------|-----------|
| **身份保持 (Identity Preservation)** | 只换头发，保留脸/肤色/表情/背景 | 我们 AI 换发需要验证百度/阿里 API 的身份保持质量 |
| **隐私优先 (Privacy-First)** | 浏览器端处理，不上传服务器 | 我们 AR 试戴本来就是本地的，AI 换发依赖云端 API |
| **多视角/360° 预览** | 单图 → 多角度展示效果 | 我们可考虑后期加，但技术上较难 |
| **LLM Agent 架构** | 2026 年最新研究，多模型协作编排 | 我们可考虑用 Agent 优化发型推荐流程 |
| **Serverless/Edge** | Cloudflare Workers, Vercel 部署 | 我们 Vite 构建适合静态部署 + API 代理 |
| **社交电商集成** | 试戴 → 分享 → 购买闭环 | 商业化的关键路径 |

---

## 四、对我们项目迭代方向的建议

### 核心结论

**我们和同类项目走的不是同一条路。** 大多数项目走"上传照片 → AI 生成"的纯静态路线，而我们独有 **AR 实时试戴**。这是真正的差异化优势，应该继续强化。

### 建议迭代优先级

#### P0 — 补完核心体验 (当前)
1. **获取发型 .deepar 文件** — 唯一卡点，拿到后 AR 试戴就完整了
2. **初始效果从 assets 读取** — 修掉 `arEngine.ts` 硬编码眼镜的问题

#### P1 — 增强 AR 试戴 (差异化)
3. **发色实时调整** — `setHairColor()` 已实现，接入 UI 滑块调色
4. **AR 截图保存** — `takeScreenshot()` 已实现，加个按钮即可
5. **语音控制 UI 接入** — useVoiceControl 已实现，加麦克风按钮

#### P2 — AI 换发质量提升 (拉齐竞品)
6. **验证百度/阿里 API 的身份保持效果** — 这是 ai-hairstyle 等竞品的核心卖点
7. **如果效果不理想**: 考虑接入 FAL AI 或 Runway API 作为补充 (竞品已验证可行)

#### P3 — 商业化验证
8. **B2B 沙龙方案** — 参照 Barber AI，增加店内目录模式
9. **免费试用 → 付费** — 参照 ai-hairstyle 的 3 次免费模式

#### P4 — 进阶功能
10. **脸型推荐** — 参照 StyleBlend，CNN 脸型分类 + 推荐匹配
11. **多角度预览** — 技术难度高，远期目标
12. **社交分享** — AR 截图 → 分享到社交平台

### 技术架构演进建议

```
当前: React SPA (纯前端)
     ↓
短期: React SPA + 静态部署 (Vercel/Cloudflare Pages)
     ↓
中期: + API 代理层 (Cloudflare Workers / 后端 API)
     ↓
长期: + 用户系统 + 付费墙 + 历史记录
```

---

## 五、参考资源

### 开源项目
- [HairFastGAN](https://github.com/FusionBrainLab/HairFastGAN) — NeurIPS 2024 发型迁移
- [ai-hairstyle (Hairroom)](https://github.com/neyric/ai-hairstyle) — Cloudflare Serverless AI 换发
- [Runway Hair Makeover Demo](https://github.com/runwayml/hair-makeover-api-demo) — Runway API 演示
- [barber-ai](https://github.com/DeanOpen/barber-ai) — 理发店 AI 预览站

### 商业参考
- ModiFace (L'Oréal) — 行业标杆 AR 试戴
- YouCam Makeup (Perfect Corp) — 最大独立 AR SDK 提供商
- Revieve — AI 个性化推荐
- 美图 — 中国市场 + 社交电商集成

### 市场报告
- [Virtual Hairstyle Try-On Market Report 2034](https://dataintelo.com/report/virtual-hairstyle-try-on-market)
- [Global Virtual Hair Color Try-On Market](https://www.wiseguyreports.com/reports/virtual-hair-color-try-on-market)
