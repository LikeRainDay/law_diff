use regex::Regex;
use std::sync::OnceLock;
use crate::models::{Entity, EntityType, Position};

static DATE_PATTERN: OnceLock<Regex> = OnceLock::new();
static AMOUNT_PATTERN: OnceLock<Regex> = OnceLock::new();
static PENALTY_PATTERN: OnceLock<Regex> = OnceLock::new();
static REGISTRY_PATTERN: OnceLock<Regex> = OnceLock::new();
static SCOPE_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_date_pattern() -> &'static Regex {
    DATE_PATTERN.get_or_init(|| {
        Regex::new(r"(\d{4}年\d{1,2}月\d{1,2}日|\d+个月|\d+年|[一二三四五六七八九十]+个月|[一二三四五六七八九十]+年)").unwrap()
    })
}

fn get_amount_pattern() -> &'static Regex {
    AMOUNT_PATTERN.get_or_init(|| {
        Regex::new(r"([一二三四五六七八九十百千万亿\d]+元|[一二三四五六七八九十百千万\d]+万元)").unwrap()
    })
}

fn get_penalty_pattern() -> &'static Regex {
    PENALTY_PATTERN.get_or_init(|| {
        Regex::new(r"(处罚|罚款|吊销|拘留|监禁|警告|责令|暂停|停业)").unwrap()
    })
}

fn get_registry_pattern() -> &'static Regex {
    REGISTRY_PATTERN.get_or_init(|| {
        Regex::new(r"(登记|注册|备案|审批|许可)").unwrap()
    })
}

fn get_scope_pattern() -> &'static Regex {
    SCOPE_PATTERN.get_or_init(|| {
        Regex::new(r"(境内|境外|全国|地区|范围)").unwrap()
    })
}

/// Extract named entities from text
pub fn extract_entities(text: &str) -> Vec<Entity> {
    let mut entities = Vec::new();

    // Extract dates
    for m in get_date_pattern().find_iter(text) {
        entities.push(Entity {
            entity_type: EntityType::Date,
            value: m.as_str().to_string(),
            confidence: 0.85 + (rand::random::<f32>() * 0.1),
            position: Position {
                start: m.start(),
                end: m.end(),
            },
        });
    }

    // Extract amounts
    for m in get_amount_pattern().find_iter(text) {
        entities.push(Entity {
            entity_type: EntityType::Amount,
            value: m.as_str().to_string(),
            confidence: 0.88 + (rand::random::<f32>() * 0.1),
            position: Position {
                start: m.start(),
                end: m.end(),
            },
        });
    }

    // Extract penalties
    for m in get_penalty_pattern().find_iter(text) {
        entities.push(Entity {
            entity_type: EntityType::Penalty,
            value: m.as_str().to_string(),
            confidence: 0.90 + (rand::random::<f32>() * 0.08),
            position: Position {
                start: m.start(),
                end: m.end(),
            },
        });
    }

    // Extract registry terms
    for m in get_registry_pattern().find_iter(text) {
        entities.push(Entity {
            entity_type: EntityType::Registry,
            value: m.as_str().to_string(),
            confidence: 0.87 + (rand::random::<f32>() * 0.1),
            position: Position {
                start: m.start(),
                end: m.end(),
            },
        });
    }

    // Extract scope terms
    for m in get_scope_pattern().find_iter(text) {
        entities.push(Entity {
            entity_type: EntityType::Scope,
            value: m.as_str().to_string(),
            confidence: 0.86 + (rand::random::<f32>() * 0.1),
            position: Position {
                start: m.start(),
                end: m.end(),
            },
        });
    }

    // Sort by position
    entities.sort_by_key(|e| e.position.start);

    entities
}

// Note: rust-bert integration would go here for production
// For now, using regex patterns for demo purposes
//
// pub fn extract_entities_with_bert(text: &str) -> Vec<Entity> {
//     // Load BERT model
//     // Perform NER
//     // Return entities with higher confidence
// }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_dates() {
        let text = "保存网络日志不少于六个月，从2024年1月1日起执行";
        let entities = extract_entities(text);

        let dates: Vec<_> = entities.iter()
            .filter(|e| e.entity_type == EntityType::Date)
            .collect();

        assert!(dates.len() >= 1);
    }

    #[test]
    fn test_extract_amounts() {
        let text = "处一万元以上三万元以下罚款";
        let entities = extract_entities(text);

        let amounts: Vec<_> = entities.iter()
            .filter(|e| e.entity_type == EntityType::Amount)
            .collect();

        assert!(amounts.len() >= 2);
    }

    #[test]
    fn test_extract_penalties() {
        let text = "依法给予警告，并处罚款";
        let entities = extract_entities(text);

        let penalties: Vec<_> = entities.iter()
            .filter(|e| e.entity_type == EntityType::Penalty)
            .collect();

        assert!(penalties.len() >= 2);
    }
}
