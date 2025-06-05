// public/admin.js
(async () => {
  const meRes = await fetch('/api/me', { credentials: 'same-origin' });
  if (meRes.status !== 200) return location.href = 'login.html';
  const user = await meRes.json();
  if (!user.is_admin) return location.href = 'home.html';

  // Fetch muscles for dropdowns
  try {
    const res = await fetch('/api/muscles', { credentials: 'same-origin' });
    if (res.ok) {
      const muscles = await res.json();
      const primarySelect = document.getElementById('primary-muscle-select');
      const secondarySelect = document.getElementById('secondary-muscles-select');
      
      if (primarySelect && secondarySelect) {
        muscles.forEach(m => {
          const opt1 = document.createElement('option'); 
          opt1.value = m.name; 
          opt1.textContent = m.name;
          primarySelect.appendChild(opt1);
          
          const opt2 = document.createElement('option'); 
          opt2.value = m.name; 
          opt2.textContent = m.name;
          secondarySelect.appendChild(opt2);
        });
      }
    }
  } catch (err) { 
    console.error('Error loading muscles:', err); 
  }

  // Fix the form ID - change from 'add-exercise-form' to 'exercise-form'
  const form = document.getElementById('exercise-form');
  if (!form) {
    console.error('Form not found! Check your admin.html');
    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    // Handle secondary muscles from multi-select
    const secondarySelect = document.getElementById('secondary-muscles-select');
    const selectedOptions = Array.from(secondarySelect.selectedOptions);
    const secondaryMuscles = selectedOptions.map(option => option.value);
    
    const exerciseData = {
      name: formData.get('name'),
      primary_muscle: formData.get('primary_muscle'),
      secondary_muscles: secondaryMuscles, // Now properly gets array from multi-select
      difficulty: formData.get('difficulty'),
      equipment_type: formData.get('equipment_type'),
      equipment_subtype: formData.get('equipment_subtype') || null,
      instructions: formData.get('instructions')
    };
    
    console.log('Sending exercise data:', exerciseData);
    
    try {
      const res = await fetch('/api/add-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseData)
      });
      
      const msgEl = document.getElementById('submit-message'); // Fix ID too
      
      if (res.ok) {
        const result = await res.json();
        msgEl.textContent = result.message || 'Exercise added successfully.';
        msgEl.style.color = '#2ecc71'; 
        msgEl.className = 'success-msg';
        msgEl.hidden = false;
        this.reset();
      } else {
        let errorMessage = 'Error adding exercise.';
        try {
          const err = await res.json();
          errorMessage = err.message || errorMessage;
        } catch (jsonError) {
          errorMessage = `Server error (${res.status}): ${res.statusText}`;
        }
        
        msgEl.textContent = errorMessage;
        msgEl.style.color = '#e74c3c'; 
        msgEl.className = 'error-msg';
        msgEl.hidden = false;
      }
    } catch (error) {
      console.error('Network error:', error);
      const msgEl = document.getElementById('submit-message');
      msgEl.textContent = 'Network error. Please try again.';
      msgEl.style.color = '#e74c3c';
      msgEl.className = 'error-msg';
      msgEl.hidden = false;
    }
  });
})();