# 后续计划

> 基于项目现状分析的下一步行动计划

---

## 当前状态

所有功能代码已就绪，唯一的实际缺口是 **缺少 3D 发型 .deepar 文件**（当前是动物/眼镜 Demo 效果）。

---

## 计划

### 第一步：获取发型 .deepar 文件

AR 试戴功能完整可用的前提。

**选项：**
- DeepAR Store 购买现成发型效果（最快）
- Tripo AI 生成 glTF → Blender 调整 → DeepAR Studio 导出 .deepar（免费但需要学习 DeepAR Studio）
- 外包给 3D 设计师制作

拿到后放入 `public/deepar/effects/`，更新 `src/data/hairstyleAssets.ts` 即可生效。

### 第二步：发色实时调整

`arEngine.ts` 中的 `setHairColor()` 方法已实现（通过 DeepAR 脚本 API 修改 3D 材质颜色），只需要在 LiveCamera 界面加一个颜色选择器 UI。

### 第三步：收尾修复

- `arEngine.ts:112` 硬编码的初始效果改为从 `HAIRSTYLE_ASSETS[0]` 读取
- `index.html` 标题改为"AI Hair Stylist Pro"

---

## 不做的事

- 语音控制（已删除）
- 脸型推荐（技术不成熟，价值不明确）
- 商业化（无用户之前不需要考虑）
- 社交分享、360° 预览（附加功能，非核心）
