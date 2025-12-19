pub mod aligner;
pub mod similarity;

#[cfg(test)]
mod aligner_tests;



use similar::{ChangeTag, TextDiff};
use crate::models::{Change, ChangeType, DiffResult, DiffStats, Entity};

/// Compare two texts and generate diff result
pub fn compare_texts(old_text: &str, new_text: &str, entities: Vec<Entity>) -> DiffResult {
    // Trim and normalize lines for better stability
    let old_normalized: String = old_text.lines().map(|l| l.trim_end()).collect::<Vec<_>>().join("\n");
    let new_normalized: String = new_text.lines().map(|l| l.trim_end()).collect::<Vec<_>>().join("\n");

    let diff = TextDiff::from_lines(&old_normalized, &new_normalized);

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
                    new_content: Some(value.into()),
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
                    old_content: Some(value.into()),
                    new_content: None,
                    entities: None,
                });
                old_line += 1;
                deletions += 1;
            }
            ChangeTag::Equal => {
                let arc_val: std::sync::Arc<str> = value.into();
                changes.push(Change {
                    change_type: ChangeType::Unchanged,
                    old_line: Some(old_line),
                    new_line: Some(new_line),
                    old_content: Some(arc_val.clone()),
                    new_content: Some(arc_val),
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

/// Merge adjacent add/delete changes into modifications.
/// Improved to handle blocks of changes for better alignment.
fn merge_adjacent_changes(changes: Vec<Change>) -> Vec<Change> {
    let mut merged = Vec::new();
    let mut i = 0;

    while i < changes.len() {
        if changes[i].change_type == ChangeType::Unchanged {
            merged.push(changes[i].clone());
            i += 1;
            continue;
        }

        let mut deletes = Vec::new();
        let mut adds = Vec::new();

        // Collect continuous deletes
        while i < changes.len() && changes[i].change_type == ChangeType::Delete {
            deletes.push(changes[i].clone());
            i += 1;
        }
        // Collect continuous adds
        while i < changes.len() && changes[i].change_type == ChangeType::Add {
            adds.push(changes[i].clone());
            i += 1;
        }

        // If we found both, pair them up as Modify as much as possible
        let max_pairs = deletes.len().max(adds.len());
        for j in 0..max_pairs {
            let del = deletes.get(j);
            let add = adds.get(j);

            match (del, add) {
                (Some(d), Some(a)) => {
                    merged.push(Change {
                        change_type: ChangeType::Modify,
                        old_line: d.old_line,
                        new_line: a.new_line,
                        old_content: d.old_content.clone(),
                        new_content: a.new_content.clone(),
                        entities: None,
                    });
                }
                (Some(d), None) => {
                    merged.push(d.clone());
                }
                (None, Some(a)) => {
                    merged.push(a.clone());
                }
                (None, None) => {}
            }
        }

        // If we are at a point where the next one is Unchanged, just continue the outer loop
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
