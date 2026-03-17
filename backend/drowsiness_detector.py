import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np

class DrowsinessDetector:
    def __init__(self):
        base_options = python.BaseOptions(model_asset_path='backend/face_landmarker.task')
        options = vision.FaceLandmarkerOptions(base_options=base_options,
                                               output_face_blendshapes=False,
                                               output_facial_transformation_matrixes=False,
                                               num_faces=1)
        self.detector = vision.FaceLandmarker.create_from_options(options)
        
        # EAR thresholds
        self.EAR_THRESHOLD = 0.25
        # MAR thresholds
        self.MAR_THRESHOLD = 0.5
        
        # Specific landmark indices from MediaPipe FaceMesh
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]
        self.MOUTH = [78, 81, 13, 311, 308, 402, 14, 178]

    def _euclidean_distance(self, p1, p2):
        return np.linalg.norm(np.array(p1) - np.array(p2))

    def _calculate_aspect_ratio(self, landmarks, indices, width_indices, height_indices_list):
        p_left = landmarks[indices[width_indices[0]]]
        p_right = landmarks[indices[width_indices[1]]]
        width = self._euclidean_distance(p_left, p_right)
        
        if width == 0:
            return 0.0

        height_sum = 0
        for top_idx, bottom_idx in height_indices_list:
            p_top = landmarks[indices[top_idx]]
            p_bottom = landmarks[indices[bottom_idx]]
            height_sum += self._euclidean_distance(p_top, p_bottom)
            
        height = height_sum / len(height_indices_list)
        return height / width

    def process_frame(self, frame_bgr):
        # MediaPipe tasks requires an mp.Image wrapper
        rgb_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        detection_result = self.detector.detect(mp_image)
        
        metrics = {
            "ear": 0.0,
            "mar": 0.0,
            "status": "Normal",
            "faces_detected": 0
        }

        if detection_result.face_landmarks:
            metrics["faces_detected"] = len(detection_result.face_landmarks)
            face_landmarks = detection_result.face_landmarks[0]
            
            h, w, _ = frame_bgr.shape
            landmarks = [(int(pt.x * w), int(pt.y * h)) for pt in face_landmarks]
            
            # Calculate EAR for both eyes
            left_ear = self._calculate_aspect_ratio(landmarks, self.LEFT_EYE, (0, 3), [(1, 5), (2, 4)])
            right_ear = self._calculate_aspect_ratio(landmarks, self.RIGHT_EYE, (0, 3), [(1, 5), (2, 4)])
            
            avg_ear = (left_ear + right_ear) / 2.0
            metrics["ear"] = avg_ear
            
            # Calculate MAR
            mar = self._calculate_aspect_ratio(landmarks, self.MOUTH, (0, 4), [(1, 7), (2, 6), (3, 5)])
            metrics["mar"] = mar
            
            # Determine status
            if avg_ear < self.EAR_THRESHOLD:
                metrics["status"] = "Critical"
            elif mar > self.MAR_THRESHOLD:
                metrics["status"] = "Warning"
            else:
                metrics["status"] = "Normal"
                
        return metrics
