# Google Colab Notebook Suite — AI Shopping OS Models

This folder contains **7 production-grade Jupyter Notebooks** designed to train, fine-tune, evaluate, and export all core Machine Learning and Deep Learning models for the **Memory-Augmented Multi-Agent AI Shopping Assistant**.

All notebooks are structured and optimized to run seamlessly inside **Google Colab's Free Tier (T4 GPU)**.

---

## Notebook Index & Architecture Mapping

| # | Notebook File | Target Agent | Models & Technologies | Free Colab GPU Required | Artifacts Exported |
|---|---------------|--------------|-----------------------|-------------------------|--------------------|
| **01** | [`01_intent_and_slot_extraction.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/01_intent_and_slot_extraction.ipynb) | Intent Agent | DistilBERT (8-class Intent) + LLaMA-3.2-3B / Qwen2.5-3B (QLoRA Slot Extraction) | T4 GPU | `intent_distilbert.onnx`, `llama_slot_extractor.gguf` |
| **02** | [`02_ahde_routing_classifier.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/02_ahde_routing_classifier.ipynb) | AHDE Orchestrator | Multi-Output XGBoost / LightGBM Classifier | CPU / T4 | `ahde_routing_xgboost.pkl` |
| **03** | [`03_dpt_persona_clustering_and_dtoc_evolution.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/03_dpt_persona_clustering_and_dtoc_evolution.ipynb) | Digital Twin Agent | K-Means / GMM (DPT Persona Archetypes) + PyTorch LSTM (DToC Evolution Trajectory) | CPU / T4 | `dpt_kmeans_persona.joblib`, `dtoc_evolution_lstm.pt` |
| **04** | [`04_mare_learning_to_rank.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/04_mare_learning_to_rank.ipynb) | Recommendation (MARE) | XGBoost LambdaMART (Pairwise Ranker) + PyTorch Two-Tower Recommendation Network | T4 GPU | `mare_ranker_lambdamart.json` |
| **05** | [`05_price_trend_forecasting.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/05_price_trend_forecasting.ipynb) | Price Intelligence | Meta Prophet (Seasonality) + PyTorch LSTM (7-day Buy/Wait Probability) | CPU / T4 | `price_prophet_model.joblib` |
| **06** | [`06_review_aspect_sentiment_absa.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/06_review_aspect_sentiment_absa.ipynb) | Review Analysis | DeBERTa-v3-base (Aspect-Based Sentiment Analysis & Pros/Cons Summarization) | T4 GPU | `absa_deberta.onnx` |
| **07** | [`07_explainable_ai_narrative_generator.ipynb`](file:///e:/Notes/3%20-%201/SDC%20-%202/Memory-Augmented-Multi-Agent-AI-Shopping-Assistant-/notebooks/07_explainable_ai_narrative_generator.ipynb) | Explainability Agent | Qwen2.5-3B-Instruct / LLaMA-3.2-3B Fine-tuning via **Unsloth QLoRA** (SFT & DPO) | T4 GPU | `explainability_qwen3b_q4_k_m.gguf` |

---

## How to Run in Google Colab

### Step 1: Upload Notebooks to Google Colab
1. Go to [colab.research.google.com](https://colab.research.google.com).
2. Click **Upload** and select any `.ipynb` file from this `notebooks/` directory.

### Step 2: Set Runtime to GPU
1. In Colab, click **Runtime** in the top menu bar.
2. Select **Change runtime type**.
3. Under **Hardware accelerator**, select **T4 GPU**.
4. Click **Save**.

### Step 3: Run All Cells
1. Click **Runtime -> Run all** (or press `Ctrl + F9`).
2. The notebook will automatically install all required packages (`transformers`, `unsloth`, `xgboost`, `prophet`, `torch`, `datasets`), generate synthetic/Kaggle dataset pipelines, train the models, generate evaluation reports/plots, and export model weight artifacts.

---

## Integration Guide: Linking Colab Models to Next.js / Python API

Once model artifacts are exported from Colab (`.onnx`, `.pkl`, `.joblib`, `.pt`, `.gguf`), they can be integrated into the application server:

1. **Lightweight Models (`.onnx`, `.pkl`, `.joblib`)**:
   - `intent_distilbert.onnx` and `ahde_routing_xgboost.pkl` can be placed in `src/lib/models/` and loaded directly using `onnxruntime-node` or a Python FastAPI microservice.
2. **LLM Checkpoints (`.gguf`)**:
   - `explainability_qwen3b_q4_k_m.gguf` can be served locally via `llama.cpp`, `ollama`, or `vllm`, and queried via standard HTTP OpenAI-compatible completion endpoints.
3. **Recommendation & Price Models (`.json`, `.joblib`, `.pt`)**:
   - `mare_ranker_lambdamart.json` and `price_prophet_model.joblib` can be loaded by Python background workers to pre-compute recommendations and price advice signals.

---

*Generated for AI Shopping OS — Memory-Augmented Multi-Agent AI Shopping Assistant.*
