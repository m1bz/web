// public\main.js

const EXERCISE_URL  = 'exercises.json';
const SVG_SELECTOR  = 'g.clickable';

/* ---------- DOM refs ---------- */
const $filters = document.querySelector('.filters');
const $grid    = document.querySelector('.exercise-grid');

/* ---------- app state ---------- */
let exercises      = [];                // flat array
let currentMuscle  = null;              // lowercase
const filterState  = new Map();         // Map<attr, Set>

/* ============================================================
   1.  LOAD + FLATTEN DATA
   ============================================================ */
fetch(EXERCISE_URL)
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  })
  .then(data => {
    /* ---- flatten and normalise ---- */
    exercises = Object.entries(data).flatMap(([muscle, bucket]) =>
      (bucket.exercises || []).map(ex => {
        const type     = ex.equipment?.type?.toLowerCase()     || 'unknown';
        const subtype  = ex.equipment?.subtype?.toLowerCase()  || null;

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
    initSvg();
  })
  .catch(err => {
    console.error(err);
    $grid.textContent = 'Could not load exercise data.';
  });

/* ============================================================
   2.  SVG INTERACTION
   ============================================================ */
function initSvg () {
  document.querySelectorAll(SVG_SELECTOR).forEach($g => {
    const key = ($g.dataset.muscle || $g.id || '').toLowerCase();
    if (!key) return;

    $g.tabIndex = 0;
    $g.role     = 'button';

    const activate = () => {
      currentMuscle = key;
      highlight($g);
      buildFilters();
      renderGrid();
    };

    $g.addEventListener('click',  activate);
    $g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
}

function highlight (chosen) {
  document.querySelectorAll(SVG_SELECTOR).forEach($g => {
    const active = $g === chosen;
    $g.classList.toggle('active',  active);
    $g.classList.toggle('dimmed', !!currentMuscle && !active);
  });
}

/* ============================================================
   3.  FILTER UI
   ============================================================ */
function buildFilters () {
  $filters.innerHTML = '';
  filterState.clear();

  if (!currentMuscle) return;

  /* dedupe upfront */
  const relevant = dedupe(
    exercises.filter(ex => ex.muscle === currentMuscle)
  );
  if (!relevant.length) { $grid.innerHTML = '<p>No exercises.</p>'; return; }

  /* --- collect attribute->Set(values) --- */
  const attrMap = new Map();                    // attr -> Set(all values)
  const equipTree = new Map();                  // type -> Set(subtypes)

  const add = (k, v) => {
    if (!v) return;
    if (!attrMap.has(k)) attrMap.set(k, new Set());
    attrMap.get(k).add(v);
  };

  relevant.forEach(ex => {
    add('difficulty', ex.difficulty);
    /* equipment: collect type + subtype and build tree */
    add('equipment', ex.equipmentType);
    if (ex.equipmentSub) {
      add('equipment', ex.equipmentSub);
      if (!equipTree.has(ex.equipmentType))
        equipTree.set(ex.equipmentType, new Set());
      equipTree.get(ex.equipmentType).add(ex.equipmentSub);
    }
    (ex.secondary_muscles || []).forEach(sec => add('secondary', sec));
  });

  /* --- render groups --- */
  for (const [attr, set] of attrMap) {
    const values = [...set].sort();
    const $group = document.createElement('div');
    $group.className = 'filter-group';

    const $title = document.createElement('button');
    $title.className = 'filter-title';
    $title.textContent = `${displayName(attr)} (${values.length})`;
    $title.onclick = () => $group.classList.toggle('collapsed');

    const $body = document.createElement('div');
    $body.className = 'filter-body';

    values.forEach(v => {
      const id = `${attr}-${slug(v)}`;
      /* extra data attrs let us reason about parent/child */
      const parent = equipTree.has(v) ? '' : findParent(v, equipTree);

      $body.insertAdjacentHTML('beforeend', `
        <label class="filter-item">
          <input type="checkbox"
                 id="${id}"
                 data-key="${attr}"
                 data-type="${parent || v}"
                 data-subtype="${parent ? v : ''}"
                 value="${v}"> ${v}
        </label>`);
    });

    $group.append($title, $body);
    $filters.appendChild($group);
  }

  /* attach listeners */
  $filters.querySelectorAll('input[type=checkbox]')
          .forEach(cb => cb.onchange = onFilter);
}

//* ---------- filter change handler ---------- */
function onFilter (e) {
  /* real value is on the element, only the meta data lives in data-* */
  const key      = e.target.dataset.key;
  const value    = e.target.value;           
  const type     = e.target.dataset.type;
  const subtype  = e.target.dataset.subtype;
  const checked  = e.target.checked;

  /* ----- equipment hierarchy exclusivity ----- */
  if (key === 'equipment') {
    const boxes = [...$filters.querySelectorAll('[data-key=equipment]')];

    if (subtype && checked) {                // child ticked
      const parentBox = boxes.find(b => b.value === type);
      if (parentBox) parentBox.checked = false;
    }

    if (!subtype && checked) {               // parent ticked
      boxes
        .filter(b => b.dataset.subtype && b.dataset.type === value)
        .forEach(b => (b.checked = false));
    }
  }

  /* ----- maintain filterState ----- */
  if (!filterState.has(key)) filterState.set(key, new Set());
  const set = filterState.get(key);
  checked ? set.add(value) : set.delete(value);

  renderGrid();
}


/* ============================================================
   4.  GRID
   ============================================================ */
function renderGrid () {
  if (!currentMuscle) { $grid.innerHTML = ''; return; }

  const base = dedupe(
    exercises.filter(ex => ex.muscle === currentMuscle)
  );

  const shown = base.filter(ex => {
    for (const [attr, selected] of filterState) {
      if (!selected.size) continue;

      let val;
      if (attr === 'equipment') {
        /* match against BOTH type & subtype */
        val = [ex.equipmentType, ex.equipmentSub].filter(Boolean);
      } else if (attr === 'secondary') {
        val = ex.secondary_muscles || [];
      } else {
        val = ex[attr];
      }

      if (Array.isArray(val)) {
        if (!val.some(v => selected.has(v))) return false;
      } else {
        if (!selected.has(val)) return false;
      }
    }
    return true;
  });

  $grid.innerHTML = shown.length
    ? shown.map(card).join('')
    : '<p>No exercises match current filters.</p>';
}

const card = ex => `
  <article class="card">
    <h3>${ex.name}</h3>
    <small>${ex.equipmentLabel} · ${ex.difficulty}</small>
    <p>${ex.instructions}</p>
  </article>`;

/* ============================================================
   helpers
   ============================================================ */
const slug   = s => s.toLowerCase().replace(/\s+/g,'-');
const displayName = k => k === 'secondary' ? 'Secondary Muscles'
                       : k.charAt(0).toUpperCase() + k.slice(1);

function dedupe(arr) {
  const seen = new Set();
  return arr.filter(ex => {
    const key = ex.name + '|' + ex.equipmentLabel;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* equipment helper: find a parent type for a subtype */
function findParent (sub, tree) {
  for (const [type, kids] of tree) {
    if (kids.has(sub)) return type;
  }
  return '';
}
