# Mermaid Beauty

为 Obsidian 中的 Mermaid 图统一配色、字体、线条和布局，让图表更易读。安装后直接用于现有的 `mermaid` 代码块，无需修改源码。

[English](README.md)

## 功能

- **浅色与深色配色**：三套完整的协调多色方案，使用柔和填充和清晰的文字、边框、连线。保留单色色系和自定义颜色。
- **协调多色 / 统一单色**：协调多色区分支持图类型中的节点、参与者、分组和组件用途；流程图按源码节点 ID 分配颜色，插入或重排其他节点时保持原有颜色。统一单色保留原有外观，数据系列仍使用各自的颜色。可全局选择，也可按图类型设置。
- **外观与布局调整**：支持字号、连线粗细、矩形圆角、间距和宽度适配。适用的关系图默认使用 ELK 布局，也可选择 Dagre。
- **按图类型设置**：使用全局样式、独立样式或原有渲染器。切换到继承模式会保留独立配置，切回后恢复；点击重置才会删除。支持流程图、时序图、类图、思维导图及多种数据图表。
- **本地渲染**：内置 Mermaid、ELK 和 ZenUML，不上传图表、收集遥测或在线下载渲染器。图中主动引用的外部图片仍可能需要联网。
- **中英文界面**：可跟随 Obsidian 语言，也可手动切换。

## 安装

需要 **Obsidian 1.12.7 或更高版本**。

### 社区插件安装

打开 **设置 → 第三方插件 → 浏览**，搜索 **Mermaid Beauty**，安装并启用。也可以打开[社区市场页面](https://community.obsidian.md/plugins/mermaid-beauty)。

### 手动安装

1. 从 [最新 Release](https://github.com/theChildinus/mermaid-beauty/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将三个文件放入笔记库的 `.obsidian/plugins/mermaid-beauty/` 目录。
3. 重新加载 Obsidian，在 **设置 → 第三方插件** 中启用 **Mermaid Beauty**。

启用后，已有图表会自动应用样式。在 **设置 → Mermaid Beauty** 中选择配色、调整外观；图表源码中显式指定的样式优先。如果与其他接管 Mermaid 渲染器的插件冲突，请关闭其中一个。

新安装默认使用“协调多色”；升级时保留原有单色设置。要切换，打开 **默认外观 → 配色方式**。自定义的节点填充、边框和文字颜色仍优先；需要自动区分颜色时，可选择预设配色。

在配色卡片中选择“清爽蓝青”“冷色秩序”或“柔和自然”。卡片展示实际的节点填充、边框和文字颜色，多色和单色分别记住上次选择，自定义颜色默认折叠。已保存的单色预设及其颜色保持兼容。

连续调整会合并保存，切换界面语言不会重绘笔记中的图表。

**Obsidian Sync Standard 用户注意**：内置渲染器约 5.9 MB，超过该套餐的单文件 5 MB 限制，请在每台设备上单独安装。移动端仍需真机验证。

## 效果对比

前后使用相同的 [Mermaid 源码](tests/browser/readme-sources.ts)。**Before** 为独立运行的原生 Mermaid 11.13.0，使用默认主题和布局；**After** 使用 Mermaid Beauty 的薄荷绿预设。点击图片可查看高清原图。

### 订单处理 · 流程图

[![流程图使用前后对比](docs/images/flowchart-comparison.png)](docs/images/flowchart-comparison.png)

---

[MIT 许可证](LICENSE) · [第三方许可声明](THIRD_PARTY_LICENSES.md)
