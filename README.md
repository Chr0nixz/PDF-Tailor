# PDF-Tailor

纯前端 PDF 可视化裁剪工具。支持自由框选、预设纸张尺寸、多页批量应用、预览和导出，全部在浏览器端完成，不依赖后端服务。

## 当前能力

- 打开本地 PDF 并渲染当前页
- 左侧多页缩略图导航，支持 `Ctrl/Cmd + Click` 多选
- 当前页自由框选裁剪
- 拖拽移动、8 个手柄缩放
- 页面边缘与中心线吸附
- 预设纸张尺寸和 9 宫格定位
- 边距输入，支持 `mm / pt` 切换
- 将当前页裁剪批量应用到选中页或全部页
- 预览导出结果
- 两种导出模式：
  - `Crop box`：快速调整页面 box
  - `Redraw`：重建页面内容区域
- Web Worker 导出，避免主线程卡死
- 撤销 / 重做

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

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址通常是 [http://localhost:5173](http://localhost:5173)。

## 构建与测试

```bash
npm test
npm run build
```

## 使用流程

1. 打开本地 PDF
2. 在中间画布拖拽创建裁剪框
3. 可继续拖动、缩放，或在右侧用预设尺寸 / 边距输入调整
4. 需要多页复用时，在左侧选中多个页面后使用批量应用
5. 用 `Preview` 检查最终结果
6. 选择 `Export` 导出新 PDF

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
- `Shift + 方向键`：按更大步长微调当前裁剪框

## 导出模式说明

### Crop box

速度快，保留原始页面内容，仅修改 PDF 页面的可见裁剪区域。适合快速处理。

### Redraw

按照裁剪结果新建页面并重绘内容。输出页面尺寸更直接，通常更适合拿去继续打印或二次处理。

## 项目结构

```text
src/
  components/   UI 组件
  hooks/        交互与渲染逻辑
  store/        Zustand 状态管理
  types/        共享类型
  utils/        坐标、单位、吸附、导出等纯函数
  workers/      导出 Worker
```

## 已有测试覆盖

- 坐标转换
- 裁剪边距换算
- 预设尺寸生成
- 吸附逻辑
- 单位换算
- `crop-box` / `redraw` 导出路径
- 非法裁剪阻断

## 已知限制

- 当前还没有完整的 E2E 浏览器交互测试
- 旋转页面、非常规页面盒模型的兼容性还需要继续加强
- 大文件场景已经可用，但缩略图缓存和导出进度仍有优化空间
- 预设尺寸在页面本身比目标纸张更小时，会被限制在当前页面尺寸内

## 部署

项目是纯前端静态站点，构建产物位于 `dist/`，可直接部署到任意静态托管环境。
