# 血染钟楼玩家角色速查

像游戏时手边的角色纸一样，查阅角色能力、剧本、规则和人数配置。支持中文和英文，全部资源内嵌，直接打开根目录 `index.html` 即可离线使用；分发时只需要这一个文件。

收录暗流涌动、No Greater Joy、7–9 人进阶三个剧本，以及 5/8 人流程示例。不包含身份标记、笔记或本地存储。语言、剧本、页签和流程阶段只在本次打开期间保留，刷新恢复默认。

## 开发

需要 Node.js 24 或更新版本，无第三方 npm 依赖。

```sh
npm run build
npm test
npm run test:browser
```

- `src/data/`：角色、剧本和导航图标。
- `src/i18n.json`：使用稳定键的中英文界面文案。
- `src/views/`：显式中英文规则/流程模板，不做运行时 DOM 文本翻译。
- `src/styles/app.css`：按组件组织的基础与响应式样式，同条件同选择器仅定义一次。
- `src/app.js`：页面渲染与当前文档内的状态。
- `assets/home-zh.png`、`assets/home-en.png`：必须保留的原始中英文首页海报。
- `assets/rules.jpg`：规则页钟楼背景。
- `scripts/build.mjs`：生成单文件 `index.html`。请修改源码后重新构建，不直接编辑生成文件。

浏览器检查默认使用 Windows Chrome 的标准安装路径；其他系统或安装位置可设置 `CHROME_PATH`。检查使用独立临时配置和单独复制的 HTML，不读取个人浏览器数据，截图保存在系统临时目录，命令完成后输出位置。

项目范围和人工审核项目见 [路线文档](docs/ROADMAP.md)，样式清理说明见 [CSS 审计记录](docs/CSS_AUDIT.md)。

CSS 结构检查包含在 `npm test` 中。设置 `CSS_AUDIT=1` 后运行浏览器检查，可记录九种宽度下的计算样式、截图和选择器使用情况，结果保存在命令输出的临时目录。
