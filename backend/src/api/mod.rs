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
async fn compare(
    Json(payload): Json<CompareRequest>,
) -> Result<Json<DiffResult>, StatusCode> {
    // Determine NER mode from options or use default
    let ner_mode = payload.options.ner_mode
        .and_then(|s| NERMode::from_str(&s))
        .unwrap_or_default();

    tracing::info!("Using NER mode: {:?}", ner_mode);

    // Extract entities from both texts
    let entities = if payload.options.detect_entities {
        let ner_engine = create_ner_engine(ner_mode)
            .map_err(|e| {
                tracing::error!("Failed to create NER engine: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        tracing::info!("Using NER engine: {}", ner_engine.name());

        let mut all_entities = Vec::new();
        all_entities.extend(
            ner_engine.extract_entities(&payload.old_text)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        );
        all_entities.extend(
            ner_engine.extract_entities(&payload.new_text)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        );
        all_entities
    } else {
        Vec::new()
    };

    // Perform detailed word-level diff
    let mut result = compare_texts(&payload.old_text, &payload.new_text, entities);

    // Perform structural article alignment (The "Pro" feature)
    let article_changes = align_articles(&payload.old_text, &payload.new_text);
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

/// Create API router
pub fn create_router() -> Router {
    Router::new()
        .route("/api/compare", post(compare))
        .route("/api/parse", post(parse))
        .route("/health", axum::routing::get(health))
}
