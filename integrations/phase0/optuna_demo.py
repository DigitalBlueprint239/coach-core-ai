#!/usr/bin/env python3
"""
Optuna Demo for Coach Core AI - Phase 0
Simple hyperparameter optimization demonstration
"""

import optuna
import numpy as np
from datetime import datetime

def create_coaching_model_objective():
    """Create an objective function for coaching model optimization"""
    
    def objective(trial):
        # Define hyperparameters to optimize
        learning_rate = trial.suggest_float('learning_rate', 1e-5, 1e-2, log=True)
        batch_size = trial.suggest_categorical('batch_size', [16, 32, 64, 128])
        hidden_layers = trial.suggest_int('hidden_layers', 2, 6)
        hidden_size = trial.suggest_categorical('hidden_size', [128, 256, 512, 1024])
        dropout_rate = trial.suggest_float('dropout_rate', 0.1, 0.5)
        
        # Simulate model training and evaluation
        # In a real scenario, this would train an actual model
        base_score = 0.7
        
        # Simulate performance based on hyperparameters
        lr_factor = 1.0 if 1e-4 <= learning_rate <= 1e-3 else 0.8
        batch_factor = 1.0 if batch_size in [32, 64] else 0.9
        layer_factor = 1.0 if 3 <= hidden_layers <= 5 else 0.85
        size_factor = 1.0 if hidden_size in [256, 512] else 0.9
        dropout_factor = 1.0 if 0.2 <= dropout_rate <= 0.3 else 0.95
        
        # Add some noise to make it realistic
        noise = np.random.normal(0, 0.02)
        
        score = base_score * lr_factor * batch_factor * layer_factor * size_factor * dropout_factor + noise
        
        # Ensure score is between 0 and 1
        score = max(0.0, min(1.0, score))
        
        return score
    
    return objective

def run_optuna_optimization(n_trials=50):
    """Run Optuna optimization for coaching model"""
    
    print("🚀 Starting Optuna Hyperparameter Optimization")
    print("=" * 50)
    print(f"Number of trials: {n_trials}")
    print(f"Start time: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    # Create study
    study = optuna.create_study(
        direction='maximize',
        study_name='coach_core_optimization'
    )
    
    # Get objective function
    objective = create_coaching_model_objective()
    
    # Run optimization
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
    
    # Results
    print("\n" + "=" * 50)
    print("📊 OPTIMIZATION RESULTS")
    print("=" * 50)
    
    print(f"Best score: {study.best_value:.4f}")
    print(f"Best parameters:")
    for key, value in study.best_params.items():
        print(f"  {key}: {value}")
    
    print(f"\nOptimization completed at: {datetime.now().strftime('%H:%M:%S')}")
    
    return study

def analyze_optimization_results(study):
    """Analyze and display optimization results"""
    
    print("\n" + "=" * 50)
    print("📈 OPTIMIZATION ANALYSIS")
    print("=" * 50)
    
    # Get all trials
    trials = study.trials
    
    # Calculate statistics
    scores = [trial.value for trial in trials if trial.value is not None]
    
    print(f"Total trials: {len(trials)}")
    print(f"Successful trials: {len(scores)}")
    print(f"Average score: {np.mean(scores):.4f}")
    print(f"Standard deviation: {np.std(scores):.4f}")
    print(f"Score range: {np.min(scores):.4f} - {np.max(scores):.4f}")
    
    # Improvement analysis
    initial_score = scores[0] if scores else 0
    final_score = study.best_value
    improvement = ((final_score - initial_score) / initial_score * 100) if initial_score > 0 else 0
    
    print(f"\nImprovement: {improvement:.1f}%")
    
    # Parameter importance (if available)
    try:
        importance = optuna.importance.get_param_importances(study)
        print(f"\nParameter importance:")
        for param, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
            print(f"  {param}: {imp:.3f}")
    except Exception as e:
        print(f"\nCould not calculate parameter importance: {e}")

def save_optimization_results(study, filename="optimization_results.json"):
    """Save optimization results to file"""
    
    import json
    
    results = {
        'study_name': study.study_name,
        'best_value': study.best_value,
        'best_params': study.best_params,
        'n_trials': len(study.trials),
        'timestamp': datetime.now().isoformat(),
        'trials': []
    }
    
    # Add trial data
    for trial in study.trials:
        if trial.value is not None:
            results['trials'].append({
                'number': trial.number,
                'value': trial.value,
                'params': trial.params,
                'datetime_start': trial.datetime_start.isoformat() if trial.datetime_start else None
            })
    
    # Save to file
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to {filename}")

def main():
    """Main function to run the Optuna demo"""
    
    print("🎯 Coach Core AI - Phase 0: Optuna Integration Demo")
    print("=" * 60)
    
    # Run optimization
    study = run_optuna_optimization(n_trials=30)
    
    # Analyze results
    analyze_optimization_results(study)
    
    # Save results
    save_optimization_results(study)
    
    print("\n" + "=" * 60)
    print("✅ Phase 0 Optuna Integration Demo Completed!")
    print("=" * 60)
    
    print("\nNext steps:")
    print("1. Review the optimization results")
    print("2. Apply the best parameters to your coaching model")
    print("3. Test the optimized model performance")
    print("4. Proceed to Sony MCT integration for model compression")

if __name__ == "__main__":
    main() 