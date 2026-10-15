# Using Mermaid Beauty across devices

Install and enable Mermaid Beauty on each device from Obsidian's Community plugins browser. Keep the same plugin version on all devices when comparing appearance. The complete offline renderer is about 6 MB, exceeding Obsidian Sync Standard's 5 MB per-file limit; syncing settings does not guarantee that the renderer file arrived.

Open the same [public example](examples.md) in Reading view. If Obsidian asks whether to display Mermaid diagrams, decide based on whether you trust the vault. Then use **Mermaid Beauty: Refresh diagrams**. The plugin does not change that permission, the note text, or its edit history.

For manual installation, copy `main.js`, `manifest.json`, and `styles.css` from the same release together. A partial or mixed-version installation can leave the plugin unavailable or show the wrong appearance.

## Common questions

| Symptom | What to check |
|---|---|
| Only source code is visible | Use Reading view, or move the cursor outside the block in Live Preview. Source mode intentionally displays code. |
| Obsidian asks to show Mermaid | Allow only for a trusted vault. The plugin respects the host permission. |
| An old diagram keeps its appearance | Run Refresh diagrams; ensure enhanced rendering is enabled and its type is not set to Native. Explicit source styles still take precedence. |
| Rendering fails or changes with another plugin | Disable one of the plugins that replaces Mermaid rendering and refresh. Mermaid Beauty falls back to the host renderer if enhancement fails. |
| A wide diagram becomes too small | Turn off Fit to width and scroll horizontally. This preserves natural label size. |
| PNG cannot be copied | The OS or WebView may not allow image clipboard writes. Use Export as PNG, then share that file. |
| Cannot paste SVG | Keep Beauty enabled between copying and pasting into an Obsidian note; pasting creates an SVG attachment and embeds it. After a plugin reload or in another vault, copy again. Other apps must support SVG images. If unavailable, save and import the SVG file. |
| Where are exported images? | On desktop, Export as SVG…/PNG… opens a system save dialog. It starts in the configured attachment folder, then remembers the last successful location. The completion notice includes **Show in folder**. Cancel writes no image. Mobile exports still use the configured attachment folder. Exporting does not insert a link into the note. |
| An image cannot be exported | External image resources are not fetched during export. Use embedded raster images, or a diagram without external images. |
| SVG text differs on another device | SVG relies on fonts installed in the viewer. Use PNG when exact text appearance matters. |

The welcome guide and PNG/SVG export require version 1.5.0 or later.

## Mobile verification

The browser suite checks narrow containers, horizontal scrolling, and PNG encoding. Touch export controls have a 44-pixel target and remain visible without hover. These checks do not establish performance, clipboard support, or compatibility on a physical mobile device.

Before a mobile release, test on both iOS and Android: first enablement and Mermaid permission, reopening a note, light/dark mode, a dense diagram, horizontal scrolling, PNG copy or its save fallback, SVG/PNG attachment creation, and disabling the plugin. Record the Obsidian version, OS, device, and any other Mermaid plugins. Compare the original note before and after; only requested image attachments should be added.

## 中文说明

每台设备都需在 Obsidian 的第三方插件市场单独安装、启用插件。完整离线渲染器约 6 MB，超过 Sync Standard 的 5 MB 单文件限制；配置同步成功，不代表渲染文件也已同步。手动安装时，三个文件必须来自同一个版本。

先用同一组[公开示例](examples.md)确认基本效果。只显示代码时切换阅读视图，旧图不变时执行「刷新图表」，宽图字太小时关闭「适应宽度」后横向滚动。原生 Mermaid 的显示权限由用户根据笔记库是否可信决定。

图片复制受设备权限限制，失败后可改为导出 PNG。「复制为 SVG」复制带样式的矢量图像。在 Obsidian 笔记中粘贴时，会保存 SVG 附件并插入图片引用；复制和粘贴期间需保持 Beauty 启用。重载插件或切换笔记库后需重新复制。其他软件需支持 SVG 图像，设备不支持时可导出文件后导入。点击「复制与导出」后，桌面端的两项导出操作会打开系统保存窗口。首次默认附件目录，成功后记住所选文件夹；完成提示显示实际位置并提供「在文件夹中显示」。取消时不写入图片，笔记保持原样。移动端仍遵循「文件与链接 → 附件默认存放路径」。SVG 在不同设备上可能因字体不同而变化，需要固定外观时使用 PNG。首次使用指南和图片导出需要 1.5.0 或更高版本。

窄屏浏览器检查不等于手机验收。移动端发布前，仍需分别在 iOS、Android 真机检查启用、权限提示、已有笔记刷新、深浅色切换、复杂图滚动、图片复制与保存、插件关闭，并记录设备和版本。
