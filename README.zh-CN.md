# Mermaid Beauty

让 Obsidian 中的 Mermaid 图更易读。启用插件即可美化已有的 `mermaid` 代码块，无需修改源码。

[English](README.md)

[![同一张发布流程的布局对比：原生渲染中分组散落、连线跨图绕行；插件将检查、验证、发布从左到右排列，反馈回路走底部。](docs/images/flowchart-comparison-stacked.png)](docs/images/flowchart-comparison-stacked.png)

这张发布流程启用插件后，按**检查 → 验证 → 发布**从左到右排列，同层卡片等宽对齐，减少连线多余的折弯，反馈回路走主流程下方。前后的 11 个节点、16 条连接完全相同。

前后使用[同一份 Mermaid 源码](tests/browser/readme-sources.ts)，按相同比例展示：上方为原生 Mermaid 11.13.0 的默认 Dagre 布局，下方为插件自动使用的 ELK 布局和默认「清爽」配色，没有手工摆放节点或指定颜色。点击图片可放大查看。

## 安装

需要 **Obsidian 1.12.7+**。打开 **设置 → 第三方插件 → 浏览**，搜索 **Mermaid Beauty**，安装并启用。[社区市场页面](https://community.obsidian.md/plugins/mermaid-beauty)

### 手动安装

1. 从 [最新 Release](https://github.com/theChildinus/mermaid-beauty/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将三个文件放入笔记库的 `.obsidian/plugins/mermaid-beauty/` 目录。
3. 重新加载 Obsidian，启用 **Mermaid Beauty**。

## 调整外观

打开 **设置 → Mermaid Beauty**：

- **配色**：清爽、冷静、自然三套协调多色方案，也可选单色或自定义颜色，随 Obsidian 浅色、深色主题切换。
- **大小与布局**：调整字号、连线粗细、圆角、间距和宽度适配。
- **按图类型设置**：共用默认外观、单独设置或保留原生渲染。支持流程图、时序图、类图、思维导图和多种数据图表。

新安装默认使用协调多色。升级时保留已有外观，可在 **默认外观 → 配色方式 → 协调多色** 中切换。

## 使用说明

- 图表在本地渲染，源码不会上传；图中引用的网络图片可能需要联网。
- 源码中显式指定的样式优先。如果其他插件也接管 Mermaid 渲染并发生冲突，请关闭其中一个。
- 内置渲染器约 **5.9 MB**，超过 Obsidian Sync Standard 的 5 MB 单文件限制，需在各设备上单独安装。移动端尚未经过真机验证。

[MIT 许可证](LICENSE) · [第三方许可声明](THIRD_PARTY_LICENSES.md)
