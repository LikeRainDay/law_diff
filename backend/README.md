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

## NER 模式选择

### 快速对比

| 模式 | 准确率 | 速度 | 内存 | 依赖 |
|------|--------|------|------|------|
| **Regex** | 85-90% | < 1ms | < 10MB | 无 |
| **BERT** | 95%+ | 50-200ms | 300-500MB | 模型文件 |
| **Hybrid** | 90-95% | 1-50ms | 300-500MB | 模型文件 |

### 使用建议

- **开发/测试**: 使用 Regex（默认）
- **生产（通用）**: 使用 Regex
- **生产（高精度）**: 使用 Hybrid
- **研究/分析**: 使用 BERT

详见 [NER_USAGE_GUIDE.md](./NER_USAGE_GUIDE.md)

## 技术栈

- **Web 框架**: Axum 0.7
- **异步运行时**: Tokio
- **中文 NLP**: jieba-rs 0.6
- **Diff 算法**: similar 2.4
- **序列化**: serde + serde_json
- **日志**: tracing + tracing-subscriber

## API 端点

### POST /api/compare
对比两个法律文本

**请求体**:
```json
{
  "old_text": "第一条 ...",
  "new_text": "第一条 ...",
  "options": {
    "detect_entities": true,
    "granularity": "word"
  }
}
```

**响应**:
```json
{
  "similarity": 0.92,
  "changes": [...],
  "entities": [...],
  "stats": {
    "additions": 10,
    "deletions": 5,
    "modifications": 3,
    "unchanged": 100
  }
}
```

### POST /api/parse
解析法律条文为 AST 结构

**请求体**: 纯文本法律条文

**响应**: AST JSON 结构

### GET /health
健康检查

## 快速开始

### 构建

**默认构建（Regex NER）**:
```bash
cd backend
cargo build --release
```

**启用 BERT NER**:
```bash
# 1. 下载 BERT 模型
./scripts/download_bert_model.sh

# 2. 编译启用 BERT 特性
cargo build --release --features bert

# 3. 设置环境变量
export BERT_MODEL_PATH=./models/chinese-ner
```

### 运行

```bash
cargo run --release
```

服务器将在 `http://127.0.0.1:8000` 启动

### 测试

```bash
cargo test
```

## 项目结构

```
backend/
├── src/
│   ├── main.rs          # 服务器入口点
│   ├── models/          # 数据模型
│   │   └── mod.rs
│   ├── api/             # REST API 端点
│   │   └── mod.rs
│   ├── diff/            # Diff 算法
│   │   └── mod.rs
│   ├── nlp/             # NLP 处理
│   │   ├── mod.rs
│   │   ├── tokenizer.rs # 中文分词
│   │   └── ner.rs       # 实体识别
│   └── ast/             # AST 解析
│       └── mod.rs
└── Cargo.toml
```

## 算法详解

### 1. Diff 算法 (similar crate)

使用 Myers diff 算法进行高效文本对比：

```rust
let diff = TextDiff::from_words(old_text, new_text);
let similarity = diff.ratio(); // 相似度 0.0-1.0
```

特点：
- O(ND) 时间复杂度
- 词级对比更适合中文
- 自动合并相邻的增删为修改

### 2. 中文分词 (jieba-rs)

基于 HMM 和 Viterbi 算法的中文分词：

```rust
let tokens = jieba.cut(text, false);
```

特点：
- 支持自定义词典
- 法律专业术语预置
- 高性能（纯 Rust 实现）

### 3. NER 实体识别

当前使用正则表达式进行模式匹配：

```rust
// 日期模式
r"(\d{4}年\d{1,2}月\d{1,2}日|\d+个月|\d+年)"

// 金额模式
r"([一二三四五六七八九十百千万亿\d]+元)"

// 处罚模式
r"(处罚|罚款|吊销|拘留|监禁|警告)"
```

**未来规划**: 集成 rust-bert 进行深度学习 NER

### 4. AST 解析

递归下降解析器，识别法律文档层级结构：

```
文档根
└── 章 (Chapter)
    └── 节 (Section)
        └── 条 (Article)
            └── 款 (Clause)
                └── 项 (Item)
```

## 性能优化

- **编译优化**: Release 模式启用 LTO 和最高优化级别
- **并发处理**: Tokio 异步运行时
- **内存效率**: 零拷贝字符串处理
- **缓存**: Jieba 分词器使用全局单例

## CORS 配置

后端默认允许所有来源的跨域请求，适合开发环境。生产环境请配置具体的允许来源：

```rust
let cors = CorsLayer::new()
    .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
    .allow_methods([Method::GET, Method::POST])
    .allow_headers([header::CONTENT_TYPE]);
```

## 环境要求

- Rust 1.70+
- Cargo

## 许可证

MIT
