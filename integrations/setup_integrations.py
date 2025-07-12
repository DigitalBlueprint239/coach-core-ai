#!/usr/bin/env python3
"""
Setup script for Coach Core AI Integrations
Installs all required dependencies for the integration modules
"""

import subprocess
import sys
import os
from typing import List, Dict

def run_command(command: List[str], description: str) -> bool:
    """Run a command and return success status"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def install_package(package: str, description: str = None) -> bool:
    """Install a Python package"""
    desc = description or f"Installing {package}"
    return run_command([sys.executable, "-m", "pip", "install", package], desc)

def install_requirements(requirements_file: str) -> bool:
    """Install requirements from file"""
    if os.path.exists(requirements_file):
        return run_command([sys.executable, "-m", "pip", "install", "-r", requirements_file], 
                          f"Installing requirements from {requirements_file}")
    return True

def main():
    """Main setup function"""
    print("🚀 Setting up Coach Core AI Integrations")
    print("=" * 50)
    
    # Phase 0: Quick Wins
    print("\n📦 Phase 0: Quick Wins")
    print("-" * 30)
    
    phase0_packages = [
        ("optuna", "Hyperparameter optimization"),
        ("optuna-dashboard", "Optuna web dashboard"),
        ("model-compression-toolkit", "Sony MCT for model compression"),
        ("tensorrt", "NVIDIA TensorRT (if available)"),
        ("assemblyai", "Real-time speech recognition"),
        ("boto3", "AWS services for voice synthesis"),
        ("mediapipe", "Computer vision and pose estimation"),
        ("streamlit", "Real-time web interface")
    ]
    
    for package, description in phase0_packages:
        install_package(package, description)
    
    # Phase 1: Core Enhancements
    print("\n📦 Phase 1: Core Enhancements")
    print("-" * 30)
    
    phase1_packages = [
        ("crewai", "Multi-agent AI framework"),
        ("langchain", "LangChain for AI tools"),
        ("roboflow", "Computer vision platform"),
        ("opencv-python", "OpenCV for computer vision"),
        ("ultralytics", "YOLO object detection"),
        ("numpy", "Numerical computing"),
        ("scipy", "Scientific computing")
    ]
    
    for package, description in phase1_packages:
        install_package(package, description)
    
    # Phase 2: Advanced Features
    print("\n📦 Phase 2: Advanced Features")
    print("-" * 30)
    
    phase2_packages = [
        ("torch", "PyTorch deep learning"),
        ("torchvision", "PyTorch computer vision"),
        ("transformers", "Hugging Face transformers"),
        ("scikit-learn", "Machine learning utilities"),
        ("pandas", "Data manipulation"),
        ("matplotlib", "Data visualization"),
        ("seaborn", "Statistical data visualization")
    ]
    
    for package, description in phase2_packages:
        install_package(package, description)
    
    # Phase 3: Production Optimization
    print("\n📦 Phase 3: Production Optimization")
    print("-" * 30)
    
    phase3_packages = [
        ("deepspeed", "Distributed training"),
        ("accelerate", "Hugging Face accelerate"),
        ("ray", "Distributed computing"),
        ("mlflow", "ML experiment tracking"),
        ("wandb", "Weights & Biases logging"),
        ("docker", "Containerization"),
        ("kubernetes", "Kubernetes client")
    ]
    
    for package, description in phase3_packages:
        install_package(package, description)
    
    # Development tools
    print("\n🛠️ Development Tools")
    print("-" * 30)
    
    dev_packages = [
        ("pytest", "Testing framework"),
        ("pytest-asyncio", "Async testing support"),
        ("black", "Code formatting"),
        ("flake8", "Code linting"),
        ("mypy", "Type checking"),
        ("pre-commit", "Git hooks"),
        ("jupyter", "Jupyter notebooks"),
        ("ipython", "Interactive Python")
    ]
    
    for package, description in dev_packages:
        install_package(package, description)
    
    # Create requirements files
    print("\n📝 Creating requirements files")
    print("-" * 30)
    
    requirements_content = """# Coach Core AI Integration Requirements

# Phase 0: Quick Wins
optuna>=3.0.0
optuna-dashboard>=0.7.0
model-compression-toolkit>=1.0.0
assemblyai>=0.20.0
boto3>=1.26.0
mediapipe>=0.10.0
streamlit>=1.25.0

# Phase 1: Core Enhancements
crewai>=0.1.0
langchain>=0.0.300
roboflow>=1.0.0
opencv-python>=4.8.0
ultralytics>=8.0.0
numpy>=1.24.0
scipy>=1.10.0

# Phase 2: Advanced Features
torch>=2.0.0
torchvision>=0.15.0
transformers>=4.30.0
scikit-learn>=1.3.0
pandas>=2.0.0
matplotlib>=3.7.0
seaborn>=0.12.0

# Phase 3: Production Optimization
deepspeed>=0.9.0
accelerate>=0.20.0
ray>=2.6.0
mlflow>=2.5.0
wandb>=0.15.0

# Development Tools
pytest>=7.4.0
pytest-asyncio>=0.21.0
black>=23.0.0
flake8>=6.0.0
mypy>=1.5.0
pre-commit>=3.3.0
jupyter>=1.0.0
ipython>=8.14.0
"""
    
    with open("requirements-integrations.txt", "w") as f:
        f.write(requirements_content)
    
    print("✅ Created requirements-integrations.txt")
    
    # Create setup script for each phase
    print("\n📝 Creating phase-specific setup scripts")
    print("-" * 30)
    
    phase_scripts = {
        "phase0": """#!/bin/bash
# Phase 0: Quick Wins Setup
echo "Setting up Phase 0 integrations..."

# Install core dependencies
pip install optuna optuna-dashboard
pip install assemblyai boto3 mediapipe streamlit

# Test installations
python -c "import optuna; print('Optuna installed successfully')"
python -c "import assemblyai; print('AssemblyAI installed successfully')"

echo "Phase 0 setup complete!"
""",
        
        "phase1": """#!/bin/bash
# Phase 1: Core Enhancements Setup
echo "Setting up Phase 1 integrations..."

# Install multi-agent and vision dependencies
pip install crewai langchain
pip install roboflow opencv-python ultralytics

# Test installations
python -c "import crewai; print('CrewAI installed successfully')"
python -c "import roboflow; print('Roboflow installed successfully')"

echo "Phase 1 setup complete!"
""",
        
        "phase2": """#!/bin/bash
# Phase 2: Advanced Features Setup
echo "Setting up Phase 2 integrations..."

# Install advanced ML dependencies
pip install torch torchvision transformers
pip install scikit-learn pandas matplotlib seaborn

# Test installations
python -c "import torch; print('PyTorch installed successfully')"
python -c "import transformers; print('Transformers installed successfully')"

echo "Phase 2 setup complete!"
""",
        
        "phase3": """#!/bin/bash
# Phase 3: Production Optimization Setup
echo "Setting up Phase 3 integrations..."

# Install production dependencies
pip install deepspeed accelerate ray
pip install mlflow wandb

# Test installations
python -c "import deepspeed; print('DeepSpeed installed successfully')"
python -c "import ray; print('Ray installed successfully')"

echo "Phase 3 setup complete!"
"""
    }
    
    for phase, script in phase_scripts.items():
        script_path = f"integrations/{phase}/setup_{phase}.sh"
        os.makedirs(os.path.dirname(script_path), exist_ok=True)
        
        with open(script_path, "w") as f:
            f.write(script)
        
        # Make executable
        os.chmod(script_path, 0o755)
        print(f"✅ Created {script_path}")
    
    # Create Docker setup
    print("\n🐳 Creating Docker configuration")
    print("-" * 30)
    
    dockerfile_content = """# Coach Core AI Integration Dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    cmake \\
    git \\
    wget \\
    libopencv-dev \\
    ffmpeg \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements-integrations.txt .
RUN pip install --no-cache-dir -r requirements-integrations.txt

# Copy Coach Core AI code
COPY coach_core_ai/ ./coach_core_ai/

# Copy integration modules
COPY integrations/ ./integrations/

# Expose ports
EXPOSE 8000 8501

# Run the application
CMD ["python", "-m", "coach_core_ai.server"]
"""
    
    with open("Dockerfile.integrations", "w") as f:
        f.write(dockerfile_content)
    
    print("✅ Created Dockerfile.integrations")
    
    # Create docker-compose for development
    docker_compose_content = """version: '3.8'

services:
  coach-core-ai:
    build:
      context: .
      dockerfile: Dockerfile.integrations
    ports:
      - "8000:8000"
      - "8501:8501"
    environment:
      - PYTHONPATH=/app
    volumes:
      - ./data:/app/data
      - ./models:/app/models
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: coach_core_ai
      POSTGRES_USER: coach
      POSTGRES_PASSWORD: coach123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
"""
    
    with open("docker-compose.integrations.yml", "w") as f:
        f.write(docker_compose_content)
    
    print("✅ Created docker-compose.integrations.yml")
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Test integrations: python -m pytest integrations/")
    print("2. Run development server: streamlit run integrations/demo_app.py")
    print("3. Build Docker image: docker build -f Dockerfile.integrations -t coach-core-ai .")
    print("4. Start with Docker Compose: docker-compose -f docker-compose.integrations.yml up")

if __name__ == "__main__":
    main() 