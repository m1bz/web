// routes/logging.js
const express  = require('express');
const router   = express.Router();
const database = require('../database/database');

// POST /api/log-workout  ──────────────────────────────────────────────
router.post('/log-workout', async (req, res) => {
  const userId = req.cookies.sid;
  if (!userId) return res.sendStatus(401);

  const { savedWorkoutId } = req.body;
  if (!savedWorkoutId) {
    return res.status(400).json({ message: 'Missing savedWorkoutId' });
  }

  try {
    // 1. Is this workout really yours?
    const { rows: own } = await database.query(
      'SELECT 1 FROM saved_workouts WHERE id=$1 AND user_id=$2',
      [savedWorkoutId, userId]
    );
    if (!own.length) return res.status(404).json({ message: 'Workout not found' });

    // 2. Already logged something in the last 24 h?
    const { rows: last } = await database.query(
      `SELECT logged_at::date AS day FROM workout_logs
       WHERE user_id=$1 ORDER BY logged_at DESC LIMIT 1`,
      [userId]
    );
    if (last.length && last[0].day.toISOString() === new Date().toISOString().slice(0,10)) {
      return res.status(429).json({ message: 'You can only log one workout every 24 h' });
    }

    // 3. Insert new log
    await database.query(
      `INSERT INTO workout_logs (user_id, saved_workout_id) VALUES ($1,$2)`,
      [userId, savedWorkoutId]
    );
    return res.json({ message: 'Workout logged successfully' });

  } catch (err) {
    console.error('Log workout error:', err);
    return res.sendStatus(500);
  }
});

// GET /api/leaderboard  ───────────────────────────────────────────────
router.get('/leaderboard', async (_req, res) => {
  try {
    const { rows } = await database.query(`
      SELECT u.username,
             COUNT(l.id)::INT AS logs
      FROM workout_logs l
      JOIN users u ON u.id = l.user_id
      GROUP BY u.username
      ORDER BY logs DESC, u.username
      LIMIT 10
    `);
    return res.json(rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.sendStatus(500);
  }
});

module.exports = router;
