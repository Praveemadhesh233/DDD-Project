from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.database import get_db, DrowsinessLog
from typing import List
import json
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Drowsiness Detection API is running"}

@app.get("/api/logs")
def get_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(DrowsinessLog).order_by(DrowsinessLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs

@app.post("/api/logs")
def create_log(status: str, ear: float, mar: float, db: Session = Depends(get_db)):
    db_log = DrowsinessLog(status=status, ear_value=ear, mar_value=mar, timestamp=datetime.datetime.utcnow())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

import base64
import cv2
import numpy as np
from backend.drowsiness_detector import DrowsinessDetector

detector = DrowsinessDetector()

@app.websocket("/ws/video")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # data is expected to be a data URL: 'data:image/jpeg;base64,...'
            if "," in data:
                header, encoded = data.split(",", 1)
                decoded = base64.b64decode(encoded)
                np_arr = np.frombuffer(decoded, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
                if frame is not None:
                    metrics = detector.process_frame(frame)
                    await websocket.send_json(metrics)
                else:
                    await websocket.send_json({"error": "Invalid frame data"})
            else:
                await websocket.send_json({"error": "Invalid format"})
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")

