/* ==========================================================================
   DETANZA — Coming Soon Interactive Scripts
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initFormHandler();
  initCursorGlow();
  updateCurrentYear();
});

/**
 * 1. Countdown Timer Logic
 * Sets target date (default: 30 days from today) or a custom date.
 */
function initCountdown() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  // Target countdown: 5 days from now
  const COUNTDOWN_DAYS = 5;
  
  // Clear any old 30-day cache
  localStorage.removeItem('detanza_launch_date');

  let savedTarget = localStorage.getItem('detanza_launch_date_5days');
  let targetDate;

  if (savedTarget && !isNaN(new Date(savedTarget).getTime())) {
    targetDate = new Date(savedTarget);
  } else {
    // 5 days ahead
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + COUNTDOWN_DAYS);
    localStorage.setItem('detanza_launch_date_5days', targetDate.toISOString());
  }

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/**
 * 2. VIP Notification Form Handler
 */
function initFormHandler() {
  const form = document.getElementById('notifyForm');
  const emailInput = document.getElementById('emailInput');
  const submitBtn = document.getElementById('submitBtn');
  const feedback = document.getElementById('formFeedback');

  if (!form || !emailInput || !submitBtn || !feedback) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    // Reset feedback state
    feedback.className = 'form-feedback';
    feedback.textContent = '';

    // Validation
    if (!email) {
      showFeedback('Please enter your email address.', 'error');
      emailInput.focus();
      return;
    }

    if (!emailRegex.test(email)) {
      showFeedback('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    // Button loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    submitBtn.innerHTML = '<span>Saving...</span>';

    // Simulate network save & store in localStorage
    setTimeout(() => {
      try {
        const storedList = JSON.parse(localStorage.getItem('detanza_waitlist') || '[]');
        if (!storedList.includes(email)) {
          storedList.push({ email, timestamp: new Date().toISOString() });
          localStorage.setItem('detanza_waitlist', JSON.stringify(storedList));
        }

        showFeedback('✦ Thank you! You are now on the private Detanza VIP list.', 'success');
        emailInput.value = '';
        submitBtn.innerHTML = '<span>Joined ✓</span>';
        submitBtn.style.background = 'linear-gradient(135deg, #34d399 0%, #059669 100%)';
        submitBtn.style.color = '#ffffff';

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.background = '';
          submitBtn.style.color = '';
          submitBtn.innerHTML = originalBtnText;
        }, 4000);
      } catch (err) {
        showFeedback('✦ Access requested! We will notify you upon launch.', 'success');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = originalBtnText;
      }
    }, 600);
  });

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `form-feedback show ${type}`;
  }
}

/**
 * 3. Interactive Cursor Glow Follower
 */
function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    glow.style.opacity = '1';
  });

  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  function animate() {
    currentX += (mouseX - currentX) * 0.1;
    currentY += (mouseY - currentY) * 0.1;
    glow.style.left = `${currentX}px`;
    glow.style.top = `${currentY}px`;
    requestAnimationFrame(animate);
  }
  animate();
}

/**
 * 4. Dynamic Year in Footer
 */
function updateCurrentYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

