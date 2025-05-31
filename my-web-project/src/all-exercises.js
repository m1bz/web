const allExercises = [
    // Chest
    { id: "bench-press", name: "Bench Press", type: "chest", difficulty: "Intermediate", description: "Classic chest exercise using barbell." },
    { id: "push-ups", name: "Push-ups", type: "chest", difficulty: "Beginner", description: "Bodyweight exercise for chest." },
    { id: "dumbbell-flyes", name: "Dumbbell Flyes", type: "chest", difficulty: "Intermediate", description: "Isolation exercise for chest." },
    { id: "incline-bench-press", name: "Incline Bench Press", type: "chest", difficulty: "Intermediate", description: "Upper chest focus." },
    { id: "decline-bench-press", name: "Decline Bench Press", type: "chest", difficulty: "Advanced", description: "Lower chest focus." },

    // Back
    { id: "pull-ups", name: "Pull-ups", type: "back", difficulty: "Intermediate", description: "Upper back and lats." },
    { id: "barbell-rows", name: "Barbell Rows", type: "back", difficulty: "Intermediate", description: "Middle back strength." },
    { id: "lat-pulldowns", name: "Lat Pulldowns", type: "back", difficulty: "Beginner", description: "Latissimus dorsi focus." },
    { id: "deadlifts", name: "Deadlifts", type: "back", difficulty: "Advanced", description: "Full back and leg development." }, // Also legs
    { id: "face-pulls", name: "Face Pulls", type: "back", difficulty: "Beginner", description: "Rear deltoids and upper back." },
    { id: "seated-cable-rows", name: "Seated Cable Rows", type: "back", difficulty: "Beginner", description: "Targets the middle back." },
    { id: "t-bar-rows", name: "T-Bar Rows", type: "back", difficulty: "Intermediate", description: "Builds thickness in the back." },

    // Legs
    { id: "squats", name: "Squats", type: "legs", difficulty: "Intermediate", description: "Quad, glute, and hamstring focus." },
    // Deadlifts already listed under back, but it's a key leg exercise too.
    { id: "lunges", name: "Lunges", type: "legs", difficulty: "Beginner", description: "Unilateral leg exercise." },
    { id: "leg-press", name: "Leg Press", type: "legs", difficulty: "Beginner", description: "Machine-based leg exercise." },
    { id: "calf-raises", name: "Calf Raises", type: "legs", difficulty: "Beginner", description: "Calf muscle isolation." },
    { id: "romanian-deadlifts", name: "Romanian Deadlifts", type: "legs", difficulty: "Intermediate", description: "Hamstring and glute focus." },
    { id: "leg-curls", name: "Leg Curls", type: "legs", difficulty: "Beginner", description: "Hamstring isolation." },
    { id: "leg-extensions", name: "Leg Extensions", type: "legs", difficulty: "Beginner", description: "Quadriceps isolation." },

    // Shoulders
    { id: "overhead-press", name: "Overhead Press", type: "shoulders", difficulty: "Intermediate", description: "Shoulder strength builder." },
    { id: "lateral-raises", name: "Lateral Raises", type: "shoulders", difficulty: "Beginner", description: "Side deltoid focus." },
    { id: "front-raises", name: "Front Raises", type: "shoulders", difficulty: "Beginner", description: "Front deltoid focus." },
    // Face Pulls already listed under back, good for rear delts.
    { id: "arnold-press", name: "Arnold Press", type: "shoulders", difficulty: "Intermediate", description: "Rotating shoulder press." },
    { id: "shrugs", name: "Shrugs", type: "shoulders", difficulty: "Beginner", description: "Targets the trapezius muscles." },

    // Arms
    { id: "bicep-curls", name: "Bicep Curls", type: "arms", difficulty: "Beginner", description: "Bicep isolation." },
    { id: "tricep-extensions", name: "Tricep Extensions", type: "arms", difficulty: "Beginner", description: "Tricep isolation (e.g., overhead dumbbell extension)." },
    { id: "hammer-curls", name: "Hammer Curls", type: "arms", difficulty: "Beginner", description: "Forearm and bicep focus." },
    { id: "skullcrushers", name: "Skullcrushers", type: "arms", difficulty: "Intermediate", description: "Tricep strength builder with EZ bar or dumbbells." },
    { id: "preacher-curls", name: "Preacher Curls", type: "arms", difficulty: "Intermediate", description: "Bicep isolation with support." },
    { id: "tricep-dips", name: "Tricep Dips", type: "arms", difficulty: "Intermediate", description: "Bodyweight tricep exercise." },
    { id: "concentration-curls", name: "Concentration Curls", type: "arms", difficulty: "Beginner", description: "Strict bicep isolation." },
    { id: "close-grip-bench-press", name: "Close-Grip Bench Press", type: "arms", difficulty: "Intermediate", description: "Tricep focused compound press." },


    // Core
    { id: "crunches", name: "Crunches", type: "core", difficulty: "Beginner", description: "Basic abdominal exercise." },
    { id: "planks", name: "Planks", type: "core", difficulty: "Beginner", description: "Core stability exercise." },
    { id: "russian-twists", name: "Russian Twists", type: "core", difficulty: "Intermediate", description: "Oblique focus." },
    { id: "leg-raises", name: "Leg Raises", type: "core", difficulty: "Intermediate", description: "Lower abdominal focus." },
    { id: "mountain-climbers", name: "Mountain Climbers", type: "core", difficulty: "Intermediate", description: "Dynamic core exercise." },
    { id: "hanging-leg-raises", name: "Hanging Leg Raises", type: "core", difficulty: "Advanced", description: "Advanced lower ab and hip flexor exercise." },
    { id: "cable-crunches", name: "Cable Crunches", type: "core", difficulty: "Intermediate", description: "Weighted abdominal exercise." }
];

// Function to get all exercises (can be used by other scripts)
function getAllExercises() {
    return allExercises;
}

// If using modules in the future, you might export it:
// export { allExercises, getAllExercises }; 