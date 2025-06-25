// routes/user-stats.js
const express = require('express');
const router = express.Router();
const database = require('../database/database');

// GET /api/user-stats
router.get('/user-stats', async (req, res) => {
  const userId = req.cookies.sid;
  if (!userId) return res.sendStatus(401);

  try {
    const stats = {};

    // 1. Total workouts logged
    const { rows: logCount } = await database.query(
      `SELECT COUNT(*)::INT AS total FROM workout_logs WHERE user_id=$1`,
      [userId]
    );
    stats.totalLogged = logCount[0]?.total || 0;

    // 2. First and last workout
    const { rows: logDates } = await database.query(
      `SELECT MIN(logged_at)::date AS first, MAX(logged_at)::date AS last
       FROM workout_logs WHERE user_id=$1`,
      [userId]
    );
    stats.firstLogged = logDates[0]?.first;
    stats.lastLogged = logDates[0]?.last;

    // 3. Favorite muscle group
    const { rows: topMuscle } = await database.query(
      `SELECT e.primary_muscle, COUNT(*)::INT AS count
       FROM workout_logs l
       JOIN saved_workouts w ON l.saved_workout_id = w.id
       JOIN jsonb_array_elements(w.workout_data) AS ex ON true
       JOIN exercises e ON (ex->>'id')::INT = e.id
       WHERE l.user_id = $1
       GROUP BY e.primary_muscle
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );
    stats.favoriteMuscle = topMuscle[0]?.primary_muscle || null;

    // 4. Top equipment used
    const { rows: topEquip } = await database.query(
      `SELECT e.equipment_type, COUNT(*)::INT AS count
       FROM workout_logs l
       JOIN saved_workouts w ON l.saved_workout_id = w.id
       JOIN jsonb_array_elements(w.workout_data) AS ex ON true
       JOIN exercises e ON (ex->>'id')::INT = e.id
       WHERE l.user_id = $1
       GROUP BY e.equipment_type
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );
    stats.topEquipment = topEquip[0]?.equipment_type || null;

    // 5. Most repeated workout
    const { rows: topWorkout } = await database.query(
      `SELECT w.name, COUNT(*)::INT AS times
       FROM workout_logs l
       JOIN saved_workouts w ON w.id = l.saved_workout_id
       WHERE l.user_id = $1
       GROUP BY w.name
       ORDER BY times DESC
       LIMIT 1`,
      [userId]
    );
    stats.topWorkout = topWorkout[0] || null;

    // 6. Most active day of week
    const { rows: topDay } = await database.query(
      `SELECT TO_CHAR(logged_at, 'Day') AS day, COUNT(*)::INT AS count
       FROM workout_logs
       WHERE user_id = $1
       GROUP BY day
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );
    stats.topDay = topDay[0]?.day?.trim() || null;

    // 7. Workout streak (consecutive workout days)
    const { rows: streakData } = await database.query(
      `SELECT DISTINCT logged_at::date AS date FROM workout_logs WHERE user_id = $1 ORDER BY date DESC`,
      [userId]
    );
    let streak = 0;
    let currentDate = new Date();
    for (const row of streakData) {
      const workoutDate = new Date(row.date);
      if (workoutDate.toDateString() === currentDate.toDateString()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    stats.workoutStreak = streak;

    // 8. BMI (requires profile info)
    const { rows: profile } = await database.query(
      `SELECT weight, height FROM profiles WHERE user_id=$1`,
      [userId]
    );
    const weight = profile[0]?.weight;
    const height = profile[0]?.height;
    if (weight && height) {
      const bmi = weight / Math.pow(height / 100, 2);
      stats.bmi = parseFloat(bmi.toFixed(1));
    } else {
      stats.bmi = null;
    }

    // 9. Total distinct exercises performed
    const { rows: distinctExercises } = await database.query(
      `SELECT COUNT(DISTINCT (ex->>'id'))::INT AS count
       FROM workout_logs l
       JOIN saved_workouts w ON w.id = l.saved_workout_id
       JOIN jsonb_array_elements(w.workout_data) AS ex ON true
       WHERE l.user_id = $1`,
      [userId]
    );
    stats.distinctExercises = distinctExercises[0]?.count || 0;

    return res.json(stats);
  } catch (err) {
    console.error('User stats error:', err);
    return res.sendStatus(500);
  }
});

module.exports = router;
