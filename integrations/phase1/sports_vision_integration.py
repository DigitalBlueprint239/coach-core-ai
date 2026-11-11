"""
Sports Computer Vision Integration for Coach Core AI
Phase 1: Core Enhancements - Real-time Sports Analysis
"""

import cv2
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from datetime import datetime
import json

logger = logging.getLogger(__name__)

@dataclass
class VisionConfig:
    sport_type: str = 'soccer'
    confidence_threshold: float = 0.4
    overlap_threshold: float = 0.3
    fps_target: int = 30
    tracking_history_length: int = 30

class PlayerTracker:
    """Track individual players across frames"""
    
    def __init__(self, max_disappeared: int = 10):
        self.next_object_id = 0
        self.objects = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared
        self.tracking_history = {}
    
    def update(self, detections: List[Dict]) -> Dict[int, Dict]:
        """Update player tracking with new detections"""
        
        # If no objects are being tracked, initialize all detections
        if len(self.objects) == 0:
            for detection in detections:
                self.objects[self.next_object_id] = detection
                self.disappeared[self.next_object_id] = 0
                self.tracking_history[self.next_object_id] = [detection['position']]
                self.next_object_id += 1
        
        # If no detections, mark all objects as disappeared
        elif len(detections) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
        
        else:
            # Match detections to existing objects
            object_ids = list(self.objects.keys())
            object_centroids = [self.objects[object_id]['position'] for object_id in object_ids]
            
            # Calculate distances between existing objects and new detections
            detection_centroids = [detection['position'] for detection in detections]
            distances = self._calculate_distances(object_centroids, detection_centroids)
            
            # Find matches using Hungarian algorithm
            rows, cols = self._hungarian_algorithm(distances)
            
            # Update matched objects
            used_rows = set()
            used_cols = set()
            
            for (row, col) in zip(rows, cols):
                if row < len(object_ids) and col < len(detections):
                    object_id = object_ids[row]
                    self.objects[object_id] = detections[col]
                    self.disappeared[object_id] = 0
                    
                    # Update tracking history
                    if object_id in self.tracking_history:
                        self.tracking_history[object_id].append(detections[col]['position'])
                        if len(self.tracking_history[object_id]) > 30:  # Keep last 30 positions
                            self.tracking_history[object_id].pop(0)
                    
                    used_rows.add(row)
                    used_cols.add(col)
            
            # Handle unmatched objects
            unused_rows = set(range(len(object_ids))).difference(used_rows)
            for row in unused_rows:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            
            # Handle new detections
            unused_cols = set(range(len(detections))).difference(used_cols)
            for col in unused_cols:
                self.objects[self.next_object_id] = detections[col]
                self.disappeared[self.next_object_id] = 0
                self.tracking_history[self.next_object_id] = [detections[col]['position']]
                self.next_object_id += 1
        
        return self.objects
    
    def deregister(self, object_id: int):
        """Remove object from tracking"""
        del self.objects[object_id]
        del self.disappeared[object_id]
        if object_id in self.tracking_history:
            del self.tracking_history[object_id]
    
    def _calculate_distances(self, centroids1: List[Tuple], centroids2: List[Tuple]) -> np.ndarray:
        """Calculate Euclidean distances between centroids"""
        distances = np.zeros((len(centroids1), len(centroids2)))
        
        for i, c1 in enumerate(centroids1):
            for j, c2 in enumerate(centroids2):
                distances[i, j] = np.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
        
        return distances
    
    def _hungarian_algorithm(self, cost_matrix: np.ndarray) -> Tuple[List[int], List[int]]:
        """Simple implementation of Hungarian algorithm for assignment"""
        try:
            from scipy.optimize import linear_sum_assignment
            rows, cols = linear_sum_assignment(cost_matrix)
            return rows.tolist(), cols.tolist()
        except ImportError:
            # Fallback: greedy assignment
            rows, cols = [], []
            used_cols = set()
            
            for row in range(len(cost_matrix)):
                min_cost = float('inf')
                min_col = -1
                
                for col in range(len(cost_matrix[row])):
                    if col not in used_cols and cost_matrix[row, col] < min_cost:
                        min_cost = cost_matrix[row, col]
                        min_col = col
                
                if min_col != -1:
                    rows.append(row)
                    cols.append(min_col)
                    used_cols.add(min_col)
            
            return rows, cols

class BallTracker:
    """Track ball position and movement"""
    
    def __init__(self):
        self.ball_history = []
        self.current_position = None
        self.velocity = None
    
    def update(self, ball_detection: Optional[Dict]) -> Optional[Dict]:
        """Update ball tracking"""
        
        if ball_detection:
            position = ball_detection['position']
            self.ball_history.append({
                'position': position,
                'timestamp': datetime.now().isoformat(),
                'confidence': ball_detection.get('confidence', 0.0)
            })
            
            # Keep only recent history
            if len(self.ball_history) > 60:  # Last 2 seconds at 30fps
                self.ball_history.pop(0)
            
            # Calculate velocity
            if len(self.ball_history) >= 2:
                prev_pos = self.ball_history[-2]['position']
                curr_pos = self.ball_history[-1]['position']
                time_diff = 1/30  # Assuming 30fps
                
                self.velocity = (
                    (curr_pos[0] - prev_pos[0]) / time_diff,
                    (curr_pos[1] - prev_pos[1]) / time_diff
                )
            
            self.current_position = position
            
            return {
                'position': position,
                'velocity': self.velocity,
                'confidence': ball_detection.get('confidence', 0.0)
            }
        
        return None

class FieldCalibrator:
    """Calibrate field coordinates and dimensions"""
    
    def __init__(self):
        self.field_dimensions = None
        self.homography_matrix = None
        self.calibrated = False
    
    def calibrate_field(self, field_corners: List[Tuple[int, int]], 
                       real_dimensions: Tuple[float, float]) -> bool:
        """Calibrate field using corner points"""
        try:
            # Define real-world field corners (in meters)
            real_corners = np.array([
                [0, 0],
                [real_dimensions[0], 0],
                [real_dimensions[0], real_dimensions[1]],
                [0, real_dimensions[1]]
            ], dtype=np.float32)
            
            # Convert image corners to numpy array
            image_corners = np.array(field_corners, dtype=np.float32)
            
            # Calculate homography matrix
            self.homography_matrix = cv2.findHomography(image_corners, real_corners)[0]
            self.field_dimensions = real_dimensions
            self.calibrated = True
            
            logger.info("Field calibration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Field calibration failed: {e}")
            return False
    
    def image_to_real_coordinates(self, image_point: Tuple[int, int]) -> Tuple[float, float]:
        """Convert image coordinates to real-world coordinates"""
        if not self.calibrated:
            return image_point
        
        point = np.array([[image_point]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(point, self.homography_matrix)
        return (transformed[0][0][0], transformed[0][0][1])

class SportsVisionAnalyzer:
    """Main sports vision analysis system"""
    
    def __init__(self, config: VisionConfig = None):
        self.config = config or VisionConfig()
        self.player_tracker = PlayerTracker()
        self.ball_tracker = BallTracker()
        self.field_calibrator = FieldCalibrator()
        
        # Initialize Roboflow (if available)
        try:
            from roboflow import Roboflow
            self.rf = Roboflow(api_key=self._get_roboflow_key())
            self.project = self.rf.workspace().project(f"{self.config.sport_type}-tracker")
            self.model = self.project.version(1).model
            self.roboflow_available = True
            logger.info("Roboflow sports vision model loaded")
        except ImportError:
            logger.warning("Roboflow not available. Install with: pip install roboflow")
            self.roboflow_available = False
        except Exception as e:
            logger.warning(f"Could not load Roboflow model: {e}")
            self.roboflow_available = False
    
    def _get_roboflow_key(self) -> str:
        """Get Roboflow API key from environment"""
        import os
        return os.getenv('ROBOFLOW_API_KEY', '')
    
    def analyze_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """Analyze a single frame for sports tracking"""
        
        if not self.roboflow_available:
            return self._analyze_frame_fallback(frame)
        
        try:
            # Get predictions from Roboflow model
            predictions = self.model.predict(frame, 
                                           confidence=self.config.confidence_threshold,
                                           overlap=self.config.overlap_threshold).json()
            
            # Process detections
            players = []
            ball = None
            
            for prediction in predictions['predictions']:
                if prediction['class'] == 'player':
                    players.append({
                        'position': (prediction['x'], prediction['y']),
                        'confidence': prediction['confidence'],
                        'bbox': prediction
                    })
                elif prediction['class'] == 'ball':
                    ball = {
                        'position': (prediction['x'], prediction['y']),
                        'confidence': prediction['confidence'],
                        'bbox': prediction
                    }
            
            # Update trackers
            tracked_players = self.player_tracker.update(players)
            tracked_ball = self.ball_tracker.update(ball)
            
            # Calculate tactical metrics
            formation = self._analyze_formation(tracked_players)
            pressure_map = self._calculate_pressure_map(tracked_players, tracked_ball)
            
            return {
                'players': tracked_players,
                'ball': tracked_ball,
                'formation': formation,
                'pressure_map': pressure_map,
                'tactical_insights': self._generate_tactical_insights(tracked_players, tracked_ball),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Frame analysis failed: {e}")
            return self._analyze_frame_fallback(frame)
    
    def _analyze_frame_fallback(self, frame: np.ndarray) -> Dict[str, Any]:
        """Fallback analysis when Roboflow is not available"""
        # Simple color-based detection for demonstration
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Detect players (assuming they wear colored jerseys)
        # This is a simplified example - real implementation would be more sophisticated
        players = []
        
        # Detect ball (assuming it's white)
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 30, 255])
        ball_mask = cv2.inRange(hsv, lower_white, upper_white)
        
        ball_contours, _ = cv2.findContours(ball_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        ball = None
        if ball_contours:
            largest_contour = max(ball_contours, key=cv2.contourArea)
            if cv2.contourArea(largest_contour) > 50:  # Minimum size threshold
                M = cv2.moments(largest_contour)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    ball = {
                        'position': (cx, cy),
                        'confidence': 0.8,
                        'bbox': {'x': cx, 'y': cy, 'width': 20, 'height': 20}
                    }
        
        return {
            'players': players,
            'ball': ball,
            'formation': 'unknown',
            'pressure_map': {},
            'tactical_insights': 'Basic analysis mode',
            'timestamp': datetime.now().isoformat()
        }
    
    def _analyze_formation(self, players: Dict[int, Dict]) -> str:
        """Analyze team formation based on player positions"""
        if not players:
            return 'unknown'
        
        # Convert player positions to list
        positions = [player['position'] for player in players.values()]
        
        if len(positions) < 3:
            return 'insufficient_players'
        
        # Simple formation analysis based on player distribution
        x_coords = [pos[0] for pos in positions]
        y_coords = [pos[1] for pos in positions]
        
        # Calculate formation characteristics
        x_mean = np.mean(x_coords)
        y_mean = np.mean(y_coords)
        
        # Determine formation based on player distribution
        if len(positions) == 11:  # Full team
            if np.std(x_coords) > np.std(y_coords):
                return '4-4-2'  # Wide formation
            else:
                return '4-3-3'  # Attacking formation
        else:
            return f'partial_team_{len(positions)}'
    
    def _calculate_pressure_map(self, players: Dict[int, Dict], ball: Optional[Dict]) -> Dict[str, float]:
        """Calculate pressure map around the ball"""
        if not ball:
            return {}
        
        ball_pos = ball['position']
        pressure_map = {}
        
        for player_id, player in players.items():
            player_pos = player['position']
            distance = np.sqrt((ball_pos[0] - player_pos[0])**2 + (ball_pos[1] - player_pos[1])**2)
            
            # Calculate pressure based on distance (closer = higher pressure)
            pressure = max(0, 1 - (distance / 100))  # Normalize to 0-1
            pressure_map[f'player_{player_id}'] = pressure
        
        return pressure_map
    
    def _generate_tactical_insights(self, players: Dict[int, Dict], ball: Optional[Dict]) -> List[str]:
        """Generate tactical insights based on current situation"""
        insights = []
        
        if not ball:
            insights.append("Ball not detected - check camera positioning")
            return insights
        
        ball_pos = ball['position']
        
        # Analyze player positioning relative to ball
        nearby_players = []
        for player_id, player in players.items():
            distance = np.sqrt((ball_pos[0] - player['position'][0])**2 + 
                             (ball_pos[1] - player['position'][1])**2)
            if distance < 50:  # Within 50 pixels
                nearby_players.append(player_id)
        
        if len(nearby_players) > 3:
            insights.append("High pressure situation - multiple players near ball")
        elif len(nearby_players) == 0:
            insights.append("Ball is free - opportunity for counter-attack")
        
        # Analyze formation
        formation = self._analyze_formation(players)
        insights.append(f"Current formation: {formation}")
        
        return insights
    
    def stream_analysis(self, video_source: str):
        """Process video stream in real-time"""
        cap = cv2.VideoCapture(video_source)
        
        if not cap.isOpened():
            logger.error(f"Could not open video source: {video_source}")
            return
        
        logger.info(f"Starting real-time analysis of {video_source}")
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Analyze frame
                analysis = self.analyze_frame(frame)
                
                # Yield analysis results
                yield analysis
                
        finally:
            cap.release()
            logger.info("Video analysis completed")

def run_vision_example():
    """Example usage of the Sports Vision Analyzer"""
    
    # Initialize analyzer
    config = VisionConfig(
        sport_type='soccer',
        confidence_threshold=0.4,
        fps_target=30
    )
    
    analyzer = SportsVisionAnalyzer(config)
    
    # Create a test frame (random image)
    test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    
    # Analyze frame
    analysis = analyzer.analyze_frame(test_frame)
    
    print("Sports Vision Analysis Results:")
    print(f"Players detected: {len(analysis['players'])}")
    print(f"Ball detected: {analysis['ball'] is not None}")
    print(f"Formation: {analysis['formation']}")
    print(f"Tactical insights: {analysis['tactical_insights']}")
    
    return analysis

if __name__ == "__main__":
    run_vision_example() 