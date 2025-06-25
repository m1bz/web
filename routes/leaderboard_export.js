// routes/leaderboard_export.js
const express      = require('express');
const router       = express.Router();
const database     = require('../database/database');
const { Feed }     = require('feed');
const { Parser }   = require('json2csv');
const PDFDocument  = require('pdfkit');

/* ------------------------------------------------------------------ */
/* helper – returns top 25 users with the most workout logs           */
/* ------------------------------------------------------------------ */
async function fetchLeaderboard() {
  const { rows } = await database.query(`
    SELECT u.username,
           COUNT(l.id)::INT AS logs
    FROM workout_logs l
    JOIN users u ON u.id = l.user_id
    GROUP BY u.username
    ORDER BY logs DESC, u.username
    LIMIT 25
  `);
  return rows;
}

/* ------------------------------------------------------------------ */
/* RSS  - /export/leaderboard/rss                                     */
/* ------------------------------------------------------------------ */
router.get('/rss', async (req, res) => {
  try {
    const rows = await fetchLeaderboard();

    const feed = new Feed({
      title      : 'Spartacus Leaderboard',
      description: 'Top users by logged workouts',
      id         : `${req.protocol}://${req.get('host')}`,
      link       : `${req.protocol}://${req.get('host')}/export/leaderboard/rss`,
      language   : 'en',
      updated    : new Date(),
      author     : { name: 'Spartacus' }
    });

    rows.forEach((r, idx) => {
      feed.addItem({
        title   : `#${idx + 1}  –  ${r.username}`,
        id      : `${r.username}-${r.logs}`,
        content : `${r.username} logged ${r.logs} workouts`,
        date    : new Date()
      });
    });

    res.type('application/rss+xml').send(feed.rss2());
  } catch (err) {
    console.error('Leaderboard RSS error:', err);
    res.sendStatus(500);
  }
});

/* ------------------------------------------------------------------ */
/* CSV  - /export/leaderboard/csv                                     */
/* ------------------------------------------------------------------ */
router.get('/csv', async (_req, res) => {
  try {
    const rows = await fetchLeaderboard();
    const csv  = new Parser({ fields: ['username', 'logs'] }).parse(rows);

    res.header('Content-Type', 'text/csv')
       .attachment('leaderboard.csv')
       .send(csv);
  } catch (err) {
    console.error('Leaderboard CSV error:', err);
    res.sendStatus(500);
  }
});

/* ------------------------------------------------------------------ */
/* PDF  - /export/leaderboard/pdf                                     */
/* ------------------------------------------------------------------ */
router.get('/pdf', async (_req, res) => {
  try {
    const rows = await fetchLeaderboard();
    const doc  = new PDFDocument({ margin: 30, size: 'A4' });

    res.header('Content-Type', 'application/pdf')
       .attachment('leaderboard.pdf');

    doc.pipe(res);
    doc.fontSize(20).text('Spartacus Leaderboard', { align: 'center' }).moveDown();

    rows.forEach((r, idx) => {
      doc.fontSize(12)
         .text(`${String(idx + 1).padStart(2, ' ')}.  ${r.username}`)
         .text(`      ${r.logs} workouts logged`)
         .moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('Leaderboard PDF error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
