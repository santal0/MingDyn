# 明代制度与宗室图谱

以仓库内的 `Data.xlsx` 为资料来源的交互式网站。使用 React、TypeScript、Vite 构建，Python 整理数据，GitHub Actions 校验并发布到 GitHub Pages。

## 已实现

- **总览**：主题入口、条目统计、机构分类、帝系与专题查阅路径。
- **官制机构**：分类与机构目录、隶属筛选、全文筛选、品级筛选、分页、官职详情、最多三项并列比较。
- **全站检索**：搜索机构、官职及职责、人物、年号、子嗣封号、字辈、散阶、勋级和科举资料。
- **帝王年表**：时间轴和卡片视图，明／南明筛选，同一人物关联多个年号。
- **宗室谱系**：选择家庭、逐代展开、缩放、人物详情；23 组字辈逐字检索。
- **品级与科举**：文武散阶与勋级对照、同品级官职跳转、童试至殿试、宗室封爵序列。
- **原始资料**：单元格定位、合并区域定位、原文搜索、重复与异写说明、Excel 和 JSON 下载。
- 手机布局、键盘操作、加载失败重试、Hash 详情路由、URL 保存筛选及比较条件。

## 本地运行

需要 Node.js 24（至少 22.12）和 Python 3.10 以上。推荐 Python 3.13，与 CI 一致。

```bash
npm ci
npm run dev
```

打开终端给出的地址，默认路径为 `http://127.0.0.1:5173/MingDyn/`。首次启动前自动读取 Excel，生成 `public/data/`。

```bash
npm run data       # 仅重新生成资料和整理报告
npm run build      # 生成数据、检查 TypeScript、构建 dist/
npm run preview    # 本地查看生产构建
```

Python 解析器只使用标准库，直接读取 XLSX 中的 XML 与合并区域，不需要安装 Python 第三方包。浏览器只加载构建后的 JSON，不解析 Excel。

## GitHub Pages 发布

默认部署目标：`https://santal0.github.io/MingDyn/`。这是预期地址，是否上线以仓库 Actions 的实际部署结果为准。

1. 将源码、`package-lock.json`、`Data.xlsx` 提交并推送到本仓库的 `main` 分支。
2. 在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 在 **Actions** 中查看 **Build, check and deploy MingDyn**；必要时用 **Run workflow** 手动触发。
4. `build` 和 `deploy` 两个任务均成功后，从部署环境中打开实际网站地址。

工作流位于 `.github/workflows/pages.yml`：

- PR：读取 Excel、数据回归测试、TypeScript 检查、生产构建、桌面和手机浏览器测试；不发布。
- `main` 推送或手动触发：完成上述检查后上传 `dist/`，再发布 Pages。
- 检查失败：不执行部署，保留原来成功发布的网站；浏览器失败报告保存为 Actions artifact。
- 使用仓库自动提供的 `GITHUB_TOKEN`，无需个人访问令牌。部署任务仅授予 `pages: write`、`id-token: write`。
- 首次需要仓库维护者启用 Pages，并允许 Actions 运行。工作流不会自动修改仓库设置。

使用 Hash 路由，例如 `/MingDyn/#/institutions`，直接打开或刷新详情不会请求服务器上的子路由。`vite.config.ts` 默认 `base` 为 `/MingDyn/`。

若改仓库名称或使用自定义域名，可在构建时设置 `VITE_BASE_PATH`；同时更新 `playwright.config.ts` 中用于验证的部署路径，以确保 CI 检查真实子路径。

官方参考：[GitHub Pages 自定义工作流](https://docs.github.com/zh/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite 静态部署](https://vite.dev/guide/static-deploy.html)。

## 更新 Excel

1. 修改根目录的 `Data.xlsx`。保持原有主题标题、列分区、官职表头和机构合并区域；机构内新增条目时同步调整对应合并区域。
2. 运行 `npm run data`，核对终端统计以及 `public/data/report.json`。
3. 运行检查，提交 Excel 和需要调整的代码并推送。网站由 Actions 重新构建。

开发服务器运行期间修改 Excel 后，重新运行 `npm run data` 并刷新页面。`public/data/`、公开下载副本 `public/Data.xlsx` 和 `dist/` 均是生成文件，无需提交。

大幅变更工作表数量、主题标题或列布局时，需要同步更新解析器。新公式、无法识别的品级、缺失栏目锚点、缺失官属、重复 ID 或循环亲子关系会使构建失败，以便先核对再发布。

## 数据口径

初始资料统计：1 个工作表，401 行 × 32 列，2,763 个非空单元格，369 个合并区域。

| 资料           |      初始条目数 |
| -------------- | --------------: |
| 官职           |             554 |
| 浏览机构分组   |              70 |
| 帝王／年号记录 | 22（21 位人物） |
| 帝王家庭分组   |              16 |
| 子嗣           |             107 |
| 王房字辈       |              23 |
| 散阶与勋级     |              52 |
| 科举录取结果   |              13 |

“机构分组”包含十二监、督抚系统等原表集合，不是对历史独立衙门数量的统计。官职条目保留重复记录与合并官名，不等同于独立职位数或编制人数。

- **原文保留**：全部非空单元格及合并区域保存到 `source.json`；主资料中的每个字段尽可能记录对应原始单元格。
- **合并区域**：仅在真实合并矩形内取左上角值，不跨空白行或栏目向下填充。
- **分类与隶属**：浏览分类与原表分类分开存储；不按相邻排版推断上下级。尚宝司独立归类，来源仍指向原单元格。
- **重复记录**：全部保留、分别定位，报告中标记；不自动合并定员。
- **人物关联**：去掉姓名中的排版空格。特定异写在 `data/curation.json` 中明确映射并保留原文；未载姓名、残缺姓名、拆字姓名使用独立身份，不据此自动串联世系。
- **时间**：按原表年份显示，保留“1月”等原始时长，不以年份之差替换原表记载。
- **稳定链接**：记录 ID 根据语义字段生成，不直接依赖行号；改名或更改身份字段时链接可能变化，原单元格位置仍随当前工作簿更新。
- **字辈检索**：查找姓名含某字的人物，不声称匹配人物一定属于所选王房。
- **资料边界**：尚未逐条完成外部史料校勘，不补写原表缺失的父子链条、机构存废时间或具体即位日期。

人工整理配置在 `data/curation.json`，包括机构归类规则、人名异写和待核实事项。校核事项同时保存坐标与文字锚点；插入行导致坐标变化时，优先按唯一文字匹配重新定位，不能唯一定位时列为“整理规则待更新”。修正原始资料后应同时复核此配置。

## 验证

```bash
npm run test:data
npx playwright install chromium
npm run build
npm run test:e2e
```

也可运行 `npm run check`。Linux 缺少浏览器系统依赖时，可按 Playwright 官方说明使用 `npx playwright install --with-deps chromium`。测试采用生产构建和真实 `/MingDyn/` 子路径。

数据测试覆盖合并边界、重复机构、复合官名、朱祁镇两段年号、人名异写、未载姓名的独立身份、已知亲子关系和异常数据阻止发布。浏览器测试覆盖搜索、筛选持久化、三项比较、深层链接刷新、谱系展开、字辈与科举跳转、原文定位、移动导航、页面溢出和加载失败恢复。

## 目录

```text
Data.xlsx                    原始资料
data/curation.json           有依据的归类、异写与校核标记
scripts/build_data.py        数据提取、关联、校验与 JSON 输出
src/pages/                  各主题页面
src/components.tsx          通用组件与官职比较
src/styles.css              视觉样式及响应式布局
tests/                      数据与浏览器回归测试
.github/workflows/pages.yml 校验和发布流程
```
