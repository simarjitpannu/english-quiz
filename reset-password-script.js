const SUPABASE_URL = 'https://pqjerqdwifsvqwnhvvwl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxamVycWR3aWZzdnF3bmh2dndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzE3OTMsImV4cCI6MjA3NDY0Nzc5M30.xDCqFC21QBwH7cswnz8ckYc5EQwJag_fv7h4Cltc0b8';

// CORRECTED CODE:
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const resetPasswordForm = document.getElementById('reset-password-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const messageArea = document.getElementById('message-area');

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = `message-area minecraft-message-box ${type}`;
    messageArea.style.display = 'block';
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match. Please try again.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters long.', 'error');
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        showMessage('Error updating password: ' + error.message, 'error');
    } else {
        showMessage('Your password has been updated! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
});