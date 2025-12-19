use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Router,
};

use crate::{
    diff::{compare_texts, aligner::align_articles},
    models::{CompareRequest, DiffResult},
    nlp::{NERMode, create_ner_engine},
    ast::parse_article,
};

/// Compare two legal texts
// Helper to extract entities
fn extract_entities_helper(payload: &CompareRequest) -> Vec<crate::models::Entity> {
    let ner_mode = payload.options.ner_mode
        .as_ref()
        .and_then(|s| NERMode::from_str(s.as_str()))
        .unwrap_or_default();

    if payload.options.detect_entities {
        if let Ok(ner_engine) = create_ner_engine(ner_mode) {
            let mut all_entities = Vec::new();
            if let Ok(e) = ner_engine.extract_entities(&payload.old_text) {
                all_entities.extend(e);
            }
            if let Ok(e) = ner_engine.extract_entities(&payload.new_text) {
                all_entities.extend(e);
            }
            return all_entities;
        }
    }
    Vec::new()
}

/// Compare two legal texts (Git/Line Diff Only)
async fn compare_git(
    Json(payload): Json<CompareRequest>,
) -> Result<Json<DiffResult>, StatusCode> {
    let entities = extract_entities_helper(&payload);
    let result = compare_texts(&payload.old_text, &payload.new_text, entities);
    Ok(Json(result))
}

/// Compare two legal texts (Structure/AST Diff Only)
async fn compare_structure(
    Json(payload): Json<CompareRequest>,
) -> Result<Json<DiffResult>, StatusCode> {
    let mut result = DiffResult {
        changes: vec![], // Empty git changes
        stats: crate::models::DiffStats { additions: 0, deletions: 0, modifications: 0, unchanged: 0 },
        similarity: 0.0,
        entities: vec![], // Structure view logic currently doesn't use the global entity list deeply, can be added if needed
        article_changes: None,
    };

    let article_changes = align_articles(
        &payload.old_text,
        &payload.new_text,
        payload.options.align_threshold,
        payload.options.format_text
    );

    // Calculate overall similarity as average
    let total_sim: f32 = article_changes.iter().map(|c| c.similarity.unwrap_or(0.0)).sum();
    if !article_changes.is_empty() {
        result.similarity = total_sim / article_changes.len() as f32;
    }

    result.article_changes = Some(article_changes);
    Ok(Json(result))
}

/// Compare two legal texts (Full Analysis)
async fn compare(
    Json(payload): Json<CompareRequest>,
) -> Result<Json<DiffResult>, StatusCode> {
    let entities = extract_entities_helper(&payload);

    // 1. Git Diff
    let mut result = compare_texts(&payload.old_text, &payload.new_text, entities);

    // 2. Structure Diff
    let article_changes = align_articles(
        &payload.old_text,
        &payload.new_text,
        payload.options.align_threshold,
        payload.options.format_text
    );
    result.article_changes = Some(article_changes);

    Ok(Json(result))
}



/// Parse legal article text to AST
async fn parse(
    Json(text): Json<String>,
) -> impl IntoResponse {
    let ast = parse_article(&text);
    Json(ast)
}

/// Health check endpoint
async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "law-compare-backend"
    }))
}

/// Get example texts
async fn get_examples() -> impl IntoResponse {
    let origin = std::fs::read_to_string("examples/origin.txt")
        .unwrap_or_else(|_| "Error loading origin.txt".to_string());

    let now = std::fs::read_to_string("examples/now.txt")
        .unwrap_or_else(|_| "Error loading now.txt".to_string());

    Json(serde_json::json!({
        "old_text": origin,
        "new_text": now
    }))
}

/// Create API router
pub fn create_router() -> Router {
    Router::new()
        .route("/api/compare", post(compare))
        .route("/api/compare/git", post(compare_git))
        .route("/api/compare/structure", post(compare_structure))
        .route("/api/parse", post(parse))
        .route("/api/examples", axum::routing::get(get_examples))
        .route("/health", axum::routing::get(health))
}
