try:
    import torch
    print(f"   - PyTorch version: {torch.__version__}")
    print(f"   - CUDA available: {torch.cuda.is_available()}")
except Exception as e:
    print(f"⚠️ PyTorch not available: {e}")

for lib in ("pandas", "streamlit", "yaml", "json"):
    try:
        globals()[lib] = __import__(lib)
        print(f"   - {lib} version: {globals()[lib].__version__ if hasattr(globals()[lib], '__version__') else 'loaded'}")
    except Exception as e:
        print(f"⚠️ {lib} not available: {e}")

from pathlib import Path

print("✅ Base dependencies check complete")
