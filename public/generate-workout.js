// public/generate-workout.js
// ============================================================
//  Spartacus – Generate Workout page
//  • Auth-guard: redirect guests to login.html
//  • Adds “Save Workout” button -> /api/save-workout
//  • Keeps original SVG-selection, filter, and card rendering
// ============================================================

/* ---------- 0.  AUTH GUARD (module-level await) ---------- */
const meRes = await fetch('/api/me', { credentials: 'same-origin' });
if (meRes.status !== 200) {
  location.href = 'login.html';
  throw new Error('Not logged in – redirecting');
}

/* ---------- 1.  CONSTANTS ---------- */
const EXERCISE_URL = 'exercises.json';
const SVG_SELECTOR = 'g.clickable';

/* ---------- 2.  DOM REFERENCES ---------- */
const $filters      = document.querySelector('.filters .controls');
const $generateBtn  = document.getElementById('generate-btn');
const $saveBtn      = document.getElementById('save-btn');
const $output       = document.getElementById('workout-output');

/* ---------- 3.  STATE ---------- */
let exercises       = [];                 // flat array of all exercises
let selectedMuscles = new Set();          // which muscles the user clicked
const filterState   = new Map();          // Map<attributeName, Set<selectedValues>>
let lastWorkout     = [];                 // store the last generated exercises

/* ============================================================
   4.  FETCH + FLATTEN DATA, THEN BUILD FILTER UI
   ============================================================ */
fetch(EXERCISE_URL)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  })
  .then(data => {
    /* flatten & normalize exactly as in main.js */
    exercises = Object.entries(data).flatMap(([muscle, bucket]) =>
      (bucket.exercises || []).map(ex => {
        const type    = ex.equipment?.type?.toLowerCase()    || 'unknown';
        const subtype = ex.equipment?.subtype?.toLowerCase() || null;

        return {
          ...ex,
          muscle          : muscle.toLowerCase(),
          equipmentType   : type,          // parent
          equipmentSub    : subtype,       // child (may be null)
          equipmentLabel  : subtype || type
        };
      })
    );

    console.log(`✅ loaded ${exercises.length} exercises`);

    /* Now that we have exercises, build filters dynamically */
    buildFilters();
    initSvgSelection();
  })
  .catch(err => {
    console.error(err);
    $output.innerHTML = '<p style="color:red;">Could not load exercise data.</p>';
  });

/* ============================================================
   5.  DYNAMIC FILTER-BUILDING (based on entire dataset)
   ============================================================ */
function buildFilters() {
  // Clear any existing filter UI (we know .controls only has the buttons)
  $filters.querySelectorAll('.filter-group').forEach(node => node.remove());

  // 5.1: Gather every attribute we want to filter on.
  const attrMap   = new Map();    // attrName -> Set of unique values
  const equipTree = new Map();    // equipmentType -> Set(subtypes)

  function addToMap(key, value) {
    if (!value) return;
    if (!attrMap.has(key)) attrMap.set(key, new Set());
    attrMap.get(key).add(value);
  }

  exercises.forEach(ex => {
    //  • difficulty
    addToMap('difficulty', ex.difficulty);

    //  • equipment: type + subtype
    addToMap('equipment', ex.equipmentType);
    if (ex.equipmentSub) {
      addToMap('equipment', ex.equipmentSub);
      if (!equipTree.has(ex.equipmentType)) {
        equipTree.set(ex.equipmentType, new Set());
      }
      equipTree.get(ex.equipmentType).add(ex.equipmentSub);
    }
  });

  // 5.2: For each attribute in attrMap, render a filter-group
  attrMap.forEach((valueSet, attr) => {
    const values = Array.from(valueSet).sort();
    const $group = document.createElement('div');
    $group.className = 'filter-group';

    // Title shows attribute name + count
    const $title = document.createElement('button');
    $title.className = 'filter-title';
    $title.textContent = `${displayName(attr)} (${values.length})`;
    $title.onclick = () => {
      $body.classList.toggle('collapsed');
    };

    // Body holds checkboxes for each distinct value
    const $body = document.createElement('div');
    $body.className = 'filter-body';

    values.forEach(val => {
      // If this val is a parent equipment type, parent = ''
      // Otherwise, we find its parent in equipTree
      const isParent = equipTree.has(val);
      const parent   = isParent ? '' : findParent(val, equipTree);
      const id       = `${attr}-${slug(val)}`;

      const $label = document.createElement('label');
      $label.className = 'filter-item';
      $label.innerHTML = `
        <input 
          type="checkbox"
          id="${id}"
          data-key="${attr}"
          data-type="${parent || val}"
          data-subtype="${parent ? val : ''}"
          value="${val}"
        > ${val}
      `;
      $body.appendChild($label);
    });

    $group.appendChild($title);
    $group.appendChild($body);

    // Insert each filter-group before the buttons
    $filters.insertBefore($group, $generateBtn);

    // Hook up change listener on all checkboxes in this group
    $body.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.onchange = onFilterChange;
    });
  });
}

/* ---------- filter checkbox handler ---------- */
function onFilterChange(e) {
  const key     = e.target.dataset.key;      // ex: 'difficulty' or 'equipment'
  const value   = e.target.value;            // ex: 'Beginner' or 'dumbbells'
  const type    = e.target.dataset.type;     // for equipment hierarchies
  const subtype = e.target.dataset.subtype;  // likewise
  const checked = e.target.checked;

  // If this is an equipment checkbox, enforce parent↔child exclusivity:
  if (key === 'equipment') {
    const allBoxes = Array.from(
      $filters.querySelectorAll('[data-key="equipment"]')
    );

    if (subtype && checked) {
      // A subtype was just checked: uncheck its parent if present
      const parentBox = allBoxes.find(b => b.value === type);
      if (parentBox) parentBox.checked = false;
    }
    if (!subtype && checked) {
      // A parent was just checked: uncheck any subtypes under it
      allBoxes
        .filter(b => b.dataset.subtype && b.dataset.type === value)
        .forEach(b => (b.checked = false));
    }
  }

  // Maintain filterState map
  if (!filterState.has(key)) filterState.set(key, new Set());
  const selectedSet = filterState.get(key);
  if (checked) {
    selectedSet.add(value);
  } else {
    selectedSet.delete(value);
  }
}

/* ============================================================
   6.  SVG INTERACTION (multiple-select)
   ============================================================ */
function initSvgSelection() {
  document.querySelectorAll(SVG_SELECTOR).forEach($g => {
    const key = ($g.dataset.muscle || $g.id || '').toLowerCase();
    if (!key) return;

    $g.tabIndex = 0;
    $g.role     = 'button';
    $g.classList.remove('selected');

    const toggle = () => {
      if (selectedMuscles.has(key)) {
        selectedMuscles.delete(key);
        $g.classList.remove('selected');
      } else {
        selectedMuscles.add(key);
        $g.classList.add('selected');
      }
    };

    $g.addEventListener('click', toggle);
    $g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ============================================================
   7.  GENERATE WORKOUT ON BUTTON CLICK
   ============================================================ */
$generateBtn.addEventListener('click', () => {
  if (!selectedMuscles.size) {
    alert('Please select at least one muscle group on the diagram.');
    return;
  }

  // Clear previous output
  $output.innerHTML = '';
  lastWorkout = [];

  const cards = [];
  selectedMuscles.forEach(muscle => {
    // Filter pool by muscle + any active filters
    const pool = exercises.filter(ex => {
      if (ex.muscle !== muscle) return false;

      for (const [attr, selectedValues] of filterState) {
        if (!selectedValues.size) continue;

        let valToCheck;
        if (attr === 'equipment') {
          valToCheck = [ex.equipmentType, ex.equipmentSub].filter(Boolean);
        } else if (attr === 'secondary') {
          valToCheck = ex.secondary_muscles || [];
        } else {
          valToCheck = ex[attr];
        }

        // If attr is array, check any overlap; if scalar, check direct membership
        if (Array.isArray(valToCheck)) {
          if (!valToCheck.some(v => selectedValues.has(v))) {
            return false;
          }
        } else {
          if (!selectedValues.has(valToCheck)) {
            return false;
          }
        }
      }
      return true;
    });

    if (!pool.length) {
      cards.push(notFoundCard(muscle));
    } else {
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      lastWorkout.push(chosen);  // store for saving
      cards.push(renderCard(chosen));
    }
  });

  $output.innerHTML = cards.join('');
  $saveBtn.disabled = !lastWorkout.length;
});

/* ============================================================
   8.  SAVE WORKOUT BUTTON
   ============================================================ */
$saveBtn.addEventListener('click', async () => {
  if (!lastWorkout.length) return;

  const defaultName = `Workout ${new Date().toLocaleDateString()}`;
  const name = prompt('Name this workout:', defaultName);
  if (!name) return;

  const payload = {
    name,
    exercises: lastWorkout,
    bodyParts: Array.from(selectedMuscles),
  };

  try {
    const res = await fetch('/api/save-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      alert('Workout saved!');
      $saveBtn.disabled = true;
    } else if (res.status === 401) {
      alert('You must be logged in to save workouts.');
      location.href = 'login.html';
    } else {
      alert('Error saving workout.');
    }
  } catch (err) {
    console.error(err);
    alert('Error saving workout.');
  }
});

/* ============================================================
   HELPERS
   ============================================================ */
function renderCard(ex) {
  const equipLabel = ex.equipmentSub || ex.equipmentType || 'Unknown';
  return `
    <article class="card">
      <h3>${ex.name}</h3>
      <small>${proper(ex.muscle)} · ${ex.difficulty} · ${proper(equipLabel)}</small>
      <p>${ex.instructions}</p>
    </article>
  `;
}

function notFoundCard(muscle) {
  const pretty = proper(muscle);
  return `
    <article class="card">
      <h3>No exercises found</h3>
      <small>${pretty}</small>
      <p>No exercises found for ${pretty} with the selected filters.</p>
    </article>
  `;
}

function slug(s) {
  return s.toString().toLowerCase().replace(/\s+/g, '-');
}

function displayName(key) {
  if (key === 'secondary') return 'Secondary Muscles';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function findParent(sub, tree) {
  for (const [type, kids] of tree) {
    if (kids.has(sub)) return type;
  }
  return '';
}

function proper(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
