// In English Quiz/script.js

const SUPABASE_URL = 'https://pqjerqdwifsvqwnhvvwl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxamVycWR3aWZzdnF3bmh2dndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzE3OTMsImV4cCI6MjA3NDY0Nzc5M30.xDCqFC21QBwH7cswnz8ckYc5EQwJag_fv7h4Cltc0b8';


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- UI Elements ---
const authHeader = document.getElementById('auth-header');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authButton = document.getElementById('auth-button');
const toggleAuthText = document.getElementById('toggle-auth-text');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const forgotPasswordLink = document.getElementById('forgot-password');
const messageArea = document.getElementById('message-area');
const fullNameGroup = document.getElementById('full-name-group');
const fullNameInput = document.getElementById('full_name');
const studentInfoGroup = document.getElementById('student-info-group');
const gradeInput = document.getElementById('grade');
const sectionInput = document.getElementById('section');
const teacherNameInput = document.getElementById('teacher_name');

let isSignUpMode = false;

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = `message-area ${type}`;
    messageArea.style.display = 'block';
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 6000); // Increased time to 6 seconds to ensure it's readable
}

function updateAuthUI() {
    if (isSignUpMode) {
        authHeader.textContent = "Create Account";
        authButton.textContent = "Create My Account!";
        toggleAuthText.textContent = "Already have an account?";
        toggleAuthMode.textContent = "Log In!";
        if(forgotPasswordLink) forgotPasswordLink.style.display = 'none';
        if (fullNameGroup) fullNameGroup.style.display = 'block';
        if (fullNameInput) fullNameInput.required = true;
        if (studentInfoGroup) studentInfoGroup.style.display = 'block';
        if (gradeInput) gradeInput.required = true;
        if (sectionInput) sectionInput.required = true;
        if (teacherNameInput) teacherNameInput.required = true;
    } else {
        authHeader.textContent = "Login";
        authButton.textContent = "Start Quizing!";
        toggleAuthText.textContent = "Don't have an account?";
        toggleAuthMode.textContent = "Create one!";
        if(forgotPasswordLink) forgotPasswordLink.style.display = 'block';
        if (fullNameGroup) fullNameGroup.style.display = 'none';
        if (fullNameInput) fullNameInput.required = false;
        if (studentInfoGroup) studentInfoGroup.style.display = 'none';
        if (gradeInput) gradeInput.required = false;
        if (sectionInput) sectionInput.required = false;
        if (teacherNameInput) teacherNameInput.required = false;
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
        const fullName = fullNameInput.value;
        const grade = gradeInput.value;
        const section = sectionInput.value;
        const teacherName = teacherNameInput.value;
    
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    grade: grade,
                    section: section,
                    teacher_name: teacherName
                }
            }
        });

        if (error) {
            showMessage('Error creating account: ' + error.message, 'error');
        } else {
            // The trigger handles profile creation, so we just show the success message.
            showMessage('Success! A confirmation link has been sent to your email. Please verify to log in.', 'success');
            isSignUpMode = false;
            updateAuthUI();
        }

    } else { // Login mode (this part remains the same)
        const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (loginError) {
            showMessage('Login failed: ' + loginError.message, 'error');
            return;
        }
        
        if (loginData.user) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', loginData.user.id)
                .single();

            if (profile?.role === 'teacher') {
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
    if (!email) return showMessage('Please enter your email to reset your password.', 'info');

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        showMessage('Error sending reset link: ' + error.message, 'error');
    } else {
        showMessage('Password reset link sent to your email!', 'success');
    }
});

// Initialize the UI on page load
updateAuthUI();
