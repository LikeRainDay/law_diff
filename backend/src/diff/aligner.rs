use crate::ast::parse_article;
use crate::diff::similarity::{calculate_composite_similarity, SimilarityScore};
use crate::models::{ArticleChange, ArticleChangeType, ArticleInfo, ArticleNode, NodeType};
use crate::nlp::tokenizer::tokenize_to_set;


// Thresholds for alignment decisions
const HIGH_SIMILARITY_THRESHOLD: f32 = 0.75;  // Strong match
const MEDIUM_SIMILARITY_THRESHOLD: f32 = 0.5;  // Potential split/merge
const EXACT_MATCH_THRESHOLD: f32 = 0.98;       // Unchanged

/// Represents a candidate alignment between old and new articles
#[derive(Debug, Clone)]
struct AlignmentCandidate {
    old_indices: Vec<usize>,
    new_indices: Vec<usize>,
    total_score: f32,
    avg_score: f32,
}

/// Main function to perform intelligent structural alignment of legal articles
pub fn align_articles(old_text: &str, new_text: &str) -> Vec<ArticleChange> {
    // 1. Parse and flatten articles
    let old_ast = parse_article(old_text);
    let new_ast = parse_article(new_text);

    let old_articles = flatten_articles(&old_ast);
    let new_articles = flatten_articles(&new_ast);

    if old_articles.is_empty() && new_articles.is_empty() {
        return Vec::new();
    }

    // 2. Build similarity matrix
    let similarity_matrix = build_similarity_matrix(&old_articles, &new_articles);

    // 3. Perform multi-stage alignment
    let mut changes = Vec::new();
    let mut used_old = vec![false; old_articles.len()];
    let mut used_new = vec![false; new_articles.len()];

    // Stage 1: Find high-confidence 1:1 matches
    find_one_to_one_matches(
        &old_articles,
        &new_articles,
        &similarity_matrix,
        &mut used_old,
        &mut used_new,
        &mut changes,
    );

    // Stage 2: Detect split patterns (1:N)
    detect_splits(
        &old_articles,
        &new_articles,
        &similarity_matrix,
        &mut used_old,
        &mut used_new,
        &mut changes,
    );

    // Stage 3: Detect merge patterns (N:1)
    detect_merges(
        &old_articles,
        &new_articles,
        &similarity_matrix,
        &mut used_old,
        &mut used_new,
        &mut changes,
    );

    // Stage 4: Handle remaining articles
    handle_remaining_articles(
        &old_articles,
        &new_articles,
        &used_old,
        &used_new,
        &mut changes,
    );

    changes
}

/// Build a comprehensive similarity matrix between all old and new articles
fn build_similarity_matrix(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
) -> Vec<Vec<SimilarityScore>> {
    let mut matrix = Vec::with_capacity(old_articles.len());

    for old_art in old_articles {
        let mut row = Vec::with_capacity(new_articles.len());
        let old_tokens = tokenize_to_set(&old_art.content);

        for new_art in new_articles {
            let new_tokens = tokenize_to_set(&new_art.content);
            let score = calculate_composite_similarity(
                &old_art.content,
                &new_art.content,
                &old_tokens,
                &new_tokens,
            );
            row.push(score);
        }
        matrix.push(row);
    }

    matrix
}

/// Find high-confidence 1:1 matches
fn find_one_to_one_matches(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
    similarity_matrix: &[Vec<SimilarityScore>],
    used_old: &mut [bool],
    used_new: &mut [bool],
    changes: &mut Vec<ArticleChange>,
) {
    for (old_idx, old_art) in old_articles.iter().enumerate() {
        if used_old[old_idx] {
            continue;
        }

        let mut best_new_idx = None;
        let mut best_score = 0.0;

        for (new_idx, _new_art) in new_articles.iter().enumerate() {
            if used_new[new_idx] {
                continue;
            }

            let score = similarity_matrix[old_idx][new_idx].composite;
            if score > best_score && score >= HIGH_SIMILARITY_THRESHOLD {
                best_score = score;
                best_new_idx = Some(new_idx);
            }
        }

        if let Some(new_idx) = best_new_idx {
            let new_art = &new_articles[new_idx];

            // Determine change type
            let change_type = if best_score >= EXACT_MATCH_THRESHOLD && old_art.number == new_art.number {
                ArticleChangeType::Unchanged
            } else if old_art.number == new_art.number {
                ArticleChangeType::Modified
            } else if best_score >= 0.9 {
                // High similarity but different number → Renumbered
                ArticleChangeType::Renumbered
            } else {
                // Content changed and number changed → Moved
                ArticleChangeType::Moved
            };

            changes.push(ArticleChange {
                change_type,
                old_article: Some(old_art.clone()),
                new_articles: Some(vec![new_art.clone()]),
                similarity: Some(best_score),
                details: None,
            });

            used_old[old_idx] = true;
            used_new[new_idx] = true;
        }
    }
}

/// Detect split patterns: one old article → multiple new articles
fn detect_splits(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
    similarity_matrix: &[Vec<SimilarityScore>],
    used_old: &mut [bool],
    used_new: &mut [bool],
    changes: &mut Vec<ArticleChange>,
) {
    for (old_idx, old_art) in old_articles.iter().enumerate() {
        if used_old[old_idx] {
            continue;
        }

        // Find all new articles with medium+ similarity
        let mut candidates: Vec<(usize, f32)> = new_articles
            .iter()
            .enumerate()
            .filter(|(new_idx, _)| !used_new[*new_idx])
            .map(|(new_idx, _)| {
                let score = similarity_matrix[old_idx][new_idx].composite;
                (new_idx, score)
            })
            .filter(|(_, score)| *score >= MEDIUM_SIMILARITY_THRESHOLD)
            .collect();

        // Check if this looks like a split (multiple good matches)
        if candidates.len() >= 2 {
            candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

            // Take top matches that sum to reasonable coverage
            let total_score: f32 = candidates.iter().take(3).map(|(_, s)| s).sum();

            if total_score >= 1.0 {
                // This looks like a split!
                let split_indices: Vec<usize> = candidates
                    .iter()
                    .take(3)
                    .map(|(idx, _)| *idx)
                    .collect();

                let split_articles: Vec<ArticleInfo> = split_indices
                    .iter()
                    .map(|idx| new_articles[*idx].clone())
                    .collect();

                let avg_score = total_score / split_indices.len() as f32;

                changes.push(ArticleChange {
                    change_type: ArticleChangeType::Split,
                    old_article: Some(old_art.clone()),
                    new_articles: Some(split_articles),
                    similarity: Some(avg_score),
                    details: None,
                });

                used_old[old_idx] = true;
                for idx in split_indices {
                    used_new[idx] = true;
                }
            }
        }
    }
}

/// Detect merge patterns: multiple old articles → one new article
fn detect_merges(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
    similarity_matrix: &[Vec<SimilarityScore>],
    used_old: &mut [bool],
    used_new: &mut [bool],
    changes: &mut Vec<ArticleChange>,
) {
    for (new_idx, new_art) in new_articles.iter().enumerate() {
        if used_new[new_idx] {
            continue;
        }

        // Find all old articles with medium+ similarity to this new article
        let mut candidates: Vec<(usize, f32)> = old_articles
            .iter()
            .enumerate()
            .filter(|(old_idx, _)| !used_old[*old_idx])
            .map(|(old_idx, _)| {
                let score = similarity_matrix[old_idx][new_idx].composite;
                (old_idx, score)
            })
            .filter(|(_, score)| *score >= MEDIUM_SIMILARITY_THRESHOLD)
            .collect();

        // Check if this looks like a merge (multiple old → one new)
        if candidates.len() >= 2 {
            candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

            let total_score: f32 = candidates.iter().take(3).map(|(_, s)| s).sum();

            if total_score >= 1.0 {
                // This looks like a merge!
                let merge_indices: Vec<usize> = candidates
                    .iter()
                    .take(3)
                    .map(|(idx, _)| *idx)
                    .collect();

                // For merge, we store the first old article as the main one
                // (or we could create multiple ArticleChange entries)
                let merged_old_articles: Vec<ArticleInfo> = merge_indices
                    .iter()
                    .map(|idx| old_articles[*idx].clone())
                    .collect();

                let avg_score = total_score / merge_indices.len() as f32;

                // Create one change per merged old article for clarity
                for (i, old_idx) in merge_indices.iter().enumerate() {
                    changes.push(ArticleChange {
                        change_type: ArticleChangeType::Merged,
                        old_article: Some(old_articles[*old_idx].clone()),
                        new_articles: Some(vec![new_art.clone()]),
                        similarity: Some(avg_score),
                        details: None,
                    });
                    used_old[*old_idx] = true;
                }

                used_new[new_idx] = true;
            }
        }
    }
}

/// Handle remaining unmatched articles (Added/Deleted)
fn handle_remaining_articles(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
    used_old: &[bool],
    used_new: &[bool],
    changes: &mut Vec<ArticleChange>,
) {
    // Remaining old articles are deleted
    for (old_idx, old_art) in old_articles.iter().enumerate() {
        if !used_old[old_idx] {
            changes.push(ArticleChange {
                change_type: ArticleChangeType::Deleted,
                old_article: Some(old_art.clone()),
                new_articles: None,
                similarity: None,
                details: None,
            });
        }
    }

    // Remaining new articles are added
    for (new_idx, new_art) in new_articles.iter().enumerate() {
        if !used_new[new_idx] {
            changes.push(ArticleChange {
                change_type: ArticleChangeType::Added,
                old_article: None,
                new_articles: Some(vec![new_art.clone()]),
                similarity: None,
                details: None,
            });
        }
    }
}

/// Helper to flatten AST into a list of articles
fn flatten_articles(node: &ArticleNode) -> Vec<ArticleInfo> {
    let mut articles = Vec::new();
    collect_articles_recursive(node, &mut articles);
    articles
}

fn collect_articles_recursive(node: &ArticleNode, list: &mut Vec<ArticleInfo>) {
    if node.node_type == NodeType::Article {
        list.push(ArticleInfo {
            number: node.number.clone(),
            content: node.content.clone(),
            title: node.title.clone(),
            start_line: 0, // TODO: Parser needs to capture line numbers
        });
    }

    for child in &node.children {
        collect_articles_recursive(child, list);
    }
}
