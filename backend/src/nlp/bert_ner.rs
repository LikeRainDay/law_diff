#[cfg(feature = "bert")]
use rust_bert::pipelines::ner::{NERModel, NerToken};
#[cfg(feature = "bert")]
use std::sync::{Arc, Mutex};

use crate::models::{Entity, EntityType, Position};
use super::ner_trait::NEREngine;
use anyhow::Result;

#[cfg(feature = "bert")]
/// BERT-based NER engine (high accuracy, heavy)
pub struct BertNER {
    model: Arc<Mutex<NERModel>>,
}

#[cfg(feature = "bert")]
impl BertNER {
    pub fn new(model_path: &str) -> Result<Self> {
        use rust_bert::pipelines::ner::NERConfig;
        use std::path::PathBuf;

        let config = NERConfig {
            model_resource: Box::new(rust_bert::resources::LocalResource {
                local_path: PathBuf::from(model_path).join("pytorch_model.bin"),
            }),
            config_resource: Box::new(rust_bert::resources::LocalResource {
                local_path: PathBuf::from(model_path).join("config.json"),
            }),
            vocab_resource: Box::new(rust_bert::resources::LocalResource {
                local_path: PathBuf::from(model_path).join("vocab.txt"),
            }),
            device: rust_bert::pipelines::common::Device::Cpu,
            ..Default::default()
        };

        let model = NERModel::new(config)?;
        Ok(Self {
            model: Arc::new(Mutex::new(model)),
        })
    }

    fn map_bert_label_to_entity_type(label: &str) -> EntityType {
        match label {
            "DATE" | "TIME" => EntityType::Date,
            "MONEY" | "PERCENT" | "QUANTITY" => EntityType::Amount,
            "LAW" | "ORG" | "FAC" => EntityType::Registry,
            "LOC" | "GPE" => EntityType::Scope,
            _ => EntityType::Other,
        }
    }
}

#[cfg(feature = "bert")]
impl NEREngine for BertNER {
    fn extract_entities(&self, text: &str) -> Result<Vec<Entity>> {
        let model = self.model.lock().unwrap();
        let ner_results = model.predict(&[text]);

        let mut entities = Vec::new();

        if let Some(tokens) = ner_results.first() {
            for token in tokens {
                // Filter out low confidence predictions
                if token.score < 0.7 {
                    continue;
                }

                let entity_type = Self::map_bert_label_to_entity_type(&token.label);

                entities.push(Entity {
                    entity_type,
                    value: token.word.clone(),
                    confidence: token.score,
                    position: Position {
                        start: token.offset.begin,
                        end: token.offset.end,
                    },
                });
            }
        }

        Ok(entities)
    }

    fn name(&self) -> &'static str {
        "BERT NER"
    }

    fn confidence_range(&self) -> (f32, f32) {
        (0.95, 0.99)
    }
}

#[cfg(not(feature = "bert"))]
/// Placeholder when BERT feature is disabled
pub struct BertNER;

#[cfg(not(feature = "bert"))]
impl BertNER {
    pub fn new(_model_path: &str) -> Result<Self> {
        anyhow::bail!("BERT feature is not enabled. Compile with --features bert")
    }
}

#[cfg(not(feature = "bert"))]
impl NEREngine for BertNER {
    fn extract_entities(&self, _text: &str) -> Result<Vec<Entity>> {
        anyhow::bail!("BERT feature is not enabled")
    }

    fn name(&self) -> &'static str {
        "BERT NER (disabled)"
    }

    fn confidence_range(&self) -> (f32, f32) {
        (0.0, 0.0)
    }
}
