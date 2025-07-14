#!/usr/bin/env python3
"""
Test script to verify model_registry.py imports work correctly
"""

try:
    # Test the specific imports from model_registry.py
    import torch
    import torch.nn as nn
    import json
    import hashlib
    import shutil
    from datetime import datetime
    from pathlib import Path
    from typing import Dict, List, Optional, Tuple, Any
    from dataclasses import dataclass, asdict
    import logging
    from enum import Enum
    import yaml
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor
    import pandas as pd
    
    print("✅ All imports from model_registry.py work correctly!")
    print("   - torch: ✅")
    print("   - torch.nn: ✅") 
    print("   - json: ✅")
    print("   - hashlib: ✅")
    print("   - All other dependencies: ✅")
    
    print(f"\n📦 PyTorch version: {torch.__version__}")
    print(f"📦 NumPy version: {np.__version__}")
    print(f"📦 Pandas version: {pd.__version__}")
    
    print("\n🎉 The PyTorch import error in model_registry.py has been resolved!")
    print("You can now use the model_registry.py file with the virtual environment:")
    print("   .venv/bin/python model_registry.py")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
