use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Article change type for structural diff
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ArticleChangeType {
    Unchanged,
    Modified,
    Renumbered, // Content similar but number changed
    Split,      // One article split into multiple
    Merged,     // Multiple articles merged into one
    Moved,      // Position changed significantly
    Added,
    Deleted,
    Replaced,   // Number reused but content is completely different
    Preamble,   // Metadata/Intro/TOC
}

/// Minimal info about an article for diff reference
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleInfo {
    pub number: Arc<str>,
    pub content: Arc<str>,
    pub title: Option<Arc<str>>,
    pub start_line: usize,
    pub node_type: NodeType,
    #[serde(default)]
    pub parents: Vec<Arc<str>>, // Hierarchy context (e.g. ["第一章 总则"])
}

/// Structural change in an article
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleChange {
    #[serde(rename = "type")]
    pub change_type: ArticleChangeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_article: Option<ArticleInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_articles: Option<Vec<ArticleInfo>>, // Vector for split/merge cases
    #[serde(skip_serializing_if = "Option::is_none")]
    pub similarity: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Vec<Change>>, // Detailed word-level diff
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Article node type in AST
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Part,     // 编
    Chapter,  // 章
    Section,  // 节
    Article,  // 条
    Clause,   // 款
    Item,     // 项
    Preamble, // 序言/目录/前言
}

/// AST node for legal article structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleNode {
    pub node_type: NodeType,
    pub number: Arc<str>,
    pub title: Option<Arc<str>>,
    pub content: Arc<str>,
    pub children: Vec<ArticleNode>,
    #[serde(default)]
    pub start_line: usize,
}

/// Change type in diff
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChangeType {
    Add,
    Delete,
    Modify,
    Unchanged,
}

/// Single change in diff result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Change {
    #[serde(rename = "type")]
    pub change_type: ChangeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_line: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_line: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_content: Option<Arc<str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_content: Option<Arc<str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entities: Option<Vec<Entity>>,
}

/// Entity type for NER
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EntityType {
    Date,     // 日期/期限
    Scope,    // 范围
    Registry, // 登记
    Penalty,  // 处罚
    Amount,   // 金额
    Other,
}

/// Named entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    #[serde(rename = "type")]
    pub entity_type: EntityType,
    pub value: Arc<str>,
    pub confidence: f32,
    pub position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub start: usize,
    pub end: usize,
}

/// Diff statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffStats {
    pub additions: usize,
    pub deletions: usize,
    pub modifications: usize,
    pub unchanged: usize,
}

/// Multi-dimensional similarity score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarityScore {
    pub char_similarity: f32,
    pub jaccard_similarity: f32,
    pub containment_similarity: f32,
    pub keyword_weight: f32,
    pub composite: f32,
}

impl SimilarityScore {
    pub fn new(char_sim: f32, jaccard_sim: f32, containment_sim: f32, keyword_weight: f32) -> Self {
        let composite = char_sim * 0.3 + jaccard_sim * 0.2 + containment_sim * 0.3 + keyword_weight * 0.2;
        Self {
            char_similarity: char_sim,
            jaccard_similarity: jaccard_sim,
            containment_similarity: containment_sim,
            keyword_weight,
            composite,
        }
    }
}

/// Complete diff result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffResult {
    pub similarity: f32,
    pub changes: Vec<Change>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub article_changes: Option<Vec<ArticleChange>>, // Structural diff result
    pub entities: Vec<Entity>,
    pub stats: DiffStats,
}

/// Compare request
#[derive(Debug, Deserialize)]
pub struct CompareRequest {
    pub old_text: String,
    pub new_text: String,
    #[serde(default)]
    pub options: CompareOptions,
}

#[derive(Debug, Deserialize, Default)]
pub struct CompareOptions {
    #[serde(default = "default_true")]
    pub detect_entities: bool,
    #[serde(default = "default_word_granularity")]
    pub granularity: String,
    #[serde(default)]

    pub ner_mode: Option<String>, // "regex", "bert", or "hybrid"
    #[serde(default = "default_align_threshold")]
    pub align_threshold: f32,
    #[serde(default)]
    pub format_text: bool,

    // Similarity filter options
    pub min_similarity: Option<f32>,
    pub max_similarity: Option<f32>,
    #[serde(default)]
    pub invert_similarity: bool,
}

fn default_align_threshold() -> f32 {
    0.6
}

fn default_true() -> bool {
    true
}

fn default_word_granularity() -> String {
    "word".to_string()
}
