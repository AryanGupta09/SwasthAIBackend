import os
import json
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, List
from groq import Groq
from beanie import PydanticObjectId
from models.diet import Diet, MealsData
from models.user import User, LatestDietPlan
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()


# ================= REQUEST SCHEMAS =================

class GenerateDietRequest(BaseModel):
    bmi: float
    foodPreference: str
    diseases: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activityLevel: Optional[str] = None


class SwapMealRequest(BaseModel):
    consumedFood: str
    consumedTime: str
    consumedCalories: Optional[str] = None
    bmi: float
    foodPreference: str
    diseases: Optional[str] = None
    currentMealPlan: Optional[dict] = None


# ================= HELPER =================

def get_food_restrictions(food_preference: str) -> str:
    restrictions = {
        "Vegetarian": "STRICTLY NO meat, chicken, fish, seafood, or any non-vegetarian items. Only vegetarian food allowed.",
        "Vegan": "STRICTLY NO meat, chicken, fish, seafood, dairy products (milk, paneer, curd, ghee), eggs, or any animal products. Only plant-based vegan food allowed.",
        "Eggetarian": "STRICTLY NO meat, chicken, fish, or seafood. Only vegetarian food and eggs are allowed. NO chicken or any meat products.",
        "Non-Vegetarian": "Can include both vegetarian and non-vegetarian items like chicken, fish, eggs, etc."
    }
    return restrictions.get(food_preference, "")


def get_fallback_meals(food_preference: str, daily_protein: int) -> dict:
    if food_preference == "Vegetarian":
        return {
            "dailyProteinTarget": daily_protein,
            "breakfast": [
                {"meal": "Poha (1 bowl) + Tea", "protein": 8},
                {"meal": "2 Paratha + Curd + Pickle", "protein": 12},
                {"meal": "Upma (1 bowl) + Coconut Chutney + Tea", "protein": 10}
            ],
            "lunch": [
                {"meal": "2 Roti + Dal (1 bowl) + Mix Veg Sabzi + Salad", "protein": 20},
                {"meal": "1 bowl Rice + Rajma + Salad + Curd", "protein": 22},
                {"meal": "3 Roti + Paneer Sabzi + Dal + Raita", "protein": 25}
            ],
            "snacks": [
                {"meal": "Fruits (1 bowl) + Nuts (10-12 almonds)", "protein": 6},
                {"meal": "Samosa (1) + Green Tea", "protein": 4},
                {"meal": "Sprouts Chaat (1 bowl) + Tea", "protein": 10}
            ],
            "dinner": [
                {"meal": "2 Roti + Paneer Sabzi + Curd (1 bowl)", "protein": 22},
                {"meal": "Khichdi (1 bowl) + Curd + Papad", "protein": 15},
                {"meal": "2 Roti + Dal Fry + Sabzi + Salad", "protein": 18}
            ]
        }
    elif food_preference == "Eggetarian":
        return {
            "dailyProteinTarget": daily_protein,
            "breakfast": [
                {"meal": "2 Boiled Eggs + 2 Brown Bread Toast + Tea", "protein": 16},
                {"meal": "Egg Omelette (2 eggs) + 2 Roti + Tea", "protein": 18},
                {"meal": "Poha (1 bowl) + 1 Boiled Egg + Tea", "protein": 10}
            ],
            "lunch": [
                {"meal": "2 Roti + Dal (1 bowl) + Sabzi + Salad", "protein": 20},
                {"meal": "1 bowl Rice + Rajma + Salad + Curd", "protein": 22},
                {"meal": "3 Roti + Mix Veg + Dal + Raita", "protein": 24}
            ],
            "snacks": [
                {"meal": "Fruits (1 bowl) + Boiled Egg (1)", "protein": 8},
                {"meal": "Egg Sandwich (2 eggs) + Green Tea", "protein": 14},
                {"meal": "Sprouts Chaat (1 bowl) + Tea", "protein": 10}
            ],
            "dinner": [
                {"meal": "Egg Bhurji (2 eggs) + 2 Roti + Curd", "protein": 20},
                {"meal": "2 Roti + Paneer Sabzi + Salad", "protein": 22},
                {"meal": "Khichdi (1 bowl) + Boiled Egg + Curd", "protein": 18}
            ]
        }
    elif food_preference == "Vegan":
        return {
            "dailyProteinTarget": daily_protein,
            "breakfast": [
                {"meal": "Oats (1 bowl) with Almond Milk + Fruits", "protein": 10},
                {"meal": "Poha (1 bowl) + Tea (no milk)", "protein": 8},
                {"meal": "Upma (1 bowl) + Coconut Chutney", "protein": 9}
            ],
            "lunch": [
                {"meal": "2 Roti + Dal (1 bowl) + Veg Sabzi + Salad", "protein": 18},
                {"meal": "Brown Rice (1 bowl) + Rajma + Salad", "protein": 20},
                {"meal": "3 Roti + Chana Masala + Salad", "protein": 22}
            ],
            "snacks": [
                {"meal": "Fruits (1 bowl) + Nuts (15-20)", "protein": 8},
                {"meal": "Roasted Chana (1 bowl) + Tea", "protein": 12},
                {"meal": "Sprouts Salad (1 bowl)", "protein": 10}
            ],
            "dinner": [
                {"meal": "Brown Rice (1 bowl) + Rajma + Salad", "protein": 18},
                {"meal": "2 Roti + Dal + Sabzi", "protein": 16},
                {"meal": "Khichdi (1 bowl) + Salad", "protein": 14}
            ]
        }
    else:  # Non-Vegetarian
        return {
            "dailyProteinTarget": daily_protein,
            "breakfast": [
                {"meal": "2 Boiled Eggs + 2 Bread Toast + Tea", "protein": 16},
                {"meal": "Chicken Sandwich (100g) + Tea", "protein": 25},
                {"meal": "Egg Omelette (2 eggs) + 2 Roti", "protein": 18}
            ],
            "lunch": [
                {"meal": "2 Roti + Chicken Curry (100g) + Salad", "protein": 30},
                {"meal": "1 bowl Rice + Fish Curry (100g) + Salad", "protein": 28},
                {"meal": "3 Roti + Mutton Curry (100g) + Raita", "protein": 32}
            ],
            "snacks": [
                {"meal": "Fruits (1 bowl) + Nuts (10-12)", "protein": 6},
                {"meal": "Boiled Eggs (2) + Green Tea", "protein": 12},
                {"meal": "Chicken Soup (1 bowl)", "protein": 15}
            ],
            "dinner": [
                {"meal": "2 Roti + Fish Curry (100g) + Curd", "protein": 28},
                {"meal": "2 Roti + Chicken Tikka (100g) + Salad", "protein": 30},
                {"meal": "1 bowl Rice + Egg Curry (2 eggs) + Salad", "protein": 22}
            ]
        }


# ================= GENERATE DIET =================

async def generate_diet(data: GenerateDietRequest, user_id: str):
    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        goal = (
            "weight loss" if data.bmi > 25 else
            "weight gain" if data.bmi < 18.5 else
            "maintain weight"
        )

        # Daily protein calculate karo
        protein_per_kg = 1.6 if goal == "weight loss" else 1.8 if goal == "weight gain" else 1.2
        daily_protein = round(data.weight * protein_per_kg) if data.weight else 60

        food_restrictions = get_food_restrictions(data.foodPreference)

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Indian nutritionist. You MUST strictly follow the food preference guidelines provided. Never suggest foods that violate the dietary restrictions. Always include protein content for each meal option."
                },
                {
                    "role": "user",
                    "content": f"""Create a 1-day Indian diet plan with the following requirements:

BMI: {data.bmi}
Goal: {goal}
Food Preference: {data.foodPreference}
FOOD RESTRICTIONS: {food_restrictions}
Medical Conditions: {data.diseases or "None"}
Daily Protein Target: {daily_protein}g

IMPORTANT RULES:
1. {food_restrictions}
2. Suggest only Indian meals with proper portions
3. Include traditional Indian foods like roti, rice, dal, sabzi, etc.
4. Mention specific quantities (e.g., 2 roti, 1 bowl dal)
5. Consider the BMI and health goal while planning calories
6. If diseases are mentioned, avoid foods that may worsen those conditions
7. Provide 3-4 different options for EACH meal time so user has variety
8. MUST include approximate protein content (in grams) for each meal option
9. Total daily protein should be around {daily_protein}g

Return ONLY valid JSON without any markdown formatting or code blocks:
{{
 "dailyProteinTarget": {daily_protein},
 "breakfast": [
   {{"meal": "option 1 with quantities", "protein": 15}},
   {{"meal": "option 2 with quantities", "protein": 18}},
   {{"meal": "option 3 with quantities", "protein": 12}}
 ],
 "lunch": [
   {{"meal": "option 1 with quantities", "protein": 25}},
   {{"meal": "option 2 with quantities", "protein": 28}},
   {{"meal": "option 3 with quantities", "protein": 22}}
 ],
 "snacks": [
   {{"meal": "option 1 with quantities", "protein": 8}},
   {{"meal": "option 2 with quantities", "protein": 10}},
   {{"meal": "option 3 with quantities", "protein": 6}}
 ],
 "dinner": [
   {{"meal": "option 1 with quantities", "protein": 20}},
   {{"meal": "option 2 with quantities", "protein": 22}},
   {{"meal": "option 3 with quantities", "protein": 18}}
 ]
}}"""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1500,
        )

        text = chat_completion.choices[0].message.content or ""
        text = text.replace("```json", "").replace("```", "").strip()

        try:
            meals_data = json.loads(text)

            # Validate food restrictions
            meals_text = json.dumps(meals_data).lower()
            if data.foodPreference in ["Vegetarian", "Eggetarian"]:
                non_veg_items = ["chicken", "mutton", "fish", "seafood", "meat", "prawn", "crab"]
                for item in non_veg_items:
                    if item in meals_text:
                        raise ValueError(f"Invalid food item detected: {item}")

            if data.foodPreference == "Vegan":
                non_vegan_items = ["chicken", "mutton", "fish", "egg", "paneer", "curd", "milk", "ghee", "butter", "cheese"]
                for item in non_vegan_items:
                    if item in meals_text:
                        raise ValueError(f"Invalid food item detected: {item}")

        except (json.JSONDecodeError, ValueError) as e:
            print(f"Parse/validation error, using fallback: {e}")
            meals_data = get_fallback_meals(data.foodPreference, daily_protein)

        # Diet DB mein save karo
        diet = Diet(
            userId=user_id,
            bmi=data.bmi,
            goal=goal,
            dailyProteinTarget=meals_data.get("dailyProteinTarget", daily_protein),
            meals=MealsData(**meals_data)
        )
        await diet.insert()

        # User ke profile mein latest diet plan save karo
        try:
            user = await User.get(PydanticObjectId(user_id))
            if user:
                user.latestDietPlan = LatestDietPlan(
                    meals=meals_data,   # dict directly pass karo
                    bmi=data.bmi,
                    goal=goal,
                    dailyProteinTarget=meals_data.get("dailyProteinTarget", daily_protein),
                    createdAt=datetime.now()
                )
                await user.save()
                print("✅ Latest diet plan saved to user profile")
        except Exception as ue:
            print(f"Warning: Could not update user latestDietPlan: {ue}")

        result = diet.dict()
        result["_id"] = str(diet.id)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diet generation failed: {str(e)}")


# ================= MEAL SWAP =================

async def swap_meal(data: SwapMealRequest, user_id: str):
    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        goal = (
            "weight loss" if data.bmi > 25 else
            "weight gain" if data.bmi < 18.5 else
            "maintain weight"
        )

        food_restrictions = get_food_restrictions(data.foodPreference)

        # Time ke basis pe already consumed meals determine karo
        consumed_time = data.consumedTime.lower()

        if "morning" in consumed_time and "late" not in consumed_time:
            # 6 AM - 10 AM → breakfast time
            already_consumed = ["breakfast"]
            remaining = ["lunch", "snacks", "dinner"]
        elif "late morning" in consumed_time:
            # 10 AM - 12 PM → breakfast already done
            already_consumed = ["breakfast"]
            remaining = ["lunch", "snacks", "dinner"]
        elif "afternoon" in consumed_time:
            # 12 PM - 3 PM → breakfast + lunch done
            already_consumed = ["breakfast", "lunch"]
            remaining = ["snacks", "dinner"]
        elif "evening" in consumed_time:
            # 3 PM - 6 PM → breakfast + lunch + snacks done
            already_consumed = ["breakfast", "lunch", "snacks"]
            remaining = ["dinner"]
        elif "night" in consumed_time and "late" not in consumed_time:
            # 6 PM - 10 PM → all except dinner done
            already_consumed = ["breakfast", "lunch", "snacks"]
            remaining = ["dinner"]
        elif "late night" in consumed_time:
            # 10 PM+ → all meals done
            already_consumed = ["breakfast", "lunch", "snacks", "dinner"]
            remaining = []
        else:
            already_consumed = []
            remaining = ["breakfast", "lunch", "snacks", "dinner"]

        already_consumed_str = ", ".join(already_consumed) if already_consumed else "none"
        remaining_str = ", ".join(remaining) if remaining else "none"

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Indian nutritionist specializing in meal adjustments. You help users balance their diet when they consume unhealthy or unplanned meals. Always follow the time-based meal rules strictly."
                },
                {
                    "role": "user",
                    "content": f"""A user consumed an unhealthy/unplanned meal. Adjust ONLY the remaining meals for the day.

USER DETAILS:
- BMI: {data.bmi}
- Goal: {goal}
- Food Preference: {data.foodPreference}
- FOOD RESTRICTIONS: {food_restrictions}
- Medical Conditions: {data.diseases or "None"}

CONSUMED MEAL:
- Food: {data.consumedFood}
- Time: {data.consumedTime}
- Estimated Calories: {data.consumedCalories or "Unknown"}

TIME-BASED MEAL STATUS:
- Already consumed meals (set to null): {already_consumed_str}
- Remaining meals to adjust: {remaining_str}

ORIGINAL MEAL PLAN:
{json.dumps(data.currentMealPlan, indent=2)}

STRICT RULES:
1. Set EXACTLY these meals to null (already consumed): {already_consumed_str}
2. Provide 3 lighter options ONLY for remaining meals: {remaining_str}
3. If remaining meals list is empty, set all to null
4. Follow food preference restrictions strictly

Return ONLY valid JSON without any markdown:
{{
  "analysis": "Brief analysis of consumed meal impact",
  "adjustedMeals": {{
    "breakfast": null if in already_consumed else ["option 1", "option 2", "option 3"],
    "lunch": null if in already_consumed else ["option 1", "option 2", "option 3"],
    "snacks": null if in already_consumed else ["option 1", "option 2", "option 3"],
    "dinner": null if in already_consumed else ["option 1", "option 2", "option 3"]
  }},
  "recommendations": "Brief tips to stay on track"
}}"""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
        )

        text = chat_completion.choices[0].message.content or ""
        text = text.replace("```json", "").replace("```", "").strip()

        try:
            response = json.loads(text)

            # Backend-side validation — already consumed meals ko force null karo
            for meal in already_consumed:
                if meal in response.get("adjustedMeals", {}):
                    response["adjustedMeals"][meal] = None

            # Remaining meals mein null nahi hona chahiye
            for meal in remaining:
                if meal in response.get("adjustedMeals", {}):
                    if response["adjustedMeals"][meal] is None:
                        # Fallback options de do
                        response["adjustedMeals"][meal] = [
                            "Light salad with lemon dressing",
                            "1 bowl vegetable soup",
                            "1 fruit + herbal tea"
                        ]

        except json.JSONDecodeError:
            # Fallback with correct time-based nulls
            adjusted = {
                "breakfast": None if "breakfast" in already_consumed else ["Poha (1 bowl) + Tea", "Upma (1 bowl) + Tea", "2 Roti + Curd"],
                "lunch": None if "lunch" in already_consumed else ["Dal + 1 Roti + Salad", "Khichdi (small bowl) + Curd", "Vegetable soup + 1 Roti"],
                "snacks": None if "snacks" in already_consumed else ["Green Tea + 5-6 Almonds", "1 Apple + Herbal Tea", "Cucumber Salad (1 bowl)"],
                "dinner": None if "dinner" in already_consumed else ["1 Roti + Clear Soup + Salad", "Grilled Vegetables + Curd", "Moong Dal Khichdi (small bowl)"]
            }
            response = {
                "analysis": "Your consumed meal was higher in calories. Adjusted remaining meals to lighter options.",
                "adjustedMeals": adjusted,
                "recommendations": "Drink plenty of water, avoid sugary drinks, and try light exercise like walking."
            }

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meal swap failed: {str(e)}")
