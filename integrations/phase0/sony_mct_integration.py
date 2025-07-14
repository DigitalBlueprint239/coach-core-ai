"""
Sony MCT (Model Compression Toolkit) Integration for Coach Core AI
Phase 0: Quick Wins - Model Compression
"""

import tensorflow as tf
import numpy as np
from typing import Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass
import os

logger = logging.getLogger(__name__)

@dataclass
class CompressionConfig:
    target_device: str = 'mobile'  # 'mobile', 'desktop', 'server'
    compression_ratio: float = 0.25  # Target 4x compression
    quantization_bits: int = 8
    mixed_precision: bool = True
    calibration_samples: int = 1000

class ModelCompressor:
    """Sony MCT-based model compressor for Coach Core AI"""
    
    def __init__(self, config: CompressionConfig = None):
        self.config = config or CompressionConfig()
        self.original_model = None
        self.compressed_model = None
        self.compression_info = None
        
        # Try to import MCT (user needs to install it)
        try:
            import model_compression_toolkit as mct
            self.mct = mct
            self.mct_available = True
        except ImportError:
            logger.warning("Sony MCT not available. Install with: pip install model-compression-toolkit")
            self.mct_available = False
    
    def compress_model(self, 
                      model: tf.keras.Model, 
                      calibration_data: np.ndarray) -> Tuple[tf.keras.Model, Dict]:
        """Compress model using Sony MCT"""
        
        if not self.mct_available:
            raise ImportError("Sony MCT is required for model compression")
        
        self.original_model = model
        
        logger.info(f"Starting model compression for {self.config.target_device}")
        
        # Get target platform capabilities
        target_platform_cap = self._get_platform_capabilities()
        
        # Create compression configuration
        core_config = self._create_compression_config()
        
        # Perform post-training quantization
        compressed_model, quantization_info = self.mct.ptq.keras_post_training_quantization(
            model,
            calibration_data,
            target_platform_capabilities=target_platform_cap,
            core_config=core_config
        )
        
        self.compressed_model = compressed_model
        self.compression_info = quantization_info
        
        # Calculate compression metrics
        compression_metrics = self._calculate_compression_metrics()
        
        logger.info(f"Model compression completed. Size reduction: {compression_metrics['size_reduction']:.1%}")
        
        return compressed_model, compression_metrics
    
    def _get_platform_capabilities(self):
        """Get target platform capabilities based on device type"""
        
        if self.config.target_device == 'mobile':
            return self.mct.get_target_platform_capabilities(
                fw_name=self.mct.core.keras.constants.TENSORFLOW,
                target_platform_name='tflite',
                target_platform_version='v1'
            )
        elif self.config.target_device == 'desktop':
            return self.mct.get_target_platform_capabilities(
                fw_name=self.mct.core.keras.constants.TENSORFLOW,
                target_platform_name='tensorflow',
                target_platform_version='v1'
            )
        else:  # server
            return self.mct.get_target_platform_capabilities(
                fw_name=self.mct.core.keras.constants.TENSORFLOW,
                target_platform_name='tensorflow',
                target_platform_version='v2'
            )
    
    def _create_compression_config(self):
        """Create MCT compression configuration"""
        
        config = self.mct.core.CoreConfig()
        
        if self.config.mixed_precision:
            config.mixed_precision_config = self.mct.core.MixedPrecisionQuantizationConfig()
        
        # Add quantization configuration
        config.quantization_config = self.mct.core.QuantizationConfig(
            activation_quantization_config=self.mct.core.ActivationQuantizationConfig(
                n_bits=self.config.quantization_bits
            ),
            weights_quantization_config=self.mct.core.WeightsQuantizationConfig(
                n_bits=self.config.quantization_bits
            )
        )
        
        return config
    
    def _calculate_compression_metrics(self) -> Dict[str, Any]:
        """Calculate compression performance metrics"""
        
        if not self.original_model or not self.compressed_model:
            return {}
        
        # Calculate model sizes
        original_size = self._get_model_size(self.original_model)
        compressed_size = self._get_model_size(self.compressed_model)
        
        # Calculate inference speed (simplified)
        original_speed = self._benchmark_inference_speed(self.original_model)
        compressed_speed = self._benchmark_inference_speed(self.compressed_model)
        
        metrics = {
            'original_size_mb': original_size,
            'compressed_size_mb': compressed_size,
            'size_reduction': 1 - (compressed_size / original_size),
            'compression_ratio': original_size / compressed_size,
            'original_inference_ms': original_speed,
            'compressed_inference_ms': compressed_speed,
            'speedup_ratio': original_speed / compressed_speed,
            'target_device': self.config.target_device
        }
        
        return metrics
    
    def _get_model_size(self, model: tf.keras.Model) -> float:
        """Calculate model size in MB"""
        try:
            # Save model to temporary file and get size
            temp_path = '/tmp/temp_model'
            model.save(temp_path)
            
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(temp_path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    total_size += os.path.getsize(filepath)
            
            # Clean up
            import shutil
            shutil.rmtree(temp_path)
            
            return total_size / (1024 * 1024)  # Convert to MB
            
        except Exception as e:
            logger.warning(f"Could not calculate exact model size: {e}")
            # Fallback: estimate based on parameters
            total_params = model.count_params()
            return total_params * 4 / (1024 * 1024)  # Assume float32
    
    def _benchmark_inference_speed(self, model: tf.keras.Model) -> float:
        """Benchmark model inference speed"""
        try:
            # Create dummy input
            input_shape = model.input_shape[1:]  # Remove batch dimension
            dummy_input = np.random.random((1,) + input_shape).astype(np.float32)
            
            # Warm up
            for _ in range(10):
                _ = model.predict(dummy_input, verbose=0)
            
            # Benchmark
            import time
            start_time = time.time()
            
            for _ in range(100):
                _ = model.predict(dummy_input, verbose=0)
            
            end_time = time.time()
            avg_time = (end_time - start_time) / 100 * 1000  # Convert to ms
            
            return avg_time
            
        except Exception as e:
            logger.warning(f"Could not benchmark inference speed: {e}")
            return 0.0
    
    def save_compressed_model(self, filepath: str):
        """Save compressed model to file"""
        if self.compressed_model:
            self.compressed_model.save(filepath)
            logger.info(f"Compressed model saved to {filepath}")
    
    def load_compressed_model(self, filepath: str) -> tf.keras.Model:
        """Load compressed model from file"""
        self.compressed_model = tf.keras.models.load_model(filepath)
        logger.info(f"Compressed model loaded from {filepath}")
        return self.compressed_model
    
    def get_compression_report(self) -> Dict[str, Any]:
        """Generate compression report"""
        if not self.compression_info:
            return {}
        
        return {
            'compression_info': self.compression_info,
            'metrics': self._calculate_compression_metrics(),
            'config': self.config.__dict__
        }

class CoachCoreModelOptimizer:
    """High-level interface for optimizing Coach Core AI models"""
    
    def __init__(self):
        self.compressor = ModelCompressor()
    
    def optimize_for_mobile(self, model: tf.keras.Model, calibration_data: np.ndarray):
        """Optimize model for mobile deployment"""
        config = CompressionConfig(
            target_device='mobile',
            compression_ratio=0.25,
            quantization_bits=8
        )
        
        compressor = ModelCompressor(config)
        return compressor.compress_model(model, calibration_data)
    
    def optimize_for_server(self, model: tf.keras.Model, calibration_data: np.ndarray):
        """Optimize model for server deployment"""
        config = CompressionConfig(
            target_device='server',
            compression_ratio=0.5,
            quantization_bits=16
        )
        
        compressor = ModelCompressor(config)
        return compressor.compress_model(model, calibration_data)

def run_compression_example():
    """Example usage of the Model Compressor"""
    
    # Create a simple model for demonstration
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(128, activation='relu', input_shape=(10,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    # Create calibration data
    calibration_data = np.random.random((1000, 10)).astype(np.float32)
    
    # Initialize compressor
    config = CompressionConfig(
        target_device='mobile',
        compression_ratio=0.25
    )
    
    compressor = ModelCompressor(config)
    
    try:
        # Compress model
        compressed_model, metrics = compressor.compress_model(model, calibration_data)
        
        print("Compression Results:")
        print(f"Original Size: {metrics['original_size_mb']:.2f} MB")
        print(f"Compressed Size: {metrics['compressed_size_mb']:.2f} MB")
        print(f"Size Reduction: {metrics['size_reduction']:.1%}")
        print(f"Compression Ratio: {metrics['compression_ratio']:.1f}x")
        print(f"Speedup: {metrics['speedup_ratio']:.1f}x")
        
        # Save compressed model
        compressor.save_compressed_model('./compressed_model')
        
        return compressed_model, metrics
        
    except ImportError as e:
        print(f"MCT not available: {e}")
        print("Install with: pip install model-compression-toolkit")
        return None, {}

if __name__ == "__main__":
    run_compression_example() 