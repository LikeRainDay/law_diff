# Law Compare Frontend

这是一个基于 [Next.js](https://nextjs.org) 构建的法条对比前端应用。

## 快速开始

### 1. 安装依赖

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 2. 运行开发服务器

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看结果。

### 3. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
frontend/
├── app/                 # Next.js App Router 页面及布局
├── components/          # React 组件
│   ├── diff/            # 核心对比组件 (GitDiffView, SideBySideView 等)
│   ├── layout/          # 布局组件
│   └── ui/              # 通用 UI 组件
├── lib/                 # 工具函数和类型定义
│   ├── diff-utils.ts    # 差异处理逻辑
│   └── types.ts         # 类型定义
└── public/              # 静态资源
```

## 核心功能与逻辑

### 1. 法条对比 (Comparison)

前端通过调用后端 API 获取法条对比结果，并提供两种可视化模式：

- **API 调用**: `POST /api/compare` (代理到后端 `http://127.0.0.1:8000/api/compare`)
- **数据流**: 用户输入旧法条和新法条 -> 发送请求 -> 获取差异数据 (`additions`, `deletions`, `modifications`, `entities`) -> 渲染视图。

### 2. 核心组件

#### `components/diff/SideBySideView.tsx` (左右对照模式)
- **功能**: 左侧显示旧文本，右侧显示新文本。
- **高亮**: 使用绿色背景高亮新增内容，红色背景高亮删除内容。
- **对齐**: 尝试将相关的法条段落对齐显示，方便阅读。

#### `components/diff/GitDiffView.tsx` (Git 风格模式)
- **功能**: 类似于 GitHub 的 diff 视图，以行或段落为单位展示差异。
- **逻辑**: 直接展示文本的增删变迁，适合快速查看具体的文本改动。

#### `components/diff/AnchorNavigation.tsx` (差异导航)
- **功能**: 提供浮动的导航栏，允许用户在差异点之间快速跳转。
- **交互**: 点击“上一个”或“下一个”按钮，页面平滑滚动到对应的差异位置。

### 3. 差异处理逻辑

前端主要依赖 `diff-match-patch` 库和自定义的 `lib/diff-utils.ts` 来处理文本差异。虽然大部分重型计算（如分词、AST 解析）由 Rust 后端完成，前端仍负责最终的 UI 渲染逻辑和交互体验。

## 环境变量

如果需要修改后端 API 地址，请在 `.env.local` 中配置（或修改 `next.config.ts` 中的 rewrite 规则）：

```env
# 示例
NEXT_PUBLIC_API_URL=http://localhost:8000
```
