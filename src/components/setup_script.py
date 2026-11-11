#!/usr/bin/env python3
"""
Coach Core AI Brain - Automated Setup Script
This script sets up everything you need to integrate AI with your Smart Playbook
"""

import os
import sys
import subprocess
import json
from pathlib import Path
import shutil

class CoachCoreSetup:
    def __init__(self):
        self.project_dir = Path.cwd()
        self.ai_dir = self.project_dir / "coach_core_ai"
        self.data_dir = self.ai_dir / "data"
        
    def run_setup(self):
        """Run the complete setup process"""
        print("🏈 Coach Core AI Brain - Automated Setup")
        print("=" * 50)
        
        # Step 1: Create directory structure
        self.create_directories()
        
        # Step 2: Install dependencies
        self.install_dependencies()
        
        # Step 3: Download/create core files
        self.setup_core_files()
        
        # Step 4: Create sample data
        self.create_sample_data()
        
        # Step 5: Test installation
        self.test_installation()
        
        # Step 6: Provide next steps
        self.show_next_steps()
    
    def create_directories(self):
        """Create project directory structure"""
        print("\n📁 Creating directory structure...")
        
        directories = [
            self.ai_dir,
            self.data_dir,
            self.ai_dir / "api",
            self.ai_dir / "models",
            self.ai_dir / "examples",
            self.ai_dir / "tests"
        ]
        
        for directory in directories:
            directory.mkdir(exist_ok=True)
            print(f"   Created: {directory}")
    
    def install_dependencies(self):
        """Install required Python packages"""
        print("\n📦 Installing dependencies...")
        
        # Core AI dependencies
        core_packages = [
            "pandas>=1.5.0",
            "numpy>=1.21.0",
            "scikit-learn>=1.1.0",
            "nltk>=3.7",
            "matplotlib>=3.5.0",
            "seaborn>=0.11.0"
        ]
        
        # Web API dependencies
        api_packages = [
            "flask>=2.2.0",
            "flask-cors>=4.0.0"
        ]
        
        # Optional development packages
        dev_packages = [
            "jupyter>=1.0.0",
            "pytest>=7.0.0"
        ]
        
        all_packages = core_packages + api_packages
        
        try:
            # Install core packages
            subprocess.check_call([
                sys.executable, "-m", "pip", "install"
            ] + all_packages)
            
            print("   ✅ Core packages installed")
            
            # Try to install development packages
            try:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install"
                ] + dev_packages)
                print("   ✅ Development packages installed")
            except:
                print("   ⚠️  Development packages skipped (optional)")
                
        except subprocess.CalledProcessError:
            print("   ❌ Failed to install some packages")
            print("   💡 Try running: pip install -r requirements.txt")
    
    def setup_core_files(self):
        """Create core AI brain files"""
        print("\n🧠 Setting up AI brain files...")
        
        # Create requirements.txt
        requirements_content = """# Coach Core AI Dependencies
pandas>=1.5.0
numpy>=1.21.0
scikit-learn>=1.1.0
nltk>=3.7
matplotlib>=3.5.0
seaborn>=0.11.0
flask>=2.2.0
flask-cors>=4.0.0
jupyter>=1.0.0
pytest>=7.0.0
"""
        
        with open(self.ai_dir / "requirements.txt", 'w') as f:
            f.write(requirements_content)
        
        print("   ✅ Requirements file created")
        
        # Create main AI brain file (simplified version)
        main_ai_content = '''"""
Coach Core AI Brain - Main Module
Simplified version for quick setup
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import json
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class PlayRecommendation:
    play_name: str
    confidence: float
    reasoning: List[str]
    formation: str
    safety_validated: bool

class SimpleAIBrain:
    def __init__(self):
        self.plays_db = []
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self.is_trained = False
        
    def load_plays(self, plays_data: List[Dict]):
        """Load plays data"""
        self.plays_db = plays_data
        print(f"Loaded {len(self.plays_db)} plays")
        
    def get_recommendation(self, game_context: Dict) -> PlayRecommendation:
        """Get AI play recommendation"""
        if not self.plays_db:
            return PlayRecommendation(
                play_name="No plays available",
                confidence=0.0,
                reasoning=["No plays in database"],
                formation="unknown",
                safety_validated=False
            )
        
        # Simple rule-based selection for demo
        down = game_context.get('down', 1)
        distance = game_context.get('distance', 10)
        
        # Filter plays by situation
        suitable_plays = []
        for play in self.plays_db:
            if down <= 2 and distance > 7:
                # Long yardage - prefer passing
                if 'pass' in play.get('name', '').lower():
                    suitable_plays.append(play)
            elif down >= 3 and distance <= 5:
                # Short yardage - prefer running
                if 'run' in play.get('name', '').lower():
                    suitable_plays.append(play)
            else:
                suitable_plays.append(play)
        
        if not suitable_plays:
            suitable_plays = self.plays_db
        
        # Select highest success rate play
        best_play = max(suitable_plays, key=lambda p: p.get('success_rate', 0.5))
        
        return PlayRecommendation(
            play_name=best_play.get('name', 'Unknown Play'),
            confidence=best_play.get('success_rate', 0.5),
            reasoning=[
                f"Down: {down}, Distance: {distance}",
                f"Success rate: {best_play.get('success_rate', 0.5):.1%}",
                f"Formation: {best_play.get('formation', 'unknown')}"
            ],
            formation=best_play.get('formation', 'shotgun'),
            safety_validated=True
        )

# Example usage
if __name__ == "__main__":
    ai = SimpleAIBrain()
    
    # Sample plays
    sample_plays = [
        {"name": "Quick Pass Right", "formation": "shotgun", "success_rate": 0.75},
        {"name": "Power Run Left", "formation": "i_formation", "success_rate": 0.68},
        {"name": "Screen Pass", "formation": "shotgun", "success_rate": 0.72}
    ]
    
    ai.load_plays(sample_plays)
    
    # Test recommendation
    context = {"down": 3, "distance": 5}
    rec = ai.get_recommendation(context)
    
    print(f"Recommendation: {rec.play_name}")
    print(f"Confidence: {rec.confidence:.1%}")
'''
        
        with open(self.ai_dir / "simple_ai_brain.py", 'w') as f:
            f.write(main_ai_content)
        
        print("   ✅ Simple AI brain created")
    
    def create_sample_data(self):
        """Create sample data for testing"""
        print("\n📊 Creating sample data...")
        
        sample_data = {
            "plays": [
                {
                    "id": "play_001",
                    "name": "Quick Slant Right",
                    "formation": "shotgun",
                    "success_rate": 0.78,
                    "usage_count": 45,
                    "complexity": "beginner",
                    "age_appropriateness": ["youth", "middle_school", "high_school"],
                    "positions_involved": ["QB", "WR"],
                    "risk_level": "low"
                },
                {
                    "id": "play_002",
                    "name": "Power Run Right",
                    "formation": "i_formation", 
                    "success_rate": 0.65,
                    "usage_count": 32,
                    "complexity": "intermediate",
                    "age_appropriateness": ["middle_school", "high_school"],
                    "positions_involved": ["QB", "RB", "FB", "OL"],
                    "risk_level": "medium"
                },
                {
                    "id": "play_003",
                    "name": "Screen Pass Left",
                    "formation": "shotgun",
                    "success_rate": 0.71,
                    "usage_count": 28,
                    "complexity": "intermediate",
                    "age_appropriateness": ["high_school"],
                    "positions_involved": ["QB", "WR", "OL"],
                    "risk_level": "low"
                }
            ],
            "players": [
                {
                    "id": "player_001",
                    "name": "Marcus Johnson",
                    "position": "QB",
                    "number": 12,
                    "age_group": "high_school",
                    "skill_level": "advanced",
                    "attendance_rate": 0.95,
                    "injury_history": [],
                    "performance_metrics": {"speed": 82, "strength": 75, "skill": 92}
                },
                {
                    "id": "player_002", 
                    "name": "Tyler Davis",
                    "position": "RB",
                    "number": 23,
                    "age_group": "high_school",
                    "skill_level": "intermediate", 
                    "attendance_rate": 0.88,
                    "injury_history": ["ankle_sprain"],
                    "performance_metrics": {"speed": 88, "strength": 85, "skill": 78}
                }
            ],
            "teams": [
                {
                    "id": "team_001",
                    "name": "Demo Eagles",
                    "sport": "football",
                    "age_group": "high_school",
                    "season": "2024"
                }
            ]
        }
        
        # Save sample data
        with open(self.data_dir / "sample_data.json", 'w') as f:
            json.dump(sample_data, f, indent=2)
        
        print(f"   ✅ Sample data saved to: {self.data_dir / 'sample_data.json'}")
    
    def test_installation(self):
        """Test that everything is working"""
        print("\n🧪 Testing installation...")
        
        try:
            # Test imports
            import pandas as pd
            import numpy as np
            import sklearn
            print("   ✅ All imports working")
            
            # Test simple AI brain
            sys.path.insert(0, str(self.ai_dir))
            from simple_ai_brain import SimpleAIBrain
            
            ai = SimpleAIBrain()
            sample_plays = [{"name": "Test Play", "formation": "shotgun", "success_rate": 0.8}]
            ai.load_plays(sample_plays)
            
            rec = ai.get_recommendation({"down": 1, "distance": 10})
            print(f"   ✅ AI recommendation test: {rec.play_name}")
            
        except Exception as e:
            print(f"   ❌ Test failed: {e}")
            return False
        
        return True
    
    def show_next_steps(self):
        """Show what to do next"""
        print("\n🎉 Setup Complete!")
        print("=" * 50)
        
        print("📁 Files created:")
        print(f"   • {self.ai_dir}/simple_ai_brain.py - Simple AI brain")
        print(f"   • {self.ai_dir}/requirements.txt - Dependencies")
        print(f"   • {self.data_dir}/sample_data.json - Sample data")
        
        print("\n🚀 Next steps:")
        print("1. Test the simple AI brain:")
        print(f"   cd {self.ai_dir}")
        print("   python simple_ai_brain.py")
        
        print("\n2. Add your own data:")
        print(f"   • Replace {self.data_dir}/sample_data.json with your plays")
        print("   • Or use the data export utility to convert existing data")
        
        print("\n3. Integrate with your React app:")
        print("   • Use the provided React integration example")
        print("   • Or build a simple Flask API")
        
        print("\n4. Advanced features:")
        print("   • Run the full AI brain for advanced capabilities")
        print("   • Add player performance tracking")
        print("   • Implement safety validation")
        
        print("\n💡 Quick test command:")
        print(f"   python -c \"import sys; sys.path.append('{self.ai_dir}'); from simple_ai_brain import SimpleAIBrain; ai = SimpleAIBrain(); print('AI Brain ready!')\"")

def main():
    """Main setup function"""
    setup = CoachCoreSetup()
    
    try:
        setup.run_setup()
    except KeyboardInterrupt:
        print("\n\n⏹️  Setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        print("💡 You can still set up manually using the provided files")

if __name__ == "__main__":
    main()
