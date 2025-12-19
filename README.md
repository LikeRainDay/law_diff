# Law Compare (法条对比工具)

> 这是一个用于法条对比的工具，旨在直观展示新旧法条的差异和变迁。
> 灵感来源于竞品效果: http://m.fadada.com/article/Basics-020737

本项目包含两个主要部分：
- **Frontend**: 基于 Next.js 构建的用户界面，提供 Git 风格对比和左右对照模式。
- **Backend**: 基于 Rust 构建的高性能后端，负责自然语言处理 (NLP)、实体识别 (NER) 和文本差异比对 (Diff)。

## 功能特性

- **直观的对比模式**:
  - **Git 风格**: 类似于代码差异的行级对比。
  - **左右对照**: 左右分屏展示，支持差异点锚点导航。
- **智能分析**:
  - 自动识别法条结构（章、节、条、款、项）。
  - 识别特定实体（如日期、金额、处罚措施等）的变更。
- **高性能**: 后端采用 Rust 编写，处理长文本比对速度极快。

## 项目结构

```
.
├── frontend/    # Next.js 前端项目
├── backend/     # Rust 后端项目
└── README.md    # 项目总说明
```

## 部署与运行指南

### 前端 (Frontend)

前端位于 `frontend` 目录，是一个标准的 Next.js 应用。

1. **进入目录**:
   ```bash
   cd frontend
   ```

2. **安装依赖**:
   ```bash
   npm install
   # 或者
   yarn install
   # 或者
   pnpm install
   ```

3. **开发模式运行**:
   ```bash
   npm run dev
   ```
   访问: [http://localhost:3000](http://localhost:3000)

4. **生产环境构建与运行**:
   ```bash
   npm run build
   npm start
   ```

更多详细信息请参阅 [frontend/README.md](./frontend/README.md)。

### 后端 (Backend)

后端位于 `backend` 目录，是一个基于 Axum 框架的 Rust 应用。

1. **进入目录**:
   ```bash
   cd backend
   ```

2. **环境要求**:
   - Rust 1.70+
   - Cargo

3. **运行 (开发/生产)**:
   ```bash
   # 开发模式
   cargo run

   # 生产模式 (推荐)
   cargo run --release
   ```
   服务默认运行在 `http://127.0.0.1:8000`。

更多详细信息请参阅 [backend/README.md](./backend/README.md)。
