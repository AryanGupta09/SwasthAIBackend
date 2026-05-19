from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel


class Workout(Document):
    userId: str
    workoutType: str          # e.g. "Running", "Yoga", "Weight Training"
    duration: int             # minutes
    caloriesBurned: int
    intensity: str            # "Low", "Medium", "High"
    notes: Optional[str] = None
    date: datetime = datetime.now()

    class Settings:
        name = "workouts"
