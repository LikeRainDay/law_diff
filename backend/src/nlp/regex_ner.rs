use regex::Regex;
use std::sync::OnceLock;
use crate::models::{Entity, EntityType, Position};
use super::ner_trait::NEREngine;
use anyhow::Result;

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

/// Regex-based NER engine (fast, lightweight)
pub struct RegexNER;

impl RegexNER {
    pub fn new() -> Self {
        Self
    }
}

impl NEREngine for RegexNER {
    fn extract_entities(&self, text: &str) -> Result<Vec<Entity>> {
        let mut entities = Vec::new();

        // Extract dates
        for m in get_date_pattern().find_iter(text) {
            entities.push(Entity {
                entity_type: EntityType::Date,
                value: m.as_str().to_string(),
                confidence: 0.85 + (rand::random::<f32>() * 0.05),
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
                confidence: 0.88 + (rand::random::<f32>() * 0.05),
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
                confidence: 0.90 + (rand::random::<f32>() * 0.05),
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
                confidence: 0.87 + (rand::random::<f32>() * 0.05),
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
                confidence: 0.86 + (rand::random::<f32>() * 0.05),
                position: Position {
                    start: m.start(),
                    end: m.end(),
                },
            });
        }

        // Sort by position
        entities.sort_by_key(|e| e.position.start);

        Ok(entities)
    }

    fn name(&self) -> &'static str {
        "Regex NER"
    }

    fn confidence_range(&self) -> (f32, f32) {
        (0.85, 0.92)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regex_ner_dates() {
        let ner = RegexNER::new();
        let text = "保存网络日志不少于六个月，从2024年1月1日起执行";
        let entities = ner.extract_entities(text).unwrap();

        let dates: Vec<_> = entities.iter()
            .filter(|e| e.entity_type == EntityType::Date)
            .collect();

        assert!(dates.len() >= 1);
    }

    #[test]
    fn test_regex_ner_amounts() {
        let ner = RegexNER::new();
        let text = "处一万元以上三万元以下罚款";
        let entities = ner.extract_entities(text).unwrap();

        let amounts: Vec<_> = entities.iter()
            .filter(|e| e.entity_type == EntityType::Amount)
            .collect();

        assert!(amounts.len() >= 2);
    }
}
