(async () => {
  /* 1. AUTH GUARD */
  const meRes = await fetch('/api/me', { credentials: 'same-origin' });
  if (meRes.status !== 200) {
    location.href = 'login.html';
    return;
  }
  const me = await meRes.json();
  if (!me.is_admin) {
    location.href = 'home.html';
    return;
  }

  /* 2. GLOBAL VARIABLES */
  let exercises = [];
  let selectedExercise = null;

  /* 3. POPULATE MUSCLE DROPDOWNS */
  try {
    const res = await fetch('/api/muscles', { credentials: 'same-origin' });
    if (res.ok) {
      const muscles = await res.json();
      const selectors = [
        '#primary-muscle-select',
        '#secondary-muscles-select',
        '#modify-primary-muscle',
        '#modify-secondary-muscles'
      ];
      
      selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          muscles.forEach(({ name }) => {
            element.appendChild(new Option(name, name));
          });
        }
      });
    }
  } catch (err) {
    console.error('Error loading muscles:', err);
  }

  /* 4. LOAD EXERCISES */
  async function loadExercises() {
    try {
      const res = await fetch('/api/exercises', { credentials: 'same-origin' });
      if (res.ok) {
        exercises = await res.json();
        populateExerciseLists();
      }
    } catch (err) {
      console.error('Error loading exercises:', err);
    }
  }

  /* 5. POPULATE EXERCISE LISTS */
  function populateExerciseLists() {
    const modifyList = document.getElementById('modify-exercise-list');
    const deleteList = document.getElementById('delete-exercise-list');
    
    const html = exercises.map(ex => `
      <div class="exercise-item" data-id="${ex.id}">
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-meta">${ex.primary_muscle} • ${ex.difficulty}</div>
        </div>
      </div>
    `).join('');
    
    modifyList.innerHTML = html;
    deleteList.innerHTML = html;
    
    // Add click handlers
    modifyList.addEventListener('click', handleModifySelect);
    deleteList.addEventListener('click', handleDeleteSelect);
  }

  /* 6. MODE SWITCHING */
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById(`${mode}-mode`).classList.add('active');
      
      // Load exercises when switching to modify or delete mode
      if (mode === 'modify' || mode === 'delete') {
        loadExercises();
      }
    });
  });

  /* 7. MODIFY MODE HANDLERS */
  function handleModifySelect(e) {
    const item = e.target.closest('.exercise-item');
    if (!item) return;
    
    // Remove previous selection
    document.querySelectorAll('#modify-exercise-list .exercise-item').forEach(i => 
      i.classList.remove('selected')
    );
    
    // Select current item
    item.classList.add('selected');
    const exerciseId = item.dataset.id;
    selectedExercise = exercises.find(ex => ex.id == exerciseId);
    
    if (selectedExercise) {
      populateModifyForm(selectedExercise);
      document.getElementById('modify-form-container').style.display = 'block';
    }
  }

  function populateModifyForm(exercise) {
    document.getElementById('modify-exercise-id').value = exercise.id;
    document.getElementById('modify-name').value = exercise.name;
    document.getElementById('modify-primary-muscle').value = exercise.primary_muscle;
    document.getElementById('modify-difficulty').value = exercise.difficulty;
    document.getElementById('modify-equipment-type').value = exercise.equipment_type;
    document.getElementById('modify-equipment-subtype').value = exercise.equipment_subtype || '';
    document.getElementById('modify-instructions').value = exercise.instructions;
    
    // Handle secondary muscles
    const secondarySelect = document.getElementById('modify-secondary-muscles');
    Array.from(secondarySelect.options).forEach(option => {
      option.selected = exercise.secondary_muscles.includes(option.value);
    });
    
    // Load existing media
    loadExistingMedia(exercise.id);
  }

  async function loadExistingMedia(exerciseId) {
    const container = document.getElementById('existing-media');
    try {
      const res = await fetch(`/api/exercise-media/${exerciseId}`, { credentials: 'same-origin' });
      if (res.ok) {
        const media = await res.json();
        container.innerHTML = media.map(m => `
          <div class="media-item" data-media-id="${m.id}">
            ${m.media_type === 'image' 
              ? `<img src="${m.media_path}" alt="Exercise media">` 
              : `<video src="${m.media_path}" controls></video>`
            }
            <button type="button" class="media-delete-btn" onclick="deleteMedia(${m.id})">&times;</button>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading media:', err);
    }
  }

  /* 8. DELETE MODE HANDLERS */
  function handleDeleteSelect(e) {
    const item = e.target.closest('.exercise-item');
    if (!item) return;
    
    // Remove previous selection
    document.querySelectorAll('#delete-exercise-list .exercise-item').forEach(i => 
      i.classList.remove('selected')
    );
    
    // Select current item
    item.classList.add('selected');
    const exerciseId = item.dataset.id;
    selectedExercise = exercises.find(ex => ex.id == exerciseId);
    
    if (selectedExercise) {
      showDeleteConfirmation(selectedExercise);
    }
  }

  function showDeleteConfirmation(exercise) {
    const confirmDiv = document.getElementById('delete-confirm');
    const detailsDiv = document.getElementById('delete-exercise-details');
    
    detailsDiv.innerHTML = `
      <p><strong>Name:</strong> ${exercise.name}</p>
      <p><strong>Primary Muscle:</strong> ${exercise.primary_muscle}</p>
      <p><strong>Difficulty:</strong> ${exercise.difficulty}</p>
    `;
    
    confirmDiv.style.display = 'block';
  }

  /* 9. FORM HANDLERS */
  
  // Create form (existing functionality)
  const createForm = document.getElementById('exercise-form');
  const createMsg = document.getElementById('submit-message');
  
  createForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    createMsg.hidden = true;

    const formData = new FormData(createForm);
    const secSelect = document.getElementById('secondary-muscles-select');
    if (secSelect) {
      Array.from(secSelect.selectedOptions)
        .forEach(opt => formData.append('secondary_muscles', opt.value));
    }

    try {
      const res = await fetch('/api/add-exercise', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        createMsg.textContent = json.message || 'Exercise added successfully.';
        createMsg.className = 'success-msg';
        createForm.reset();
      } else {
        createMsg.textContent = json.message || 'Error adding exercise.';
        createMsg.className = 'error-msg';
      }
    } catch (err) {
      console.error('Network error:', err);
      createMsg.textContent = 'Network error. Please try again.';
      createMsg.className = 'error-msg';
    }

    createMsg.hidden = false;
  });

  // Modify form
  const modifyForm = document.getElementById('modify-form');
  const modifyMsg = document.getElementById('modify-message');
  
  modifyForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    modifyMsg.hidden = true;

    const formData = new FormData(modifyForm);
    const secSelect = document.getElementById('modify-secondary-muscles');
    if (secSelect) {
      Array.from(secSelect.selectedOptions)
        .forEach(opt => formData.append('secondary_muscles', opt.value));
    }

    try {
      const res = await fetch('/api/update-exercise', {
        method: 'PUT',
        credentials: 'same-origin',
        body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        modifyMsg.textContent = json.message || 'Exercise updated successfully.';
        modifyMsg.className = 'success-msg';
        loadExercises(); // Refresh the list
        loadExistingMedia(selectedExercise.id); // Refresh media
      } else {
        modifyMsg.textContent = json.message || 'Error updating exercise.';
        modifyMsg.className = 'error-msg';
      }
    } catch (err) {
      console.error('Network error:', err);
      modifyMsg.textContent = 'Network error. Please try again.';
      modifyMsg.className = 'error-msg';
    }

    modifyMsg.hidden = false;
  });

  // Delete confirmation
  document.getElementById('confirm-delete').addEventListener('click', async () => {
    const deleteMsg = document.getElementById('delete-message');
    deleteMsg.hidden = true;

    try {
      const res = await fetch(`/api/delete-exercise/${selectedExercise.id}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const json = await res.json().catch(() => ({}));
      
      if (res.ok) {
        deleteMsg.textContent = json.message || 'Exercise deleted successfully.';
        deleteMsg.className = 'success-msg';
        document.getElementById('delete-confirm').style.display = 'none';
        loadExercises(); // Refresh the list
      } else {
        deleteMsg.textContent = json.message || 'Error deleting exercise.';
        deleteMsg.className = 'error-msg';
      }
    } catch (err) {
      console.error('Network error:', err);
      deleteMsg.textContent = 'Network error. Please try again.';
      deleteMsg.className = 'error-msg';
    }

    deleteMsg.hidden = false;
  });

  document.getElementById('cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-confirm').style.display = 'none';
    document.querySelectorAll('#delete-exercise-list .exercise-item').forEach(i => 
      i.classList.remove('selected')
    );
  });

  /* 10. GLOBAL FUNCTIONS */
  window.deleteMedia = async function(mediaId) {
    if (!confirm('Delete this media file?')) return;
    
    try {
      const res = await fetch(`/api/delete-media/${mediaId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      
      if (res.ok) {
        loadExistingMedia(selectedExercise.id); // Refresh media display
      } else {
        alert('Error deleting media');
      }
    } catch (err) {
      console.error('Error deleting media:', err);
      alert('Error deleting media');
    }
  };

})();