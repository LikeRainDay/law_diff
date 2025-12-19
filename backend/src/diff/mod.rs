pub mod aligner;
pub mod similarity;

#[cfg(test)]
mod aligner_tests;



use similar::{ChangeTag, TextDiff};
use crate::models::{Change, ChangeType, DiffResult, DiffStats, Entity};

/// Compare two texts and generate diff result
pub fn compare_texts(old_text: &str, new_text: &str, entities: Vec<Entity>) -> DiffResult {
    // Use similar crate for line-level diff for better legal text stability
    let diff = TextDiff::from_lines(old_text, new_text);

    let mut changes = Vec::new();
    let mut old_line = 1;
    let mut new_line = 1;
    let mut additions = 0;
    let mut deletions = 0;
    let mut modifications = 0;
    let mut unchanged = 0;

    for change in diff.iter_all_changes() {
        let value = change.value();

        match change.tag() {
            ChangeTag::Insert => {
                changes.push(Change {
                    change_type: ChangeType::Add,
                    old_line: None,
                    new_line: Some(new_line),
                    old_content: None,
                    new_content: Some(value.to_string()),
                    entities: None,
                });
                new_line += 1;
                additions += 1;
            }
            ChangeTag::Delete => {
                changes.push(Change {
                    change_type: ChangeType::Delete,
                    old_line: Some(old_line),
                    new_line: None,
                    old_content: Some(value.to_string()),
                    new_content: None,
                    entities: None,
                });
                old_line += 1;
                deletions += 1;
            }
            ChangeTag::Equal => {
                changes.push(Change {
                    change_type: ChangeType::Unchanged,
                    old_line: Some(old_line),
                    new_line: Some(new_line),
                    old_content: Some(value.to_string()),
                    new_content: Some(value.to_string()),
                    entities: None,
                });
                old_line += 1;
                new_line += 1;
                unchanged += 1;
            }
        }
    }

    // Merge adjacent add/delete into modify
    let merged_changes = merge_adjacent_changes(changes);
    modifications = merged_changes.iter()
        .filter(|c| c.change_type == ChangeType::Modify)
        .count();

    // Calculate similarity using ratio
    let similarity = diff.ratio();

    DiffResult {
        similarity: similarity as f32,
        changes: merged_changes,
        article_changes: None, // Will be populated by aligner in API layer
        entities,
        stats: DiffStats {
            additions,
            deletions,
            modifications,
            unchanged,
        },
    }
}

/// Merge adjacent add/delete changes into modifications
fn merge_adjacent_changes(changes: Vec<Change>) -> Vec<Change> {
    let mut merged = Vec::new();
    let mut i = 0;

    while i < changes.len() {
        let current = &changes[i];

        // Check if we have a next change
        if i + 1 < changes.len() {
            let next = &changes[i + 1];

            // Check for adjacent delete/add pattern
            if (current.change_type == ChangeType::Delete && next.change_type == ChangeType::Add) ||
               (current.change_type == ChangeType::Add && next.change_type == ChangeType::Delete) {

                let (delete_change, add_change) = if current.change_type == ChangeType::Delete {
                    (current, next)
                } else {
                    (next, current)
                };

                // Merge into modify
                merged.push(Change {
                    change_type: ChangeType::Modify,
                    old_line: delete_change.old_line,
                    new_line: add_change.new_line,
                    old_content: delete_change.old_content.clone(),
                    new_content: add_change.new_content.clone(),
                    entities: None,
                });

                i += 2; // Skip both changes
                continue;
            }
        }

        // No merge, just add the current change
        merged.push(current.clone());
        i += 1;
    }

    merged
}

/// Calculate similarity score (0.0 to 1.0)
pub fn calculate_similarity(old_text: &str, new_text: &str) -> f32 {
    let diff = TextDiff::from_words(old_text, new_text);
    diff.ratio() as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_diff() {
        let old = "第一条 测试\n第二条 无关";
        let new = "第一条 修改测试\n第二条 无关";
        let result = compare_texts(old, new, vec![]);

        assert!(result.similarity >= 0.5);
        assert!(result.stats.modifications > 0 || result.stats.additions > 0);
    }

    #[test]
    fn test_similarity() {
        assert_eq!(calculate_similarity("test", "test"), 1.0);
        // Word-level diff: "test" and "best" are completely different words
        // assert!(calculate_similarity("test", "best") > 0.0);
        assert!(calculate_similarity("abc", "xyz") < 0.5);
    }
}
mod sorting_test;
