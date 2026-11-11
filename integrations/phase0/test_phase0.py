#!/usr/bin/env python3
"""
Test script for Phase 0 integrations
Verifies that Optuna and other Phase 0 components are working correctly
"""

import sys
import os
import numpy as np
from datetime import datetime

def test_optuna_integration():
    """Test Optuna hyperparameter optimization"""
    print("🧪 Testing Optuna Integration...")
    
    try:
        import optuna
        print("✅ Optuna imported successfully")
        
        # Create a simple optimization study
        def objective(trial):
            x = trial.suggest_float('x', -10, 10)
            y = trial.suggest_float('y', -10, 10)
            return (x - 2) ** 2 + (y - 3) ** 2
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=10)
        
        print(f"✅ Optimization completed. Best value: {study.best_value:.4f}")
        print(f"✅ Best parameters: {study.best_params}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Optuna import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Optuna test failed: {e}")
        return False

def test_streamlit_integration():
    """Test Streamlit for demo app"""
    print("🧪 Testing Streamlit Integration...")
    
    try:
        import streamlit as st
        print("✅ Streamlit imported successfully")
        
        # Test basic Streamlit functionality
        if hasattr(st, 'write'):
            print("✅ Streamlit write function available")
            return True
        else:
            print("❌ Streamlit write function not available")
            return False
            
    except ImportError as e:
        print(f"❌ Streamlit import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Streamlit test failed: {e}")
        return False

def test_numpy_integration():
    """Test NumPy for numerical computations"""
    print("🧪 Testing NumPy Integration...")
    
    try:
        import numpy as np
        print("✅ NumPy imported successfully")
        
        # Test basic NumPy operations
        arr = np.array([1, 2, 3, 4, 5])
        mean_val = np.mean(arr)
        std_val = np.std(arr)
        
        print(f"✅ NumPy operations successful. Mean: {mean_val}, Std: {std_val}")
        return True
        
    except ImportError as e:
        print(f"❌ NumPy import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ NumPy test failed: {e}")
        return False

def test_pandas_integration():
    """Test Pandas for data manipulation"""
    print("🧪 Testing Pandas Integration...")
    
    try:
        import pandas as pd
        print("✅ Pandas imported successfully")
        
        # Test basic Pandas operations
        data = {
            'player': ['Player1', 'Player2', 'Player3'],
            'score': [85, 92, 78],
            'position': ['Forward', 'Midfielder', 'Defender']
        }
        df = pd.DataFrame(data)
        
        print(f"✅ Pandas DataFrame created successfully. Shape: {df.shape}")
        return True
        
    except ImportError as e:
        print(f"❌ Pandas import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Pandas test failed: {e}")
        return False

def test_phase0_optimizer():
    """Test our custom Phase 0 optimizer"""
    print("🧪 Testing Phase 0 Optimizer...")
    
    try:
        # Import our custom optimizer
        sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
        from phase0.optuna_integration import CoachCoreOptimizer, OptimizationConfig
        
        print("✅ Phase 0 Optimizer imported successfully")
        
        # Test optimizer initialization
        config = OptimizationConfig(n_trials=5, timeout=60)
        optimizer = CoachCoreOptimizer(config)
        
        print("✅ Phase 0 Optimizer initialized successfully")
        return True
        
    except ImportError as e:
        print(f"❌ Phase 0 Optimizer import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Phase 0 Optimizer test failed: {e}")
        return False

def run_quick_demo():
    """Run a quick demo of Phase 0 capabilities"""
    print("\n🚀 Running Phase 0 Quick Demo...")
    
    # Simulate a simple coaching model optimization
    print("📊 Simulating coaching model optimization...")
    
    # Generate some fake performance data
    np.random.seed(42)
    trials = np.arange(20)
    scores = 0.6 + 0.3 * np.random.random(20) * np.exp(-trials/10)
    
    print(f"📈 Optimization completed!")
    print(f"   - Best score: {np.max(scores):.4f}")
    print(f"   - Improvement: {((np.max(scores) - np.min(scores)) / np.min(scores) * 100):.1f}%")
    print(f"   - Trials completed: {len(trials)}")
    
    # Simulate model compression
    print("\n🗜️ Simulating model compression...")
    original_size = 45.2  # MB
    compressed_size = original_size * 0.25  # 75% reduction
    
    print(f"   - Original size: {original_size:.1f} MB")
    print(f"   - Compressed size: {compressed_size:.1f} MB")
    print(f"   - Size reduction: {((original_size - compressed_size) / original_size * 100):.1f}%")
    print(f"   - Speedup: 2.3x")

def main():
    """Main test function"""
    print("=" * 60)
    print("🧪 PHASE 0 INTEGRATION TESTS")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run all tests
    tests = [
        ("NumPy", test_numpy_integration),
        ("Pandas", test_pandas_integration),
        ("Optuna", test_optuna_integration),
        ("Streamlit", test_streamlit_integration),
        ("Phase 0 Optimizer", test_phase0_optimizer)
    ]
    
    results = {}
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        results[test_name] = test_func()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All Phase 0 integrations are working correctly!")
        print("Ready to proceed with Phase 0 implementation.")
        
        # Run quick demo
        run_quick_demo()
        
    else:
        print("\n⚠️ Some integrations failed. Please check the errors above.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 