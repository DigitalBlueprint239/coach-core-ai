# Coach Core AI Brain - Complete Implementation
# File Structure:
# coach_core_ai/
# ├── __init__.py
# ├── config.py
# ├── main.py
# ├── core/
# │   ├── __init__.py
# │   ├── dialogue_engine.py
# │   ├── progress_analyzer.py
# │   ├── motivational_engine.py
# │   ├── personalization_engine.py
# │   ├── engagement_manager.py
# │   └── learning_module.py
# ├── services/
# │   ├── __init__.py
# │   ├── nlp_service.py
# │   ├── ml_models.py
# │   ├── data_store.py
# │   └── context_manager.py
# ├── models/
# │   ├── __init__.py
# │   ├── user_model.py
# │   ├── conversation_model.py
# │   └── progress_model.py
# ├── utils/
# │   ├── __init__.py
# │   ├── helpers.py
# │   └── validators.py
# └── api/
#     ├── __init__.py
#     └── endpoints.py

# === config.py ===
"""Configuration settings for Coach Core AI Brain"""

import os
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class AIConfig:
    """AI Brain configuration settings"""
    
    # Model settings
    nlp_model: str = "bert-base-uncased"
    embedding_dim: int = 768
    max_sequence_length: int = 512
    
    # Database settings
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", 5432))
    db_name: str = os.getenv("DB_NAME", "coach_core")
    
    # Cache settings
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", 6379))
    cache_ttl: int = 3600  # 1 hour
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_version: str = "v1"
    
    # ML settings
    batch_size: int = 32
    learning_rate: float = 0.001
    model_update_frequency: int = 86400  # Daily
    
    # Engagement settings
    min_engagement_interval: int = 3600  # 1 hour
    max_daily_notifications: int = 5
    
    # Security settings
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "default-key-change-in-production")
    jwt_secret: str = os.getenv("JWT_SECRET", "default-secret-change-in-production")
    
    # Feature flags
    enable_voice_input: bool = False
    enable_advanced_analytics: bool = True
    enable_social_features: bool = True

config = AIConfig()

# === main.py ===
"""Main entry point for Coach Core AI Brain"""

import asyncio
import logging
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from coach_core_ai.config import config
from coach_core_ai.core import (
    DialogueEngine,
    ProgressAnalyzer,
    MotivationalEngine,
    PersonalizationEngine,
    EngagementManager,
    LearningModule
)
from coach_core_ai.services import (
    NLPService,
    MLModels,
    DataStore,
    ContextManager
)
from coach_core_ai.api.endpoints import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CoachCoreAIBrain:
    """Main AI Brain orchestrator"""
    
    def __init__(self):
        self.app = FastAPI(title="Coach Core AI Brain", version=config.api_version)
        self._setup_middleware()
        self._initialize_services()
        self._initialize_modules()
        self._setup_routes()
        
    def _setup_middleware(self):
        """Configure API middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
    def _initialize_services(self):
        """Initialize core services"""
        logger.info("Initializing core services...")
        
        self.data_store = DataStore()
        self.nlp_service = NLPService()
        self.ml_models = MLModels()
        self.context_manager = ContextManager()
        
        logger.info("Core services initialized successfully")
        
    def _initialize_modules(self):
        """Initialize AI modules"""
        logger.info("Initializing AI modules...")
        
        # Initialize modules with service dependencies
        self.dialogue_engine = DialogueEngine(
            nlp_service=self.nlp_service,
            context_manager=self.context_manager,
            data_store=self.data_store
        )
        
        self.progress_analyzer = ProgressAnalyzer(
            ml_models=self.ml_models,
            data_store=self.data_store
        )
        
        self.motivational_engine = MotivationalEngine(
            nlp_service=self.nlp_service,
            ml_models=self.ml_models,
            data_store=self.data_store
        )
        
        self.personalization_engine = PersonalizationEngine(
            ml_models=self.ml_models,
            data_store=self.data_store
        )
        
        self.engagement_manager = EngagementManager(
            ml_models=self.ml_models,
            data_store=self.data_store
        )
        
        self.learning_module = LearningModule(
            ml_models=self.ml_models,
            data_store=self.data_store
        )
        
        # Store modules in app state for API access
        self.app.state.dialogue_engine = self.dialogue_engine
        self.app.state.progress_analyzer = self.progress_analyzer
        self.app.state.motivational_engine = self.motivational_engine
        self.app.state.personalization_engine = self.personalization_engine
        self.app.state.engagement_manager = self.engagement_manager
        self.app.state.learning_module = self.learning_module
        
        logger.info("AI modules initialized successfully")
        
    def _setup_routes(self):
        """Setup API routes"""
        self.app.include_router(router, prefix=f"/api/{config.api_version}")
        
    async def start(self):
        """Start the AI Brain server"""
        logger.info(f"Starting Coach Core AI Brain on {config.api_host}:{config.api_port}")
        
        config_dict = {
            "app": self.app,
            "host": config.api_host,
            "port": config.api_port,
            "log_level": "info"
        }
        
        server = uvicorn.Server(uvicorn.Config(**config_dict))
        await server.serve()
        
    def run(self):
        """Run the AI Brain server"""
        asyncio.run(self.start())

# === core/dialogue_engine.py ===
"""Dialogue Engine for conversational coaching"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json

from coach_core_ai.models.conversation_model import Conversation, Message
from coach_core_ai.models.user_model import User

logger = logging.getLogger(__name__)

class DialogueEngine:
    """Manages conversational interactions with users"""
    
    def __init__(self, nlp_service, context_manager, data_store):
        self.nlp_service = nlp_service
        self.context_manager = context_manager
        self.data_store = data_store
        
        # Coaching domain handlers
        self.domain_handlers = {
            "fitness": self._handle_fitness_query,
            "nutrition": self._handle_nutrition_query,
            "mental_wellness": self._handle_mental_wellness_query,
            "productivity": self._handle_productivity_query,
            "general": self._handle_general_query
        }
        
    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_id: Optional[str] = None
    ) -> Dict:
        """Process incoming user message and generate response"""
        
        # Get or create conversation
        if conversation_id:
            conversation = await self.data_store.get_conversation(conversation_id)
        else:
            conversation = await self._create_conversation(user_id)
            
        # Get user profile
        user = await self.data_store.get_user(user_id)
        
        # Analyze message
        analysis = await self.nlp_service.analyze_message(message)
        intent = analysis["intent"]
        entities = analysis["entities"]
        sentiment = analysis["sentiment"]
        
        # Get conversation context
        context = await self.context_manager.get_context(user_id, conversation_id)
        
        # Generate response based on intent and domain
        domain = self._determine_domain(intent, entities, context)
        response = await self.domain_handlers[domain](
            user, message, intent, entities, sentiment, context
        )
        
        # Update conversation history
        await self._update_conversation(
            conversation, user_id, message, response, analysis
        )
        
        # Update context
        await self.context_manager.update_context(
            user_id, conversation_id, {
                "last_intent": intent,
                "last_domain": domain,
                "last_entities": entities
            }
        )
        
        return {
            "conversation_id": conversation.id,
            "response": response["text"],
            "suggestions": response.get("suggestions", []),
            "actions": response.get("actions", []),
            "metadata": {
                "intent": intent,
                "domain": domain,
                "sentiment": sentiment,
                "confidence": analysis["confidence"]
            }
        }
        
    def _determine_domain(
        self,
        intent: str,
        entities: List[Dict],
        context: Dict
    ) -> str:
        """Determine the coaching domain for the query"""
        
        # Domain keywords mapping
        domain_keywords = {
            "fitness": ["workout", "exercise", "training", "gym", "cardio", "strength"],
            "nutrition": ["diet", "food", "meal", "calories", "nutrition", "eating"],
            "mental_wellness": ["stress", "anxiety", "mood", "meditation", "mindfulness", "mental"],
            "productivity": ["goals", "tasks", "schedule", "focus", "time", "productivity"]
        }
        
        # Check entities for domain indicators
        for entity in entities:
            for domain, keywords in domain_keywords.items():
                if any(keyword in entity.get("value", "").lower() for keyword in keywords):
                    return domain
                    
        # Check intent mapping
        intent_domain_map = {
            "fitness_query": "fitness",
            "nutrition_query": "nutrition",
            "mental_health_query": "mental_wellness",
            "productivity_query": "productivity"
        }
        
        if intent in intent_domain_map:
            return intent_domain_map[intent]
            
        # Use context if available
        if context.get("last_domain"):
            return context["last_domain"]
            
        return "general"
        
    async def _handle_fitness_query(
        self,
        user: User,
        message: str,
        intent: str,
        entities: List[Dict],
        sentiment: float,
        context: Dict
    ) -> Dict:
        """Handle fitness-related queries"""
        
        # Extract fitness-specific entities
        exercise_type = next(
            (e["value"] for e in entities if e["type"] == "exercise_type"),
            None
        )
        
        # Generate contextual response
        if intent == "workout_recommendation":
            response = await self._generate_workout_recommendation(
                user, exercise_type, context
            )
        elif intent == "progress_check":
            response = await self._generate_fitness_progress_update(user)
        else:
            response = await self._generate_general_fitness_advice(
                user, message, context
            )
            
        return response
        
    async def _handle_nutrition_query(
        self,
        user: User,
        message: str,
        intent: str,
        entities: List[Dict],
        sentiment: float,
        context: Dict
    ) -> Dict:
        """Handle nutrition-related queries"""
        
        # Extract nutrition-specific entities
        food_item = next(
            (e["value"] for e in entities if e["type"] == "food"),
            None
        )
        meal_type = next(
            (e["value"] for e in entities if e["type"] == "meal_type"),
            None
        )
        
        # Generate contextual response
        if intent == "meal_planning":
            response = await self._generate_meal_plan(user, meal_type, context)
        elif intent == "calorie_query":
            response = await self._generate_calorie_info(user, food_item)
        else:
            response = await self._generate_general_nutrition_advice(
                user, message, context
            )
            
        return response
        
    async def _handle_mental_wellness_query(
        self,
        user: User,
        message: str,
        intent: str,
        entities: List[Dict],
        sentiment: float,
        context: Dict
    ) -> Dict:
        """Handle mental wellness queries"""
        
        # Check sentiment for emotional support needs
        if sentiment < -0.5:
            response = await self._generate_emotional_support(user, message, context)
        elif intent == "meditation_request":
            response = await self._generate_meditation_guidance(user, context)
        elif intent == "stress_management":
            response = await self._generate_stress_tips(user, context)
        else:
            response = await self._generate_general_wellness_advice(
                user, message, context
            )
            
        return response
        
    async def _handle_productivity_query(
        self,
        user: User,
        message: str,
        intent: str,
        entities: List[Dict],
        sentiment: float,
        context: Dict
    ) -> Dict:
        """Handle productivity-related queries"""
        
        # Extract productivity entities
        task_type = next(
            (e["value"] for e in entities if e["type"] == "task"),
            None
        )
        
        # Generate contextual response
        if intent == "goal_setting":
            response = await self._generate_goal_guidance(user, task_type, context)
        elif intent == "schedule_optimization":
            response = await self._generate_schedule_advice(user, context)
        else:
            response = await self._generate_general_productivity_tips(
                user, message, context
            )
            
        return response
        
    async def _handle_general_query(
        self,
        user: User,
        message: str,
        intent: str,
        entities: List[Dict],
        sentiment: float,
        context: Dict
    ) -> Dict:
        """Handle general queries"""
        
        # Provide general coaching response
        response_text = (
            f"I understand you're looking for guidance. Based on your profile "
            f"and goals, I can help you with fitness, nutrition, mental wellness, "
            f"or productivity coaching. What area would you like to focus on today?"
        )
        
        suggestions = [
            "Tell me about your fitness goals",
            "Help me plan healthy meals",
            "I need stress management tips",
            "How can I be more productive?"
        ]
        
        return {
            "text": response_text,
            "suggestions": suggestions,
            "actions": []
        }
        
    async def _generate_workout_recommendation(
        self,
        user: User,
        exercise_type: Optional[str],
        context: Dict
    ) -> Dict:
        """Generate personalized workout recommendation"""
        
        # Get user fitness profile
        fitness_level = user.profile.get("fitness_level", "intermediate")
        preferences = user.preferences.get("workout_preferences", {})
        
        # Generate recommendation based on profile
        if exercise_type:
            workout = await self._get_specific_workout(
                exercise_type, fitness_level, preferences
            )
        else:
            workout = await self._get_balanced_workout(
                fitness_level, preferences
            )
            
        response_text = (
            f"Here's a {fitness_level} {exercise_type or 'workout'} "
            f"plan tailored for you:\n\n{workout['description']}"
        )
        
        return {
            "text": response_text,
            "suggestions": [
                "Show me alternative exercises",
                "Adjust difficulty level",
                "Add this to my schedule"
            ],
            "actions": [
                {
                    "type": "save_workout",
                    "data": workout
                }
            ]
        }
        
    async def _create_conversation(self, user_id: str) -> Conversation:
        """Create new conversation"""
        conversation = Conversation(
            user_id=user_id,
            started_at=datetime.utcnow()
        )
        await self.data_store.save_conversation(conversation)
        return conversation
        
    async def _update_conversation(
        self,
        conversation: Conversation,
        user_id: str,
        user_message: str,
        response: Dict,
        analysis: Dict
    ):
        """Update conversation history"""
        
        # Add user message
        user_msg = Message(
            sender="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            metadata=analysis
        )
        conversation.messages.append(user_msg)
        
        # Add AI response
        ai_msg = Message(
            sender="ai",
            content=response["text"],
            timestamp=datetime.utcnow(),
            metadata={
                "suggestions": response.get("suggestions", []),
                "actions": response.get("actions", [])
            }
        )
        conversation.messages.append(ai_msg)
        
        # Save updated conversation
        await self.data_store.save_conversation(conversation)
        
    # Additional helper methods for generating responses...
    async def _get_specific_workout(
        self,
        exercise_type: str,
        fitness_level: str,
        preferences: Dict
    ) -> Dict:
        """Get specific workout plan"""
        # Implementation would fetch from workout database
        return {
            "type": exercise_type,
            "level": fitness_level,
            "description": f"Custom {exercise_type} workout for {fitness_level} level",
            "exercises": [],
            "duration": 45
        }

# === core/progress_analyzer.py ===
"""Progress Analyzer for tracking and analyzing user progress"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from scipy import stats

from coach_core_ai.models.progress_model import Progress, Metric

logger = logging.getLogger(__name__)

class ProgressAnalyzer:
    """Analyzes user progress across various metrics and goals"""
    
    def __init__(self, ml_models, data_store):
        self.ml_models = ml_models
        self.data_store = data_store
        
    async def analyze_progress(
        self,
        user_id: str,
        metric_type: Optional[str] = None,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict:
        """Analyze user progress for specified metrics and time range"""
        
        # Get user data
        user = await self.data_store.get_user(user_id)
        
        # Determine time range
        if not time_range:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            time_range = (start_date, end_date)
            
        # Get progress data
        progress_data = await self.data_store.get_progress_data(
            user_id, metric_type, time_range
        )
        
        if not progress_data:
            return {
                "status": "no_data",
                "message": "No progress data available for analysis"
            }
            
        # Perform analysis
        analysis = {
            "summary": await self._generate_summary(progress_data, user),
            "trends": await self._analyze_trends(progress_data),
            "predictions": await self._generate_predictions(progress_data, user),
            "insights": await self._generate_insights(progress_data, user),
            "comparisons": await self._generate_comparisons(progress_data, user)
        }
        
        return analysis
        
    async def track_metric(
        self,
        user_id: str,
        metric_type: str,
        value: float,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Track a new metric value"""
        
        metric = Metric(
            user_id=user_id,
            type=metric_type,
            value=value,
            timestamp=datetime.utcnow(),
            metadata=metadata or {}
        )
        
        # Save metric
        await self.data_store.save_metric(metric)
        
        # Check for achievements
        achievements = await self._check_achievements(user_id, metric)
        
        # Update user statistics
        await self._update_statistics(user_id, metric)
        
        return {
            "metric_id": metric.id,
            "achievements": achievements,
            "message": f"Successfully tracked {metric_type}: {value}"
        }
        
    async def get_goal_progress(self, user_id: str, goal_id: str) -> Dict:
        """Get progress towards a specific goal"""
        
        # Get goal details
        goal = await self.data_store.get_goal(goal_id)
        
        if not goal or goal.user_id != user_id:
            return {"error": "Goal not found"}
            
        # Get relevant metrics
        metrics = await self.data_store.get_goal_metrics(goal_id)
        
        # Calculate progress
        progress_percentage = await self._calculate_goal_progress(goal, metrics)
        
        # Predict completion
        completion_prediction = await self._predict_goal_completion(goal, metrics)
        
        return {
            "goal": goal.to_dict(),
            "progress_percentage": progress_percentage,
            "current_metrics": metrics[-10:],  # Last 10 metrics
            "completion_prediction": completion_prediction,
            "recommendations": await self._generate_goal_recommendations(
                goal, metrics, progress_percentage
            )
        }
        
    async def _generate_summary(
        self,
        progress_data: List[Progress],
        user: 'User'
    ) -> Dict:
        """Generate progress summary"""
        
        # Group by metric type
        metrics_by_type = {}
        for progress in progress_data:
            if progress.metric_type not in metrics_by_type:
                metrics_by_type[progress.metric_type] = []
            metrics_by_type[progress.metric_type].append(progress)
            
        summary = {}
        for metric_type, data in metrics_by_type.items():
            values = [p.value for p in data]
            summary[metric_type] = {
                "count": len(values),
                "average": np.mean(values),
                "min": np.min(values),
                "max": np.max(values),
                "std_dev": np.std(values),
                "latest": values[-1] if values else None,
                "change": values[-1] - values[0] if len(values) > 1 else 0
            }
            
        return summary
        
    async def _analyze_trends(self, progress_data: List[Progress]) -> Dict:
        """Analyze trends in progress data"""
        
        trends = {}
        
        # Group by metric type
        metrics_by_type = {}
        for progress in progress_data:
            if progress.metric_type not in metrics_by_type:
                metrics_by_type[progress.metric_type] = []
            metrics_by_type[progress.metric_type].append(progress)
            
        for metric_type, data in metrics_by_type.items():
            if len(data) < 3:  # Need at least 3 points for trend
                trends[metric_type] = {"trend": "insufficient_data"}
                continue
                
            # Extract time series
            timestamps = [p.timestamp.timestamp() for p in data]
            values = [p.value for p in data]
            
            # Linear regression for trend
            slope, intercept, r_value, p_value, std_err = stats.linregress(
                timestamps, values
            )
            
            # Determine trend direction
            if p_value < 0.05:  # Statistically significant
                if slope > 0:
                    trend_direction = "increasing"
                elif slope < 0:
                    trend_direction = "decreasing"
                else:
                    trend_direction = "stable"
            else:
                trend_direction = "no_clear_trend"
                
            trends[metric_type] = {
                "trend": trend_direction,
                "slope": slope,
                "correlation": r_value,
                "significance": p_value,
                "percentage_change": ((values[-1] - values[0]) / values[0] * 100)
                                   if values[0] != 0 else 0
            }
            
        return trends
        
    async def _generate_predictions(
        self,
        progress_data: List[Progress],
        user: 'User'
    ) -> Dict:
        """Generate predictions based on progress data"""
        
        predictions = {}
        
        # Use ML models for predictions
        for goal in user.goals:
            # Prepare features
            features = await self._extract_prediction_features(
                progress_data, goal
            )
            
            if features is not None:
                # Get prediction from ML model
                prediction = await self.ml_models.predict_goal_achievement(
                    features, goal
                )
                
                predictions[goal.id] = {
                    "goal_name": goal.name,
                    "predicted_achievement_date": prediction["date"],
                    "confidence": prediction["confidence"],
                    "required_rate": prediction["required_rate"],
                    "current_rate": prediction["current_rate"]
                }
                
        return predictions
        
    async def _generate_insights(
        self,
        progress_data: List[Progress],
        user: 'User'
    ) -> List[Dict]:
        """Generate actionable insights from progress data"""
        
        insights = []
        
        # Analyze patterns
        patterns = await self._identify_patterns(progress_data)
        
        for pattern in patterns:
            insight = {
                "type": pattern["type"],
                "description": pattern["description"],
                "impact": pattern["impact"],
                "recommendation": pattern["recommendation"],
                "priority": pattern["priority"]
            }
            insights.append(insight)
            
        # Sort by priority
        insights.sort(key=lambda x: x["priority"], reverse=True)
        
        return insights[:5]  # Top 5 insights
        
    async def _generate_comparisons(
        self,
        progress_data: List[Progress],
        user: 'User'
    ) -> Dict:
        """Generate comparisons with similar users"""
        
        # Get anonymized comparison data
        comparison_data = await self.data_store.get_comparison_data(
            user.demographics,
            user.goals
        )
        
        comparisons = {}
        
        # Compare performance
        for metric_type in set(p.metric_type for p in progress_data):
            user_avg = np.mean([
                p.value for p in progress_data 
                if p.metric_type == metric_type
            ])
            
            peer_avg = comparison_data.get(metric_type, {}).get("average", user_avg)
            peer_percentile = comparison_data.get(metric_type, {}).get(
                "percentile", 50
            )
            
            comparisons[metric_type] = {
                "user_average": user_avg,
                "peer_average": peer_avg,
                "percentile": peer_percentile,
                "performance": "above_average" if user_avg > peer_avg else "below_average"
            }
            
        return comparisons
        
    async def _check_achievements(
        self,
        user_id: str,
        metric: Metric
    ) -> List[Dict]:
        """Check if new metric triggers any achievements"""
        
        achievements = []
        
        # Get achievement rules
        rules = await self.data_store.get_achievement_rules()
        
        for rule in rules:
            if await self._evaluate_achievement_rule(user_id, metric, rule):
                achievement = {
                    "id": rule.id,
                    "name": rule.name,
                    "description": rule.description,
                    "badge": rule.badge,
                    "points": rule.points
                }
                achievements.append(achievement)
                
                # Save achievement
                await self.data_store.save_user_achievement(
                    user_id, achievement
                )
                
        return achievements
        
    async def _update_statistics(self, user_id: str, metric: Metric):
        """Update user statistics with new metric"""
        
        # Get current statistics
        stats = await self.data_store.get_user_statistics(user_id)
        
        # Update relevant statistics
        metric_stats = stats.get(metric.type, {})
        metric_stats["count"] = metric_stats.get("count", 0) + 1
        metric_stats["total"] = metric_stats.get("total", 0) + metric.value
        metric_stats["average"] = metric_stats["total"] / metric_stats["count"]
        metric_stats["last_value"] = metric.value
        metric_stats["last_updated"] = metric.timestamp
        
        stats[metric.type] = metric_stats
        
        # Save updated statistics
        await self.data_store.save_user_statistics(user_id, stats)

# === core/motivational_engine.py ===
"""Motivational Engine for personalized motivation and encouragement"""

import logging
import random
from typing import Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MotivationalEngine:
    """Provides personalized motivation based on user behavior and progress"""
    
    def __init__(self, nlp_service, ml_models, data_store):
        self.nlp_service = nlp_service
        self.ml_models = ml_models
        self.data_store = data_store
        
        # Motivation strategies
        self.strategies = {
            "achievement": self._achievement_based_motivation,
            "progress": self._progress_based_motivation,
            "social": self._social_motivation,
            "intrinsic": self._intrinsic_motivation,
            "reward": self._reward_based_motivation
        }
        
        # Message templates by type
        self.templates = {
            "achievement": [
                "Amazing! You've just {achievement}! Keep up the fantastic work! 🎉",
                "Congratulations on {achievement}! You're making incredible progress! 🌟",
                "What an accomplishment! {achievement} is no small feat! 💪"
            ],
            "progress": [
                "You're {percentage}% closer to your goal! Every step counts! 📈",
                "Look how far you've come! {progress_summary} 🚀",
                "Your consistency is paying off! {streak_message} 🔥"
            ],
            "encouragement": [
                "Remember why you started. You've got this! 💪",
                "Every expert was once a beginner. Keep going! 🌱",
                "Progress isn't always linear, but you're moving forward! 📊"
            ],
            "celebration": [
                "Time to celebrate! {milestone} is a huge achievement! 🎊",
                "You did it! {milestone} - you should be proud! 🏆",
                "Incredible! {milestone} reached! You're unstoppable! ⭐"
            ]
        }
        
    async def generate_motivation(
        self,
        user_id: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """Generate personalized motivational message"""
        
        # Get user profile and recent activity
        user = await self.data_store.get_user(user_id)
        recent_activity = await self.data_store.get_recent_activity(user_id, days=7)
        
        # Determine user's motivation type
        motivation_type = user.personality_profile.get(
            "motivation_type", 
            "achievement"
        )
        
        # Select appropriate strategy
        strategy = self.strategies.get(
            motivation_type,
            self._achievement_based_motivation
        )
        
        # Generate motivation
        motivation = await strategy(user, recent_activity, context)
        
        # Personalize message
        personalized = await self._personalize_message(
            motivation["message"],
            user,
            motivation["data"]
        )
        
        return {
            "message": personalized,
            "type": motivation["type"],
            "actions": motivation.get("actions", []),
            "visuals": motivation.get("visuals", [])
        }
        
    async def check_motivation_triggers(
        self,
        user_id: str
    ) -> List[Dict]:
        """Check if any motivation triggers are activated"""
        
        triggers = []
        
        # Check various trigger conditions
        achievement_trigger = await self._check_achievement_trigger(user_id)
        if achievement_trigger:
            triggers.append(achievement_trigger)
            
        milestone_trigger = await self._check_milestone_trigger(user_id)
        if milestone_trigger:
            triggers.append(milestone_trigger)
            
        streak_trigger = await self._check_streak_trigger(user_id)
        if streak_trigger:
            triggers.append(streak_trigger)
            
        plateau_trigger = await self._check_plateau_trigger(user_id)
        if plateau_trigger:
            triggers.append(plateau_trigger)
            
        return triggers
        
    async def generate_challenge(
        self,
        user_id: str,
        challenge_type: Optional[str] = None
    ) -> Dict:
        """Generate personalized challenge for user"""
        
        user = await self.data_store.get_user(user_id)
        
        # Determine appropriate challenge level
        challenge_level = await self._determine_challenge_level(user)
        
        # Generate challenge based on user goals and preferences
        if challenge_type:
            challenge = await self._create_specific_challenge(
                user, challenge_type, challenge_level
            )
        else:
            challenge = await self._create_adaptive_challenge(
                user, challenge_level
            )
            
        return {
            "challenge_id": challenge["id"],
            "title": challenge["title"],
            "description": challenge["description"],
            "difficulty": challenge_level,
            "duration": challenge["duration"],
            "rewards": challenge["rewards"],
            "start_date": datetime.utcnow().isoformat(),
            "milestones": challenge["milestones"]
        }
        
    async def calculate_engagement_score(
        self,
        user_id: str
    ) -> Dict:
        """Calculate user's engagement score"""
        
        # Get engagement metrics
        metrics = await self.data_store.get_engagement_metrics(user_id)
        
        # Calculate component scores
        activity_score = self._calculate_activity_score(metrics)
        consistency_score = self._calculate_consistency_score(metrics)
        achievement_score = self._calculate_achievement_score(metrics)
        social_score = self._calculate_social_score(metrics)
        
        # Calculate overall score
        overall_score = (
            activity_score * 0.3 +
            consistency_score * 0.3 +
            achievement_score * 0.25 +
            social_score * 0.15
        )
        
        return {
            "overall_score": overall_score,
            "components": {
                "activity": activity_score,
                "consistency": consistency_score,
                "achievement": achievement_score,
                "social": social_score
            },
            "level": self._determine_engagement_level(overall_score),
            "trend": await self._calculate_engagement_trend(user_id)
        }
        
    async def _achievement_based_motivation(
        self,
        user: 'User',
        activity: List[Dict],
        context: Dict
    ) -> Dict:
        """Generate achievement-based motivation"""
        
        # Find recent achievements
        recent_achievements = [
            a for a in activity 
            if a["type"] == "achievement" and 
            a["timestamp"] > datetime.utcnow() - timedelta(days=7)
        ]
        
        if recent_achievements:
            achievement = recent_achievements[0]
            template = random.choice(self.templates["achievement"])
            message = template.format(achievement=achievement["name"])
            
            return {
                "message": message,
                "type": "achievement",
                "data": {"achievement": achievement},
                "actions": [
                    {
                        "type": "share_achievement",
                        "label": "Share your success"
                    }
                ]
            }
        else:
            # Encourage towards next achievement
            next_achievement = await self._get_next_achievement(user)
            
            return {
                "message": f"You're close to unlocking '{next_achievement['name']}'! "
                          f"Just {next_achievement['remaining']} more to go!",
                "type": "achievement_progress",
                "data": {"next_achievement": next_achievement}
            }
            
    async def _progress_based_motivation(
        self,
        user: 'User',
        activity: List[Dict],
        context: Dict
    ) -> Dict:
        """Generate progress-based motivation"""
        
        # Calculate progress metrics
        progress_data = await self.data_store.get_progress_summary(user.id)
        
        # Find most significant progress
        best_progress = max(
            progress_data.items(),
            key=lambda x: x[1].get("improvement", 0)
        )
        
        metric_name, metric_data = best_progress
        improvement = metric_data["improvement"]
        
        template = random.choice(self.templates["progress"])
        message = template.format(
            percentage=round(improvement),
            progress_summary=f"You've improved your {metric_name} by {improvement}%",
            streak_message=f"You're on a {metric_data.get('streak', 0)} day streak"
        )
        
        return {
            "message": message,
            "type": "progress",
            "data": {"progress": metric_data},
            "visuals": [
                {
                    "type": "progress_chart",
                    "data": metric_data["history"]
                }
            ]
        }
        
    async def _social_motivation(
        self,
        user: 'User',
        activity: List[Dict],
        context: Dict
    ) -> Dict:
        """Generate social motivation"""
        
        # Get peer comparisons
        comparisons = await self.data_store.get_peer_comparisons(user.id)
        
        # Find positive comparisons
        positive_comparisons = [
            c for c in comparisons 
            if c["user_percentile"] > 70
        ]
        
        if positive_comparisons:
            comparison = positive_comparisons[0]
            message = (
                f"You're in the top {100 - comparison['user_percentile']}% "
                f"for {comparison['metric']}! You're inspiring others! 🌟"
            )
        else:
            message = (
                "Join our community challenge this week! "
                "Working together makes the journey more enjoyable! 🤝"
            )
            
        return {
            "message": message,
            "type": "social",
            "data": {"comparisons": comparisons},
            "actions": [
                {
                    "type": "join_challenge",
                    "label": "View community challenges"
                }
            ]
        }
        
    async def _intrinsic_motivation(
        self,
        user: 'User',
        activity: List[Dict],
        context: Dict
    ) -> Dict:
        """Generate intrinsic motivation"""
        
        # Focus on personal growth and mastery
        growth_metrics = await self._analyze_personal_growth(user, activity)
        
        message = (
            f"Notice how {growth_metrics['improvement_area']} feels easier now? "
            f"That's your hard work paying off. You're becoming the person "
            f"you want to be, one day at a time. 🌱"
        )
        
        return {
            "message": message,
            "type": "intrinsic",
            "data": {"growth": growth_metrics}
        }
        
    async def _reward_based_motivation(
        self,
        user: 'User',
        activity: List[Dict],
        context: Dict
    ) -> Dict:
        """Generate reward-based motivation"""
        
        # Check reward points
        points = await self.data_store.get_user_points(user.id)
        next_reward = await self._get_next_reward_milestone(points)
        
        message = (
            f"You've earned {points} points! "
            f"Just {next_reward['points_needed']} more points to unlock "
            f"'{next_reward['reward_name']}'! 🎁"
        )
        
        return {
            "message": message,
            "type": "reward",
            "data": {
                "current_points": points,
                "next_reward": next_reward
            },
            "actions": [
                {
                    "type": "view_rewards",
                    "label": "View available rewards"
                }
            ]
        }
        
    async def _personalize_message(
        self,
        message: str,
        user: 'User',
        data: Dict
    ) -> str:
        """Personalize message based on user preferences"""
        
        # Adjust tone based on communication style
        style = user.preferences.get("communication_style", "friendly")
        
        if style == "professional":
            message = await self.nlp_service.adjust_tone(
                message, "professional"
            )
        elif style == "casual":
            message = await self.nlp_service.adjust_tone(
                message, "casual"
            )
            
        # Add user name if preferred
        if user.preferences.get("use_name", True):
            message = f"{user.name}, {message.lower()}"
            
        return message

# === core/personalization_engine.py ===
"""Personalization Engine for adapting AI interactions to individual users"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)

class PersonalizationEngine:
    """Adapts all AI interactions to individual user preferences and contexts"""
    
    def __init__(self, ml_models, data_store):
        self.ml_models = ml_models
        self.data_store = data_store
        
        # Personalization dimensions
        self.dimensions = {
            "communication_style": ["professional", "friendly", "casual", "motivational"],
            "learning_style": ["visual", "auditory", "kinesthetic", "reading"],
            "pace": ["fast", "moderate", "slow"],
            "detail_level": ["high", "medium", "low"],
            "feedback_preference": ["direct", "encouraging", "balanced"]
        }
        
    async def get_user_profile(self, user_id: str) -> Dict:
        """Get comprehensive user profile for personalization"""
        
        # Get base user data
        user = await self.data_store.get_user(user_id)
        
        # Get interaction history
        interactions = await self.data_store.get_user_interactions(user_id)
        
        # Analyze patterns
        patterns = await self._analyze_interaction_patterns(interactions)
        
        # Build comprehensive profile
        profile = {
            "user_id": user_id,
            "demographics": user.demographics,
            "explicit_preferences": user.preferences,
            "inferred_preferences": patterns["preferences"],
            "behavioral_patterns": patterns["behaviors"],
            "engagement_profile": patterns["engagement"],
            "personality_traits": await self._infer_personality_traits(
                interactions, patterns
            ),
            "context_preferences": await self._analyze_context_preferences(
                interactions
            )
        }
        
        return profile
        
    async def personalize_content(
        self,
        content: Any,
        user_id: str,
        content_type: str
    ) -> Any:
        """Personalize content based on user profile"""
        
        profile = await self.get_user_profile(user_id)
        
        # Apply personalization based on content type
        if content_type == "message":
            return await self._personalize_message(content, profile)
        elif content_type == "recommendation":
            return await self._personalize_recommendation(content, profile)
        elif content_type == "workout":
            return await self._personalize_workout(content, profile)
        elif content_type == "meal_plan":
            return await self._personalize_meal_plan(content, profile)
        elif content_type == "notification":
            return await self._personalize_notification(content, profile)
        else:
            return content
            
    async def update_preferences(
        self,
        user_id: str,
        feedback: Dict
    ) -> Dict:
        """Update user preferences based on feedback"""
        
        # Get current preferences
        user = await self.data_store.get_user(user_id)
        current_prefs = user.preferences
        
        # Process feedback
        preference_updates = await self._process_preference_feedback(
            feedback, current_prefs
        )
        
        # Update preferences
        updated_prefs = {**current_prefs, **preference_updates}
        
        # Save updates
        await self.data_store.update_user_preferences(user_id, updated_prefs)
        
        # Update ML models
        await self.ml_models.update_personalization_model(
            user_id, preference_updates
        )
        
        return {
            "status": "updated",
            "changes": preference_updates,
            "message": "Preferences updated successfully"
        }
        
    async def get_personalization_parameters(
        self,
        user_id: str,
        context: Dict
    ) -> Dict:
        """Get personalization parameters for current context"""
        
        profile = await self.get_user_profile(user_id)
        
        # Base parameters from profile
        params = {
            "communication_style": profile["explicit_preferences"].get(
                "communication_style", "friendly"
            ),
            "detail_level": profile["explicit_preferences"].get(
                "detail_level", "medium"
            ),
            "pace": profile["inferred_preferences"].get(
                "pace", "moderate"
            )
        }
        
        # Context-based adjustments
        if context.get("time_of_day"):
            params = await self._adjust_for_time(params, context["time_of_day"])
            
        if context.get("user_state"):
            params = await self._adjust_for_state(params, context["user_state"])
            
        if context.get("goal_urgency"):
            params = await self._adjust_for_urgency(params, context["goal_urgency"])
            
        return params
        
    async def recommend_features(
        self,
        user_id: str,
        available_features: List[str]
    ) -> List[Dict]:
        """Recommend features based on user profile"""
        
        profile = await self.get_user_profile(user_id)
        
        # Score features based on profile
        feature_scores = []
        
        for feature in available_features:
            score = await self._score_feature_for_user(feature, profile)
            feature_scores.append({
                "feature": feature,
                "score": score,
                "reason": await self._get_recommendation_reason(
                    feature, profile, score
                )
            })
            
        # Sort by score
        feature_scores.sort(key=lambda x: x["score"], reverse=True)
        
        return feature_scores[:5]  # Top 5 recommendations
        
    async def _analyze_interaction_patterns(
        self,
        interactions: List[Dict]
    ) -> Dict:
        """Analyze user interaction patterns"""
        
        patterns = {
            "preferences": {},
            "behaviors": {},
            "engagement": {}
        }
        
        if not interactions:
            return patterns
            
        # Analyze communication preferences
        message_lengths = [len(i.get("message", "")) for i in interactions]
        avg_length = np.mean(message_lengths) if message_lengths else 0
        
        if avg_length < 50:
            patterns["preferences"]["detail_level"] = "low"
        elif avg_length > 200:
            patterns["preferences"]["detail_level"] = "high"
        else:
            patterns["preferences"]["detail_level"] = "medium"
            
        # Analyze engagement patterns
        response_times = []
        for i, interaction in enumerate(interactions[1:]):
            if interactions[i]["type"] == "ai_message":
                time_diff = (
                    interaction["timestamp"] - interactions[i]["timestamp"]
                ).total_seconds()
                response_times.append(time_diff)
                
        if response_times:
            avg_response_time = np.mean(response_times)
            patterns["engagement"]["avg_response_time"] = avg_response_time
            patterns["engagement"]["engagement_level"] = (
                "high" if avg_response_time < 60 else "medium"
            )
            
        # Analyze behavioral patterns
        interaction_types = [i.get("type") for i in interactions]
        patterns["behaviors"]["preferred_interactions"] = self._get_most_common(
            interaction_types
        )
        
        return patterns
        
    async def _infer_personality_traits(
        self,
        interactions: List[Dict],
        patterns: Dict
    ) -> Dict:
        """Infer personality traits from interactions"""
        
        traits = {}
        
        # Analyze language use for personality indicators
        if interactions:
            # Extraversion indicator: frequency of social references
            social_keywords = ["team", "together", "group", "friends", "community"]
            social_mentions = sum(
                1 for i in interactions 
                if any(keyword in i.get("message", "").lower() 
                      for keyword in social_keywords)
            )
            traits["extraversion"] = min(social_mentions / len(interactions), 1.0)
            
            # Conscientiousness indicator: goal and planning references
            planning_keywords = ["plan", "schedule", "goal", "track", "progress"]
            planning_mentions = sum(
                1 for i in interactions 
                if any(keyword in i.get("message", "").lower() 
                      for keyword in planning_keywords)
            )
            traits["conscientiousness"] = min(
                planning_mentions / len(interactions), 1.0
            )
            
        return traits
        
    async def _personalize_message(
        self,
        message: str,
        profile: Dict
    ) -> str:
        """Personalize a message based on user profile"""
        
        style = profile["explicit_preferences"].get(
            "communication_style", "friendly"
        )
        
        # Adjust message based on style
        if style == "professional":
            # Make more formal
            message = message.replace("Hey", "Hello")
            message = message.replace("!", ".")
            message = message.replace("awesome", "excellent")
        elif style == "casual":
            # Make more casual
            if not message.startswith(("Hey", "Hi")):
                message = f"Hey! {message}"
                
        # Adjust detail level
        detail_level = profile["explicit_preferences"].get("detail_level", "medium")
        if detail_level == "low":
            # Simplify message
            sentences = message.split(".")
            if len(sentences) > 2:
                message = ". ".join(sentences[:2]) + "."
                
        return message
        
    async def _personalize_workout(
        self,
        workout: Dict,
        profile: Dict
    ) -> Dict:
        """Personalize workout based on user profile"""
        
        # Adjust based on pace preference
        pace = profile["inferred_preferences"].get("pace", "moderate")
        
        if pace == "fast":
            workout["rest_time"] = int(workout.get("rest_time", 60) * 0.8)
            workout["intensity"] = "high"
        elif pace == "slow":
            workout["rest_time"] = int(workout.get("rest_time", 60) * 1.2)
            workout["intensity"] = "moderate"
            
        # Adjust based on learning style
        learning_style = profile["explicit_preferences"].get(
            "learning_style", "visual"
        )
        
        if learning_style == "visual":
            workout["include_videos"] = True
            workout["include_diagrams"] = True
        elif learning_style == "reading":
            workout["include_detailed_descriptions"] = True
            
        return workout

# === core/engagement_manager.py ===
"""Engagement Manager for optimizing user engagement"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)

class EngagementManager:
    """Manages user engagement strategies and timing"""
    
    def __init__(self, ml_models, data_store):
        self.ml_models = ml_models
        self.data_store = data_store
        
        # Engagement strategies
        self.strategies = {
            "notification": self._notification_strategy,
            "content": self._content_strategy,
            "challenge": self._challenge_strategy,
            "social": self._social_strategy,
            "reward": self._reward_strategy
        }
        
    async def get_engagement_plan(
        self,
        user_id: str,
        timeframe: str = "daily"
    ) -> Dict:
        """Get personalized engagement plan for user"""
        
        # Get user engagement profile
        profile = await self._get_engagement_profile(user_id)
        
        # Get optimal engagement times
        optimal_times = await self._get_optimal_times(user_id, profile)
        
        # Select engagement strategies
        selected_strategies = await self._select_strategies(profile)
        
        # Create engagement plan
        plan = {
            "user_id": user_id,
            "timeframe": timeframe,
            "optimal_times": optimal_times,
            "strategies": selected_strategies,
            "notifications": await self._plan_notifications(
                user_id, optimal_times, selected_strategies
            ),
            "content_recommendations": await self._plan_content(
                user_id, profile
            ),
            "challenges": await self._plan_challenges(
                user_id, profile
            )
        }
        
        return plan
        
    async def predict_churn_risk(self, user_id: str) -> Dict:
        """Predict user churn risk"""
        
        # Get user activity data
        activity = await self.data_store.get_user_activity(user_id, days=30)
        
        # Extract features for churn prediction
        features = await self._extract_churn_features(activity)
        
        # Get prediction from ML model
        prediction = await self.ml_models.predict_churn(features)
        
        # Generate retention strategies if high risk
        retention_strategies = []
        if prediction["risk_score"] > 0.7:
            retention_strategies = await self._generate_retention_strategies(
                user_id, prediction
            )
            
        return {
            "risk_score": prediction["risk_score"],
            "risk_level": self._get_risk_level(prediction["risk_score"]),
            "factors": prediction["contributing_factors"],
            "retention_strategies": retention_strategies
        }
        
    async def optimize_notification_timing(
        self,
        user_id: str,
        notification_type: str
    ) -> Dict:
        """Determine optimal time to send notification"""
        
        # Get user's notification history
        history = await self.data_store.get_notification_history(user_id)
        
        # Get user's typical active times
        active_times = await self._analyze_active_times(user_id)
        
        # Get context factors
        context = await self._get_notification_context(user_id)
        
        # Use ML model to predict optimal time
        optimal_time = await self.ml_models.predict_optimal_notification_time(
            user_id,
            notification_type,
            history,
            active_times,
            context
        )
        
        return {
            "optimal_time": optimal_time["timestamp"],
            "confidence": optimal_time["confidence"],
            "alternative_times": optimal_time["alternatives"],
            "reason": optimal_time["reasoning"]
        }
        
    async def analyze_engagement_metrics(
        self,
        user_id: str,
        period: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict:
        """Analyze user engagement metrics"""
        
        if not period:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            period = (start_date, end_date)
            
        # Get engagement data
        engagement_data = await self.data_store.get_engagement_data(
            user_id, period
        )
        
        # Calculate metrics
        metrics = {
            "daily_active_rate": self._calculate_daily_active_rate(
                engagement_data
            ),
            "session_duration": self._calculate_avg_session_duration(
                engagement_data
            ),
            "feature_usage": self._analyze_feature_usage(engagement_data),
            "interaction_frequency": self._calculate_interaction_frequency(
                engagement_data
            ),
            "response_rate": self._calculate_response_rate(engagement_data),
            "engagement_trend": await self._calculate_engagement_trend(
                user_id, engagement_data
            )
        }
        
        # Generate insights
        insights = await self._generate_engagement_insights(metrics)
        
        return {
            "metrics": metrics,
            "insights": insights,
            "period": {
                "start": period[0].isoformat(),
                "end": period[1].isoformat()
            }
        }
        
    async def _get_engagement_profile(self, user_id: str) -> Dict:
        """Build user engagement profile"""
        
        # Get historical engagement data
        engagement_history = await self.data_store.get_engagement_history(
            user_id
        )
        
        # Analyze patterns
        profile = {
            "engagement_level": self._calculate_engagement_level(
                engagement_history
            ),
            "preferred_times": self._analyze_preferred_times(
                engagement_history
            ),
            "preferred_features": self._analyze_preferred_features(
                engagement_history
            ),
            "response_patterns": self._analyze_response_patterns(
                engagement_history
            ),
            "motivation_drivers": await self._identify_motivation_drivers(
                user_id, engagement_history
            )
        }
        
        return profile
        
    async def _select_strategies(
        self,
        profile: Dict
    ) -> List[Dict]:
        """Select appropriate engagement strategies"""
        
        selected = []
        
        # Score each strategy based on profile
        for strategy_name, strategy_func in self.strategies.items():
            score = await self._score_strategy(strategy_name, profile)
            
            if score > 0.5:  # Threshold for selection
                selected.append({
                    "name": strategy_name,
                    "score": score,
                    "implementation": await strategy_func(profile)
                })
                
        # Sort by score
        selected.sort(key=lambda x: x["score"], reverse=True)
        
        return selected[:3]  # Top 3 strategies
        
    async def _notification_strategy(self, profile: Dict) -> Dict:
        """Generate notification strategy"""
        
        return {
            "frequency": self._determine_notification_frequency(profile),
            "types": self._select_notification_types(profile),
            "timing": profile["preferred_times"],
            "personalization": {
                "use_name": True,
                "tone": profile.get("preferred_tone", "friendly"),
                "length": "short" if profile["engagement_level"] == "low" else "medium"
            }
        }
        
    async def _content_strategy(self, profile: Dict) -> Dict:
        """Generate content strategy"""
        
        return {
            "content_types": self._select_content_types(profile),
            "frequency": self._determine_content_frequency(profile),
            "topics": await self._identify_preferred_topics(profile),
            "format": profile.get("preferred_format", "mixed")
        }
        
    async def _generate_retention_strategies(
        self,
        user_id: str,
        prediction: Dict
    ) -> List[Dict]:
        """Generate strategies to retain at-risk users"""
        
        strategies = []
        
        # Re-engagement campaign
        if "low_activity" in prediction["contributing_factors"]:
            strategies.append({
                "type": "re_engagement_campaign",
                "actions": [
                    {
                        "action": "send_personalized_message",
                        "content": "We miss you! Here's what's new...",
                        "timing": "immediate"
                    },
                    {
                        "action": "offer_incentive",
                        "content": "Complete a workout for bonus points",
                        "timing": "24_hours"
                    }
                ]
            })
            
        # Goal adjustment
        if "goal_difficulty" in prediction["contributing_factors"]:
            strategies.append({
                "type": "goal_adjustment",
                "actions": [
                    {
                        "action": "suggest_easier_goals",
                        "content": "Let's adjust your goals for better success",
                        "timing": "immediate"
                    }
                ]
            })
            
        # Social connection
        if "low_social_interaction" in prediction["contributing_factors"]:
            strategies.append({
                "type": "social_connection",
                "actions": [
                    {
                        "action": "suggest_community_challenge",
                        "content": "Join others in this week's challenge",
                        "timing": "next_monday"
                    }
                ]
            })
            
        return strategies
        
    def _calculate_engagement_level(
        self,
        engagement_history: List[Dict]
    ) -> str:
        """Calculate overall engagement level"""
        
        if not engagement_history:
            return "new"
            
        # Calculate metrics
        recent_history = [
            e for e in engagement_history 
            if e["timestamp"] > datetime.utcnow() - timedelta(days=7)
        ]
        
        if not recent_history:
            return "inactive"
            
        daily_sessions = len(recent_history) / 7
        
        if daily_sessions >= 1:
            return "high"
        elif daily_sessions >= 0.5:
            return "medium"
        else:
            return "low"

# === core/learning_module.py ===
"""Learning Module for continuous AI improvement"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)

class LearningModule:
    """Manages continuous learning and improvement of AI system"""
    
    def __init__(self, ml_models, data_store):
        self.ml_models = ml_models
        self.data_store = data_store
        
        # Learning strategies
        self.learning_strategies = {
            "feedback": self._learn_from_feedback,
            "outcomes": self._learn_from_outcomes,
            "patterns": self._learn_from_patterns,
            "experiments": self._learn_from_experiments
        }
        
    async def process_feedback(
        self,
        user_id: str,
        feedback_type: str,
        feedback_data: Dict
    ) -> Dict:
        """Process user feedback for learning"""
        
        # Store feedback
        feedback_record = {
            "user_id": user_id,
            "type": feedback_type,
            "data": feedback_data,
            "timestamp": datetime.utcnow()
        }
        
        await self.data_store.save_feedback(feedback_record)
        
        # Process based on feedback type
        if feedback_type == "message_rating":
            learning_result = await self._process_message_feedback(
                user_id, feedback_data
            )
        elif feedback_type == "recommendation_rating":
            learning_result = await self._process_recommendation_feedback(
                user_id, feedback_data
            )
        elif feedback_type == "feature_feedback":
            learning_result = await self._process_feature_feedback(
                user_id, feedback_data
            )
        else:
            learning_result = {"status": "stored"}
            
        return {
            "feedback_id": feedback_record.get("id"),
            "processing_result": learning_result,
            "message": "Thank you for your feedback!"
        }
        
    async def analyze_system_performance(
        self,
        period: Optional[Dict] = None
    ) -> Dict:
        """Analyze overall system performance"""
        
        if not period:
            period = {
                "start": datetime.utcnow() - timedelta(days=7),
                "end": datetime.utcnow()
            }
            
        # Get performance metrics
        metrics = await self.data_store.get_system_metrics(period)
        
        # Analyze different aspects
        analysis = {
            "accuracy_metrics": await self._analyze_accuracy(metrics),
            "user_satisfaction": await self._analyze_satisfaction(metrics),
            "engagement_impact": await self._analyze_engagement_impact(metrics),
            "model_performance": await self._analyze_model_performance(metrics),
            "improvement_opportunities": await self._identify_improvements(
                metrics
            )
        }
        
        return analysis
        
    async def run_ab_test(
        self,
        test_name: str,
        test_config: Dict
    ) -> Dict:
        """Run A/B test for system improvements"""
        
        # Validate test configuration
        if not self._validate_test_config(test_config):
            return {"error": "Invalid test configuration"}
            
        # Initialize test
        test = {
            "name": test_name,
            "config": test_config,
            "status": "running",
            "started_at": datetime.utcnow(),
            "groups": {
                "control": [],
                "treatment": []
            }
        }
        
        # Save test
        test_id = await self.data_store.save_ab_test(test)
        
        return {
            "test_id": test_id,
            "status": "initialized",
            "message": f"A/B test '{test_name}' started successfully"
        }
        
    async def update_knowledge_base(
        self,
        domain: str,
        updates: List[Dict]
    ) -> Dict:
        """Update system knowledge base"""
        
        # Validate updates
        validated_updates = []
        for update in updates:
            if await self._validate_knowledge_update(update):
                validated_updates.append(update)
                
        # Apply updates
        results = []
        for update in validated_updates:
            result = await self._apply_knowledge_update(domain, update)
            results.append(result)
            
        # Trigger model retraining if needed
        if len(validated_updates) > 10:  # Threshold for retraining
            await self._trigger_model_update(domain)
            
        return {
            "domain": domain,
            "updates_applied": len(results),
            "status": "success",
            "results": results
        }
        
    async def train_personalization_model(
        self,
        user_id: Optional[str] = None
    ) -> Dict:
        """Train or update personalization models"""
        
        if user_id:
            # Train user-specific model
            result = await self._train_user_model(user_id)
        else:
            # Train global personalization model
            result = await self._train_global_model()
            
        return result
        
    async def _process_message_feedback(
        self,
        user_id: str,
        feedback_data: Dict
    ) -> Dict:
        """Process feedback on AI messages"""
        
        # Extract feedback details
        message_id = feedback_data.get("message_id")
        rating = feedback_data.get("rating")
        comment = feedback_data.get("comment")
        
        # Get message context
        context = await self.data_store.get_message_context(message_id)
        
        # Update response quality model
        await self.ml_models.update_response_quality_model(
            context, rating, comment
        )
        
        # Update user preference model
        if rating <= 2:  # Negative feedback
            await self._update_negative_preference(user_id, context)
        elif rating >= 4:  # Positive feedback
            await self._update_positive_preference(user_id, context)
            
        return {
            "model_updated": True,
            "preference_updated": True
        }
        
    async def _learn_from_outcomes(
        self,
        outcome_data: Dict
    ) -> Dict:
        """Learn from goal achievement outcomes"""
        
        # Analyze successful strategies
        successful_strategies = await self._analyze_successful_outcomes(
            outcome_data
        )
        
        # Analyze failed strategies
        failed_strategies = await self._analyze_failed_outcomes(
            outcome_data
        )
        
        # Update strategy models
        updates = {
            "successful_patterns": successful_strategies,
            "failure_patterns": failed_strategies,
            "model_adjustments": await self._calculate_model_adjustments(
                successful_strategies, failed_strategies
            )
        }
        
        # Apply updates
        await self.ml_models.update_strategy_models(updates)
        
        return {
            "patterns_identified": len(successful_strategies) + len(failed_strategies),
            "models_updated": True
        }
        
    async def _learn_from_patterns(
        self,
        pattern_data: Dict
    ) -> Dict:
        """Learn from user behavior patterns"""
        
        # Identify new patterns
        new_patterns = await self._identify_new_patterns(pattern_data)
        
        # Validate patterns
        validated_patterns = []
        for pattern in new_patterns:
            if await self._validate_pattern(pattern):
                validated_patterns.append(pattern)
                
        # Update pattern recognition models
        if validated_patterns:
            await self.ml_models.update_pattern_models(validated_patterns)
            
        return {
            "new_patterns": len(validated_patterns),
            "models_updated": len(validated_patterns) > 0
        }
        
    async def _analyze_accuracy(self, metrics: Dict) -> Dict:
        """Analyze prediction accuracy"""
        
        accuracy_metrics = {}
        
        # Intent classification accuracy
        if "intent_predictions" in metrics:
            predictions = metrics["intent_predictions"]
            correct = sum(1 for p in predictions if p["predicted"] == p["actual"])
            accuracy_metrics["intent_accuracy"] = correct / len(predictions)
            
        # Goal achievement prediction accuracy
        if "goal_predictions" in metrics:
            predictions = metrics["goal_predictions"]
            mae = np.mean([
                abs(p["predicted_days"] - p["actual_days"]) 
                for p in predictions
            ])
            accuracy_metrics["goal_prediction_mae"] = mae
            
        return accuracy_metrics
        
    async def _identify_improvements(
        self,
        metrics: Dict
    ) -> List[Dict]:
        """Identify improvement opportunities"""
        
        improvements = []
        
        # Check response quality
        if metrics.get("avg_rating", 5) < 3.5:
            improvements.append({
                "area": "response_quality",
                "priority": "high",
                "suggestion": "Improve response generation model",
                "metrics": {"current_rating": metrics.get("avg_rating")}
            })
            
        # Check engagement metrics
        if metrics.get("engagement_rate", 1) < 0.5:
            improvements.append({
                "area": "engagement",
                "priority": "medium",
                "suggestion": "Enhance engagement strategies",
                "metrics": {"current_rate": metrics.get("engagement_rate")}
            })
            
        # Check personalization effectiveness
        if metrics.get("personalization_score", 1) < 0.7:
            improvements.append({
                "area": "personalization",
                "priority": "medium",
                "suggestion": "Refine personalization algorithms",
                "metrics": {"current_score": metrics.get("personalization_score")}
            })
            
        return improvements

# === services/nlp_service.py ===
"""NLP Service for natural language processing"""

import logging
from typing import Dict, List, Optional
import re
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import spacy
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

class NLPService:
    """Handles all NLP operations"""
    
    def __init__(self):
        logger.info("Initializing NLP Service...")
        
        # Initialize models
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        self.intent_classifier = pipeline(
            "text-classification",
            model="bert-base-uncased"
        )
        
        # Load spaCy model for entity extraction
        self.nlp = spacy.load("en_core_web_sm")
        
        # Intent mappings
        self.intent_patterns = {
            "workout_recommendation": [
                r"recommend.*workout",
                r"suggest.*exercise",
                r"what.*workout.*should"
            ],
            "progress_check": [
                r"how.*doing",
                r"check.*progress",
                r"show.*progress"
            ],
            "meal_planning": [
                r"plan.*meal",
                r"what.*eat",
                r"food.*suggestion"
            ],
            "goal_setting": [
                r"set.*goal",
                r"create.*goal",
                r"new.*goal"
            ]
        }
        
    async def analyze_message(self, message: str) -> Dict:
        """Analyze message for intent, entities, and sentiment"""
        
        # Clean message
        cleaned_message = self._clean_text(message)
        
        # Get intent
        intent = await self._classify_intent(cleaned_message)
        
        # Extract entities
        entities = await self._extract_entities(cleaned_message)
        
        # Analyze sentiment
        sentiment = self._analyze_sentiment(cleaned_message)
        
        # Calculate confidence
        confidence = await self._calculate_confidence(
            intent, entities, sentiment
        )
        
        return {
            "intent": intent["label"],
            "intent_confidence": intent["confidence"],
            "entities": entities,
            "sentiment": sentiment,
            "confidence": confidence
        }
        
    async def generate_response(
        self,
        template: str,
        parameters: Dict
    ) -> str:
        """Generate natural language response from template"""
        
        # Fill template with parameters
        response = template
        for key, value in parameters.items():
            placeholder = f"{{{key}}}"
            if placeholder in response:
                response = response.replace(placeholder, str(value))
                
        # Post-process for natural flow
        response = self._improve_fluency(response)
        
        return response
        
    async def adjust_tone(
        self,
        text: str,
        target_tone: str
    ) -> str:
        """Adjust text tone"""
        
        if target_tone == "professional":
            text = self._make_professional(text)
        elif target_tone == "casual":
            text = self._make_casual(text)
        elif target_tone == "motivational":
            text = self._make_motivational(text)
            
        return text
        
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        
        # Remove extra whitespace
        text = " ".join(text.split())
        
        # Fix common typos
        text = self._fix_common_typos(text)
        
        return text.strip()
        
    async def _classify_intent(self, text: str) -> Dict:
        """Classify message intent"""
        
        # First try pattern matching
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text.lower()):
                    return {
                        "label": intent,
                        "confidence": 0.9
                    }
                    
        # Fall back to ML classifier
        try:
            results = self.intent_classifier(text)
            if results:
                return {
                    "label": results[0]["label"],
                    "confidence": results[0]["score"]
                }
        except Exception as e:
            logger.error(f"Intent classification error: {e}")
            
        return {
            "label": "general",
            "confidence": 0.5
        }
        
    async def _extract_entities(self, text: str) -> List[Dict]:
        """Extract entities from text"""
        
        entities = []
        
        # Use spaCy NER
        doc = self.nlp(text)
        
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char
            })
            
        # Custom entity extraction
        custom_entities = self._extract_custom_entities(text)
        entities.extend(custom_entities)
        
        return entities
        
    def _analyze_sentiment(self, text: str) -> float:
        """Analyze text sentiment"""
        
        scores = self.sentiment_analyzer.polarity_scores(text)
        return scores["compound"]  # Return compound score (-1 to 1)
        
    def _extract_custom_entities(self, text: str) -> List[Dict]:
        """Extract domain-specific entities"""
        
        entities = []
        
        # Exercise types
        exercises = [
            "cardio", "strength", "yoga", "pilates", "hiit",
            "running", "cycling", "swimming"
        ]
        
        for exercise in exercises:
            if exercise in text.lower():
                entities.append({
                    "text": exercise,
                    "type": "exercise_type",
                    "value": exercise
                })
                
        # Time entities
        time_pattern = r'\b(\d+)\s*(minutes?|hours?|days?|weeks?)\b'
        for match in re.finditer(time_pattern, text.lower()):
            entities.append({
                "text": match.group(0),
                "type": "duration",
                "value": match.group(1),
                "unit": match.group(2)
            })
            
        return entities
        
    def _make_professional(self, text: str) -> str:
        """Make text more professional"""
        
        replacements = {
            "hey": "hello",
            "hi": "greetings",
            "awesome": "excellent",
            "cool": "beneficial",
            "!": "."
        }
        
        for casual, professional in replacements.items():
            text = text.replace(casual, professional)
            text = text.replace(casual.capitalize(), professional.capitalize())
            
        return text
        
    def _make_casual(self, text: str) -> str:
        """Make text more casual"""
        
        if not text.lower().startswith(("hey", "hi")):
            text = f"Hey! {text}"
            
        return text
        
    def _make_motivational(self, text: str) -> str:
        """Make text more motivational"""
        
        motivational_phrases = [
            "You've got this!",
            "Keep pushing forward!",
            "Every step counts!",
            "You're doing amazing!"
        ]
        
        # Add motivational phrase if not present
        has_motivation = any(
            phrase.lower() in text.lower() 
            for phrase in motivational_phrases
        )
        
        if not has_motivation:
            import random
            text += f" {random.choice(motivational_phrases)}"
            
        return text

# === services/ml_models.py ===
"""Machine Learning Models Service"""

import logging
from typing import Dict, List, Optional, Any
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import pickle
import joblib

logger = logging.getLogger(__name__)

class MLModels:
    """Manages all machine learning models"""
    
    def __init__(self):
        logger.info("Initializing ML Models...")
        
        # Initialize models
        self.models = {
            "churn_prediction": self._init_churn_model(),
            "goal_achievement": self._init_goal_model(),
            "engagement_prediction": self._init_engagement_model(),
            "recommendation": self._init_recommendation_model(),
            "personalization": self._init_personalization_model()
        }
        
        # Initialize scalers
        self.scalers = {
            "churn": StandardScaler(),
            "goal": StandardScaler(),
            "engagement": StandardScaler()
        }
        
    async def predict_churn(self, features: Dict) -> Dict:
        """Predict user churn probability"""
        
        # Prepare features
        X = self._prepare_churn_features(features)
        
        # Scale features
        X_scaled = self.scalers["churn"].transform([X])
        
        # Get prediction
        probability = self.models["churn_prediction"].predict_proba(X_scaled)[0][1]
        
        # Get feature importance
        feature_importance = self._get_feature_importance(
            "churn_prediction", X
        )
        
        # Identify contributing factors
        factors = self._identify_churn_factors(features, feature_importance)
        
        return {
            "risk_score": float(probability),
            "contributing_factors": factors,
            "confidence": self._calculate_prediction_confidence(
                self.models["churn_prediction"], X_scaled
            )
        }
        
    async def predict_goal_achievement(
        self,
        features: Dict,
        goal: Dict
    ) -> Dict:
        """Predict goal achievement timeline"""
        
        # Prepare features
        X = self._prepare_goal_features(features, goal)
        
        # Scale features
        X_scaled = self.scalers["goal"].transform([X])
        
        # Predict days to achievement
        days_predicted = self.models["goal_achievement"].predict(X_scaled)[0]
        
        # Calculate achievement date
        achievement_date = datetime.utcnow() + timedelta(days=int(days_predicted))
        
        # Calculate required rate
        current_progress = features.get("current_progress", 0)
        remaining_progress = goal["target"] - current_progress
        required_rate = remaining_progress / max(days_predicted, 1)
        
        return {
            "date": achievement_date,
            "days_remaining": int(days_predicted),
            "confidence": self._calculate_regression_confidence(
                self.models["goal_achievement"], X_scaled
            ),
            "required_rate": required_rate,
            "current_rate": features.get("current_rate", 0)
        }
        
    async def predict_optimal_notification_time(
        self,
        user_id: str,
        notification_type: str,
        history: List[Dict],
        active_times: Dict,
        context: Dict
    ) -> Dict:
        """Predict optimal time for notification"""
        
        # Analyze historical response rates
        response_rates = self._analyze_response_rates(history)
        
        # Find peak activity windows
        peak_windows = self._identify_peak_windows(active_times)
        
        # Consider context factors
        context_score = self._score_context_factors(context)
        
        # Calculate optimal time
        optimal_hour = self._calculate_optimal_hour(
            response_rates, peak_windows, context_score
        )
        
        # Generate alternatives
        alternatives = self._generate_alternative_times(
            optimal_hour, peak_windows
        )
        
        return {
            "timestamp": datetime.utcnow().replace(
                hour=optimal_hour, minute=0, second=0
            ),
            "confidence": 0.85,  # Placeholder
            "alternatives": alternatives,
            "reasoning": f"Based on your typical activity at {optimal_hour}:00"
        }
        
    async def update_response_quality_model(
        self,
        context: Dict,
        rating: float,
        comment: Optional[str] = None
    ) -> bool:
        """Update response quality model with feedback"""
        
        # Extract features from context
        features = self._extract_response_features(context)
        
        # Create training sample
        sample = {
            "features": features,
            "rating": rating,
            "comment": comment,
            "timestamp": datetime.utcnow()
        }
        
        # Add to training buffer
        # In production, this would be stored and used for batch retraining
        
        return True
        
    def _init_churn_model(self):
        """Initialize churn prediction model"""
        
        # In production, load pre-trained model
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        # Placeholder training
        # In reality, would load from saved model
        return model
        
    def _init_goal_model(self):
        """Initialize goal achievement model"""
        
        model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        return model
        
    def _init_engagement_model(self):
        """Initialize engagement prediction model"""
        
        model = RandomForestClassifier(
            n_estimators=50,
            max_depth=8,
            random_state=42
        )
        
        return model
        
    def _prepare_churn_features(self, features: Dict) -> List[float]:
        """Prepare features for churn prediction"""
        
        return [
            features.get("days_since_last_login", 0),
            features.get("total_sessions", 0),
            features.get("avg_session_duration", 0),
            features.get("goals_completed", 0),
            features.get("goals_abandoned", 0),
            features.get("messages_sent", 0),
            features.get("features_used", 0),
            features.get("days_active_last_month", 0)
        ]
        
    def _prepare_goal_features(
        self,
        features: Dict,
        goal: Dict
    ) -> List[float]:
        """Prepare features for goal prediction"""
        
        return [
            features.get("current_progress", 0),
            features.get("days_elapsed", 0),
            features.get("consistency_score", 0),
            features.get("avg_daily_progress", 0),
            goal.get("target_value", 0),
            goal.get("difficulty_score", 0),
            features.get("similar_goals_completed", 0)
        ]

# === services/data_store.py ===
"""Data Store Service for managing persistent data"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import json
import asyncio
from collections import defaultdict

logger = logging.getLogger(__name__)

class DataStore:
    """Manages data persistence and retrieval"""
    
    def __init__(self):
        logger.info("Initializing Data Store...")
        
        # In production, this would connect to actual databases
        # Using in-memory storage for demonstration
        self.users = {}
        self.conversations = {}
        self.metrics = defaultdict(list)
        self.feedback = []
        self.achievements = {}
        self.user_achievements = defaultdict(list)
        
    async def get_user(self, user_id: str) -> Optional['User']:
        """Get user by ID"""
        
        user_data = self.users.get(user_id)
        if user_data:
            from coach_core_ai.models.user_model import User
            return User(**user_data)
        return None
        
    async def save_user(self, user: 'User') -> str:
        """Save user data"""
        
        self.users[user.id] = user.to_dict()
        return user.id
        
    async def get_conversation(
        self,
        conversation_id: str
    ) -> Optional['Conversation']:
        """Get conversation by ID"""
        
        conv_data = self.conversations.get(conversation_id)
        if conv_data:
            from coach_core_ai.models.conversation_model import Conversation
            return Conversation(**conv_data)
        return None
        
    async def save_conversation(self, conversation: 'Conversation') -> str:
        """Save conversation"""
        
        self.conversations[conversation.id] = conversation.to_dict()
        return conversation.id
        
    async def get_progress_data(
        self,
        user_id: str,
        metric_type: Optional[str] = None,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> List['Progress']:
        """Get user progress data"""
        
        user_metrics = self.metrics.get(user_id, [])
        
        # Filter by metric type if specified
        if metric_type:
            user_metrics = [
                m for m in user_metrics 
                if m.get("type") == metric_type
            ]
            
        # Filter by time range if specified
        if time_range:
            start, end = time_range
            user_metrics = [
                m for m in user_metrics
                if start <= m.get("timestamp") <= end
            ]
            
        # Convert to Progress objects
        from coach_core_ai.models.progress_model import Progress
        return [Progress(**m) for m in user_metrics]
        
    async def save_metric(self, metric: 'Metric') -> str:
        """Save metric data"""
        
        metric_dict = metric.to_dict()
        self.metrics[metric.user_id].append(metric_dict)
        return metric.id
        
    async def get_recent_activity(
        self,
        user_id: str,
        days: int = 7
    ) -> List[Dict]:
        """Get recent user activity"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        activity = []
        
        # Get recent metrics
        user_metrics = self.metrics.get(user_id, [])
        for metric in user_metrics:
            if metric.get("timestamp") > cutoff_date:
                activity.append({
                    "type": "metric",
                    "timestamp": metric["timestamp"],
                    "data": metric
                })
                
        # Get recent achievements
        user_achievements = self.user_achievements.get(user_id, [])
        for achievement in user_achievements:
            if achievement.get("timestamp") > cutoff_date:
                activity.append({
                    "type": "achievement",
                    "timestamp": achievement["timestamp"],
                    "data": achievement
                })
                
        # Sort by timestamp
        activity.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return activity
        
    async def get_engagement_metrics(
        self,
        user_id: str
    ) -> Dict:
        """Get user engagement metrics"""
        
        # Calculate from activity data
        # In production, this would be pre-computed
        
        return {
            "total_sessions": 42,
            "avg_session_duration": 15.5,
            "days_active_last_month": 22,
            "features_used": 8,
            "goals_completed": 3,
            "messages_sent": 156
        }
        
    async def get_user_interactions(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get user interactions history"""
        
        interactions = []
        
        # Get from conversations
        for conv_id, conv in self.conversations.items():
            if conv.get("user_id") == user_id:
                for msg in conv.get("messages", [])[:limit]:
                    interactions.append({
                        "type": "message",
                        "timestamp": msg.get("timestamp"),
                        "data": msg
                    })
                    
        return interactions[-limit:]
        
    async def get_achievement_rules(self) -> List[Dict]:
        """Get achievement rules"""
        
        # In production, load from database
        return [
            {
                "id": "first_workout",
                "name": "First Workout Complete",
                "description": "Complete your first workout",
                "badge": "🏃",
                "points": 10,
                "criteria": {"workouts_completed": 1}
            },
            {
                "id": "week_streak",
                "name": "Week Warrior",
                "description": "7 day activity streak",
                "badge": "🔥",
                "points": 50,
                "criteria": {"streak_days": 7}
            }
        ]
        