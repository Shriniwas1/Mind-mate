#!/usr/bin/env python3
"""
Export facial emotion model to ONNX (self-contained, no external data files)
Run this script to fix the corrupt ONNX file
"""

import torch
import onnx
from transformers import AutoImageProcessor, AutoModelForImageClassification
import os

print("🚀 Starting ONNX export...")

# Model from HuggingFace
model_name = "dima806/facial_emotions_image_detection"

print(f"📥 Loading model: {model_name}")
processor = AutoImageProcessor.from_pretrained(model_name)
model = AutoModelForImageClassification.from_pretrained(model_name)
model.eval()

# Print class order (critical!)
print("\n📋 Model emotion class order:")
for idx, emotion in model.config.id2label.items():
    print(f"   {idx}: {emotion}")

print("\n⚙️  Exporting to ONNX...")

# Create dummy input
dummy_input = torch.randn(1, 3, 224, 224)

# Export to ONNX
output_path = "mindmate_emotion_v2.onnx"
torch.onnx.export(
    model,
    dummy_input,
    output_path,
    export_params=True,
    opset_version=14,
    input_names=["pixel_values"],
    output_names=["logits"],
    dynamic_axes={
        "pixel_values": {0: "batch"},
        "logits": {0: "batch"}
    },
    verbose=False
)

print(f"✅ ONNX model exported to: {output_path}")

# Verify the export
print("\n🔍 Verifying ONNX model...")
import onnxruntime as ort

try:
    sess = ort.InferenceSession(output_path)
    test_output = sess.run(None, {"pixel_values": dummy_input.numpy()})
    print(f"✅ Verification successful!")
    print(f"   Output shape: {test_output[0].shape}")
    print(f"   Expected: (1, 7)")
except Exception as e:
    print(f"❌ Verification failed: {e}")
    exit(1)

# Copy to backend folder
import shutil
backend_path = os.path.join(
    os.path.dirname(__file__),
    "backend/model/mindmate_emotion_v2.onnx"
)

os.makedirs(os.path.dirname(backend_path), exist_ok=True)
shutil.copy(output_path, backend_path)
print(f"\n📁 Copied to: {backend_path}")

print("\n✅ Done! Restart your backend server.")
print("   npm run dev")
