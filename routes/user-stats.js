// routes/user-stats.js
const express      = require('express');
const statsRouter  = express.Router();
const database     = require('../database/database');
const { Feed }     = require('feed');
const { Parser }   = require('json2csv');
const PDFDocument  = require('pdfkit');

/* ────────────────────────────────────────────────────────────── */
/* Build one object with every metric we ever need               */
/* ────────────────────────────────────────────────────────────── */
async function buildStats(userId) {
  const stats = {};

  /* total logs, first + last **************************************************/
  const tot = await database.query(
    `SELECT COUNT(*)::INT            AS total,
            MIN(logged_at)::date     AS first,
            MAX(logged_at)::date     AS last
       FROM workout_logs
      WHERE user_id = $1`, [userId]);
  stats.totalLogged = tot.rows[0].total;
  stats.firstLogged = tot.rows[0].first;
  stats.lastLogged  = tot.rows[0].last;

  /* favourite muscle **********************************************************/
  const fav = await database.query(`
    SELECT e.primary_muscle, COUNT(*)::INT AS c
      FROM workout_logs      l
      JOIN saved_workouts    w  ON w.id = l.saved_workout_id
      JOIN jsonb_array_elements(w.workout_data) ex ON TRUE
      JOIN exercises         e  ON (ex->>'id')::INT = e.id
     WHERE l.user_id = $1
  GROUP BY e.primary_muscle
  ORDER BY c DESC
     LIMIT 1`, [userId]);
  stats.favoriteMuscle = fav.rows[0]?.primary_muscle ?? null;

  /* BMI ***********************************************************************/
  const prof = await database.query(
    `SELECT weight, height FROM profiles WHERE user_id = $1`, [userId]);
  if (prof.rows[0]?.weight && prof.rows[0]?.height) {
    const { weight, height } = prof.rows[0];
    stats.bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);
  }

  /* distinct exercises ********************************************************/
  const de = await database.query(`
    SELECT COUNT(DISTINCT (ex->>'id')::INT)::INT AS n
      FROM workout_logs      l
      JOIN saved_workouts    w  ON w.id = l.saved_workout_id
      JOIN jsonb_array_elements(w.workout_data) ex ON TRUE
     WHERE l.user_id = $1`, [userId]);
  stats.distinctExercises = de.rows[0].n;

  /* top equipment *************************************************************/
  const te = await database.query(`
    SELECT e.equipment_type, COUNT(*)::INT AS c
      FROM workout_logs      l
      JOIN saved_workouts    w  ON w.id = l.saved_workout_id
      JOIN jsonb_array_elements(w.workout_data) ex ON TRUE
      JOIN exercises         e  ON (ex->>'id')::INT = e.id
     WHERE l.user_id = $1
  GROUP BY e.equipment_type
  ORDER BY c DESC
     LIMIT 1`, [userId]);
  stats.topEquipment = te.rows[0]?.equipment_type ?? null;

  /* top workout ***************************************************************/
  const tw = await database.query(`
    SELECT w.name, COUNT(*)::INT AS times
      FROM workout_logs   l
      JOIN saved_workouts w ON w.id = l.saved_workout_id
     WHERE l.user_id = $1
  GROUP BY w.name
  ORDER BY times DESC
     LIMIT 1`, [userId]);
  if (tw.rows.length) stats.topWorkout = tw.rows[0];

  /* most active day ***********************************************************/
  const td = await database.query(`
    SELECT TO_CHAR(logged_at, 'FMDay') AS dow, COUNT(*)::INT AS c
      FROM workout_logs
     WHERE user_id = $1
  GROUP BY dow
  ORDER BY c DESC
     LIMIT 1`, [userId]);
  stats.topDay = td.rows[0]?.dow?.trim() ?? null;

  /* current streak (consecutive days up to today) *****************************/
  const streakDates = await database.query(`
    SELECT DISTINCT logged_at::date AS d
      FROM workout_logs
     WHERE user_id = $1
  ORDER BY d DESC`, [userId]);

  let streak = 0;
  let cursor = new Date();                     // today
  for (const row of streakDates.rows) {
    const date = row.d;
    if (date.getTime() === cursor.setHours(0,0,0,0)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);    // go to previous day
    } else {
      break;
    }
  }
  stats.workoutStreak = streak;

  return stats;
}

/* make buildStats usable from server.js */
statsRouter.buildStats = buildStats;

/* ────────────────────────────────────────────────────────────── */
/* ===  RSS / CSV / PDF  EXPORTS  =============================== */
/* ────────────────────────────────────────────────────────────── */

function sendStatsRSS(req, res, data) {
  const feed = new Feed({
    title      : 'My Workout Stats',
    description: 'Personal workout statistics exported by Spartacus',
    id         : `${req.protocol}://${req.get('host')}`,
    link       : `${req.protocol}://${req.get('host')}/export/stats/rss`,
    language   : 'en',
    updated    : new Date(),
    author     : { name: 'Spartacus' }
  });

  Object.entries(data).forEach(([k, v]) =>
    feed.addItem({ title: k, id: k, content_text: String(v ?? 'n/a'), date: new Date() })
  );

  res.type('application/rss+xml').send(feed.rss2());
}

/* ---------------- RSS ---------------- */
statsRouter.get('/rss', async (req, res) => {
  const uid = req.cookies.sid;
  if (!uid) return res.sendStatus(401);

  try {
    const data = await buildStats(uid);
    sendStatsRSS(req, res, data);
  } catch (err) {
    console.error('Stats RSS error', err);
    res.sendStatus(500);
  }
});

/* ---------------- CSV ---------------- */
statsRouter.get('/csv', async (req, res) => {
  const uid = req.cookies.sid;
  if (!uid) return res.sendStatus(401);

  try {
    const data  = await buildStats(uid);
    const rows  = Object.entries(data).map(([k, v]) => ({ key: k, value: v }));
    const csv   = new Parser({ fields: ['key', 'value'] }).parse(rows);
    res.header('Content-Type', 'text/csv')
       .attachment('my_stats.csv')
       .send(csv);
  } catch (err) {
    console.error('Stats CSV error', err);
    res.sendStatus(500);
  }
});

/* ---------------- PDF ---------------- */
statsRouter.get('/pdf', async (req, res) => {
  const uid = req.cookies.sid;
  if (!uid) return res.sendStatus(401);

  try {
    const data = await buildStats(uid);
    const doc  = new PDFDocument({ margin: 30, size: 'A4' });

    res.header('Content-Type', 'application/pdf')
       .attachment('my_stats.pdf');

    doc.pipe(res);
    doc.fontSize(18).text('My Workout Stats', { align: 'center' }).moveDown();
    Object.entries(data).forEach(([k, v]) =>
      doc.fontSize(12).text(`${k}: ${v ?? 'n/a'}`).moveDown(0.3)
    );
    doc.end();
  } catch (err) {
    console.error('Stats PDF error', err);
    res.sendStatus(500);
  }
});

module.exports = statsRouter;
