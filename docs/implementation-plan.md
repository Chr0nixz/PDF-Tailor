# PDF-Tailor 实现文档

## 1. 项目概述

PDF-Tailor 是一个纯前端 PDF 裁剪工具，目标是在浏览器中完成 PDF 打开、可视化裁剪、批量应用、预览和导出，不上传用户文件。

当前版本实现已经覆盖：

- PDF 加载与渲染
- 自由框选裁剪
- 预设尺寸和边距编辑
- 多页缩略图和批量应用
- 预览与导出
- 单元测试、E2E 测试和 CI

## 2. 当前架构

### 前端框架

- React 18
- TypeScript
- Vite
- Tailwind CSS

### PDF 能力

- `pdfjs-dist`：渲染 PDF 页面到 canvas
- `pdf-lib`：导出新 PDF，支持 `Crop box` 与 `Redraw`

### 状态与性能

- Zustand：全局状态管理
- `@tanstack/react-virtual`：左侧多页虚拟列表
- Web Worker：导出与预览使用独立线程

### 测试

- Vitest：纯函数与导出逻辑单测
- Playwright：关键工作流 E2E

## 3. 目录结构

```text
src/
  components/   UI 组件
  hooks/        交互与渲染逻辑
  store/        Zustand 状态管理
  types/        共享类型
  utils/        坐标、单位、吸附、导出等纯函数
  workers/      导出 Worker
docs/
  implementation-plan.md
  v1.0-release-checklist.md
e2e/
  app.spec.ts
.github/workflows/
  ci.yml
```

## 4. 核心模块

### 4.1 渲染链路

- [usePdfRenderer.ts](D:/Projects/PDF-Tailor/src/hooks/usePdfRenderer.ts)
- [PdfPageCanvas.tsx](D:/Projects/PDF-Tailor/src/components/PdfPageCanvas.tsx)
- [pdfjs.ts](D:/Projects/PDF-Tailor/src/lib/pdfjs.ts)

职责：

- 加载 PDF 文档
- 读取页面尺寸与旋转信息
- 渲染当前页 canvas
- 管理文档与页面资源释放

### 4.2 裁剪交互

- [useCropSelection.ts](D:/Projects/PDF-Tailor/src/hooks/useCropSelection.ts)
- [CropOverlay.tsx](D:/Projects/PDF-Tailor/src/components/CropOverlay.tsx)
- [CropRectangle.tsx](D:/Projects/PDF-Tailor/src/components/CropRectangle.tsx)
- [coordinates.ts](D:/Projects/PDF-Tailor/src/utils/coordinates.ts)
- [snapEngine.ts](D:/Projects/PDF-Tailor/src/utils/snapEngine.ts)

职责：

- 创建裁剪框
- 拖拽移动
- 手柄缩放
- 边缘和中心线吸附
- 画布坐标与 PDF pt 坐标转换

### 4.3 属性编辑

- [PropertiesPanel.tsx](D:/Projects/PDF-Tailor/src/components/PropertiesPanel.tsx)
- [MarginInputs.tsx](D:/Projects/PDF-Tailor/src/components/MarginInputs.tsx)
- [PresetSizeDropdown.tsx](D:/Projects/PDF-Tailor/src/components/PresetSizeDropdown.tsx)
- [PresetPositionSelector.tsx](D:/Projects/PDF-Tailor/src/components/PresetPositionSelector.tsx)

职责：

- 预设尺寸
- 9 宫格定位
- 边距输入
- 当前页裁剪清除
- 批量应用

### 4.4 多页工作流

- [PageSidebar.tsx](D:/Projects/PDF-Tailor/src/components/PageSidebar.tsx)
- [PageThumbnail.tsx](D:/Projects/PDF-Tailor/src/components/PageThumbnail.tsx)
- [useThumbnails.ts](D:/Projects/PDF-Tailor/src/hooks/useThumbnails.ts)

职责：

- 缩略图列表
- 当前页切换
- 多选页面
- 懒加载缩略图
- 显示裁剪状态和旋转页标记

### 4.5 导出与预览

- [ExportDialog.tsx](D:/Projects/PDF-Tailor/src/components/ExportDialog.tsx)
- [PreviewModal.tsx](D:/Projects/PDF-Tailor/src/components/PreviewModal.tsx)
- [pdfOperations.ts](D:/Projects/PDF-Tailor/src/utils/pdfOperations.ts)
- [pdfExportWorker.ts](D:/Projects/PDF-Tailor/src/workers/pdfExportWorker.ts)

职责：

- `Crop box` 导出
- `Redraw` 导出
- Worker 中执行导出
- 预览与最终导出共用同一条导出管线

## 5. 数据模型

核心状态定义集中在 [index.ts](D:/Projects/PDF-Tailor/src/types/index.ts) 和 [usePdfStore.ts](D:/Projects/PDF-Tailor/src/store/usePdfStore.ts)。

重点对象：

- `PageMetadata`
  - 页面尺寸
  - 旋转角度
- `CropRect`
  - 裁剪矩形，统一用 PDF pt 存储
- `PageCropState`
  - 每页独立裁剪状态
- `pageCrops`
  - 以页码为 key 的裁剪映射
- `past` / `future`
  - 撤销与重做历史

## 6. 当前已完成功能

### 编辑能力

- 当前页自由框选
- 裁剪框移动与缩放
- 吸附辅助线
- 预设尺寸应用
- 边距输入联动
- 当前页清除裁剪
- 键盘复制 / 粘贴 / 微调 / 撤销 / 重做

### 多页能力

- 缩略图导航
- 多选页面
- 当前页裁剪批量应用到选中页
- 应用到全部页

### 导出能力

- `Crop box` 导出
- `Redraw` 导出
- 预览结果和导出结果共用同一导出管线

### 稳定性与限制提示

- 导出和预览中的 stale worker response 隔离
- 导出非法裁剪阻断
- 旋转页标记与风险提示
- 已裁剪旋转页禁用 `Redraw`

## 7. 测试与质量现状

### 单元测试

当前已覆盖：

- 坐标换算
- 单位换算
- 吸附逻辑
- 导出逻辑
- 旋转页 / 大文档提示逻辑

### E2E

当前已覆盖：

1. 上传 PDF -> 裁剪 -> 批量应用 -> 预览 -> 导出
2. 旋转页裁剪后 `Redraw` 预览 / 导出禁用

### CI

CI 工作流位于 [ci.yml](D:/Projects/PDF-Tailor/.github/workflows/ci.yml)，会自动执行：

- `npm ci`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## 8. 当前已知限制

- 已裁剪的 `90°/270°` 旋转页不支持 `Redraw`
- E2E 目前只覆盖 Chromium
- 尚未做跨平台下载行为差异验证
- 大文档导出没有细粒度进度条

## 9. 建议的 v1.x 后续方向

优先级较高：

- 支持旋转页 `Redraw`
- 导出进度提示
- 更多 E2E 场景
- 跨浏览器测试矩阵

优先级次高：

- 页面重排
- 裁剪模板保存
- 更细的批量操作范围控制

更完整的后续版本规划见 [roadmap.md](D:/Projects/PDF-Tailor/docs/roadmap.md)。
