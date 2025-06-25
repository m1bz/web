// routes/rss_exports.js
const express      = require('express');
const router       = express.Router();
const database     = require('../database/database');
const { Feed }     = require('feed');
const { Parser }   = require('json2csv');
const PDFDocument  = require('pdfkit');


router.get('/rss', async (req, res) => {
  try {
    const { rows } = await database.query(`
      SELECT id,
             name,
             workout_data,          -- JSONB[]
             body_parts_worked,     -- TEXT[]
             created_at,
             user_id
        FROM saved_workouts
    ORDER BY created_at DESC
       LIMIT 20
    `);

    const feed = new Feed({
      title       : 'Latest Workouts',
      description : 'Newest saved workouts from all users',
      id          : `${req.protocol}://${req.get('host')}`,
      link        : `${req.protocol}://${req.get('host')}/export/rss`,
      language    : 'en',
      updated     : rows.length ? rows[0].created_at : new Date(),
      author      : { name: 'Spartacus', link: `${req.protocol}://${req.get('host')}` }
    });

    rows.forEach(w => {
      const exercises = Array.isArray(w.workout_data)
        ? w.workout_data.map(e => e.name || e.exercise || 'exercise').join(', ')
        : '';
      const bodyParts = (w.body_parts_worked || []).join(', ');
      const exerciseCount = Array.isArray(w.workout_data) ? w.workout_data.length : 0;

      /* Build a tiny HTML snippet – works for RSS (description) and JSON feeds */
      const html = `
        <p><strong>Exercises&nbsp;(${exerciseCount})</strong>: ${exercises}</p>
        <p><strong>Body&nbsp;parts</strong>: ${bodyParts || 'n/a'}</p>
      `;

      feed.addItem({
        title       : w.name,
        id          : w.id.toString(),
        link        : `${req.protocol}://${req.get('host')}/workouts/${w.id}`,
        date        : w.created_at,
        author      : [{ name: `User ${w.user_id}` }],
        description : html,          // RSS 2.0
        content_html: html           // JSON feed
      });
    });

    res.type('application/rss+xml').send(feed.rss2());
  } catch (err) {
    console.error('RSS feed error:', err);
    res.sendStatus(500);
  }
});

/* ────────────────────────────────────────────────────────────── */
/* PUBLIC CSV  – all saved workouts                              */
/* ────────────────────────────────────────────────────────────── */
router.get('/csv', async (_req, res) => {
  try {
    const { rows } = await database.query(`
      SELECT id, name, user_id, created_at
        FROM saved_workouts
    ORDER BY created_at DESC
    `);

    const csv = new Parser({
      fields: ['id', 'name', 'user_id', 'created_at']
    }).parse(rows);

    res.header('Content-Type', 'text/csv')
       .attachment('workouts.csv')
       .send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.sendStatus(500);
  }
});

/* ────────────────────────────────────────────────────────────── */
/* PUBLIC PDF  – all saved workouts                              */
/* ────────────────────────────────────────────────────────────── */
router.get('/pdf', async (_req, res) => {
  try {
    const { rows } = await database.query(`
      SELECT id, name, user_id, created_at
        FROM saved_workouts
    ORDER BY created_at DESC
    `);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.header('Content-Type', 'application/pdf')
       .attachment('workouts.pdf');

    doc.pipe(res);
    doc.fontSize(18).text('Saved Workouts', { align: 'center' }).moveDown();

    rows.forEach(w => {
      doc.fontSize(12)
         .text(`ID: ${w.id}  Name: ${w.name}`)
         .text(`User: ${w.user_id}  Saved: ${w.created_at.toISOString().slice(0,10)}`)
         .moveDown(0.5);
    });
    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
