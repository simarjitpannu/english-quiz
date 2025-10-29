const SUPABASE_URL = 'https://pqjerqdwifsvqwnhvvwl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxamVycWR3aWZzdnF3bmh2dndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzE3OTMsImV4cCI6MjA3NDY0Nzc5M30.xDCqFC21QBwH7cswnz8ckYc5EQwJag_fv7h4Cltc0b8';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Global state ---
let currentUser = null;
let currentProfile = null;
let selectedGrade = null;
let selectedCategory = null;
let currentQuizData = null;
let timerInterval = null;
let timeElapsed = 0;

// --- UI Elements ---
const welcomeTitleSpan = document.getElementById('welcome-title');
const logoutBtn = document.querySelector('.logout-btn');
const dashboardView = document.getElementById('dashboard-view');
const gradeSelectionView = document.getElementById('grade-selection-view');
const categorySelectionView = document.getElementById('category-selection-view');
const chapterListView = document.getElementById('chapter-list-view');
const chapterListContainer = document.getElementById('chapter-list-container');
const chapterListTitle = document.getElementById('chapter-list-title');
const quizView = document.getElementById('quiz-view');
const quizTitle = document.getElementById('quiz-title');
const quizTimer = document.getElementById('quiz-timer');
const quizParagraph = document.getElementById('quiz-paragraph');
const quizQuestionsContainer = document.getElementById('quiz-questions-container');
const submitQuizBtn = document.getElementById('submit-quiz-btn');
const resultsModal = document.getElementById('results-modal');
const certUserName = document.getElementById('cert-user-name');
const certChapterName = document.getElementById('cert-chapter-name');
const certScore = document.getElementById('cert-score');
const certTime = document.getElementById('cert-time');
const downloadCertBtn = document.getElementById('download-cert-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardTitle = document.getElementById('leaderboard-title');
const leaderboardBody = document.getElementById('leaderboard-body');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

// --- NEW: Helper Function to Shuffle Arrays ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

function extractLessonNumber(title) {
    const match = title.match(/^LESSON (\d+)/i);
    // If a match is found, return the number. Otherwise, return 0.
    return match ? parseInt(match[1]) : 0;
}

// --- Main Functions ---

async function init() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;

    const { data: profile, error } = await supabaseClient.from('profiles').select('full_name, role').eq('id', user.id).single();
    if (error || !profile) {
        return handleLogout();
    }
    currentProfile = profile;

    if (profile.role === 'teacher') {
        window.location.replace('teacher-admin.html');
    } else {
        const welcomeText = `Welcome, ${profile.full_name}!`;
        if (welcomeTitleSpan) {
            welcomeTitleSpan.textContent = welcomeText;
            welcomeTitleSpan.dataset.text = welcomeText;
        }
        showView('grade');
    }
}

function showView(viewName) {
    if(gradeSelectionView) gradeSelectionView.style.display = 'none';
    if(categorySelectionView) categorySelectionView.style.display = 'none';
    if(chapterListView) chapterListView.style.display = 'none';
    if(quizView) quizView.style.display = 'none';
    if(dashboardView) dashboardView.style.display = 'none';

    if (viewName === 'grade') {
        if(dashboardView) dashboardView.style.display = 'block';
        if(gradeSelectionView) gradeSelectionView.style.display = 'block';
    } else if (viewName === 'category') {
        if(dashboardView) dashboardView.style.display = 'block';
        if(categorySelectionView) categorySelectionView.style.display = 'block';
    } else if (viewName === 'chapters') {
        if(dashboardView) dashboardView.style.display = 'block';
        if(chapterListView) chapterListView.style.display = 'block';
    } else if (viewName === 'quiz') {
        if(quizView) quizView.style.display = 'flex';
    }
}

async function fetchAndDisplayChapters() {
    if(!chapterListTitle) return;
    chapterListTitle.textContent = `Grade ${selectedGrade} - ${selectedCategory}`;
    const { data: quizzes, error } = await supabaseClient.from('quizzes').select('id, chapter_title').eq('grade', selectedGrade).eq('category', selectedCategory);
    if (error) { console.error('Error fetching quizzes:', error); return; }

    // --- ADD THIS SORTING LOGIC ---
    quizzes.sort((a, b) => {
        const numA = extractLessonNumber(a.chapter_title);
        const numB = extractLessonNumber(b.chapter_title);
        return numA - numB;
    });
    
    chapterListContainer.innerHTML = '';
    if (quizzes.length === 0) {
        chapterListContainer.innerHTML = '<p style="font-size: 1.2em; color: #3E3E3E;">No quizzes found!</p>';
    } else {
        quizzes.forEach(quiz => {
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter-item';
            chapterDiv.innerHTML = `<h3>${quiz.chapter_title}</h3><div class="chapter-buttons"><button class="btn minecraft-btn leaderboard-btn" data-quiz-id="${quiz.id}" data-chapter-title="${quiz.chapter_title}">🏆</button><button class="btn minecraft-btn primary-btn start-quiz-btn" data-quiz-id="${quiz.id}">Start</button></div>`;
            chapterListContainer.appendChild(chapterDiv);
        });
    }
    showView('chapters');
}

async function startQuiz(quizId) {
    const { data: quizData, error } = await supabaseClient.from('quizzes').select('*').eq('id', quizId).single();
    if (error) return console.error(error);

    const { data: questionsData, error: qError } = await supabaseClient.from('questions').select('*').eq('quiz_id', quizId);
    if (qError) return console.error(qError);

    // --- NEW: Shuffle the questions ---
    shuffleArray(questionsData);

    currentQuizData = { ...quizData, questions: questionsData };
    
    quizTitle.textContent = currentQuizData.chapter_title;
    quizParagraph.textContent = currentQuizData.paragraph;
    quizQuestionsContainer.innerHTML = '';

    if (currentQuizData.questions && currentQuizData.questions.length > 0) {
        currentQuizData.questions.forEach((q, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block';

            // --- NEW: Shuffle the options ---
            const optionsArray = Object.entries(q.options); // Convert options object to an array
            shuffleArray(optionsArray); // Shuffle the array

            let optionsHTML = '';
            if (q.options && typeof q.options === 'object') {
                // Loop through the now-shuffled array of options
                optionsArray.forEach(([key, value]) => {
                    optionsHTML += `
                        <input type="radio" id="q${index}_${key}" name="question_${index}" value="${key}">
                        <label for="q${index}_${key}">${value}</label>
                    `;
                });
            }
            questionBlock.innerHTML = `<p>${index + 1}. ${q.question_text}</p><div class="options-group">${optionsHTML}</div>`;
            quizQuestionsContainer.appendChild(questionBlock);
        });
    } else {
        quizQuestionsContainer.innerHTML = '<p>This quiz has no questions yet!</p>';
    }
    
    showView('quiz');
    startTimer();
}

function startTimer() {
    timeElapsed = 0;
    quizTimer.textContent = `Time: 0s`;
    timerInterval = setInterval(() => {
        timeElapsed++;
        quizTimer.textContent = `Time: ${timeElapsed}s`;
    }, 1000);
}

async function submitQuiz() {
    clearInterval(timerInterval);
    let score = 0;
    currentQuizData.questions.forEach((q, index) => {
        const selectedOption = document.querySelector(`input[name="question_${index}"]:checked`);
        if (selectedOption && selectedOption.value === q.correct_option) { score++; }
    });
    const totalQuestions = currentQuizData.questions.length;
    await supabaseClient.from('submissions').insert({ quiz_id: currentQuizData.id, student_id: currentUser.id, score: score, time_taken_seconds: timeElapsed });
    
    certUserName.textContent = currentProfile.full_name;
    certChapterName.textContent = `"${currentQuizData.chapter_title}"`;
    certScore.textContent = `${score} / ${totalQuestions}`;
    certTime.textContent = `${timeElapsed} seconds`;

    const { data: profile } = await supabaseClient.from('profiles').select('grade, section, teacher_name').eq('id', currentUser.id).single();
    if (profile) {
        document.getElementById('cert-grade-section').textContent = `(Grade ${profile.grade}${profile.section})`;
        document.getElementById('cert-teacher-signature').textContent = profile.teacher_name;
    }

    resultsModal.style.display = 'flex';
}

async function showLeaderboard(quizId, chapterTitle) {
    leaderboardTitle.textContent = `Leaderboard: ${chapterTitle}`;
    const { data, error } = await supabaseClient.rpc('get_leaderboard', { quiz_id_param: quizId });
    if (error) { console.error('Error fetching leaderboard:', error); return; }
    
    leaderboardBody.innerHTML = '';
    if (data.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4">No one has completed this quiz yet!</td></tr>';
    } else {
        data.forEach((entry) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>#${entry.rank}</td><td>${entry.full_name}</td><td>${entry.score}</td><td>${entry.time_taken}s</td>`;
            leaderboardBody.appendChild(row);
        });
    }
    leaderboardModal.style.display = 'flex';
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-grade]')) { selectedGrade = e.target.dataset.grade; showView('category'); }
    if (e.target.matches('[data-category]')) { selectedCategory = e.target.dataset.category; fetchAndDisplayChapters(); }
    if (e.target.id === 'back-to-grade') showView('grade');
    if (e.target.id === 'back-to-category') showView('category');
    if (e.target.matches('.start-quiz-btn')) startQuiz(e.target.dataset.quizId);
    if (e.target.matches('.leaderboard-btn')) showLeaderboard(e.target.dataset.quizId, e.target.dataset.chapterTitle);
});
if(submitQuizBtn) submitQuizBtn.addEventListener('click', submitQuiz);
if(closeModalBtn) closeModalBtn.addEventListener('click', () => { resultsModal.style.display = 'none'; showView('chapters'); });
if(closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.style.display = 'none');
if(downloadCertBtn) downloadCertBtn.addEventListener('click', () => { html2canvas(document.querySelector("#certificate")).then(canvas => { const link = document.createElement('a'); link.download = 'QuizCraft-Badge.png'; link.href = canvas.toDataURL(); link.click(); }); });
document.addEventListener('DOMContentLoaded', init);
