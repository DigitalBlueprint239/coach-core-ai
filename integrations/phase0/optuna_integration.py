"""
Optuna Integration for Coach Core AI
Phase 0: Quick Wins - Hyperparameter Optimization
"""

import optuna
import optuna_dashboard
from typing import Dict, Any, Optional
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class OptimizationConfig:
    n_trials: int = 100
    timeout: Optional[int] = 3600  # 1 hour
    direction: str = 'maximize'
    study_name: str = 'coach_core_optimization'

class CoachCoreOptimizer:
    """Optuna-based hyperparameter optimizer for Coach Core AI models"""
    
    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        self.study = None
        self.best_params = None
        self.best_value = None
    
    def create_study(self, storage: str = None):
        """Initialize Optuna study"""
        if storage:
            self.study = optuna.create_study(
                study_name=self.config.study_name,
                storage=storage,
                direction=self.config.direction,
                load_if_exists=True
            )
        else:
            self.study = optuna.create_study(
                study_name=self.config.study_name,
                direction=self.config.direction
            )
        
        logger.info(f"Created study: {self.study.study_name}")
        return self.study
    
    def objective_function(self, trial: optuna.Trial) -> float:
        """Objective function for hyperparameter optimization"""
        
        # Define hyperparameter search space
        params = {
            'learning_rate': trial.suggest_float('learning_rate', 1e-5, 1e-2, log=True),
            'batch_size': trial.suggest_categorical('batch_size', [16, 32, 64, 128]),
            'hidden_layers': trial.suggest_int('hidden_layers', 2, 6),
            'hidden_size': trial.suggest_categorical('hidden_size', [128, 256, 512, 1024]),
            'dropout_rate': trial.suggest_float('dropout_rate', 0.1, 0.5),
            'weight_decay': trial.suggest_float('weight_decay', 1e-6, 1e-3, log=True),
            'optimizer': trial.suggest_categorical('optimizer', ['adam', 'adamw', 'sgd']),
            'scheduler': trial.suggest_categorical('scheduler', ['cosine', 'step', 'none']),
            'warmup_steps': trial.suggest_int('warmup_steps', 0, 1000),
            'gradient_clip': trial.suggest_float('gradient_clip', 0.1, 2.0),
        }
        
        # Add model-specific parameters
        params.update(self._get_model_specific_params(trial))
        
        try:
            # Create and train model with these parameters
            model = self._create_model(params)
            score = self._evaluate_model(model, params)
            
            logger.info(f"Trial {trial.number}: Score = {score:.4f}")
            return score
            
        except Exception as e:
            logger.error(f"Trial {trial.number} failed: {e}")
            return float('-inf') if self.config.direction == 'maximize' else float('inf')
    
    def _get_model_specific_params(self, trial: optuna.Trial) -> Dict[str, Any]:
        """Get model-specific hyperparameters"""
        return {
            'attention_heads': trial.suggest_int('attention_heads', 4, 16),
            'attention_dropout': trial.suggest_float('attention_dropout', 0.1, 0.3),
            'layer_norm_eps': trial.suggest_float('layer_norm_eps', 1e-6, 1e-4, log=True),
            'max_position_embeddings': trial.suggest_int('max_position_embeddings', 512, 2048),
        }
    
    def _create_model(self, params: Dict[str, Any]):
        """Create model with given parameters"""
        # This would integrate with your existing Coach Core AI model
        from coach_core_ai.models import CoachingBrainModel
        
        return CoachingBrainModel(**params)
    
    def _evaluate_model(self, model, params: Dict[str, Any]) -> float:
        """Evaluate model performance"""
        # This would use your existing evaluation pipeline
        from coach_core_ai.evaluation import evaluate_coaching_model
        
        return evaluate_coaching_model(model)
    
    def optimize(self, n_trials: int = None) -> Dict[str, Any]:
        """Run hyperparameter optimization"""
        n_trials = n_trials or self.config.n_trials
        
        logger.info(f"Starting optimization with {n_trials} trials")
        
        self.study.optimize(
            self.objective_function,
            n_trials=n_trials,
            timeout=self.config.timeout,
            show_progress_bar=True
        )
        
        # Store best results
        self.best_params = self.study.best_params
        self.best_value = self.study.best_value
        
        logger.info(f"Optimization completed. Best score: {self.best_value:.4f}")
        logger.info(f"Best parameters: {self.best_params}")
        
        return {
            'best_params': self.best_params,
            'best_value': self.best_value,
            'study': self.study
        }
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """Generate optimization report"""
        if not self.study:
            raise ValueError("No study available. Run optimize() first.")
        
        return {
            'best_params': self.best_params,
            'best_value': self.best_value,
            'n_trials': len(self.study.trials),
            'optimization_history': [trial.value for trial in self.study.trials if trial.value is not None],
            'parameter_importance': optuna.importance.get_param_importances(self.study),
            'study_name': self.study.study_name
        }
    
    def save_study(self, filepath: str):
        """Save study to file"""
        if self.study:
            optuna.study.save_study(self.study, filepath)
            logger.info(f"Study saved to {filepath}")
    
    def load_study(self, filepath: str):
        """Load study from file"""
        self.study = optuna.study.load_study(filepath)
        self.best_params = self.study.best_params
        self.best_value = self.study.best_value
        logger.info(f"Study loaded from {filepath}")

def run_optimization_example():
    """Example usage of the Coach Core Optimizer"""
    
    # Initialize optimizer
    config = OptimizationConfig(
        n_trials=50,
        timeout=1800,  # 30 minutes
        study_name='coach_core_demo'
    )
    
    optimizer = CoachCoreOptimizer(config)
    
    # Create study
    optimizer.create_study()
    
    # Run optimization
    results = optimizer.optimize()
    
    # Generate report
    report = optimizer.get_optimization_report()
    
    print("Optimization Results:")
    print(f"Best Score: {report['best_value']:.4f}")
    print(f"Best Parameters: {report['best_params']}")
    print(f"Number of Trials: {report['n_trials']}")
    
    # Save study
    optimizer.save_study('./optimization_results/coach_core_study.pkl')
    
    return results

if __name__ == "__main__":
    run_optimization_example() 