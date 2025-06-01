document.addEventListener('DOMContentLoaded', () => {
    // Exercise database organized by body parts
    const exerciseDatabase = {
        shoulders: [
            {
                name: "Shoulder Press",
                instructions: [
                    "Sit or stand with dumbbells at shoulder height",
                    "Press weights overhead until arms are fully extended",
                    "Lower weights back to shoulder height",
                    "Repeat for desired reps"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Lateral Raises",
                instructions: [
                    "Stand with dumbbells at your sides",
                    "Raise arms out to the sides until parallel to floor",
                    "Lower weights slowly back to starting position",
                    "Keep slight bend in elbows throughout movement"
                ],
                difficulty: "Beginner",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Front Raises",
                instructions: [
                    "Stand with dumbbells in front of thighs",
                    "Raise one arm forward until parallel to floor",
                    "Lower weight slowly back to starting position",
                    "Alternate arms or do both together"
                ],
                difficulty: "Beginner",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Pike Push-ups",
                instructions: [
                    "Start in downward dog position",
                    "Lower head toward hands by bending elbows",
                    "Push back up to starting position",
                    "Keep hips high throughout movement"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Strength"
            }
        ],
        biceps: [
            {
                name: "Bicep Curls",
                instructions: [
                    "Stand with dumbbells at your sides",
                    "Curl weights up toward shoulders",
                    "Squeeze biceps at the top",
                    "Lower weights slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Hammer Curls",
                instructions: [
                    "Hold dumbbells with neutral grip (palms facing each other)",
                    "Curl weights up toward shoulders",
                    "Keep wrists straight throughout movement",
                    "Lower weights slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Chin-ups",
                instructions: [
                    "Hang from pull-up bar with palms facing you",
                    "Pull body up until chin clears the bar",
                    "Lower body slowly back to starting position",
                    "Keep core engaged throughout movement"
                ],
                difficulty: "Advanced",
                equipment: "Pull-up Bar",
                type: "Strength"
            }
        ],
        triceps: [
            {
                name: "Tricep Dips",
                instructions: [
                    "Sit on edge of chair or bench",
                    "Place hands on edge beside hips",
                    "Lower body by bending elbows",
                    "Push back up to starting position"
                ],
                difficulty: "Intermediate",
                equipment: "Chair/Bench",
                type: "Strength"
            },
            {
                name: "Overhead Tricep Extension",
                instructions: [
                    "Hold dumbbell overhead with both hands",
                    "Lower weight behind head by bending elbows",
                    "Keep upper arms stationary",
                    "Extend arms back to starting position"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbell",
                type: "Strength"
            },
            {
                name: "Diamond Push-ups",
                instructions: [
                    "Get in push-up position with hands in diamond shape",
                    "Lower chest toward hands",
                    "Push back up to starting position",
                    "Keep elbows close to body"
                ],
                difficulty: "Advanced",
                equipment: "None",
                type: "Strength"
            }
        ],
        chest: [
            {
                name: "Push-ups",
                instructions: [
                    "Start in plank position with hands shoulder-width apart",
                    "Lower chest toward floor by bending elbows",
                    "Push back up to starting position",
                    "Keep body in straight line throughout"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Chest Press",
                instructions: [
                    "Lie on bench with dumbbells at chest level",
                    "Press weights up until arms are extended",
                    "Lower weights slowly back to chest",
                    "Keep feet flat on floor"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbells/Bench",
                type: "Strength"
            },
            {
                name: "Chest Flyes",
                instructions: [
                    "Lie on bench with dumbbells over chest",
                    "Lower weights out to sides in wide arc",
                    "Bring weights back together over chest",
                    "Keep slight bend in elbows"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbells/Bench",
                type: "Strength"
            }
        ],
        abs: [
            {
                name: "Crunches",
                instructions: [
                    "Lie on back with knees bent",
                    "Place hands behind head or across chest",
                    "Lift shoulders off ground by contracting abs",
                    "Lower back down slowly"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Plank",
                instructions: [
                    "Get in push-up position but on forearms",
                    "Keep body in straight line from head to heels",
                    "Hold position while breathing normally",
                    "Engage core throughout"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Isometric"
            },
            {
                name: "Bicycle Crunches",
                instructions: [
                    "Lie on back with hands behind head",
                    "Bring one knee toward chest while twisting torso",
                    "Touch opposite elbow to knee",
                    "Alternate sides in cycling motion"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Dead Bug",
                instructions: [
                    "Lie on back with arms up and knees at 90 degrees",
                    "Slowly lower opposite arm and leg toward floor",
                    "Return to starting position",
                    "Alternate sides while keeping core engaged"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Strength"
            }
        ],
        obliques: [
            {
                name: "Side Plank",
                instructions: [
                    "Lie on side with forearm on ground",
                    "Lift hips off ground to form straight line",
                    "Hold position while breathing normally",
                    "Switch sides and repeat"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Isometric"
            },
            {
                name: "Russian Twists",
                instructions: [
                    "Sit with knees bent and feet off ground",
                    "Lean back slightly while keeping chest up",
                    "Rotate torso from side to side",
                    "Keep core engaged throughout"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Side Crunches",
                instructions: [
                    "Lie on side with knees bent",
                    "Crunch up by bringing elbow toward hip",
                    "Focus on contracting obliques",
                    "Switch sides and repeat"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            }
        ],
        quads: [
            {
                name: "Squats",
                instructions: [
                    "Stand with feet shoulder-width apart",
                    "Lower body by bending knees and hips",
                    "Keep chest up and knees over toes",
                    "Return to standing position"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Lunges",
                instructions: [
                    "Step forward with one leg",
                    "Lower body until both knees are at 90 degrees",
                    "Push back to starting position",
                    "Alternate legs or complete set on one side"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Wall Sit",
                instructions: [
                    "Stand with back against wall",
                    "Slide down until thighs are parallel to floor",
                    "Hold position with knees at 90 degrees",
                    "Keep back flat against wall"
                ],
                difficulty: "Intermediate",
                equipment: "Wall",
                type: "Isometric"
            },
            {
                name: "Jump Squats",
                instructions: [
                    "Start in squat position",
                    "Jump up explosively from squat",
                    "Land softly back in squat position",
                    "Repeat immediately for desired reps"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Plyometric"
            }
        ],
        calves: [
            {
                name: "Calf Raises",
                instructions: [
                    "Stand with feet hip-width apart",
                    "Rise up onto balls of feet",
                    "Hold briefly at the top",
                    "Lower slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Single Leg Calf Raises",
                instructions: [
                    "Stand on one foot",
                    "Rise up onto ball of foot",
                    "Hold briefly at the top",
                    "Lower slowly and repeat on other leg"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Seated Calf Raises",
                instructions: [
                    "Sit with feet flat on floor",
                    "Place weight on thighs if available",
                    "Rise up onto balls of feet",
                    "Lower slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "Chair",
                type: "Strength"
            }
        ],
        back: [
            {
                name: "Pull-ups",
                instructions: [
                    "Hang from pull-up bar with palms facing away",
                    "Pull body up until chin clears bar",
                    "Lower body slowly back to starting position",
                    "Keep core engaged throughout"
                ],
                difficulty: "Advanced",
                equipment: "Pull-up Bar",
                type: "Strength"
            },
            {
                name: "Bent-over Rows",
                instructions: [
                    "Bend forward at hips with dumbbells",
                    "Pull weights up toward chest",
                    "Squeeze shoulder blades together",
                    "Lower weights slowly back to starting position"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Superman",
                instructions: [
                    "Lie face down with arms extended forward",
                    "Lift chest and legs off ground simultaneously",
                    "Hold briefly at the top",
                    "Lower slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Reverse Flyes",
                instructions: [
                    "Bend forward with dumbbells hanging down",
                    "Raise arms out to sides in wide arc",
                    "Squeeze shoulder blades together",
                    "Lower weights slowly back to starting position"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbells",
                type: "Strength"
            }
        ],
        glutes: [
            {
                name: "Glute Bridges",
                instructions: [
                    "Lie on back with knees bent",
                    "Lift hips up by squeezing glutes",
                    "Form straight line from knees to shoulders",
                    "Lower slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Hip Thrusts",
                instructions: [
                    "Sit with back against bench, knees bent",
                    "Drive hips up by squeezing glutes",
                    "Form straight line from knees to shoulders",
                    "Lower slowly back to starting position"
                ],
                difficulty: "Intermediate",
                equipment: "Bench",
                type: "Strength"
            },
            {
                name: "Bulgarian Split Squats",
                instructions: [
                    "Place rear foot on bench behind you",
                    "Lower body until front thigh is parallel to floor",
                    "Push through front heel to return to start",
                    "Complete set then switch legs"
                ],
                difficulty: "Advanced",
                equipment: "Bench",
                type: "Strength"
            },
            {
                name: "Clamshells",
                instructions: [
                    "Lie on side with knees bent at 90 degrees",
                    "Keep feet together and lift top knee",
                    "Hold briefly at the top",
                    "Lower slowly and repeat"
                ],
                difficulty: "Beginner",
                equipment: "None",
                type: "Strength"
            }
        ],
        hamstrings: [
            {
                name: "Romanian Deadlifts",
                instructions: [
                    "Stand with dumbbells in front of thighs",
                    "Hinge at hips and lower weights toward floor",
                    "Keep back straight and feel stretch in hamstrings",
                    "Return to standing by driving hips forward"
                ],
                difficulty: "Intermediate",
                equipment: "Dumbbells",
                type: "Strength"
            },
            {
                name: "Good Mornings",
                instructions: [
                    "Stand with hands behind head",
                    "Hinge at hips and lower torso forward",
                    "Keep back straight throughout movement",
                    "Return to standing position"
                ],
                difficulty: "Intermediate",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Single Leg Deadlifts",
                instructions: [
                    "Stand on one leg with slight knee bend",
                    "Hinge at hip and reach toward floor",
                    "Lift other leg behind for balance",
                    "Return to standing and switch legs"
                ],
                difficulty: "Advanced",
                equipment: "None",
                type: "Strength"
            },
            {
                name: "Lying Leg Curls",
                instructions: [
                    "Lie face down with legs straight",
                    "Curl heels toward glutes",
                    "Squeeze hamstrings at the top",
                    "Lower slowly back to starting position"
                ],
                difficulty: "Beginner",
                equipment: "Resistance Band",
                type: "Strength"
            }
        ]
    };

    // Get body part from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const bodyPart = urlParams.get('bodypart');
    
    // Update page title
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    if (bodyPart && exerciseDatabase[bodyPart]) {
        const capitalizedBodyPart = bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1);
        pageTitle.textContent = `${capitalizedBodyPart} Exercises`;
        pageSubtitle.textContent = `Targeted exercises for your ${bodyPart}`;
        
        loadExercises(exerciseDatabase[bodyPart]);
    } else {
        pageTitle.textContent = 'Body Part Not Found';
        pageSubtitle.textContent = 'Please select a valid body part';
    }    function loadExercises(exercises) {
        const exercisesGrid = document.getElementById('exercises-grid');
        exercisesGrid.innerHTML = '';

        exercises.forEach((exercise, index) => {
            const exerciseCard = document.createElement('div');
            exerciseCard.className = 'exercise-card';
            
            // Get difficulty color class
            const difficultyClass = exercise.difficulty.toLowerCase();
            
            // Get equipment icon
            const equipmentIcon = getEquipmentIcon(exercise.equipment);
            
            exerciseCard.innerHTML = `
                <div class="exercise-card-header">
                    <div class="exercise-icon">${getExerciseIcon(exercise.name)}</div>
                    <span class="difficulty-badge difficulty-${difficultyClass}">${exercise.difficulty}</span>
                </div>
                <div class="exercise-card-body">
                    <h3 class="exercise-name">${exercise.name}</h3>
                    <div class="exercise-meta-row">
                        <div class="meta-item">
                            <span class="meta-icon">${equipmentIcon}</span>
                            <span class="meta-text">${exercise.equipment}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">🎯</span>
                            <span class="meta-text">${exercise.type}</span>
                        </div>
                    </div>
                    <div class="exercise-preview">
                        ${exercise.instructions.slice(0, 2).map(instruction => 
                            `<div class="instruction-preview">• ${instruction}</div>`
                        ).join('')}
                        ${exercise.instructions.length > 2 ? '<div class="instruction-more">+ more steps...</div>' : ''}
                    </div>
                </div>
                <div class="exercise-card-footer">
                    <button class="btn btn-primary view-details-btn" data-exercise-index="${index}">
                        View Details
                    </button>
                </div>
            `;

            // Add hover effects
            exerciseCard.addEventListener('mouseenter', () => {
                exerciseCard.style.transform = 'translateY(-8px)';
                exerciseCard.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
            });

            exerciseCard.addEventListener('mouseleave', () => {
                exerciseCard.style.transform = 'translateY(0)';
                exerciseCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            });

            exercisesGrid.appendChild(exerciseCard);
        });

        // Add event listeners to view details buttons
        const viewDetailsButtons = document.querySelectorAll('.view-details-btn');
        viewDetailsButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                showExerciseModal(exercises[index]);
            });
        });
    }

    function getEquipmentIcon(equipment) {
        const iconMap = {
            'None': '🏃',
            'Dumbbells': '🏋️',
            'Dumbbell': '🏋️',
            'Pull-up Bar': '🤸',
            'Chair/Bench': '🪑',
            'Dumbbells/Bench': '🏋️',
            'Chair': '🪑',
            'Bench': '🪑',
            'Wall': '🧱',
            'Resistance Band': '🔗'
        };
        return iconMap[equipment] || '💪';
    }

    function getExerciseIcon(exerciseName) {
        const name = exerciseName.toLowerCase();
        if (name.includes('push')) return '👐';
        if (name.includes('pull')) return '🤲';
        if (name.includes('squat') || name.includes('lunge')) return '🦵';
        if (name.includes('curl')) return '💪';
        if (name.includes('press')) return '⬆️';
        if (name.includes('plank')) return '🏗️';
        if (name.includes('crunch')) return '🎯';
        if (name.includes('raise')) return '⬆️';
        if (name.includes('row')) return '↔️';
        if (name.includes('bridge')) return '🌉';
        if (name.includes('deadlift')) return '⬇️';
        return '💪';
    }

    function showExerciseModal(exercise) {
        const modal = document.getElementById('exercise-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalInstructions = document.getElementById('exercise-instructions');
        const modalDifficulty = document.getElementById('exercise-difficulty');
        const modalEquipment = document.getElementById('exercise-equipment');
        const modalType = document.getElementById('exercise-type');

        modalTitle.textContent = exercise.name;
        modalDifficulty.textContent = exercise.difficulty;
        modalEquipment.textContent = exercise.equipment;
        modalType.textContent = exercise.type;

        // Clear and populate instructions
        modalInstructions.innerHTML = '';
        exercise.instructions.forEach(instruction => {
            const li = document.createElement('li');
            li.textContent = instruction;
            modalInstructions.appendChild(li);
        });

        modal.classList.remove('hidden');
    }

    // Modal close functionality
    const closeModal = document.querySelector('.close-modal');
    const modal = document.getElementById('exercise-modal');

    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Modal action buttons
    const addToWorkoutBtn = document.getElementById('add-to-workout-btn');
    const logExerciseBtn = document.getElementById('log-exercise-btn');

    addToWorkoutBtn.addEventListener('click', () => {
        alert('Add to workout functionality coming soon!');
        modal.classList.add('hidden');
    });

    logExerciseBtn.addEventListener('click', () => {
        alert('Exercise logging functionality coming soon!');
        modal.classList.add('hidden');
    });
});
