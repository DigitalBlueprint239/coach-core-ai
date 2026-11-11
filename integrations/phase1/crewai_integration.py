"""
CrewAI Integration for Coach Core AI
Phase 1: Core Enhancements - Multi-Agent Coaching System
"""

import asyncio
from typing import Dict, List, Any, Optional
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class AgentConfig:
    role: str
    goal: str
    backstory: str
    tools: List[str]
    verbose: bool = True
    allow_delegation: bool = False

@dataclass
class TaskConfig:
    description: str
    expected_output: str
    agents: List[str]

class CoachingCrewSystem:
    """Multi-agent coaching system using CrewAI"""
    
    def __init__(self):
        self.agents = {}
        self.tools = {}
        self.crew = None
        self.setup_tools()
        self.setup_agents()
    
    def setup_tools(self):
        """Initialize coaching tools"""
        try:
            from langchain.tools import Tool
            
            # Game Analysis Tool
            self.tools['game_analysis'] = Tool(
                name="Game Analysis Tool",
                func=self._analyze_game_state,
                description="Analyze current game state, possession, and tactical situation"
            )
            
            # Player Profile Tool
            self.tools['player_profile'] = Tool(
                name="Player Profile Tool",
                func=self._get_player_profile,
                description="Get detailed player profile including performance history and preferences"
            )
            
            # Formation Tool
            self.tools['formation_analysis'] = Tool(
                name="Formation Analysis Tool",
                func=self._analyze_formation,
                description="Analyze team formation and suggest tactical adjustments"
            )
            
            # Motivation Database Tool
            self.tools['motivation_db'] = Tool(
                name="Motivation Database Tool",
                func=self._get_motivational_content,
                description="Access motivational content and psychological strategies"
            )
            
            # Biometric Tool
            self.tools['biometric_analysis'] = Tool(
                name="Biometric Analysis Tool",
                func=self._analyze_biometrics,
                description="Analyze player biometric data and fitness metrics"
            )
            
            # Fitness Analysis Tool
            self.tools['fitness_analysis'] = Tool(
                name="Fitness Analysis Tool",
                func=self._analyze_fitness,
                description="Analyze player fitness levels and recovery status"
            )
            
            logger.info("Coaching tools initialized successfully")
            
        except ImportError:
            logger.warning("LangChain not available. Install with: pip install langchain")
            self.tools = {}
    
    def setup_agents(self):
        """Initialize coaching agents"""
        try:
            from crewai import Agent
            
            # Tactical Coach Agent
            self.agents['tactical'] = Agent(
                role='Tactical Analysis Coach',
                goal='Provide real-time tactical analysis and strategic adjustments',
                backstory="""You are an experienced tactical coach with over 20 years 
                         of experience in professional sports. You have deep understanding 
                         of game strategies, player positioning, and tactical adjustments. 
                         You excel at analyzing game situations and providing actionable 
                         tactical advice.""",
                verbose=True,
                allow_delegation=False,
                tools=[self.tools.get('game_analysis'), self.tools.get('formation_analysis')]
            )
            
            # Motivational Coach Agent
            self.agents['motivational'] = Agent(
                role='Motivational Coach',
                goal='Boost player morale and mental performance',
                backstory="""You are a sports psychologist specializing in peak performance 
                         and mental coaching. You have helped numerous athletes overcome 
                         mental blocks and achieve their full potential. You understand 
                         the psychology of sports and can provide personalized motivation.""",
                verbose=True,
                allow_delegation=False,
                tools=[self.tools.get('player_profile'), self.tools.get('motivation_db')]
            )
            
            # Fitness Coach Agent
            self.agents['fitness'] = Agent(
                role='Fitness Coach',
                goal='Monitor and optimize player physical performance',
                backstory="""You are a fitness expert with specialization in sports 
                         performance and injury prevention. You have worked with elite 
                         athletes and understand the importance of proper conditioning, 
                         recovery, and injury prevention in sports performance.""",
                verbose=True,
                allow_delegation=False,
                tools=[self.tools.get('biometric_analysis'), self.tools.get('fitness_analysis')]
            )
            
            logger.info("Coaching agents initialized successfully")
            
        except ImportError:
            logger.warning("CrewAI not available. Install with: pip install crewai")
            self.agents = {}
    
    def create_coaching_task(self, 
                           game_state: Dict[str, Any], 
                           player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create and execute a coaching task with multiple agents"""
        
        if not self.agents:
            raise ImportError("CrewAI agents not available")
        
        try:
            from crewai import Task, Crew, Process
            
            # Create task description
            task_description = f"""
            Analyze the current coaching situation and provide comprehensive recommendations:
            
            Game State:
            - Score: {game_state.get('score', 'Unknown')}
            - Time: {game_state.get('time', 'Unknown')}
            - Possession: {game_state.get('possession', 'Unknown')}
            - Field Position: {game_state.get('field_position', 'Unknown')}
            
            Player Data:
            - Fatigue Level: {player_data.get('fatigue', 'Unknown')}
            - Position: {player_data.get('position', 'Unknown')}
            - Performance: {player_data.get('performance', 'Unknown')}
            - Mental State: {player_data.get('mental_state', 'Unknown')}
            
            Provide detailed analysis and recommendations from tactical, motivational, and fitness perspectives.
            """
            
            # Create task
            task = Task(
                description=task_description,
                expected_output="""Detailed coaching strategy including:
                1. Tactical recommendations and adjustments
                2. Motivational strategies and psychological support
                3. Fitness and recovery recommendations
                4. Immediate action items for the coach""",
                agents=[self.agents['tactical'], self.agents['motivational'], self.agents['fitness']]
            )
            
            # Create crew
            crew = Crew(
                agents=[self.agents['tactical'], self.agents['motivational'], self.agents['fitness']],
                tasks=[task],
                process=Process.sequential,
                verbose=True
            )
            
            # Execute task
            logger.info("Executing coaching task with multi-agent crew")
            result = crew.kickoff()
            
            return {
                'result': result,
                'timestamp': datetime.now().isoformat(),
                'game_state': game_state,
                'player_data': player_data
            }
            
        except Exception as e:
            logger.error(f"Error executing coaching task: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _analyze_game_state(self, game_data: str) -> str:
        """Analyze current game state"""
        # This would integrate with your existing game analysis system
        return f"Game state analysis: {game_data} - Tactical situation assessed"
    
    def _get_player_profile(self, player_id: str) -> str:
        """Get player profile information"""
        # This would integrate with your existing player database
        return f"Player profile for {player_id}: Performance history and preferences loaded"
    
    def _analyze_formation(self, formation_data: str) -> str:
        """Analyze team formation"""
        # This would integrate with your existing formation analysis
        return f"Formation analysis: {formation_data} - Tactical adjustments recommended"
    
    def _get_motivational_content(self, context: str) -> str:
        """Get motivational content"""
        # This would integrate with your motivational content database
        return f"Motivational content for context: {context} - Personalized motivation ready"
    
    def _analyze_biometrics(self, biometric_data: str) -> str:
        """Analyze player biometrics"""
        # This would integrate with your biometric analysis system
        return f"Biometric analysis: {biometric_data} - Health metrics assessed"
    
    def _analyze_fitness(self, fitness_data: str) -> str:
        """Analyze player fitness"""
        # This would integrate with your fitness analysis system
        return f"Fitness analysis: {fitness_data} - Performance and recovery status evaluated"

class RealTimeCoachingSystem:
    """Real-time coaching system with multi-agent coordination"""
    
    def __init__(self):
        self.crew_system = CoachingCrewSystem()
        self.coaching_history = []
        self.active_sessions = {}
    
    async def start_coaching_session(self, session_id: str, initial_context: Dict[str, Any]):
        """Start a new coaching session"""
        self.active_sessions[session_id] = {
            'start_time': datetime.now(),
            'context': initial_context,
            'interactions': [],
            'recommendations': []
        }
        
        logger.info(f"Started coaching session: {session_id}")
        return session_id
    
    async def process_coaching_request(self, 
                                     session_id: str, 
                                     game_state: Dict[str, Any], 
                                     player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a coaching request in real-time"""
        
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        # Execute coaching task
        result = self.crew_system.create_coaching_task(game_state, player_data)
        
        # Store interaction
        interaction = {
            'timestamp': datetime.now().isoformat(),
            'game_state': game_state,
            'player_data': player_data,
            'recommendation': result
        }
        
        self.active_sessions[session_id]['interactions'].append(interaction)
        self.active_sessions[session_id]['recommendations'].append(result)
        
        return result
    
    async def end_coaching_session(self, session_id: str) -> Dict[str, Any]:
        """End a coaching session and generate summary"""
        
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.active_sessions[session_id]
        session['end_time'] = datetime.now()
        
        # Generate session summary
        summary = {
            'session_id': session_id,
            'duration': (session['end_time'] - session['start_time']).total_seconds(),
            'interaction_count': len(session['interactions']),
            'recommendations_generated': len(session['recommendations']),
            'session_data': session
        }
        
        # Store in history
        self.coaching_history.append(summary)
        
        # Remove from active sessions
        del self.active_sessions[session_id]
        
        logger.info(f"Ended coaching session: {session_id}")
        return summary
    
    def get_session_history(self, session_id: str = None) -> List[Dict[str, Any]]:
        """Get coaching session history"""
        if session_id:
            return [s for s in self.coaching_history if s['session_id'] == session_id]
        return self.coaching_history

def run_crewai_example():
    """Example usage of the CrewAI coaching system"""
    
    # Initialize coaching system
    coaching_system = RealTimeCoachingSystem()
    
    # Example game state and player data
    game_state = {
        'score': '2-1',
        'time': '75:00',
        'possession': '45%',
        'field_position': 'attacking_third'
    }
    
    player_data = {
        'fatigue': 0.7,
        'position': 'midfielder',
        'performance': 'good',
        'mental_state': 'focused'
    }
    
    async def example_session():
        # Start session
        session_id = await coaching_system.start_coaching_session(
            'demo_session_001',
            {'team': 'Home Team', 'opponent': 'Away Team'}
        )
        
        # Process coaching request
        result = await coaching_system.process_coaching_request(
            session_id,
            game_state,
            player_data
        )
        
        print("Coaching Recommendation:")
        print(result.get('result', 'No result available'))
        
        # End session
        summary = await coaching_system.end_coaching_session(session_id)
        print(f"\nSession Summary: {summary['interaction_count']} interactions")
        
        return result
    
    # Run example
    try:
        result = asyncio.run(example_session())
        return result
    except ImportError as e:
        print(f"CrewAI not available: {e}")
        print("Install with: pip install crewai langchain")
        return None

if __name__ == "__main__":
    run_crewai_example() 