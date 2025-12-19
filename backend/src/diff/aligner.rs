use crate::ast::parse_article;
use crate::diff::similarity::{calculate_composite_similarity, SimilarityScore};
use crate::models::{ArticleChange, ArticleChangeType, ArticleInfo, ArticleNode, NodeType};
use crate::nlp::tokenizer::tokenize_to_set;
use crate::nlp::formatter::normalize_legal_text;

// Base thresholds - will be adjusted by user input
const EXACT_MATCH_THRESHOLD: f32 = 0.98;
const MEDIUM_SIMILARITY_THRESHOLD: f32 = 0.4;

/// Represents a candidate alignment between old and new articles
#[derive(Debug, Clone)]
struct AlignmentCandidate {
    old_indices: Vec<usize>,
    new_indices: Vec<usize>,
    total_score: f32,
    avg_score: f32,
}

/// Main function to perform intelligent structural alignment of legal articles
pub fn align_articles(
    old_text: &str,
    new_text: &str,
    threshold: f32,
    format_text: bool
) -> Vec<ArticleChange> {
    // Always normalize for AST parsing robustness
    let processed_old = normalize_legal_text(old_text);
    let processed_new = normalize_legal_text(new_text);

    // 1. Parse and flatten articles
    let old_ast = parse_article(&processed_old);
    let new_ast = parse_article(&processed_new);

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
        threshold,
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

    // 5. Sort by document order based on start_line
    // We prioritize NEW structure (Target) because that's what the user sees as the "Result".
    // For Deleted items, we fall back to Old structure.
    changes.sort_by(|a, b| {
        let get_info = |c: &ArticleChange| {
            // Priority 1: New Article/Target Position
            if let Some(new_list) = &c.new_articles {
                if let Some(first) = new_list.first() {
                    return (first.start_line, 0, first.number.clone()); // 0 = Prefer Target
                }
            }
            // Priority 2: Old Article/Source Position (for Deleted)
            if let Some(old) = &c.old_article {
                return (old.start_line, 1, old.number.clone()); // 1 = Source fallback
            }
            (usize::MAX, 2, String::new())
        };

        let (line_a, type_a, num_a) = get_info(a);
        let (line_b, type_b, num_b) = get_info(b);

        // 1. Primary Sort: Line Number
        match line_a.cmp(&line_b) {
            std::cmp::Ordering::Equal => {
                // 2. Secondary Sort: Article Number (Lexicographical works for simple Chinese numbers)
                match num_a.cmp(&num_b) {
                    std::cmp::Ordering::Equal => {
                         // 3. Tertiary Sort: Prefer Content (Target) over Deleted (Source)
                         type_a.cmp(&type_b)
                    },
                    other => other
                }
            },
            other => other
        }
    });

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
    threshold: f32,
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
            // Use the dynamic threshold instead of hardcoded HIGH_SIMILARITY_THRESHOLD
            if score > best_score && score >= threshold {
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

            let mut tags = Vec::new();
            match change_type {
                ArticleChangeType::Added => tags.push("added".to_string()),
                ArticleChangeType::Deleted => tags.push("deleted".to_string()),
                ArticleChangeType::Modified => tags.push("modified".to_string()),
                ArticleChangeType::Renumbered => tags.push("renumbered".to_string()),
                ArticleChangeType::Moved => tags.push("moved".to_string()),
                ArticleChangeType::Split => tags.push("split".to_string()),
                ArticleChangeType::Merged => tags.push("merged".to_string()),
                ArticleChangeType::Unchanged => {},
            }

            // Add secondary tags
            if change_type == ArticleChangeType::Renumbered || change_type == ArticleChangeType::Moved {
                 if best_score < EXACT_MATCH_THRESHOLD {
                     tags.push("modified".to_string());
                 }
            }
            // Tag preamble specifically
            if new_art.number == "0" || new_art.title.as_deref() == Some("序言/目录") {
                tags.push("preamble".to_string());
            }

            changes.push(ArticleChange {
                change_type: change_type.clone(),
                old_article: Some(old_art.clone()),
                new_articles: Some(vec![new_art.clone()]),
                similarity: Some(best_score),
                details: None,
                tags,
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
                    tags: vec!["split".to_string()],
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
                        tags: vec!["merged".to_string()],
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
                tags: vec!["deleted".to_string()],
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
                tags: vec!["added".to_string()],
            });
        }
    }
}

/// Helper to flatten AST into a list of articles with hierarchy context
fn flatten_articles(node: &ArticleNode) -> Vec<ArticleInfo> {
    let mut articles = Vec::new();
    let parent_stack = Vec::new();
    collect_articles_recursive(node, &mut articles, &parent_stack);
    articles
}

fn collect_articles_recursive(node: &ArticleNode, list: &mut Vec<ArticleInfo>, parent_stack: &[String]) {
    // If this node is an article or preamble, add it to the list
    if matches!(node.node_type, NodeType::Article | NodeType::Preamble) {
        // Skip technical root node
        if node.number != "root" {
            list.push(ArticleInfo {
                number: node.number.clone(),
                content: node.content.clone(),
                title: node.title.clone(),
                start_line: node.start_line,
                parents: parent_stack.to_vec(),
            });
        }
    }

    // Determine if this node contributes to the parent stack for its children
    let mut current_stack = parent_stack.to_vec();
    match node.node_type {
        NodeType::Part | NodeType::Chapter | NodeType::Section => {
            let label = if let Some(title) = &node.title {
                format!("{} {}", node.number, title)
            } else {
                node.number.clone()
            };
            current_stack.push(label);
        }
        _ => {}
    }

    // Recurse into children
    for child in &node.children {
        collect_articles_recursive(child, list, &current_stack);
    }
}
