# PDF-Tailor

浏览器端 PDF 可视化裁剪工具。支持自由框选、预设尺寸、多页批量应用、预览和导出，全部在本地浏览器中完成，不依赖后端服务。

## 当前版本

- 当前目标版本：`v1.0`
- 当前状态：功能完成，已具备单元测试、E2E 测试和 CI 校验
- 核心限制：旋转页的 `Redraw` 预览和导出目前会被禁用，需使用 `Crop box`

## 功能概览

- 打开本地 PDF 并渲染当前页
- 左侧缩略图侧栏，支持 `Ctrl/Cmd + Click` 多选页面
- 自由框选裁剪
- 裁剪框移动、8 个手柄缩放
- 页面边缘和中心线吸附
- 预设纸张尺寸和 9 宫格定位
- 边距输入，支持 `mm / pt` 切换
- 将当前页裁剪批量应用到选中页或全部页
- 预览导出结果
- 两种导出模式：
  - `Crop box`
  - `Redraw`
- 撤销 / 重做
- Web Worker 导出

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- `pdfjs-dist`
- `pdf-lib`
- `@tanstack/react-virtual`
- Vitest
- Playwright

## 文档

- 实现文档：[docs/implementation-plan.md](D:/Projects/PDF-Tailor/docs/implementation-plan.md)
- 发布清单：[docs/v1.0-release-checklist.md](D:/Projects/PDF-Tailor/docs/v1.0-release-checklist.md)

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址通常是 [http://localhost:5173](http://localhost:5173)。

## 测试与构建

```bash
npm test
npm run test:e2e
npm run build
```

## 使用流程

1. 打开本地 PDF
2. 在中间画布拖拽创建裁剪框
3. 通过拖拽、手柄、预设尺寸或边距输入调整裁剪
4. 在左侧选中多页后批量应用当前页裁剪
5. 通过 `Preview` 检查结果
6. 通过 `Export` 导出新 PDF

## 快捷键

- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Shift + Z`：重做
- `Ctrl/Cmd + Y`：重做
- `Ctrl/Cmd + S`：打开导出对话框
- `Ctrl/Cmd + C`：复制当前页裁剪
- `Ctrl/Cmd + V`：粘贴到选中页或当前页
- `Ctrl/Cmd + A`：选中全部页面
- `Ctrl/Cmd + Enter`：将当前页裁剪应用到选中页
- `Ctrl/Cmd + 0`：缩放重置为 `100%`
- `Ctrl/Cmd + +` / `Ctrl/Cmd + -`：缩放
- `Delete` / `Backspace`：清除当前页裁剪
- `Escape`：取消当前草稿裁剪或关闭弹窗
- `PageUp` / `PageDown`：切换页面
- `Tab` / `Shift + Tab`：循环切换页面
- `Space`：打开预览
- 方向键：微调当前裁剪框
- `Shift + 方向键`：大步长微调当前裁剪框

## 导出模式

### Crop box

速度快，直接修改页面 box。适合大多数常规裁剪场景，也是旋转页当前推荐的导出方式。

### Redraw

重新创建目标页面并绘制裁剪后的内容。适合需要“真实裁掉页面尺寸”的场景。

当前限制：

- 若存在已裁剪的 `90°/270°` 旋转页，`Redraw` 预览和导出会被禁用

## 测试覆盖

- 单元测试：
  - 坐标换算
  - 单位换算
  - 吸附逻辑
  - 导出逻辑
  - 旋转页和大文档警告逻辑
- E2E：
  - 主工作流：上传 -> 裁剪 -> 批量应用 -> 预览 -> 导出
  - 旋转页限制：`Redraw` 禁用提示与 `Crop box` 导出

## CI

GitHub Actions 会自动执行：

- `npm ci`
- `npm test`
- `npm run build`
- `npm run test:e2e`

工作流文件位于 [ci.yml](D:/Projects/PDF-Tailor/.github/workflows/ci.yml)。

## 已知限制

- 旋转页的 `Redraw` 支持尚未完成
- 目前没有跨浏览器矩阵测试，E2E 仅跑 Chromium
- 大文档场景已经可用，但缩略图缓存和导出进度仍有优化空间
- 预设尺寸在页面本身小于目标纸张时，会被限制在当前页面尺寸内

## 部署

项目是纯前端静态站点，构建产物位于 `dist/`，可直接部署到任意静态托管环境。
