// Handles the couple registration form and saves the data to localStorage
document.getElementById('registrationForm').addEventListener('submit', function(e) {
  e.preventDefault();

  // Retrieve form values
  const data = {
    bride: document.getElementById('brideName').value.trim(),
    groom: document.getElementById('groomName').value.trim(),
    weddingDate: document.getElementById('weddingDate').value,
    homecomingDate: document.getElementById('homecomingDate').value
  };

  // Minimal validation
  if(!data.bride || !data.groom || !data.weddingDate){
    document.getElementById('message').textContent = "Please fill all required fields!";
    return;
  }

  // Save in browser (simulate backend until Flask is ready)
  localStorage.setItem('weddingCoupleData', JSON.stringify(data));
  document.getElementById('message').textContent = 'Registration successful! Redirecting…';
  setTimeout(() => window.location.href = "dashboard.html", 1200);
});
