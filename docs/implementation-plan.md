# PDF-Tailor 实现文档与开发进度计划

## 1. 文档目的

本文档用于将现有的产品设想整理为一份可直接执行的前端实现方案，覆盖以下内容：

- 产品目标与范围界定
- 技术架构与目录规划
- 核心模块职责与关键数据结构
- 关键交互、导出流程、性能与异常处理方案
- 分阶段开发计划、里程碑、验收标准与风险控制

本文档默认以单仓库、纯前端、静态部署为前提，适用于从零开始搭建 `PDF-Tailor` 项目。

## 2. 项目目标

### 2.1 产品目标

构建一个浏览器端 PDF 可视化裁剪工具，使用户能够：

- 打开本地 PDF 文件并可视化浏览页面
- 在页面上自由框选裁剪区域
- 按预设纸张尺寸和定位规则生成裁剪框
- 用数值方式精确调整页边距
- 对单页、多页或选中页批量应用裁剪
- 在导出前预览裁剪结果
- 导出新的 PDF 文件
- 在编辑过程中支持撤销与重做

### 2.2 设计原则

- 纯前端执行：不上传 PDF 到服务端，优先保证隐私
- 数据统一：所有裁剪数据以 PDF 坐标系和 pt 单位存储
- 交互即时：拖拽与属性面板双向实时联动
- 大文件可用：多页文档下仍保持可接受的滚动与渲染性能
- 可扩展：为后续新增旋转、页面重排、裁剪模板保留结构空间

### 2.3 非目标

以下能力不纳入首个版本范围：

- OCR 识别
- PDF 注释编辑
- 页面重排、拆分、合并
- 云端存储与用户账户系统
- 服务端渲染和协同编辑

## 3. 技术方案总览

### 3.1 技术栈

| 用途 | 方案 | 说明 |
| --- | --- | --- |
| 前端框架 | React 18 + TypeScript | 组件分层清晰，类型约束适合复杂编辑器状态 |
| 构建工具 | Vite | 启动快，Worker 与现代前端生态兼容好 |
| PDF 渲染 | pdfjs-dist | 直接控制 canvas 与 viewport，便于叠加交互层 |
| PDF 处理 | pdf-lib | 支持裁剪框设置和内容重绘，纯浏览器运行 |
| 状态管理 | Zustand | 轻量，适合编辑器状态与中间件扩展 |
| 列表虚拟化 | @tanstack/react-virtual | 支撑多页缩略图与可选主工作区虚拟渲染 |
| 样式系统 | Tailwind CSS | 快速搭建布局，复杂交互层配合自定义 CSS |
| 导出线程 | Web Worker | 避免导出阻塞主线程 |

### 3.2 总体架构

应用采用纯前端分层架构：

1. 表现层：React 组件负责布局、交互、表单和状态订阅。
2. 状态层：Zustand 保存文档信息、页面裁剪状态、选择状态、历史记录和 UI 状态。
3. 能力层：`utils/` 与 `hooks/` 负责坐标转换、渲染、吸附、单位换算、导出等核心逻辑。
4. 后台任务层：Web Worker 负责耗时的 PDF 导出任务。

### 3.3 运行流程

1. 用户拖入或选择 PDF 文件。
2. `pdfjs-dist` 解析文档并生成页面元信息。
3. 主工作区渲染当前页面 canvas，覆盖裁剪交互层。
4. 用户拖拽或输入参数更新裁剪矩形。
5. Zustand 同步页面裁剪状态与历史记录。
6. 预览或导出时将当前裁剪配置传入 `pdf-lib` 流程。
7. 导出结果通过 Blob 下载到本地。

## 4. 目录与模块规划

建议目录结构如下：

```text
PDF-Tailor/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   └── favicon.svg
├── docs/
│   └── implementation-plan.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── index.ts
    ├── store/
    │   ├── usePdfStore.ts
    │   └── selectors.ts
    ├── utils/
    │   ├── coordinates.ts
    │   ├── pdfOperations.ts
    │   ├── paperSizes.ts
    │   ├── unitConversion.ts
    │   └── snapEngine.ts
    ├── hooks/
    │   ├── usePdfRenderer.ts
    │   ├── useCropSelection.ts
    │   ├── useThumbnails.ts
    │   └── useKeyboardShortcuts.ts
    ├── workers/
    │   ├── pdfExportWorker.ts
    │   └── workerTypes.ts
    └── components/
        ├── Header.tsx
        ├── MainLayout.tsx
        ├── PageSidebar.tsx
        ├── PageThumbnail.tsx
        ├── Workspace.tsx
        ├── PdfPageCanvas.tsx
        ├── CropOverlay.tsx
        ├── CropRectangle.tsx
        ├── PropertiesPanel.tsx
        ├── CropModeSelector.tsx
        ├── PresetSizeDropdown.tsx
        ├── PresetPositionSelector.tsx
        ├── MarginInputs.tsx
        ├── PreviewModal.tsx
        ├── ExportDialog.tsx
        └── DropZone.tsx
```

### 4.1 模块职责

#### `types/`

定义统一的业务类型，避免组件层散落临时结构。

建议至少包含：

- `PdfUnit = 'pt' | 'mm'`
- `CropMode = 'free' | 'preset'`
- `ExportMode = 'crop-box' | 'redraw'`
- `PresetAnchor = 'top-left' | ... | 'bottom-right'`
- `Rect`
- `CropRect`
- `PageMetadata`
- `PageCropState`
- `SelectionState`
- `HistoryState`

#### `store/`

负责全局状态组织，建议拆为三类：

- 文档状态：源文件、页数、页面尺寸、当前页、缩放比
- 裁剪状态：每页裁剪矩形、选中页集合、当前交互态
- UI 状态：面板开关、预览弹窗、导出弹窗、错误消息

#### `utils/`

- `coordinates.ts`：屏幕坐标、viewport 坐标、PDF 坐标转换
- `pdfOperations.ts`：导出、预览 PDF 的纯函数和编排逻辑
- `paperSizes.ts`：预设纸张尺寸表、方向转换、定位计算
- `unitConversion.ts`：mm/pt 双向换算与格式化
- `snapEngine.ts`：吸附点生成、阈值判断、辅助线返回

#### `hooks/`

- `usePdfRenderer.ts`：管理 pdf.js 文档与页面生命周期
- `useCropSelection.ts`：拖拽创建、拖拽移动、手柄缩放等交互
- `useThumbnails.ts`：缩略图懒加载与缓存
- `useKeyboardShortcuts.ts`：撤销/重做、删除、缩放快捷键

#### `components/`

组件只负责渲染与交互装配，复杂业务逻辑尽量放在 hooks、store、utils 中。

#### `workers/`

负责导出任务，避免主线程卡顿。Worker 应只接收序列化数据，不直接依赖 DOM。

## 5. 核心数据结构设计

### 5.1 页面与裁剪模型

建议使用以下核心结构：

```ts
export type PdfUnit = 'pt' | 'mm';

export type CropMode = 'free' | 'preset';

export type ExportMode = 'crop-box' | 'redraw';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropRect extends Rect {
  pageIndex: number;
}

export interface PageMetadata {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  rotation: number;
}

export interface PageCropState {
  pageIndex: number;
  cropRect: CropRect | null;
  mode: CropMode;
  presetSizeId?: string;
  presetAnchor?: string;
  marginsPt?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  updatedAt: number;
}
```

### 5.2 Store 状态建议

```ts
interface PdfStoreState {
  file: File | null;
  fileName: string | null;
  fileBuffer: Uint8Array | null;
  pageCount: number;
  pages: PageMetadata[];
  currentPageIndex: number;
  selectedPageIndices: number[];
  zoom: number;
  displayUnit: PdfUnit;
  pageCrops: Record<number, PageCropState>;
  activeDragState: {
    pageIndex: number | null;
    action: 'create' | 'move' | 'resize' | null;
    handle: string | null;
  };
  previewOpen: boolean;
  exportDialogOpen: boolean;
  errorMessage: string | null;
}
```

### 5.3 设计约束

- `pageCrops` 以页码为 key，保证按页读写简单直接
- 所有几何数据以 pt 存储，输入展示再按需要转换为 mm
- 拖拽中的临时态与已提交历史态分开，避免每次 mousemove 都污染历史记录
- Worker 通信数据尽量使用 `Uint8Array` 和普通对象，避免复杂类实例传递失败

## 6. 页面布局与交互设计

### 6.1 布局结构

采用三栏编辑器布局：

- 顶栏：文件操作、缩放控制、预览、导出
- 左栏：页面缩略图、页面选择、多选控制
- 中栏：PDF 页面画布与裁剪覆盖层
- 右栏：裁剪模式、预设尺寸、定位、边距与批量应用

### 6.2 关键交互

#### 文件导入

- 支持拖拽上传和点击选择
- 非 PDF 类型立即提示错误
- 加载新文档前先清空旧状态并释放旧资源

#### 自由框选

- 鼠标按下开始创建矩形
- 鼠标移动实时更新矩形与辅助线
- 鼠标抬起后提交裁剪结果到页面状态并写入历史

#### 矩形调整

- 支持整体移动
- 支持四角与四边中点手柄
- 实时约束宽高不能小于最小阈值
- 超出页面边界时自动裁剪回合法区域

#### 属性面板联动

- 拖拽更新裁剪框时，边距输入实时显示最新值
- 输入边距时重新计算裁剪框并刷新画布
- 数值输入失焦或按回车后写入历史记录

#### 多页应用

- 支持当前页、选中页、全部页面三种应用范围
- 批量操作一次写入一个历史快照，确保撤销行为符合预期

## 7. 关键技术实现说明

### 7.1 坐标系统一

PDF 坐标原点位于左下角，canvas 坐标原点位于左上角，因此需要统一转换。

核心公式如下：

```ts
const canvasX = event.clientX - rect.left;
const canvasY = event.clientY - rect.top;
const pdfX = canvasX / viewport.scale;
const pdfY = pageHeight - canvasY / viewport.scale;
```

要求：

- 所有裁剪矩形在 store 中一律存为 PDF pt 坐标
- 页面缩放仅影响显示，不影响原始裁剪数据
- 画布覆盖层绘制前，将 PDF 坐标反向转换为屏幕像素坐标

### 7.2 吸附引擎

吸附目标：

- 页面四条边
- 页面水平中心线
- 页面垂直中心线

吸附规则：

- 吸附阈值在屏幕层统一定义为 5px
- 实际判断前需要换算到 PDF pt
- 吸附结果除修正坐标外，还需要返回命中的辅助线信息

建议返回结构：

```ts
interface SnapResult {
  x: number;
  y: number;
  guides: Array<{
    orientation: 'horizontal' | 'vertical';
    position: number;
  }>;
}
```

### 7.3 拖拽性能控制

为防止连续 `mousemove` 导致状态风暴：

- 拖拽中的视图更新通过 `requestAnimationFrame` 节流
- 拖拽中的临时矩形单独存储
- 仅在 `mouseup` 时写入可撤销历史
- 属性面板订阅裁剪矩形 selector，避免整个面板随无关状态重渲染

### 7.4 撤销与重做

建议实现策略：

- `pageCrops` 作为历史记录主对象
- `mousedown` 开始时不入栈
- `mouseup` 完成时入栈
- 输入框连续输入期间只更新临时值，确认后入栈
- 历史上限 50 步，超出后丢弃最旧记录

快捷键：

- `Ctrl + Z`：撤销
- `Ctrl + Shift + Z`：重做
- macOS 可兼容 `Meta` 键，但首版可先按 Windows 习惯实现

### 7.5 预设纸张尺寸与 9 宫格定位

`paperSizes.ts` 建议维护标准尺寸表：

- A3, A4, A5
- B4, B5
- Letter, Legal

每个预设包含：

- 名称
- 宽高毫米值
- 宽高 pt 值
- 是否支持横向

定位流程：

1. 将预设尺寸换算为 pt。
2. 根据页面尺寸和定位锚点计算目标矩形左下角。
3. 若超出页面边界，根据规则提示或自动收敛。

### 7.6 PDF 导出策略

#### 方式 A：裁剪框调整

适用于快速导出，优点是速度快、实现简单、兼容首版需求。

- 读取原文档
- 对目标页设置 `CropBox` 和必要时的 `MediaBox`
- 保存为新文档

注意：

- 该方式通常不会减少底层内容体积
- 某些阅读器的展示行为可能依赖多个 box，需做好兼容验证

#### 方式 B：内容重绘

适用于真正裁掉不可见内容并优化最终体积。

- 新建 PDF 文档
- 将源页嵌入为模板
- 对每页按裁剪框创建新尺寸页面
- 使用 `drawPage` 将原页内容映射到新页面

注意：

- 对复杂 PDF 的字体、透明图层、旋转页要重点回归测试
- 该方式通常更耗时，应在 Worker 中执行

### 7.7 Worker 设计

Worker 通信建议：

```ts
type ExportWorkerRequest = {
  type: 'EXPORT_PDF';
  payload: {
    fileBuffer: Uint8Array;
    pageCrops: Record<number, PageCropState>;
    exportMode: ExportMode;
  };
};

type ExportWorkerResponse =
  | { type: 'EXPORT_SUCCESS'; payload: { fileBuffer: Uint8Array } }
  | { type: 'EXPORT_ERROR'; payload: { message: string } };
```

要求：

- 使用 `postMessage(data, [buffer.buffer])` 传递 transferable
- 主线程负责下载触发，Worker 仅负责数据处理
- 导出时界面显示进度或最少显示 loading 状态

### 7.8 性能与内存管理

性能要求：

- 100 页文档下，缩略图区域不允许一次性渲染全部 canvas
- 导出期间主线程仍可响应基本 UI 操作
- 切换页面和缩放时避免重复解析整份 PDF

内存策略：

- 新文档加载前先销毁旧 `pdfDocument`
- 页面切换后调用旧页 `cleanup()`
- 缩略图缓存采用有限缓存策略
- 预览关闭后释放预览用的 Blob URL

## 8. 组件实现建议

### 8.1 `App.tsx`

负责全局初始化、快捷键绑定、空态与主编辑态切换。

### 8.2 `Header.tsx`

提供：

- 打开文件
- 当前文件名
- 缩放控制
- 预览按钮
- 导出按钮

### 8.3 `PageSidebar.tsx`

负责：

- 缩略图虚拟列表
- 当前页高亮
- 多选态展示
- 懒加载缩略图

### 8.4 `Workspace.tsx`

作为主编辑容器，协调：

- 当前页画布渲染
- 裁剪覆盖层
- 滚动与居中布局

### 8.5 `PdfPageCanvas.tsx`

只负责：

- 请求页面 viewport
- 将页面渲染到 canvas
- 在组件卸载或参数变化时清理 render task

### 8.6 `CropOverlay.tsx`

负责原始鼠标事件采集，不直接保存业务逻辑，逻辑通过 `useCropSelection.ts` 注入。

### 8.7 `CropRectangle.tsx`

负责：

- 虚线框
- 半透明遮罩
- 控制手柄
- 吸附辅助线展示

### 8.8 `PropertiesPanel.tsx`

负责：

- 裁剪模式切换
- 页边距输入
- 预设尺寸与定位
- 应用到选中页/全部页

## 9. 异常处理与边界条件

需要明确处理以下场景：

- 非 PDF 文件上传
- 加密 PDF 无法读取
- 损坏 PDF 导致解析失败
- 页面尺寸异常或旋转页
- 裁剪框宽高为 0 或小于最小尺寸
- 裁剪框超出页面边界
- 用户未设置裁剪直接导出
- Worker 导出失败或浏览器内存不足

建议策略：

- 可恢复错误使用 toast 或面板提示
- 不可恢复错误提供清晰原因和重试路径
- 导出前统一校验裁剪矩形合法性

## 10. 测试与验收方案

### 10.1 单元测试重点

建议优先为纯函数编写测试：

- `coordinates.ts`
- `unitConversion.ts`
- `paperSizes.ts`
- `snapEngine.ts`
- `pdfOperations.ts` 中的参数构造逻辑

### 10.2 集成测试重点

可使用 Playwright 或 Vitest + Testing Library 组合覆盖：

- 文件上传
- 自由框选
- 属性面板联动
- 撤销/重做
- 预设尺寸定位
- 批量应用
- 导出流程

### 10.3 手工验收清单

1. 打开多页 PDF 并确认渲染正常。
2. 调整缩放并确认裁剪矩形显示位置正确。
3. 自由框选时确认坐标映射准确。
4. 接近页面边缘与中心线时确认吸附生效。
5. 拖拽时右侧边距输入实时更新。
6. 输入边距时画布矩形同步变化。
7. 选择预设纸张尺寸并验证 9 宫格定位。
8. 对多个页面批量应用裁剪。
9. 使用两种导出方式导出并检查结果。
10. 对 100 页以上文件验证滚动、渲染和内存释放。

### 10.4 发布准入标准

满足以下条件后可进入首版发布：

- 核心链路完整可用：加载、编辑、预览、导出
- 主要功能无阻断性 bug
- 100 页文档下无明显不可恢复卡死
- 导出的 PDF 能被主流阅读器正常打开
- 撤销/重做在主要编辑场景下行为一致

## 11. 开发进度计划

### 11.1 排期假设

以下进度计划默认：

- 1 名前端开发为主，必要时兼顾测试与设计联调
- 周期约 4 周到 5 周
- 目标是交付一个可上线试用的 MVP

### 11.2 里程碑概览

| 里程碑 | 时间建议 | 目标 |
| --- | --- | --- |
| M1 | 第 1 周结束 | 项目骨架、状态层、PDF 基础加载完成 |
| M2 | 第 2 周结束 | 单页自由裁剪与属性联动完成 |
| M3 | 第 3 周结束 | 预设裁剪、多页支持、缩略图侧栏完成 |
| M4 | 第 4 周结束 | 导出、预览、撤销重做、异常处理完成 |
| M5 | 第 5 周 | 性能优化、回归测试、发布准备 |

### 11.3 分阶段执行计划

#### 阶段 1：项目初始化

预计时长：2 到 3 天

目标：

- 初始化 Vite + React + TypeScript
- 接入 Tailwind CSS
- 安装核心依赖
- 建立目录结构与基础类型
- 搭建 Zustand store 和基础布局
- 确认 Worker 打包方式可用

输出物：

- 可运行的前端骨架
- 三栏布局占位界面
- 基础类型定义
- store 初版与状态读写样例

验收标准：

- `npm run dev` 可启动
- 三栏布局可见
- store 能正常驱动基础 UI
- Worker 模块可以被构建

#### 阶段 2：PDF 加载与渲染

预计时长：3 到 4 天

目标：

- 实现拖拽上传与文件选择
- 使用 `pdfjs-dist` 加载文档
- 渲染当前页到 canvas
- 实现缩放控制
- 建立文档和页面生命周期清理机制

输出物：

- `DropZone`
- `usePdfRenderer`
- `PdfPageCanvas`
- 当前页渲染与缩放功能

验收标准：

- 可打开单页和多页 PDF
- 缩放正常
- 切换文档后旧资源释放

#### 阶段 3：自由框选裁剪

预计时长：4 到 5 天

目标：

- 完成坐标转换工具
- 完成覆盖层鼠标交互
- 实现裁剪矩形显示与手柄
- 完成边缘吸附与辅助线
- 建立拖拽与属性面板的实时联动

输出物：

- `coordinates.ts`
- `snapEngine.ts`
- `useCropSelection.ts`
- `CropOverlay`
- `CropRectangle`

验收标准：

- 可创建、移动、缩放裁剪框
- 吸附行为稳定
- 拖拽中属性面板实时更新

#### 阶段 4：预设尺寸与边距控制

预计时长：3 到 4 天

目标：

- 接入常见纸张尺寸
- 完成 9 宫格定位
- 完成 mm/pt 切换
- 完成输入框反向驱动画布更新

输出物：

- `paperSizes.ts`
- `unitConversion.ts`
- `PresetSizeDropdown`
- `PresetPositionSelector`
- `MarginInputs`

验收标准：

- 预设尺寸应用结果正确
- 定位规则符合预期
- 输入框与画布双向同步

#### 阶段 5：多页支持

预计时长：4 到 5 天

目标：

- 生成缩略图
- 接入虚拟滚动
- 支持页面导航与多选
- 支持每页独立裁剪状态
- 支持批量应用裁剪

输出物：

- `PageSidebar`
- `PageThumbnail`
- `useThumbnails`
- 批量应用逻辑

验收标准：

- 100 页文档下缩略图滚动流畅
- 多页选择与裁剪状态隔离正确
- 批量应用不破坏单页独立设置

#### 阶段 6：导出管道

预计时长：4 到 5 天

目标：

- 完成两种导出模式
- 在 Worker 中执行导出
- 建立导出配置对话框
- 完成浏览器下载

输出物：

- `pdfOperations.ts`
- `pdfExportWorker.ts`
- `ExportDialog`

验收标准：

- 两种导出模式都可用
- 导出期间主线程不卡死
- 导出文件可被外部阅读器打开

#### 阶段 7：预览、快捷键与收尾

预计时长：3 到 4 天

目标：

- 完成预览弹窗
- 实现撤销/重做
- 补齐错误处理
- 优化响应式布局
- 完成关键回归测试

输出物：

- `PreviewModal`
- `useKeyboardShortcuts`
- 错误提示机制
- MVP 发布版本

验收标准：

- 预览结果与导出结果一致
- 撤销/重做行为稳定
- 常见异常有清晰提示

### 11.4 建议周计划

#### 第 1 周

- 完成项目初始化
- 完成 PDF 加载与基础渲染
- 建立基础布局和 store

#### 第 2 周

- 完成自由框选
- 完成手柄缩放、吸附与属性联动

#### 第 3 周

- 完成预设尺寸、边距控制
- 完成多页缩略图和批量裁剪

#### 第 4 周

- 完成导出、预览、撤销重做
- 补充错误处理与基础测试

#### 第 5 周

- 压测与性能优化
- 回归测试
- 修复发布前问题并准备部署

### 11.5 每阶段完成定义

每个阶段结束前都应检查：

- 功能代码合入主分支前能本地运行
- 核心交互具备至少一次手工回归
- 新增的纯函数有基本单元测试
- 未解决问题形成明确 issue 清单

## 12. 风险与应对

| 风险 | 说明 | 应对方案 |
| --- | --- | --- |
| pdf.js 与 pdf-lib 坐标理解不一致 | 容易出现显示与导出结果偏差 | 先完成统一坐标模型并编写测试样例 |
| 大文件性能下降 | 多页文档可能导致 canvas 和内存压力过大 | 优先实现虚拟列表、资源释放和 Worker 导出 |
| 导出兼容性问题 | 不同阅读器对 CropBox 展示可能不同 | 同时提供 redraw 模式并做多阅读器验证 |
| 拖拽历史记录过密 | 容易造成撤销体验差和内存膨胀 | 只在提交时入历史栈，拖拽中使用临时状态 |
| 旋转页处理复杂 | 坐标与导出偏移风险高 | MVP 首版先支持常见 0 度页面，旋转页做专项验证 |

## 13. 后续迭代建议

首版完成后可考虑以下增强方向：

- 页面旋转与自动纠偏
- 裁剪模板保存与复用
- 最近使用纸张尺寸和参数记忆
- 页面重排、拆分、合并
- 批量命名导出与 ZIP 打包
- PWA 离线能力

## 14. 结论

该方案适合以纯前端方式快速落地一个可用的 PDF 裁剪工具。实现的关键不在单个组件，而在三个基础能力是否稳定：

- 坐标系统一
- 交互状态与历史管理清晰
- 渲染、导出、预览三条链路结果一致

开发时应优先锁定数据模型和坐标转换，再推进画布交互、多页能力和导出链路。只要这几个基础点处理准确，后续增加预设、批量操作和性能优化都会更可控。
