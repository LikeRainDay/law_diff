#!/bin/bash

# Download BERT model for Chinese NER
# Model: ckiplab/bert-base-chinese-ner from HuggingFace

set -e

MODEL_DIR="./models/chinese-ner"
BASE_URL="https://huggingface.co/ckiplab/bert-base-chinese-ner/resolve/main"

echo "Creating model directory..."
mkdir -p "$MODEL_DIR"

echo "Downloading BERT model files..."

# Download config.json
echo "Downloading config.json..."
wget -q --show-progress "$BASE_URL/config.json" -O "$MODEL_DIR/config.json"

# Download vocab.txt
echo "Downloading vocab.txt..."
wget -q --show-progress "$BASE_URL/vocab.txt" -O "$MODEL_DIR/vocab.txt"

# Download pytorch_model.bin (large file ~400MB)
echo "Downloading pytorch_model.bin (this may take a while)..."
wget -q --show-progress "$BASE_URL/pytorch_model.bin" -O "$MODEL_DIR/pytorch_model.bin"

echo "✅ BERT model downloaded successfully!"
echo "Model location: $MODEL_DIR"
echo ""
echo "Set environment variable:"
echo "  export BERT_MODEL_PATH=$MODEL_DIR"
echo ""
echo "Build with BERT support:"
echo "  cargo build --release --features bert"
