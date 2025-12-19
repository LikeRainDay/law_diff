use crate::ast::parse_article;
use crate::diff::similarity::calculate_composite_similarity;
use crate::models::{ArticleChange, ArticleChangeType, ArticleInfo, ArticleNode, NodeType, SimilarityScore};
use crate::nlp::tokenizer::tokenize_to_set;
use crate::nlp::formatter::normalize_legal_text;
use rayon::prelude::*;
use std::collections::HashSet;
use std::sync::Arc;

// Base thresholds - will be adjusted by user input
const EXACT_MATCH_THRESHOLD: f32 = 1.0;
const MEDIUM_SIMILARITY_THRESHOLD: f32 = 0.4;

fn chinese_to_int(s: &str) -> usize {
    if s == "root" { return 0; }
    if s == "0" || s.is_empty() { return 0; }

    let mut result = 0;
    let mut temp = 0;

    let mut mapping = std::collections::HashMap::new();
    mapping.insert('零', 0); mapping.insert('一', 1); mapping.insert('二', 2); mapping.insert('两', 2);
    mapping.insert('三', 3); mapping.insert('四', 4); mapping.insert('五', 5); mapping.insert('六', 6);
    mapping.insert('七', 7); mapping.insert('八', 8); mapping.insert('九', 9); mapping.insert('十', 10);
    mapping.insert('百', 100); mapping.insert('千', 1000); mapping.insert('万', 10000);

    for c in s.chars() {
        if let Some(&v) = mapping.get(&c) {
            if v >= 10 {
                if temp == 0 { temp = 1; }
                if v == 10000 {
                    result = (result + temp) * 10000;
                    temp = 0;
                } else {
                    result += temp * v;
                    temp = 0;
                }
            } else {
                temp = temp * 10 + v;
            }
        } else if let Some(d) = c.to_digit(10) {
            temp = temp * 10 + d as usize;
        }
    }
    result + temp
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

    // Stage 1: Find high-confidence 1:1 matches (Similarity takes precedence for renumbering)
    find_one_to_one_matches(
        &old_articles,
        &new_articles,
        &similarity_matrix,
        &mut used_old,
        &mut used_new,
        &mut changes,
        threshold,
    );

    // Stage 2: Perfect number matches (as fallback for items similarity didn't catch)
    find_number_matches(
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

    // 5. Sort by document order
    changes.sort_by(|a, b| {
        let is_preamble = |c: &ArticleChange| {
            c.change_type == ArticleChangeType::Preamble ||
            c.new_articles.as_ref().map_or(false, |list| list.iter().any(|a| a.node_type == NodeType::Preamble)) ||
            c.old_article.as_ref().map_or(false, |a| a.node_type == NodeType::Preamble)
        };

        // 1. Preamble always first
        let pa = is_preamble(a);
        let pb = is_preamble(b);
        if pa != pb {
            return if pa { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater };
        }

        let get_sort_info = |c: &ArticleChange| {
            if let Some(new_list) = &c.new_articles {
                if let Some(first) = new_list.first() {
                    return (chinese_to_int(&first.number), first.start_line, 0);
                }
            }
            if let Some(old) = &c.old_article {
                return (chinese_to_int(&old.number), old.start_line, 1);
            }
            (usize::MAX, usize::MAX, 2)
        };

        let (num_a, line_a, src_a) = get_sort_info(a);
        let (num_b, line_b, src_b) = get_sort_info(b);

        // 2. Sort by Article Number primarily (if both have numbers)
        if num_a != num_b && num_a != 0 && num_b != 0 {
            return num_a.cmp(&num_b);
        }

        // 3. Fallback to Line Number (Start Line)
        match line_a.cmp(&line_b) {
            std::cmp::Ordering::Equal => src_a.cmp(&src_b),
            other => other
        }
    });

    changes
}

/// Build a comprehensive similarity matrix between all old and new articles.
/// Optimized with parallel processing and pre-tokenization.
fn build_similarity_matrix(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
) -> Vec<Vec<SimilarityScore>> {
    // 1. Pre-tokenize everything once
    let old_tokens: Vec<HashSet<std::sync::Arc<str>>> = old_articles.par_iter()
        .map(|art| tokenize_to_set(&art.content))
        .collect();

    let new_tokens: Vec<HashSet<std::sync::Arc<str>>> = new_articles.par_iter()
        .map(|art| tokenize_to_set(&art.content))
        .collect();

    // 2. Build matrix in parallel
    old_articles.par_iter().enumerate().map(|(i, old_art)| {
        let mut row = Vec::with_capacity(new_articles.len());
        let tokens_a = &old_tokens[i];

        for (j, new_art) in new_articles.iter().enumerate() {
            let tokens_b = &new_tokens[j];
            let mut score_wrapper = calculate_composite_similarity(
                &old_art.content,
                &new_art.content,
                tokens_a,
                tokens_b,
            );

            // Boost score if hierarchy context matches
            if !old_art.parents.is_empty() && !new_art.parents.is_empty() {
                let p1 = &old_art.parents;
                let p2 = &new_art.parents;
                let mut matches = 0;
                for parent1 in p1 {
                    for parent2 in p2 {
                        if parent1 == parent2 {
                            matches += 1;
                        }
                    }
                }
                if matches > 0 {
                    score_wrapper.composite = (score_wrapper.composite + (0.05 * matches as f32)).min(0.99);
                }
            }

            row.push(score_wrapper);
        }
        row
    }).collect()
}

/// Stage 0: Match articles with identical numbers as primary signal
fn find_number_matches(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
    similarity_matrix: &[Vec<SimilarityScore>],
    used_old: &mut [bool],
    used_new: &mut [bool],
    changes: &mut Vec<ArticleChange>,
) {
    for (old_idx, old_art) in old_articles.iter().enumerate() {
        if used_old[old_idx] || old_art.number.as_ref() == "root" || old_art.number.as_ref() == "0" {
            continue;
        }

        for (new_idx, new_art) in new_articles.iter().enumerate() {
            if used_new[new_idx] {
                continue;
            }

            // If numbers match exactly, we align them regardless of similarity
            // (Similarity match stage 1 has already run, so this won't steal articles that moved elsewhere)
            if old_art.number == new_art.number {
                let score = similarity_matrix[old_idx][new_idx].composite;

                let change_type = if score >= EXACT_MATCH_THRESHOLD {
                    ArticleChangeType::Unchanged
                } else if score >= 0.15 {
                    ArticleChangeType::Modified
                } else {
                    // Reused number but completely different content (e.g. Article 29 reuse)
                    ArticleChangeType::Replaced
                };

                let mut tags = Vec::new();
                match change_type {
                    ArticleChangeType::Modified => tags.push("modified".to_string()),
                    ArticleChangeType::Replaced => tags.push("replaced".to_string()),
                    _ => {}
                }

                changes.push(ArticleChange {
                    change_type,
                    old_article: Some(old_art.clone()),
                    new_articles: Some(vec![new_art.clone()]),
                    similarity: Some(score),
                    details: None,
                    tags,
                });

                used_old[old_idx] = true;
                used_new[new_idx] = true;
                break;
            }
        }
    }
}

/// Find high-confidence 1:1 matches
/// Stage 1: Find high-confidence sequential matches using LCS principle.
/// This handles renumbering shifts (e.g. Old Art 29 -> New Art 30) much better than greedy matching.
fn find_one_to_one_matches(
    old_articles: &[ArticleInfo],
    new_articles: &[ArticleInfo],
    similarity_matrix: &[Vec<SimilarityScore>],
    used_old: &mut [bool],
    used_new: &mut [bool],
    changes: &mut Vec<ArticleChange>,
    threshold: f32,
) {
    let n = old_articles.len();
    let m = new_articles.len();
    if n == 0 || m == 0 { return; }

    // dp[i][j] stores the maximum cumulative similarity score for a sequential alignment
    let mut dp = vec![vec![0.0f32; m + 1]; n + 1];
    // backtrack stores (prev_i, prev_j, matched)
    let mut backtrack = vec![vec![(0, 0, false); m + 1]; n + 1];

    for i in 1..=n {
        for j in 1..=m {
            let score = similarity_matrix[i-1][j-1].composite;

            // Prefer sequential match if it's strong enough
            // Using a more lenient threshold for sequential matches (70% of global threshold) to catch renumbered items
            if score >= (threshold * 0.7).max(0.3) {
                let match_score = dp[i-1][j-1] + score;
                if match_score > dp[i-1][j] && match_score > dp[i][j-1] {
                    dp[i][j] = match_score;
                    backtrack[i][j] = (i-1, j-1, true);
                    continue;
                }
            }

            // Otherwise skip either side
            if dp[i-1][j] >= dp[i][j-1] {
                dp[i][j] = dp[i-1][j];
                backtrack[i][j] = (i-1, j, false);
            } else {
                dp[i][j] = dp[i][j-1];
                backtrack[i][j] = (i, j-1, false);
            }
        }
    }

    // Trace back to find matches
    let mut curr_i = n;
    let mut curr_j = m;
    while curr_i > 0 && curr_j > 0 {
        let (pi, pj, matched) = backtrack[curr_i][curr_j];
        if matched {
            let old_idx = curr_i - 1;
            let new_idx = curr_j - 1;

            if !used_old[old_idx] && !used_new[new_idx] {
                let old_art = &old_articles[old_idx];
                let new_art = &new_articles[new_idx];
                let score = similarity_matrix[old_idx][new_idx].composite;

                let change_type = if old_art.node_type == NodeType::Preamble || new_art.node_type == NodeType::Preamble {
                    ArticleChangeType::Preamble
                } else if score >= EXACT_MATCH_THRESHOLD && old_art.number == new_art.number {
                    ArticleChangeType::Unchanged
                } else if old_art.number == new_art.number {
                    ArticleChangeType::Modified
                } else {
                    // Content matches significantly but number differs
                    ArticleChangeType::Renumbered
                };

                let mut tags = Vec::new();
                if change_type == ArticleChangeType::Preamble {
                    tags.push("preamble".to_string());
                } else {
                    if old_art.number != new_art.number {
                        tags.push("renumbered".to_string());
                    }
                    // Use a very high threshold to detect even minor modifications
                    if score < 0.999 {
                        tags.push("modified".to_string());
                    }
                }

                changes.push(ArticleChange {
                    change_type,
                    old_article: Some(old_art.clone()),
                    new_articles: Some(vec![new_art.clone()]),
                    similarity: Some(score),
                    details: None,
                    tags,
                });

                used_old[old_idx] = true;
                used_new[new_idx] = true;
            }
        }
        curr_i = pi;
        curr_j = pj;
    }

    // Secondary Pass: Non-sequential Greedy for remaining (Moved items that jumped out of order)
    for (old_idx, old_art) in old_articles.iter().enumerate() {
        if used_old[old_idx] { continue; }

        let mut best_score = -1.0;
        let mut best_new_idx = None;

        for (new_idx, _new_art) in new_articles.iter().enumerate() {
            if used_new[new_idx] { continue; }
            let score = similarity_matrix[old_idx][new_idx].composite;
            if score >= threshold && score > best_score {
                best_score = score;
                best_new_idx = Some(new_idx);
            }
        }

        if let Some(new_idx) = best_new_idx {
            let new_art = &new_articles[new_idx];
            let change_type = if old_art.number == new_art.number {
                ArticleChangeType::Modified
            } else {
                ArticleChangeType::Renumbered
            };

            let mut tags = Vec::new();
            if old_art.number != new_art.number {
                tags.push("renumbered".to_string());
            }
            if best_score < 0.999 {
                tags.push("modified".to_string());
            }

            changes.push(ArticleChange {
                change_type,
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
            let mut tags = vec!["deleted".to_string()];
            if old_art.node_type == NodeType::Preamble {
                tags.push("preamble".to_string());
            }
            changes.push(ArticleChange {
                change_type: ArticleChangeType::Deleted,
                old_article: Some(old_art.clone()),
                new_articles: None,
                similarity: None,
                details: None,
                tags,
            });
        }
    }

    // Remaining new articles are added
    for (new_idx, new_art) in new_articles.iter().enumerate() {
        if !used_new[new_idx] {
            let mut tags = vec!["added".to_string()];
            if new_art.node_type == NodeType::Preamble {
                tags.push("preamble".to_string());
            }
            changes.push(ArticleChange {
                change_type: ArticleChangeType::Added,
                old_article: None,
                new_articles: Some(vec![new_art.clone()]),
                similarity: None,
                details: None,
                tags,
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

fn collect_articles_recursive(node: &ArticleNode, list: &mut Vec<ArticleInfo>, parent_stack: &[Arc<str>]) {
    // If this node is an article or preamble, add it to the list
    if matches!(node.node_type, NodeType::Article | NodeType::Preamble) {
        // Skip technical root node
        if node.number.as_ref() != "root" {
            list.push(ArticleInfo {
                number: node.number.clone(),
                content: get_all_content(node).into(),
                title: node.title.clone(),
                start_line: node.start_line,
                node_type: node.node_type.clone(),
                parents: parent_stack.to_vec(),
            });
        }
    }

    // Determine if this node contributes to the parent stack for its children
    let mut current_stack = parent_stack.to_vec();
    match node.node_type {
        NodeType::Part | NodeType::Chapter | NodeType::Section => {
            let label: Arc<str> = if let Some(title) = &node.title {
                format!("{} {}", node.number, title).into()
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

/// Helper to gather content from a node and all its children (clauses, items)
fn get_all_content(node: &ArticleNode) -> String {
    let mut result = node.content.to_string();

    // For articles, we want to maintain some separation if content exists
    for child in &node.children {
        let child_content = get_all_content(child);
        if !child_content.is_empty() {
            if !result.is_empty() && !result.ends_with('\n') {
                result.push('\n');
            }
            if child.node_type == NodeType::Clause || child.node_type == NodeType::Item {
                // If it doesn't already look like it has indentation, add it
                if !child_content.starts_with(' ') && !child_content.starts_with('\u{3000}') {
                    result.push_str("\u{3000}\u{3000}");
                }
            }
            result.push_str(&child_content);
        }
    }
    result
}
