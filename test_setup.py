import torch
import pandas as pd
import streamlit
import yaml
import json
from pathlib import Path

print("✅ All dependencies installed successfully!")
print(f"   - PyTorch version: {torch.__version__}")
print(f"   - CUDA available: {torch.cuda.is_available()}")
print(f"   - Streamlit version: {streamlit.__version__}")
