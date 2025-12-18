#[cfg(feature = "bert")]
use crate::models::{Entity, EntityType};
#[cfg(feature = "bert")]
use super::{ner_trait::NEREngine, regex_ner::RegexNER, bert_ner::BertNER};
#[cfg(feature = "bert")]
use anyhow::Result;

#[cfg(feature = "bert")]
/// Hybrid NER: Uses regex first, then BERT for low-confidence regions
pub struct HybridNER {
    regex_ner: RegexNER,
    bert_ner: BertNER,
    confidence_threshold: f32,
}

#[cfg(feature = "bert")]
impl HybridNER {
    pub fn new() -> Result<Self> {
        let model_path = std::env::var("BERT_MODEL_PATH")
            .unwrap_or_else(|_| "./models/chinese-ner".to_string());

        Ok(Self {
            regex_ner: RegexNER::new(),
            bert_ner: BertNER::new(&model_path)?,
            confidence_threshold: 0.88, // Use BERT if regex confidence < 88%
        })
    }

    fn merge_entities(regex_entities: Vec<Entity>, bert_entities: Vec<Entity>) -> Vec<Entity> {
        let mut merged = regex_entities.clone();

        // Add BERT entities that don't overlap with regex entities
        for bert_entity in bert_entities {
            let overlaps = regex_entities.iter().any(|re| {
                let re_start = re.position.start;
                let re_end = re.position.end;
                let bert_start = bert_entity.position.start;
                let bert_end = bert_entity.position.end;

                // Check for overlap
                (bert_start >= re_start && bert_start < re_end) ||
                (bert_end > re_start && bert_end <= re_end) ||
                (bert_start <= re_start && bert_end >= re_end)
            });

            if !overlaps {
                merged.push(bert_entity);
            }
        }

        // Sort by position
        merged.sort_by_key(|e| e.position.start);
        merged
    }

    fn calculate_coverage(entities: &[Entity], text_length: usize) -> f32 {
        if text_length == 0 {
            return 0.0;
        }

        let covered_chars: usize = entities.iter()
            .map(|e| e.position.end - e.position.start)
            .sum();

        covered_chars as f32 / text_length as f32
    }
}

#[cfg(feature = "bert")]
impl NEREngine for HybridNER {
    fn extract_entities(&self, text: &str) -> Result<Vec<Entity>> {
        // Step 1: Extract with regex (fast)
        let regex_entities = self.regex_ner.extract_entities(text)?;

        // Step 2: Check if regex coverage is sufficient
        let coverage = Self::calculate_coverage(&regex_entities, text.len());
        let avg_confidence: f32 = if regex_entities.is_empty() {
            0.0
        } else {
            regex_entities.iter().map(|e| e.confidence).sum::<f32>() / regex_entities.len() as f32
        };

        // Step 3: Use BERT if regex confidence is low
        if coverage < 0.5 || avg_confidence < self.confidence_threshold {
            tracing::debug!(
                "Low regex confidence ({:.2}%), falling back to BERT for better accuracy",
                avg_confidence * 100.0
            );

            let bert_entities = self.bert_ner.extract_entities(text)?;
            Ok(Self::merge_entities(regex_entities, bert_entities))
        } else {
            Ok(regex_entities)
        }
    }

    fn name(&self) -> &'static str {
        "Hybrid NER (Regex + BERT)"
    }

    fn confidence_range(&self) -> (f32, f32) {
        (0.88, 0.99)
    }
}
