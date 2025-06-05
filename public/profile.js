// public/profile.js
(async () => {
  // Auth guard
  const meRes = await fetch('/api/me', { credentials: 'same-origin' });
  if (meRes.status !== 200) {
    location.href = 'login.html';
    return;
  }

  const user = await meRes.json();
  const container = document.getElementById('profile-container');
  const loading = document.getElementById('loading');

  try {
    // Load current profile data
    const profileRes = await fetch('/api/profile', { credentials: 'same-origin' });
    let profileData = {};
    
    if (profileRes.ok) {
      profileData = await profileRes.json();
    }

    loading.style.display = 'none';
    renderProfile(user, profileData);

  } catch (error) {
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="profile-section">
        <h2>❌ Error Loading Profile</h2>
        <p>Unable to load your profile data. Please try again.</p>
      </div>
    `;
  }
})();

function renderProfile(user, profileData) {
  const container = document.getElementById('profile-container');
  
  // Calculate BMI if height and weight are available
  let bmi = '';
  let bmiCategory = '';
  if (profileData.weight && profileData.height) {
    const heightInMeters = profileData.height / 100;
    const calculatedBmi = profileData.weight / (heightInMeters * heightInMeters);
    bmi = calculatedBmi.toFixed(1);
    
    if (calculatedBmi < 18.5) bmiCategory = 'Underweight';
    else if (calculatedBmi < 25) bmiCategory = 'Normal';
    else if (calculatedBmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';
  }

  const html = `
    <!-- User Information -->
    <div class="profile-section">
      <div class="profile-header">
        👤 Account Information
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Username</label>
          <input type="text" value="${user.username}" disabled>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" value="${user.email}" disabled>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Member Since</label>
          <input type="text" value="${new Date(user.created_at).toLocaleDateString()}" disabled>
        </div>
        <div class="form-group">
          <label>Account Type</label>
          <input type="text" value="${user.is_admin ? 'Administrator' : 'Regular User'}" disabled>
        </div>
      </div>
    </div>

    <!-- Profile Form -->
    <div class="profile-section">
      <div class="profile-header">
        📊 Personal Information
      </div>
      
      <div id="message-container"></div>
      
      <form id="profile-form">
        <div class="form-row">
          <div class="form-group">
            <label for="gender">Gender *</label>
            <select id="gender" name="gender" required>
              <option value="">Select Gender</option>
              <option value="male" ${profileData.gender === 'male' ? 'selected' : ''}>Male</option>
              <option value="female" ${profileData.gender === 'female' ? 'selected' : ''}>Female</option>
              <option value="other" ${profileData.gender === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="age">Age *</label>
            <input type="number" id="age" name="age" min="5" max="120" 
                   value="${profileData.age || ''}" required 
                   placeholder="Enter your age">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="weight">Weight (kg)</label>
            <input type="number" id="weight" name="weight" min="20" max="300" step="0.1"
                   value="${profileData.weight || ''}" 
                   placeholder="Enter weight in kg">
          </div>
          <div class="form-group">
            <label for="height">Height (cm)</label>
            <input type="number" id="height" name="height" min="100" max="250"
                   value="${profileData.height || ''}" 
                   placeholder="Enter height in cm">
          </div>
        </div>
        
        <button type="submit" class="save-button" id="save-button">
          Save Profile
        </button>
      </form>
    </div>

    <!-- Profile Stats -->
    ${profileData.age || profileData.weight || profileData.height ? `
    <div class="profile-section">
      <div class="profile-header">
        📈 Your Stats
      </div>
      <div class="profile-stats">
        ${profileData.age ? `
        <div class="stat-card">
          <div class="stat-value">${profileData.age}</div>
          <div class="stat-label">Years Old</div>
        </div>
        ` : ''}
        ${profileData.weight ? `
        <div class="stat-card">
          <div class="stat-value">${profileData.weight}kg</div>
          <div class="stat-label">Weight</div>
        </div>
        ` : ''}
        ${profileData.height ? `
        <div class="stat-card">
          <div class="stat-value">${profileData.height}cm</div>
          <div class="stat-label">Height</div>
        </div>
        ` : ''}
        ${bmi ? `
        <div class="stat-card">
          <div class="stat-value">${bmi}</div>
          <div class="stat-label">BMI (${bmiCategory})</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Info Box -->
    <div class="info-box">
      <h3>🎯 Why Complete Your Profile?</h3>
      <p>
        Complete your profile to unlock personalized workout recommendations! 
        We use your age and gender to find similar users and suggest exercises 
        and routines that work well for people like you.
      </p>
    </div>
  `;

  container.innerHTML = html;
  setupFormHandler();
}

function setupFormHandler() {
  const form = document.getElementById('profile-form');
  const saveButton = document.getElementById('save-button');
  const messageContainer = document.getElementById('message-container');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    const formData = new FormData(form);
    const profileData = {
      gender: formData.get('gender'),
      age: formData.get('age') ? parseInt(formData.get('age')) : null,
      weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
      height: formData.get('height') ? parseFloat(formData.get('height')) : null
    };

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        showMessage('Profile updated successfully! 🎉', 'success');
        
        // Reload the page after a short delay to show updated stats
        setTimeout(() => {
          location.reload();
        }, 1500);
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showMessage('Network error. Please try again.', 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Profile';
    }
  });
}

function showMessage(message, type) {
  const messageContainer = document.getElementById('message-container');
  const className = type === 'success' ? 'success-message' : 'error-message';
  
  messageContainer.innerHTML = `
    <div class="${className}">
      ${message}
    </div>
  `;
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      messageContainer.innerHTML = '';
    }, 3000);
  }
}