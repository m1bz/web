

const fs      = require('fs').promises;
const path    = require('path');
const database = require('./database/database'); // now this resolves correctly
const raw     = require('./public/exercises.json');

async function main() {
  try {
    await database.connect();

    // 2a.  Insert every muscle name into `muscles` (ignore duplicates)
    const muscleNames = Object.keys(raw);
    for (const m of muscleNames) {
      await database.query(
        `INSERT INTO muscles(name)
         VALUES($1)
         ON CONFLICT (name) DO NOTHING`,
        [m]
      );
    }

    // 2b.  Insert each exercise row
    for (const [muscle, bucket] of Object.entries(raw)) {
      if (!bucket.exercises) continue;

      for (const ex of bucket.exercises) {
        // Pull out fields from JSON
        const {
          name,
          primary_muscle,      // this will be the same as `muscle`
          secondary_muscles = [],
          difficulty,
          equipment = {},
          instructions
        } = ex;

        // In the JSON, primary_muscle === the outer key, but we double‐check
        const pm = (ex.primary_muscle || muscle).toLowerCase() === muscle.toLowerCase()
                  ? muscle
                  : ex.primary_muscle;

        const type    = (equipment.type || '').toLowerCase()   || null;
        const subtype = (equipment.subtype || '').toLowerCase() || null;

        await database.query(
          `INSERT INTO exercises (
               name,
               primary_muscle,
               secondary_muscles,
               difficulty,
               equipment_type,
               equipment_subtype,
               instructions
             ) VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING`,
          [
            name,
            pm,
            secondary_muscles,
            difficulty,
            type,
            subtype,
            instructions
          ]
        );
      }
    }

    console.log('✅ Import complete.');
    await database.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
