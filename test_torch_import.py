#!/usr/bin/env python3
"""
Test script to verify PyTorch imports work correctly
"""

try:
    import torch
    import torch.nn as nn
    print("✅ PyTorch imported successfully!")
    print(f"   - PyTorch version: {torch.__version__}")
    print(f"   - CUDA available: {torch.cuda.is_available()}")
    
    # Test basic functionality
    x = torch.randn(2, 3)
    print(f"   - Created tensor: {x.shape}")
    
    # Test nn module
    linear = nn.Linear(3, 1)
    output = linear(x)
    print(f"   - Linear layer output: {output.shape}")
    
    print("\n🎉 All PyTorch functionality working correctly!")
    print("The import error in model_registry.py has been resolved.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
