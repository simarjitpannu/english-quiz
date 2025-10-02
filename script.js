const SUPABASE_URL = 'https://pqjerqdwifsvqwnhvvwl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxamVycWR3aWZzdnF3bmh2dndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzE3OTMsImV4cCI6MjA3NDY0Nzc5M30.xDCqFC21QBwH7cswnz8ckYc5EQwJag_fv7h4Cltc0b8';

// CORRECTED LINE: Using the lowercase 'supabase' object from the library
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const authHeader = document.getElementById('auth-header');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleSelection = document.getElementById('role-selection');
const authButton = document.getElementById('auth-button');
const toggleAuthText = document.getElementById('toggle-auth-text');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const forgotPasswordLink = document.getElementById('forgot-password');
const messageArea = document.getElementById('message-area');

let isSignUpMode = false;

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = `message-area ${type}`;
    messageArea.style.display = 'block';
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

function updateAuthUI() {
    if (isSignUpMode) {
        authHeader.textContent = "Create Account";
        authButton.textContent = "Create My Account!";
        toggleAuthText.textContent = "Already have an account?";
        toggleAuthMode.textContent = "Log In!";
        forgotPasswordLink.style.display = 'none';
        // Ensure role selection is visible in sign up mode
        if(roleSelection) roleSelection.style.display = 'block';
    } else {
        authHeader.textContent = "Login";
        authButton.textContent = "Start Quizing!";
        toggleAuthText.textContent = "Don't have an account?";
        toggleAuthMode.textContent = "Create one!";
        forgotPasswordLink.style.display = 'block';
        // Ensure role selection is hidden in login mode
        if(roleSelection) roleSelection.style.display = 'none';
    }
}

toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    updateAuthUI();
});

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        const selectedRole = document.querySelector('input[name="role"]:checked').value;
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            showMessage('Error creating account: ' + error.message, 'error');
        } else if (data.user) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .insert([{ id: data.user.id, full_name: email.split('@')[0], role: selectedRole }]);
            
            if (profileError) {
                console.error("Error saving profile data:", profileError);
                showMessage('Account created, but could not save profile.', 'error');
            } else {
                showMessage('Success! Check your email to confirm your account.', 'success');
                isSignUpMode = false;
                updateAuthUI();
            }
        }
    } else { // Login mode
        const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (loginError) {
            showMessage('Login failed: ' + loginError.message, 'error');
            return;
        }
        
        if (loginData.user) {
            showMessage('Login successful! Checking your role...', 'success');
            
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', loginData.user.id)
                .single();

            if (profileError || !profile) {
                showMessage('Could not find your profile. Please contact support.', 'error');
                await supabaseClient.auth.signOut();
                return;
            }

            if (profile.role === 'teacher') {
                window.location.href = "teacher-admin.html";
            } else {
                window.location.href = "dashboard.html";
            }
        }
    }
});

forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    if (!email) {
        showMessage('Please enter your email to reset your password.', 'info');
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        showMessage('Error sending reset link: ' + error.message, 'error');
    } else {
        showMessage('Password reset link sent to your email!', 'success');
    }
});

updateAuthUI();