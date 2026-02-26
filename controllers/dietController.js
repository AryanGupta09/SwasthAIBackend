import Diet from "../models/Diet.js";
import Groq from "groq-sdk";

/* ================= MEAL SWAP FEATURE ================= */
export const swapMeal = async (req, res) => {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const { 
      consumedFood, 
      consumedTime, 
      consumedCalories, 
      bmi, 
      foodPreference, 
      diseases,
      currentMealPlan 
    } = req.body;

    const goal =
      bmi > 25 ? "weight loss" :
      bmi < 18.5 ? "weight gain" :
      "maintain weight";

    // Define food restrictions
    let foodRestrictions = "";
    if (foodPreference === "Vegetarian") {
      foodRestrictions = "STRICTLY NO meat, chicken, fish, seafood, or any non-vegetarian items. Only vegetarian food allowed.";
    } else if (foodPreference === "Vegan") {
      foodRestrictions = "STRICTLY NO meat, chicken, fish, seafood, dairy products (milk, paneer, curd, ghee), eggs, or any animal products. Only plant-based vegan food allowed.";
    } else if (foodPreference === "Eggetarian") {
      foodRestrictions = "STRICTLY NO meat, chicken, fish, or seafood. Only vegetarian food and eggs are allowed. NO chicken or any meat products.";
    } else if (foodPreference === "Non-Vegetarian") {
      foodRestrictions = "Can include both vegetarian and non-vegetarian items like chicken, fish, eggs, etc.";
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert Indian nutritionist specializing in meal adjustments. You help users balance their diet when they consume unhealthy or unplanned meals.`
        },
        {
          role: "user",
          content: `A user has consumed an unplanned/unhealthy meal. Adjust their remaining meals for the day to compensate.

USER DETAILS:
- BMI: ${bmi}
- Goal: ${goal}
- Food Preference: ${foodPreference}
- FOOD RESTRICTIONS: ${foodRestrictions}
- Medical Conditions: ${diseases || "None"}

CONSUMED MEAL:
- Food: ${consumedFood}
- Time: ${consumedTime}
- Estimated Calories: ${consumedCalories || "Unknown"}

ORIGINAL MEAL PLAN:
${JSON.stringify(currentMealPlan, null, 2)}

TASK:
1. Analyze the consumed meal's nutritional impact
2. Determine which upcoming meals need adjustment
3. Suggest lighter/healthier alternatives for remaining meals to balance the day
4. Maintain the food preference restrictions strictly
5. Provide 3 adjusted options for each remaining meal

Return ONLY valid JSON without any markdown formatting:
{
  "analysis": "Brief analysis of consumed meal impact",
  "adjustedMeals": {
    "breakfast": ["option 1", "option 2", "option 3"] or null if already consumed,
    "lunch": ["option 1", "option 2", "option 3"] or null if already consumed,
    "snacks": ["option 1", "option 2", "option 3"],
    "dinner": ["option 1", "option 2", "option 3"]
  },
  "recommendations": "Brief tips to stay on track"
}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    let text = chatCompletion.choices[0]?.message?.content || "";
    text = text.replace(/```json|```/g, "").trim();

    let response;
    try {
      response = JSON.parse(text);
    } catch (parseError) {
      console.log("Parse error in meal swap, using fallback");
      response = {
        analysis: "Your consumed meal was higher in calories. We've adjusted your remaining meals to lighter options.",
        adjustedMeals: {
          breakfast: null,
          lunch: null,
          snacks: [
            "Green Tea + 5-6 Almonds",
            "1 Apple + Herbal Tea",
            "Cucumber Salad (1 bowl)"
          ],
          dinner: [
            "1 Roti + Clear Soup + Salad",
            "Grilled Vegetables (1 bowl) + Curd",
            "Moong Dal Khichdi (small bowl) + Salad"
          ]
        },
        recommendations: "Drink plenty of water, avoid sugary drinks, and try light exercise like walking."
      };
    }

    res.json(response);

  } catch (error) {
    console.error("Meal Swap Error:", error.message);
    res.status(500).json({ 
      message: "Meal swap failed",
      error: error.message 
    });
  }
};

export const generateDiet = async (req, res) => {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const { bmi, foodPreference, diseases, weight, height, age, gender, activityLevel } = req.body;

    const goal =
      bmi > 25 ? "weight loss" :
      bmi < 18.5 ? "weight gain" :
      "maintain weight";

    // Calculate daily protein requirement
    // Formula: Based on activity level and goal
    let proteinPerKg = 1.2; // Default moderate activity
    
    if (goal === "weight loss") {
      proteinPerKg = 1.6; // Higher protein for weight loss
    } else if (goal === "weight gain") {
      proteinPerKg = 1.8; // Higher protein for muscle gain
    }
    
    const dailyProtein = weight ? Math.round(weight * proteinPerKg) : 60; // Default 60g if weight not provided

    // Define food restrictions based on preference
    let foodRestrictions = "";
    if (foodPreference === "Vegetarian") {
      foodRestrictions = "STRICTLY NO meat, chicken, fish, seafood, or any non-vegetarian items. Only vegetarian food allowed.";
    } else if (foodPreference === "Vegan") {
      foodRestrictions = "STRICTLY NO meat, chicken, fish, seafood, dairy products (milk, paneer, curd, ghee), eggs, or any animal products. Only plant-based vegan food allowed.";
    } else if (foodPreference === "Eggetarian") {
      foodRestrictions = "STRICTLY NO meat, chicken, fish, or seafood. Only vegetarian food and eggs are allowed. NO chicken or any meat products.";
    } else if (foodPreference === "Non-Vegetarian") {
      foodRestrictions = "Can include both vegetarian and non-vegetarian items like chicken, fish, eggs, etc.";
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert Indian nutritionist. You MUST strictly follow the food preference guidelines provided. Never suggest foods that violate the dietary restrictions. Always include protein content for each meal option.`
        },
        {
          role: "user",
          content: `Create a 1-day Indian diet plan with the following requirements:

BMI: ${bmi}
Goal: ${goal}
Food Preference: ${foodPreference}
FOOD RESTRICTIONS: ${foodRestrictions}
Medical Conditions: ${diseases || "None"}
Daily Protein Target: ${dailyProtein}g

IMPORTANT RULES:
1. ${foodRestrictions}
2. Suggest only Indian meals with proper portions
3. Include traditional Indian foods like roti, rice, dal, sabzi, etc.
4. Mention specific quantities (e.g., 2 roti, 1 bowl dal)
5. Consider the BMI and health goal while planning calories
6. If diseases are mentioned, avoid foods that may worsen those conditions
7. Provide 3-4 different options for EACH meal time so user has variety
8. MUST include approximate protein content (in grams) for each meal option
9. Total daily protein should be around ${dailyProtein}g

Return ONLY valid JSON without any markdown formatting or code blocks:
{
 "dailyProteinTarget": ${dailyProtein},
 "breakfast": [
   {"meal": "option 1 with quantities", "protein": 15},
   {"meal": "option 2 with quantities", "protein": 18},
   {"meal": "option 3 with quantities", "protein": 12}
 ],
 "lunch": [
   {"meal": "option 1 with quantities", "protein": 25},
   {"meal": "option 2 with quantities", "protein": 28},
   {"meal": "option 3 with quantities", "protein": 22}
 ],
 "snacks": [
   {"meal": "option 1 with quantities", "protein": 8},
   {"meal": "option 2 with quantities", "protein": 10},
   {"meal": "option 3 with quantities", "protein": 6}
 ],
 "dinner": [
   {"meal": "option 1 with quantities", "protein": 20},
   {"meal": "option 2 with quantities", "protein": 22},
   {"meal": "option 3 with quantities", "protein": 18}
 ]
}

Example for Eggetarian:
{
 "dailyProteinTarget": 80,
 "breakfast": [
   {"meal": "2 Boiled Eggs + 2 Brown Bread Toast + Tea", "protein": 16},
   {"meal": "Egg Omelette (2 eggs) + 2 Roti + Tea", "protein": 18},
   {"meal": "Poha (1 bowl) + 1 Boiled Egg + Tea", "protein": 10}
 ],
 "lunch": [
   {"meal": "2 Roti + 1 bowl Dal + Sabzi + Salad", "protein": 22},
   {"meal": "1 bowl Rice + Rajma + Salad + Curd", "protein": 25},
   {"meal": "3 Roti + Mix Veg + Dal + Raita", "protein": 24}
 ],
 "snacks": [
   {"meal": "1 bowl Fruits + 10-12 Almonds", "protein": 6},
   {"meal": "1 Boiled Egg + Green Tea + 5-6 Biscuits", "protein": 8},
   {"meal": "Sprouts Chaat (1 bowl) + Tea", "protein": 10}
 ],
 "dinner": [
   {"meal": "Egg Bhurji (2 eggs) + 2 Roti + Curd", "protein": 20},
   {"meal": "2 Roti + Paneer Sabzi + Salad", "protein": 22},
   {"meal": "Khichdi (1 bowl) + Curd + Papad", "protein": 15}
 ]
}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });

    let text = chatCompletion.choices[0]?.message?.content || "";
    
    // Clean response
    text = text.replace(/```json|```/g, "").trim();

    let mealsData;
    try {
      mealsData = JSON.parse(text);
      
      // Validate that meals don't contain restricted items
      const mealsText = JSON.stringify(mealsData).toLowerCase();
      
      if (foodPreference === "Vegetarian" || foodPreference === "Eggetarian") {
        const nonVegItems = ["chicken", "mutton", "fish", "seafood", "meat", "prawn", "crab"];
        const foundNonVeg = nonVegItems.find(item => mealsText.includes(item));
        
        if (foundNonVeg) {
          console.log(`Warning: Found ${foundNonVeg} in ${foodPreference} diet, using fallback`);
          throw new Error("Invalid food items detected");
        }
      }
      
      if (foodPreference === "Vegan") {
        const nonVeganItems = ["chicken", "mutton", "fish", "egg", "paneer", "curd", "milk", "ghee", "butter", "cheese"];
        const foundNonVegan = nonVeganItems.find(item => mealsText.includes(item));
        
        if (foundNonVegan) {
          console.log(`Warning: Found ${foundNonVegan} in Vegan diet, using fallback`);
          throw new Error("Invalid food items detected");
        }
      }
      
    } catch (parseError) {
      console.log("Parse error or validation failed, using fallback");
      
      // Fallback meals based on preference with protein content
      if (foodPreference === "Vegetarian") {
        mealsData = {
          dailyProteinTarget: dailyProtein,
          breakfast: [
            {meal: "Poha (1 bowl) + Tea", protein: 8},
            {meal: "2 Paratha + Curd + Pickle", protein: 12},
            {meal: "Upma (1 bowl) + Coconut Chutney + Tea", protein: 10}
          ],
          lunch: [
            {meal: "2 Roti + Dal (1 bowl) + Mix Veg Sabzi + Salad", protein: 20},
            {meal: "1 bowl Rice + Rajma + Salad + Curd", protein: 22},
            {meal: "3 Roti + Paneer Sabzi + Dal + Raita", protein: 25}
          ],
          snacks: [
            {meal: "Fruits (1 bowl) + Nuts (10-12 almonds)", protein: 6},
            {meal: "Samosa (1) + Green Tea", protein: 4},
            {meal: "Sprouts Chaat (1 bowl) + Tea", protein: 10}
          ],
          dinner: [
            {meal: "2 Roti + Paneer Sabzi + Curd (1 bowl)", protein: 22},
            {meal: "Khichdi (1 bowl) + Curd + Papad", protein: 15},
            {meal: "2 Roti + Dal Fry + Sabzi + Salad", protein: 18}
          ]
        };
      } else if (foodPreference === "Eggetarian") {
        mealsData = {
          dailyProteinTarget: dailyProtein,
          breakfast: [
            {meal: "2 Boiled Eggs + 2 Brown Bread Toast + Tea", protein: 16},
            {meal: "Egg Omelette (2 eggs) + 2 Roti + Tea", protein: 18},
            {meal: "Poha (1 bowl) + 1 Boiled Egg + Tea", protein: 10}
          ],
          lunch: [
            {meal: "2 Roti + Dal (1 bowl) + Sabzi + Salad", protein: 20},
            {meal: "1 bowl Rice + Rajma + Salad + Curd", protein: 22},
            {meal: "3 Roti + Mix Veg + Dal + Raita", protein: 24}
          ],
          snacks: [
            {meal: "Fruits (1 bowl) + Boiled Egg (1)", protein: 8},
            {meal: "Egg Sandwich (2 eggs) + Green Tea", protein: 14},
            {meal: "Sprouts Chaat (1 bowl) + Tea", protein: 10}
          ],
          dinner: [
            {meal: "Egg Bhurji (2 eggs) + 2 Roti + Curd", protein: 20},
            {meal: "2 Roti + Paneer Sabzi + Salad", protein: 22},
            {meal: "Khichdi (1 bowl) + Boiled Egg + Curd", protein: 18}
          ]
        };
      } else if (foodPreference === "Vegan") {
        mealsData = {
          dailyProteinTarget: dailyProtein,
          breakfast: [
            {meal: "Oats (1 bowl) with Almond Milk + Fruits", protein: 10},
            {meal: "Poha (1 bowl) + Tea (no milk)", protein: 8},
            {meal: "Upma (1 bowl) + Coconut Chutney", protein: 9}
          ],
          lunch: [
            {meal: "2 Roti + Dal (1 bowl) + Veg Sabzi + Salad", protein: 18},
            {meal: "Brown Rice (1 bowl) + Rajma + Salad", protein: 20},
            {meal: "3 Roti + Chana Masala + Salad", protein: 22}
          ],
          snacks: [
            {meal: "Fruits (1 bowl) + Nuts (15-20)", protein: 8},
            {meal: "Roasted Chana (1 bowl) + Tea", protein: 12},
            {meal: "Sprouts Salad (1 bowl)", protein: 10}
          ],
          dinner: [
            {meal: "Brown Rice (1 bowl) + Rajma + Salad", protein: 18},
            {meal: "2 Roti + Dal + Sabzi", protein: 16},
            {meal: "Khichdi (1 bowl) + Salad", protein: 14}
          ]
        };
      } else {
        mealsData = {
          dailyProteinTarget: dailyProtein,
          breakfast: [
            {meal: "2 Boiled Eggs + 2 Bread Toast + Tea", protein: 16},
            {meal: "Chicken Sandwich (100g) + Tea", protein: 25},
            {meal: "Egg Omelette (2 eggs) + 2 Roti", protein: 18}
          ],
          lunch: [
            {meal: "2 Roti + Chicken Curry (100g) + Salad", protein: 30},
            {meal: "1 bowl Rice + Fish Curry (100g) + Salad", protein: 28},
            {meal: "3 Roti + Mutton Curry (100g) + Raita", protein: 32}
          ],
          snacks: [
            {meal: "Fruits (1 bowl) + Nuts (10-12)", protein: 6},
            {meal: "Boiled Eggs (2) + Green Tea", protein: 12},
            {meal: "Chicken Soup (1 bowl)", protein: 15}
          ],
          dinner: [
            {meal: "2 Roti + Fish Curry (100g) + Curd", protein: 28},
            {meal: "2 Roti + Chicken Tikka (100g) + Salad", protein: 30},
            {meal: "1 bowl Rice + Egg Curry (2 eggs) + Salad", protein: 22}
          ]
        };
      }
    }

    const diet = await Diet.create({
      userId: req.userId,
      bmi,
      goal,
      meals: mealsData,
      dailyProteinTarget: mealsData.dailyProteinTarget || dailyProtein
    });

    // Save latest diet plan to user profile
    try {
      const User = (await import("../models/User.js")).default;
      await User.findByIdAndUpdate(req.userId, {
        latestDietPlan: {
          meals: mealsData,
          bmi: bmi,
          goal: goal,
          dailyProteinTarget: mealsData.dailyProteinTarget || dailyProtein,
          createdAt: new Date()
        }
      });
      console.log("Latest diet plan saved to user profile");
    }

    res.json(diet);

  } catch (error) {
    console.error("Groq Error:", error.message);
    res.status(500).json({ 
      message: "Diet generation failed",
      error: error.message 
    });
  }
};