"""
Coach Core AI Brain - Complete Integration Package
This file provides everything needed to integrate the AI brain with your existing Smart Playbook
"""

import json
import os
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path
from enum import Enum

# Import the AI brain components
from coach_core_ai_brain import (
    CoachCoreAIBrain, 
    PlayData, 
    PlayerProfile, 
    GameContext,
    CoachingInsight
)

class FootballLevel(str, Enum):
    YOUTH_6U = "youth_6u"
    YOUTH_8U = "youth_8u"
    YOUTH_10U = "youth_10u"
    YOUTH_12U = "youth_12u"
    YOUTH_14U = "youth_14u"
    MIDDLE_SCHOOL = "middle_school"
    JV = "jv"
    VARSITY = "varsity"
    COLLEGE = "college"
    SEMI_PRO = "semi_pro"
    PROFESSIONAL = "professional"

class SmartPlaybookIntegrator:
    """
    Integrates AI brain with existing Smart Playbook data and functionality
    """
    
    def __init__(self, data_source_type: str = "json"):
        """
        Initialize integrator with different data source types
        Args:
            data_source_type: "json", "sqlite", "csv", or "live_app"
        """
        self.ai_brain = CoachCoreAIBrain()
        self.data_source_type = data_source_type
        self.logger = logging.getLogger(__name__)
        
        # Create data directory if it doesn't exist
        self.data_dir = Path("coach_core_data")
        self.data_dir.mkdir(exist_ok=True)
        
        self.logger.info(f"SmartPlaybook Integrator initialized with {data_source_type} data source")
    
    def extract_data_from_smart_playbook(self, source_path: str = None) -> Dict[str, Any]:
        """
        Extract data from existing Smart Playbook in various formats
        """
        if self.data_source_type == "json":
            return self._extract_from_json(source_path or "smart_playbook_export.json")
        elif self.data_source_type == "sqlite":
            return self._extract_from_sqlite(source_path or "smart_playbook.db")
        elif self.data_source_type == "csv":
            return self._extract_from_csv_folder(source_path or "csv_exports/")
        elif self.data_source_type == "live_app":
            return self._extract_from_live_app()
        else:
            raise ValueError(f"Unsupported data source type: {self.data_source_type}")
    
    def _extract_from_json(self, json_path: str) -> Dict[str, Any]:
        """Extract data from JSON export (most common case)"""
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
            
            self.logger.info(f"Loaded data from {json_path}")
            return self._standardize_data_format(data)
            
        except FileNotFoundError:
            self.logger.warning(f"JSON file {json_path} not found, creating sample data")
            return self._create_sample_export_data()
    
    def _extract_from_sqlite(self, db_path: str) -> Dict[str, Any]:
        """Extract data from SQLite database"""
        try:
            conn = sqlite3.connect(db_path)
            
            # Extract plays
            plays_df = pd.read_sql_query("""
                SELECT id, name, formation, success_rate, usage_count, 
                       complexity, age_appropriateness, positions_involved, risk_level
                FROM plays
            """, conn)
            
            # Extract players  
            players_df = pd.read_sql_query("""
                SELECT id, name, position, number, age_group, skill_level,
                       attendance_rate, injury_history, performance_metrics
                FROM players
            """, conn)
            
            # Extract practice sessions
            practices_df = pd.read_sql_query("""
                SELECT id, team_id, date, duration_minutes, periods, attendance
                FROM practice_sessions
            """, conn)
            
            conn.close()
            
            return {
                'plays': plays_df.to_dict('records'),
                'players': players_df.to_dict('records'),
                'practice_sessions': practices_df.to_dict('records')
            }
            
        except Exception as e:
            self.logger.error(f"Error reading SQLite database: {e}")
            return self._create_sample_export_data()
    
    def _extract_from_csv_folder(self, csv_folder: str) -> Dict[str, Any]:
        """Extract data from CSV files in a folder"""
        csv_path = Path(csv_folder)
        data = {}
        
        try:
            # Load plays.csv
            if (csv_path / "plays.csv").exists():
                plays_df = pd.read_csv(csv_path / "plays.csv")
                data['plays'] = plays_df.to_dict('records')
            
            # Load players.csv
            if (csv_path / "players.csv").exists():
                players_df = pd.read_csv(csv_path / "players.csv")
                data['players'] = players_df.to_dict('records')
            
            # Load roster.csv (alternative player format)
            elif (csv_path / "roster.csv").exists():
                roster_df = pd.read_csv(csv_path / "roster.csv")
                data['players'] = self._convert_roster_to_players(roster_df)
            
            # Load practice_plans.csv
            if (csv_path / "practice_plans.csv").exists():
                practices_df = pd.read_csv(csv_path / "practice_plans.csv")
                data['practice_sessions'] = practices_df.to_dict('records')
            
            self.logger.info(f"Loaded data from CSV folder: {csv_folder}")
            return data
            
        except Exception as e:
            self.logger.error(f"Error reading CSV files: {e}")
            return self._create_sample_export_data()
    
    def _extract_from_live_app(self) -> Dict[str, Any]:
        """
        Extract data from running Smart Playbook app
        This would connect to your live database/API
        """
        # This is a template - replace with your actual database connection
        try:
            # Example: Connect to your Firebase/Supabase/PostgreSQL
            # Replace this with your actual database queries
            
            # Mock implementation for demonstration
            self.logger.info("Connecting to live Smart Playbook app...")
            
            # In real implementation, you'd do something like:
            # plays = firebase_client.collection('plays').get()
            # players = firebase_client.collection('players').get()
            
            return self._create_sample_export_data()
            
        except Exception as e:
            self.logger.error(f"Error connecting to live app: {e}")
            return self._create_sample_export_data()
    
    def _convert_roster_to_players(self, roster_df: pd.DataFrame) -> List[Dict]:
        """Convert roster CSV format to player format"""
        players = []
        
        for _, row in roster_df.iterrows():
            player = {
                'id': row.get('id', f"player_{row.name}"),
                'name': row.get('name', f"Player {row.name}"),
                'position': row.get('position', 'WR'),
                'number': int(row.get('number', row.name + 1)),
                'age_group': row.get('age_group', 'high_school'),
                'skill_level': row.get('skill_level', 'intermediate'),
                'attendance_rate': float(row.get('attendance_rate', 0.85)),
                'injury_history': [],
                'performance_metrics': {
                    'speed': float(row.get('speed', 75)),
                    'strength': float(row.get('strength', 75)),
                    'skill': float(row.get('skill', 75))
                }
            }
            players.append(player)
        
        return players
    
    def _standardize_data_format(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize different data formats to consistent structure"""
        standardized = {
            'plays': [],
            'players': [],
            'practice_sessions': [],
            'teams': [],
            'feedback': []
        }
        
        # Handle different play data formats
        if 'plays' in raw_data:
            for play in raw_data['plays']:
                level = play.get('age_group', 'high_school')
                level = FootballLevel[level.upper()] if level.upper() in FootballLevel.__members__ else FootballLevel.VARSITY
                standardized_play = {
                    'id': play.get('id', f"play_{len(standardized['plays'])}"),
                    'name': play.get('name', 'Unnamed Play'),
                    'formation': play.get('formation', 'shotgun'),
                    'success_rate': float(play.get('success_rate', 0.5)),
                    'usage_count': int(play.get('usage_count', 1)),
                    'complexity': play.get('complexity', 'intermediate'),
                    'level': level,
                    'constraints': play.get('constraints', {}),
                    'level_extensions': play.get('level_extensions', {}),
                    'age_appropriateness': play.get('age_appropriateness', ['high_school']),
                    'positions_involved': play.get('positions_involved', ['QB', 'WR']),
                    'risk_level': play.get('risk_level', 'medium')
                }
                standardized['plays'].append(standardized_play)
        
        # Handle different player data formats
        if 'players' in raw_data:
            for player in raw_data['players']:
                level = player.get('age_group', 'high_school')
                level = FootballLevel[level.upper()] if level.upper() in FootballLevel.__members__ else FootballLevel.VARSITY
                standardized_player = {
                    'id': player.get('id', f"player_{len(standardized['players'])}"),
                    'name': player.get('name', 'Unknown Player'),
                    'position': player.get('position', 'WR'),
                    'number': int(player.get('number', 99)),
                    'level': level,
                    'constraints': player.get('constraints', {}),
                    'level_extensions': player.get('level_extensions', {}),
                    'skill_level': player.get('skill_level', 'intermediate'),
                    'attendance_rate': float(player.get('attendance_rate', 0.85)),
                    'injury_history': player.get('injury_history', []),
                    'performance_metrics': player.get('performance_metrics', {
                        'speed': 75, 'strength': 75, 'skill': 75
                    })
                }
                standardized['players'].append(standardized_player)
        
        # Copy other data as-is
        for key in ['practice_sessions', 'teams', 'feedback']:
            if key in raw_data:
                for team in raw_data.get('teams', []):
                    level = team.get('age_group', 'high_school')
                    level = FootballLevel[level.upper()] if level.upper() in FootballLevel.__members__ else FootballLevel.VARSITY
                    team['level'] = level
                    team['constraints'] = team.get('constraints', {})
                    team['level_extensions'] = team.get('level_extensions', {})
                standardized[key] = raw_data[key]
        
        return standardized
    
    def _create_sample_export_data(self) -> Dict[str, Any]:
        """Create sample data based on your Smart Playbook structure"""
        return {
            'plays': [
                {
                    'id': 'play_001',
                    'name': 'Shotgun Quick Slant',
                    'formation': 'shotgun',
                    'success_rate': 0.78,
                    'usage_count': 45,
                    'complexity': 'beginner',
                    'level': FootballLevel.YOUTH_10U,
                    'constraints': {},
                    'level_extensions': {},
                    'age_appropriateness': ['youth', 'middle_school', 'high_school'],
                    'positions_involved': ['QB', 'WR'],
                    'risk_level': 'low'
                },
                {
                    'id': 'play_002',
                    'name': 'I-Formation Power Run',
                    'formation': 'i_formation',
                    'success_rate': 0.65,
                    'usage_count': 32,
                    'complexity': 'intermediate',
                    'level': FootballLevel.HIGH_SCHOOL,
                    'constraints': {},
                    'level_extensions': {},
                    'age_appropriateness': ['middle_school', 'high_school'],
                    'positions_involved': ['QB', 'RB', 'FB', 'OL'],
                    'risk_level': 'medium'
                },
                {
                    'id': 'play_003',
                    'name': 'Spread Four Verticals',
                    'formation': 'spread',
                    'success_rate': 0.71,
                    'usage_count': 28,
                    'complexity': 'advanced',
                    'level': FootballLevel.COLLEGE,
                    'constraints': {},
                    'level_extensions': {},
                    'age_appropriateness': ['high_school'],
                    'positions_involved': ['QB', 'WR', 'WR', 'WR', 'TE'],
                    'risk_level': 'low'
                }
            ],
            'players': [
                {
                    'id': 'player_001',
                    'name': 'Marcus Johnson',
                    'position': 'QB',
                    'number': 12,
                    'level': FootballLevel.HIGH_SCHOOL,
                    'constraints': {},
                    'level_extensions': {},
                    'skill_level': 'advanced',
                    'attendance_rate': 0.95,
                    'injury_history': [],
                    'performance_metrics': {'speed': 82, 'strength': 75, 'skill': 92}
                },
                {
                    'id': 'player_002',
                    'name': 'Tyler Davis',
                    'position': 'RB',
                    'number': 23,
                    'level': FootballLevel.HIGH_SCHOOL,
                    'constraints': {},
                    'level_extensions': {},
                    'skill_level': 'intermediate',
                    'attendance_rate': 0.88,
                    'injury_history': ['ankle_sprain'],
                    'performance_metrics': {'speed': 88, 'strength': 85, 'skill': 78}
                }
            ],
            'teams': [
                {
                    'id': 'team_001',
                    'name': 'Demo Eagles',
                    'sport': 'football',
                    'level': FootballLevel.HIGH_SCHOOL,
                    'constraints': {},
                    'level_extensions': {},
                    'season': '2024'
                }
            ]
        }
    
    def setup_ai_brain_with_data(self, data: Dict[str, Any]) -> bool:
        """Set up AI brain with extracted data"""
        try:
            # Clear existing data
            self.ai_brain.play_database = []
            self.ai_brain.player_database = []
            
            # Load plays
            for play_data in data.get('plays', []):
                try:
                    play = PlayData(**play_data)
                    self.ai_brain.play_database.append(play)
                except Exception as e:
                    self.logger.warning(f"Error loading play {play_data.get('name', 'unknown')}: {e}")
            
            # Load players
            for player_data in data.get('players', []):
                try:
                    player = PlayerProfile(**player_data)
                    self.ai_brain.player_database.append(player)
                except Exception as e:
                    self.logger.warning(f"Error loading player {player_data.get('name', 'unknown')}: {e}")
            
            # Train models
            self.ai_brain.train_models()
            
            self.logger.info(f"AI Brain loaded with {len(self.ai_brain.play_database)} plays and {len(self.ai_brain.player_database)} players")
            return True
            
        except Exception as e:
            self.logger.error(f"Error setting up AI brain: {e}")
            return False
    
    def create_react_api_service(self, port: int = 5000) -> str:
        """
        Create a Flask API service for React integration
        Returns the service code as a string
        """
        api_code = f'''
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime

# Import your AI brain
from coach_core_ai_brain import CoachCoreAIBrain, GameContext

app = Flask(__name__)
CORS(app)  # Enable CORS for React integration

# Initialize AI brain
ai_brain = CoachCoreAIBrain()

# Load your data
try:
    with open('smart_playbook_data.json', 'r') as f:
        data = json.load(f)
    
    # Set up AI brain with your data
    integrator = SmartPlaybookIntegrator()
    integrator.setup_ai_brain_with_data(data)
    ai_brain = integrator.ai_brain
    
    print("✅ AI Brain loaded with real data")
except:
    print("⚠️  Using mock data - add your smart_playbook_data.json file")
    ai_brain._generate_mock_data()
    ai_brain.train_models()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({{"status": "healthy", "plays": len(ai_brain.play_database), "players": len(ai_brain.player_database)}})

@app.route('/api/recommend_play', methods=['POST'])
def recommend_play():
    try:
        data = request.json
        
        # Create game context from request
        context = GameContext(
            score_differential=data.get('score_differential', 0),
            time_remaining=data.get('time_remaining', 900),
            field_position=data.get('field_position', 'midfield'),
            down=data.get('down', 1),
            distance=data.get('distance', 10),
            weather=data.get('weather', 'clear'),
            opponent_tendency=data.get('opponent_tendency', 'balanced')
        )
        
        team_context = {{
            'age_group': data.get('age_group', 'high_school'),
            'skill_level': data.get('skill_level', 'intermediate')
        }}
        
        # Get AI recommendation
        recommendation = ai_brain.generate_play_recommendation(context, team_context)
        
        return jsonify({{
            'success': True,
            'recommendation': recommendation.recommendation,
            'confidence': recommendation.confidence,
            'reasoning': recommendation.reasoning,
            'safety_validated': recommendation.safety_validated,
            'supporting_data': recommendation.supporting_data
        }})
        
    except Exception as e:
        return jsonify({{'success': False, 'error': str(e)}}), 500

@app.route('/api/generate_practice_plan', methods=['POST'])
def generate_practice_plan():
    try:
        data = request.json
        
        team_context = {{
            'age_group': data.get('age_group', 'high_school'),
            'skill_level': data.get('skill_level', 'intermediate')
        }}
        
        practice_goals = data.get('goals', ['offense', 'defense'])
        
        # Generate practice plan
        practice_insight = ai_brain.generate_practice_plan_insights(team_context, practice_goals)
        
        return jsonify({{
            'success': True,
            'plan': practice_insight.recommendation,
            'periods': practice_insight.supporting_data.get('periods', []),
            'safety_check': practice_insight.supporting_data.get('safety_check', {{}},
            'confidence': practice_insight.confidence
        }})
        
    except Exception as e:
        return jsonify({{'success': False, 'error': str(e)}}), 500

@app.route('/api/analyze_player/<player_id>', methods=['GET'])
def analyze_player(player_id):
    try:
        # Get player analysis
        analysis = ai_brain.analyze_player_development(player_id)
        
        return jsonify({{
            'success': True,
            'analysis': analysis.recommendation,
            'confidence': analysis.confidence,
            'trends': analysis.supporting_data.get('trends', {{}},
            'injury_risk': analysis.supporting_data.get('injury_risk', {{}})
        }})
        
    except Exception as e:
        return jsonify({{'success': False, 'error': str(e)}}), 500

@app.route('/api/feedback', methods=['POST'])
def record_feedback():
    try:
        data = request.json
        suggestion_id = data.get('suggestion_id')
        feedback_type = data.get('feedback')  # 'helpful', 'not_helpful', 'applied'
        
        # Record feedback for AI learning
        ai_brain.record_feedback(suggestion_id, feedback_type)
        
        return jsonify({{'success': True, 'message': 'Feedback recorded'}})
        
    except Exception as e:
        return jsonify({{'success': False, 'error': str(e)}}), 500

if __name__ == '__main__':
    print("🚀 Coach Core AI API Server starting...")
    print(f"💡 Access at: http://localhost:{port}")
    print("📚 API Endpoints:")
    print("   GET  /api/health - Check service status")
    print("   POST /api/recommend_play - Get play recommendations") 
    print("   POST /api/generate_practice_plan - Generate practice plans")
    print("   GET  /api/analyze_player/<id> - Analyze player development")
    print("   POST /api/feedback - Record AI feedback")
    
    app.run(debug=True, host='0.0.0.0', port={port})
'''
        
        # Save the API service to a file
        api_file_path = self.data_dir / "ai_api_service.py"
        with open(api_file_path, 'w') as f:
            f.write(api_code)
        
        self.logger.info(f"Created API service file: {api_file_path}")
        return str(api_file_path)
    
    def create_react_integration_example(self) -> str:
        """Create React integration example"""
        react_code = '''
// React Integration Example for Coach Core AI Brain
import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

// Custom hook for AI recommendations
const useAIBrain = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPlayRecommendation = async (gameContext, teamContext) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/recommend_play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...gameContext, ...teamContext })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generatePracticePlan = async (teamContext, goals) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate_practice_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...teamContext, goals })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const recordFeedback = async (suggestionId, feedback) => {
    try {
      await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion_id: suggestionId, feedback })
      });
    } catch (err) {
      console.error('Failed to record feedback:', err);
    }
  };

  return { 
    getPlayRecommendation, 
    generatePracticePlan,
    recordFeedback,
    loading, 
    error 
  };
};

// AI-Enhanced Smart Playbook Component
const AIEnhancedSmartPlaybook = () => {
  const { getPlayRecommendation, generatePracticePlan, loading, error } = useAIBrain();
  const [recommendation, setRecommendation] = useState(null);
  const [gameContext, setGameContext] = useState({
    down: 3,
    distance: 7,
    field_position: 'midfield',
    score_differential: -3,
    time_remaining: 420
  });

  const handleGetRecommendation = async () => {
    try {
      const result = await getPlayRecommendation(gameContext, {
        age_group: 'high_school',
        skill_level: 'intermediate'
      });
      
      setRecommendation(result);
    } catch (err) {
      console.error('Failed to get recommendation:', err);
    }
  };

  return (
    <div className="ai-enhanced-playbook p-6">
      <h2 className="text-2xl font-bold mb-6">🧠 AI-Enhanced Smart Playbook</h2>
      
      {/* Game Context Controls */}
      <div className="game-context mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Game Situation</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Down</label>
            <select 
              value={gameContext.down}
              onChange={(e) => setGameContext({...gameContext, down: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            >
              <option value={1}>1st</option>
              <option value={2}>2nd</option>
              <option value={3}>3rd</option>
              <option value={4}>4th</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Distance</label>
            <input 
              type="number"
              value={gameContext.distance}
              onChange={(e) => setGameContext({...gameContext, distance: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              min="1" max="25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Field Position</label>
            <select 
              value={gameContext.field_position}
              onChange={(e) => setGameContext({...gameContext, field_position: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="own_territory">Own Territory</option>
              <option value="midfield">Midfield</option>
              <option value="red_zone">Red Zone</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Score Diff</label>
            <input 
              type="number"
              value={gameContext.score_differential}
              onChange={(e) => setGameContext({...gameContext, score_differential: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              min="-30" max="30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time (sec)</label>
            <input 
              type="number"
              value={gameContext.time_remaining}
              onChange={(e) => setGameContext({...gameContext, time_remaining: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              min="0" max="3600"
            />
          </div>
        </div>
      </div>

      {/* AI Recommendation Button */}
      <button 
        onClick={handleGetRecommendation}
        disabled={loading}
        className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Getting AI Recommendation...
          </>
        ) : (
          <>
            🎯 Get AI Play Recommendation
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
          Error: {error}
        </div>
      )}

      {/* AI Recommendation Display */}
      {recommendation && (
        <div className="ai-recommendation bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">🧠 AI Recommendation</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {Math.round(recommendation.confidence * 100)}% Confidence
            </span>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-800 font-medium">{recommendation.recommendation}</p>
          </div>

          {/* Safety Badge */}
          {recommendation.safety_validated && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ✅ Safety Validated
              </span>
            </div>
          )}

          {/* Reasoning */}
          {recommendation.reasoning && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Reasoning:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                {recommendation.reasoning.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback Buttons */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-600">Was this helpful?</span>
            <button 
              onClick={() => recordFeedback(recommendation.id, 'helpful')}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
            >
              👍 Helpful
            </button>
            <button 
              onClick={() => recordFeedback(recommendation.id, 'not_helpful')}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              👎 Not Helpful
            </button>
            <button 
              onClick={() => recordFeedback(recommendation.id, 'applied')}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              ✅ Used This Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIEnhancedSmartPlaybook;
'''
        
        # Save React integration example
        react_file_path = self.data_dir / "react_integration_example.jsx"
        with open(react_file_path, 'w') as f:
            f.write(react_code)
        
        self.logger.info(f"Created React integration example: {react_file_path}")
        return str(react_file_path)
    
    def create_data_export_utility(self) -> str:
        """Create utility to export data from existing Smart Playbook"""
        export_code = '''
"""
Data Export Utility for Smart Playbook -> AI Brain Migration
Use this script to export your existing Smart Playbook data for AI training
"""

import json
import csv
import sqlite3
from pathlib import Path
from datetime import datetime

class SmartPlaybookExporter:
    def __init__(self, output_dir="exported_data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def export_from_local_storage(self, local_storage_file):
        """Export from browser localStorage backup"""
        # If you have a localStorage backup JSON file
        try:
            with open(local_storage_file, 'r') as f:
                storage_data = json.load(f)
            
            # Extract Smart Playbook data
            plays = self._extract_plays_from_storage(storage_data)
            players = self._extract_players_from_storage(storage_data)
            
            self._save_exported_data({'plays': plays, 'players': players})
            
        except Exception as e:
            print(f"Error exporting from localStorage: {e}")
    
    def export_from_csv_files(self, csv_directory):
        """Export from CSV files you've already created"""
        csv_dir = Path(csv_directory)
        data = {}
        
        # Read plays
        plays_file = csv_dir / "plays.csv"
        if plays_file.exists():
            with open(plays_file, 'r') as f:
                reader = csv.DictReader(f)
                data['plays'] = list(reader)
        
        # Read roster/players
        for filename in ["players.csv", "roster.csv"]:
            roster_file = csv_dir / filename
            if roster_file.exists():
                with open(roster_file, 'r') as f:
                    reader = csv.DictReader(f)
                    data['players'] = list(reader)
                break
        
        self._save_exported_data(data)
    
    def export_manual_entry(self):
        """Interactive manual data entry"""
        print("🏈 Manual Smart Playbook Data Entry")
        print("=" * 50)
        
        plays = []
        players = []
        
        # Enter plays
        print("\\nEnter your plays (press Enter on empty name to finish):")
        while True:
            name = input("Play name: ").strip()
            if not name:
                break
            
            formation = input("Formation (shotgun/i_formation/spread): ").strip() or "shotgun"
            success_rate = float(input("Success rate (0.0-1.0): ") or "0.7")
            complexity = input("Complexity (beginner/intermediate/advanced): ").strip() or "intermediate"
            
            play = {
                'id': f"play_{len(plays) + 1:03d}",
                'name': name,
                'formation': formation,
                'success_rate': success_rate,
                'usage_count': 1,
                'complexity': complexity,
                'level': FootballLevel.HIGH_SCHOOL,
                'constraints': {},
                'level_extensions': {},
                'age_appropriateness': ['high_school'],
                'positions_involved': ['QB', 'WR'],
                'risk_level': 'medium'
            }
            plays.append(play)
            print(f"✅ Added play: {name}")
        
        # Enter players
        print("\\nEnter your players (press Enter on empty name to finish):")
        while True:
            name = input("Player name: ").strip()
            if not name:
                break
            
            position = input("Position: ").strip() or "WR"
            number = int(input("Jersey number: ") or len(players) + 1)
            
            player = {
                'id': f"player_{len(players) + 1:03d}",
                'name': name,
                'position': position,
                'number': number,
                'level': FootballLevel.HIGH_SCHOOL,
                'constraints': {},
                'level_extensions': {},
                'skill_level': 'intermediate',
                'attendance_rate': 0.9,
                'injury_history': [],
                'performance_metrics': {'speed': 75, 'strength': 75, 'skill': 75}
            }
            players.append(player)
            print(f"✅ Added player: {name} (#{number})")
        
        self._save_exported_data({'plays': plays, 'players': players})
    
    def _extract_plays_from_storage(self, storage_data):
        """Extract plays from localStorage data"""
        plays = []
        
        # Look for saved plays in various storage keys
        for key, value in storage_data.items():
            if 'play' in key.lower() and isinstance(value, str):
                try:
                    play_data = json.loads(value)
                    if isinstance(play_data, list):
                        plays.extend(play_data)
                    elif isinstance(play_data, dict):
                        plays.append(play_data)
                except:
                    continue
        
        return plays
    
    def _extract_players_from_storage(self, storage_data):
        """Extract players from localStorage data"""
        players = []
        
        # Look for saved players/roster in various storage keys
        for key, value in storage_data.items():
            if any(keyword in key.lower() for keyword in ['player', 'roster', 'team']):
                try:
                    player_data = json.loads(value)
                    if isinstance(player_data, list):
                        players.extend(player_data)
                    elif isinstance(player_data, dict):
                        players.append(player_data)
                except:
                    continue
        
        return players
    
    def _save_exported_data(self, data):
        """Save exported data to JSON file"""
        output_file = self.output_dir / "smart_playbook_data.json"
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"\\n✅ Data exported to: {output_file}")
        print(f"📊 Exported {len(data.get('plays', []))} plays and {len(data.get('players', []))} players")
        print(f"🚀 Use this file with the AI Brain integration!")

# CLI Interface
if __name__ == "__main__":
    exporter = SmartPlaybookExporter()
    
    print("🏈 Smart Playbook Data Exporter")
    print("=" * 40)
    print("Choose export method:")
    print("1. Manual entry (interactive)")
    print("2. From CSV files")
    print("3. From localStorage backup")
    
    choice = input("\\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        exporter.export_manual_entry()
    elif choice == "2":
        csv_dir = input("CSV directory path: ").strip() or "csv_exports"
        exporter.export_from_csv_files(csv_dir)
    elif choice == "3":
        storage_file = input("localStorage JSON file path: ").strip()
        exporter.export_from_local_storage(storage_file)
    else:
        print("Invalid choice. Run the script again.")
'''
        
        # Save export utility
        export_file_path = self.data_dir / "data_export_utility.py"
        with open(export_file_path, 'w') as f:
            f.write(export_code)
        
        self.logger.info(f"Created data export utility: {export_file_path}")
        return str(export_file_path)
    
    def run_complete_integration(self, data_source: str = None) -> Dict[str, str]:
        """Run the complete integration process"""
        self.logger.info("🚀 Starting complete Smart Playbook AI integration...")
        
        # Step 1: Extract data
        data = self.extract_data_from_smart_playbook(data_source)
        
        # Step 2: Set up AI brain
        success = self.setup_ai_brain_with_data(data)
        if not success:
            raise Exception("Failed to set up AI brain with data")
        
        # Step 3: Create integration files
        integration_files = {
            'api_service': self.create_react_api_service(),
            'react_example': self.create_react_integration_example(),
            'export_utility': self.create_data_export_utility()
        }
        
        # Step 4: Save the trained AI brain
        model_path = self.data_dir / "trained_ai_brain.pkl"
        self.ai_brain.save_model(str(model_path))
        integration_files['trained_model'] = str(model_path)
        
        # Step 5: Create data file for API
        data_file_path = self.data_dir / "smart_playbook_data.json"
        with open(data_file_path, 'w') as f:
            json.dump(data, f, indent=2)
        integration_files['data_file'] = str(data_file_path)
        
        self.logger.info("✅ Complete integration ready!")
        return integration_files

# Usage example and CLI interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Smart Playbook AI Integration")
    parser.add_argument('--data-source', choices=['json', 'sqlite', 'csv', 'live_app'], 
                       default='json', help='Data source type')
    parser.add_argument('--data-path', help='Path to data source')
    parser.add_argument('--output-dir', default='coach_core_data', help='Output directory')
    parser.add_argument('--api-port', type=int, default=5000, help='API server port')
    
    args = parser.parse_args()
    
    # Create integrator
    integrator = SmartPlaybookIntegrator(args.data_source)
    
    try:
        # Run complete integration
        files = integrator.run_complete_integration(args.data_path)
        
        print("🎉 Integration Complete!")
        print("=" * 50)
        print("Generated files:")
        for name, path in files.items():
            print(f"  {name}: {path}")
        
        print(f"\\n🚀 Next steps:")
        print(f"1. Install requirements: pip install flask flask-cors")
        print(f"2. Start API server: python {files['api_service']}")
        print(f"3. Integrate React example into your app")
        print(f"4. Use the export utility to add more data")
        
    except Exception as e:
        print(f"❌ Integration failed: {e}")
        print("💡 Try running the data export utility first")
