# Law Compare Backend (Rust)

高性能法律条文对比后端服务，使用 Rust 实现。

## 功能特性

### ✅ 已实现

- **高效 Diff 算法**: 使用 `similar` crate 进行词级对比
- **中文分词**: 基于 `jieba-rs` 的中文分词引擎
- **可配置 NER 引擎**: 支持三种模式
  - **Regex 模式** (默认): 快速轻量，85-90% 准确率
  - **BERT 模式**: 高精度 95%+，需要模型文件
  - **Hybrid 模式**: 智能混合，平衡速度和准确率
- **实体识别类型**:
  - 日期/期限
  - 金额
  - 处罚措施
  - 登记事项
  - 适用范围
- **AST 解析**: 结构化解析法律条文（章节条款项）
- **REST API**: Axum 框架提供高性能 HTTP 接口
- **自定义词典**: 支持法律专业术语管理

## 部署与运行指南

### 1. 环境要求
- Rust 1.70+
- Cargo

### 2. 构建
**默认构建（Regex NER）**:
```bash
cargo build --release
```

**启用 BERT NER** (如果需要更高精度的实体识别):
```bash
# 1. 下载 BERT 模型
./scripts/download_bert_model.sh

# 2. 编译启用 BERT 特性
cargo build --release --features bert

# 3. 设置环境变量
export BERT_MODEL_PATH=./models/chinese-ner
```

### 3. 运行
```bash
cargo run --release
```
服务器将在 `http://127.0.0.1:8000` 启动。

### 4. 测试
```bash
cargo test
```

## 项目结构

```
backend/
├── src/
│   ├── main.rs          # 服务器入口点
│   ├── models/          # 数据结构定义 (请求/响应)
│   ├── api/             # API 路由处理
│   ├── diff/            # 文本比对逻辑 (similar)
│   ├── nlp/             # 自然语言处理 (分词、NER)
│   └── ast/             # 法律条文 AST 解析器
└── Cargo.toml           # 依赖管理
```

## 核心逻辑详解

### 1. API 交互
后端提供 HTTP 接口供前端调用，核心接口为 `POST /api/compare`。它接收新旧两段文本，返回详细的对比结果。

### 2. NLP 与 分词 (Tokenizer)
使用 `jieba-rs` 对输入的法律文本进行中文分词。相比于简单的按字符对比，词级对比更能反映法律条文语义的变化。

### 3. 实体识别 (NER)
为了识别诸如“罚款金额变更”、“日期变更”等特定语义，后端实现了 NER 模块。
- **Regex**: 默认模式，通过预定义的正则表达式快速匹配。
- **BERT**: 可选模式，使用深度学习模型进行更精准的识别。

### 4. Diff 算法
使用 `similar` crate (基于 Myers 算法) 计算分词后的序列差异。
- **AST 解析**: 将法律文本解析为结构化的 AST (章/节/条/款)，不仅对比纯文本，还能对比结构上的增删。

## 许可证

MIT
