import os
import json
from datetime import datetime, timedelta
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from beanie import PydanticObjectId
from models.workout import Workout
from models.user import User
from dotenv import load_dotenv

load_dotenv()


# ================= REQUEST SCHEMAS =================

class LogWorkoutRequest(BaseModel):
    workoutType: str
    duration: int           # minutes
    caloriesBurned: int
    intensity: str          # Low / Medium / High
    notes: Optional[str] = None
    date: Optional[str] = None   # ISO string, default today


class WorkoutSuggestionRequest(BaseModel):
    bmi: Optional[float] = None
    goal: Optional[str] = None   # weight loss / weight gain / maintain
    fitnessLevel: Optional[str] = "Beginner"
    availableTime: Optional[int] = 30   # minutes per day
    diseases: Optional[str] = None


# ================= LOG WORKOUT =================

async def log_workout(data: LogWorkoutRequest, user_id: str):
    try:
        workout_date = datetime.now()
        if data.date:
            try:
                workout_date = datetime.fromisoformat(data.date.replace("Z", "+00:00"))
            except Exception:
                workout_date = datetime.now()

        workout = Workout(
            userId=user_id,
            workoutType=data.workoutType,
            duration=data.duration,
            caloriesBurned=data.caloriesBurned,
            intensity=data.intensity,
            notes=data.notes,
            date=workout_date
        )
        await workout.insert()

        result = workout.dict()
        result["_id"] = str(workout.id)
        return {"success": True, "message": "Workout logged successfully", "workout": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log workout: {str(e)}")


# ================= GET WORKOUT HISTORY =================

async def get_workout_history(user_id: str, limit: int = 30):
    try:
        workouts = await Workout.find(
            Workout.userId == user_id
        ).sort(-Workout.date).limit(limit).to_list()

        result = []
        for w in workouts:
            d = w.dict()
            d["_id"] = str(w.id)
            result.append(d)

        return {"success": True, "workouts": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch workouts: {str(e)}")


# ================= GET WEEKLY SUMMARY =================

async def get_weekly_summary(user_id: str):
    try:
        # Last 7 days
        week_ago = datetime.now() - timedelta(days=7)

        workouts = await Workout.find(
            Workout.userId == user_id,
            Workout.date >= week_ago
        ).sort(+Workout.date).to_list()

        # Aggregate stats
        total_workouts = len(workouts)
        total_duration = sum(w.duration for w in workouts)
        total_calories = sum(w.caloriesBurned for w in workouts)

        # Per day breakdown
        days = {}
        for w in workouts:
            day_key = w.date.strftime("%Y-%m-%d")
            if day_key not in days:
                days[day_key] = {"date": day_key, "duration": 0, "calories": 0, "workouts": []}
            days[day_key]["duration"] += w.duration
            days[day_key]["calories"] += w.caloriesBurned
            days[day_key]["workouts"].append(w.workoutType)

        # Workout type frequency
        type_count = {}
        for w in workouts:
            type_count[w.workoutType] = type_count.get(w.workoutType, 0) + 1

        most_done = max(type_count, key=type_count.get) if type_count else None

        # Streak calculation
        streak = 0
        check_date = datetime.now().date()
        all_dates = {w.date.date() for w in workouts}
        while check_date in all_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return {
            "success": True,
            "summary": {
                "totalWorkouts": total_workouts,
                "totalDuration": total_duration,
                "totalCalories": total_calories,
                "avgDuration": round(total_duration / total_workouts) if total_workouts else 0,
                "streak": streak,
                "mostDoneWorkout": most_done,
                "dailyBreakdown": list(days.values()),
                "workoutTypes": type_count
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get weekly summary: {str(e)}")


# ================= DELETE WORKOUT =================

async def delete_workout(workout_id: str, user_id: str):
    try:
        workout = await Workout.get(PydanticObjectId(workout_id))
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        if workout.userId != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        await workout.delete()
        return {"success": True, "message": "Workout deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete workout: {str(e)}")


# ================= AI WORKOUT SUGGESTIONS =================

async def get_workout_suggestions(data: WorkoutSuggestionRequest, user_id: str):
    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        # Get user profile for context
        bmi = data.bmi
        goal = data.goal
        try:
            user = await User.get(PydanticObjectId(user_id))
            if user:
                if not bmi and user.bmi:
                    bmi = user.bmi
                if not goal:
                    goal = (
                        "weight loss" if (bmi or 22) > 25 else
                        "weight gain" if (bmi or 22) < 18.5 else
                        "maintain weight"
                    )
        except Exception:
            pass

        if not bmi:
            bmi = 22.0
        if not goal:
            goal = "maintain weight"

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Indian fitness coach. Give practical, safe workout plans suitable for Indian lifestyle. Always consider health conditions."
                },
                {
                    "role": "user",
                    "content": f"""Create a personalized weekly workout plan for an Indian user.

USER PROFILE:
- BMI: {bmi}
- Goal: {goal}
- Fitness Level: {data.fitnessLevel}
- Available Time: {data.availableTime} minutes/day
- Medical Conditions: {data.diseases or "None"}

REQUIREMENTS:
1. 7-day workout plan (Monday to Sunday)
2. Include workout type, duration, intensity, and estimated calories burned
3. Mix cardio, strength, and flexibility exercises
4. Include Indian-friendly exercises (yoga, walking, cricket, etc.)
5. Rest days should have light activity like walking or yoga
6. Consider BMI and goal strictly
7. Keep it realistic for a beginner/intermediate Indian person

Return ONLY valid JSON without markdown:
{{
  "weeklyPlan": [
    {{
      "day": "Monday",
      "workouts": [
        {{
          "name": "Brisk Walking",
          "duration": 30,
          "intensity": "Medium",
          "caloriesBurned": 150,
          "description": "Walk at a brisk pace in your colony or park"
        }}
      ],
      "totalDuration": 30,
      "totalCalories": 150,
      "isRestDay": false
    }}
  ],
  "weeklyGoals": {{
    "totalWorkouts": 5,
    "totalDuration": 180,
    "totalCalories": 1200
  }},
  "tips": ["tip 1", "tip 2", "tip 3"],
  "warmupRoutine": "5-minute warmup description",
  "cooldownRoutine": "5-minute cooldown description"
}}"""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2000,
        )

        text = chat_completion.choices[0].message.content or ""
        text = text.replace("```json", "").replace("```", "").strip()

        try:
            suggestions = json.loads(text)
        except json.JSONDecodeError:
            # Fallback plan
            suggestions = _get_fallback_plan(bmi, goal, data.availableTime)

        return {"success": True, "suggestions": suggestions}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")


def _get_fallback_plan(bmi: float, goal: str, available_time: int):
    """Fallback workout plan if AI fails"""
    is_weight_loss = bmi > 25
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    rest_days = {2, 5}  # Wednesday, Saturday

    plan = []
    for i, day in enumerate(days):
        if i in rest_days:
            plan.append({
                "day": day,
                "workouts": [{"name": "Light Yoga / Stretching", "duration": 20, "intensity": "Low", "caloriesBurned": 60, "description": "Gentle stretching and breathing exercises"}],
                "totalDuration": 20,
                "totalCalories": 60,
                "isRestDay": True
            })
        else:
            if is_weight_loss:
                workouts = [
                    {"name": "Brisk Walking", "duration": min(available_time, 30), "intensity": "Medium", "caloriesBurned": 150, "description": "Walk at a brisk pace"},
                    {"name": "Bodyweight Squats", "duration": 10, "intensity": "Medium", "caloriesBurned": 80, "description": "3 sets of 15 squats"}
                ]
            else:
                workouts = [
                    {"name": "Yoga", "duration": min(available_time, 30), "intensity": "Low", "caloriesBurned": 100, "description": "Sun salutation and basic poses"},
                    {"name": "Light Jogging", "duration": 15, "intensity": "Low", "caloriesBurned": 90, "description": "Easy jog in the park"}
                ]
            total_dur = sum(w["duration"] for w in workouts)
            total_cal = sum(w["caloriesBurned"] for w in workouts)
            plan.append({"day": day, "workouts": workouts, "totalDuration": total_dur, "totalCalories": total_cal, "isRestDay": False})

    return {
        "weeklyPlan": plan,
        "weeklyGoals": {"totalWorkouts": 5, "totalDuration": 175, "totalCalories": 1150},
        "tips": ["Stay hydrated — drink water before and after workout", "Exercise in the morning for best results", "Consistency is more important than intensity"],
        "warmupRoutine": "5 minutes of light jogging in place + arm circles + leg swings",
        "cooldownRoutine": "5 minutes of slow walking + hamstring stretch + shoulder stretch"
    }
