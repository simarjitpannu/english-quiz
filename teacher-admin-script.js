const SUPABASE_URL = 'https://pqjerqdwifsvqwnhvvwl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxamVycWR3aWZzdnF3bmh2dndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzE3OTMsImV4cCI6MjA3NDY0Nzc5M30.xDCqFC21QBwH7cswnz8ckYc5EQwJag_fv7h4Cltc0b8';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Global state ---
let currentUser = null;
let currentProfile = null;
let selectedGrade = null;
let selectedCategory = null;

// --- UI Elements ---
const welcomeMessage = document.getElementById('teacher-welcome-message');
const logoutBtn = document.getElementById('logout-btn-admin');
const gradeSelectionView = document.getElementById('grade-selection-view');
const categorySelectionView = document.getElementById('category-selection-view');
const chapterManagementView = document.getElementById('chapter-management-view');
const chapterListContainer = document.getElementById('chapter-list-container');
const chapterManagementTitle = document.getElementById('chapter-management-title');
const quizEditorModal = document.getElementById('quiz-editor-modal');
const quizEditorForm = document.getElementById('quiz-editor-form');
const quizEditorTitle = document.getElementById('quiz-editor-title');
const questionsEditorContainer = document.getElementById('questions-editor-container');
const quizIdInput = document.getElementById('quiz-id');
const chapterTitleInput = document.getElementById('chapter_title');
const paragraphInput = document.getElementById('paragraph');

// --- Functions ---

async function init() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return handleLogout();
    }
    currentUser = user;

    const { data: profile, error } = await supabaseClient.from('profiles').select('full_name, role').eq('id', user.id).single();
    if (error || !profile || profile.role !== 'teacher') {
        return handleLogout();
    }
    currentProfile = profile;
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${profile.full_name}!`;
    }
    showView('grade');
}

function extractLessonNumber(title) {
    const match = title.match(/^LESSON (\d+)/i);
    // If a match is found, return the number. Otherwise, return 0.
    return match ? parseInt(match[1]) : 0;
}

function showView(viewName) {
    if(gradeSelectionView) gradeSelectionView.style.display = 'none';
    if(categorySelectionView) categorySelectionView.style.display = 'none';
    if(chapterManagementView) chapterManagementView.style.display = 'none';

    if (viewName === 'grade') gradeSelectionView.style.display = 'block';
    if (viewName === 'category') categorySelectionView.style.display = 'block';
    if (viewName === 'chapters') chapterManagementView.style.display = 'block';
}

async function fetchAndDisplayChapters() {
    chapterManagementTitle.textContent = `Manage: Grade ${selectedGrade} - ${selectedCategory}`;
    const { data: quizzes, error } = await supabaseClient
        .from('quizzes')
        .select('id, chapter_title')
        .eq('grade', selectedGrade)
        .eq('category', selectedCategory);

    if (error) return console.error('Error fetching quizzes:', error);

    // --- ADD THIS SORTING LOGIC ---
    quizzes.sort((a, b) => {
        const numA = extractLessonNumber(a.chapter_title);
        const numB = extractLessonNumber(b.chapter_title);
        return numA - numB;
    });
    // --- END OF NEW LOGIC ---

    chapterListContainer.innerHTML = '';
    if (quizzes.length === 0) {
        chapterListContainer.innerHTML = '<p>No quizzes found. Add one!</p>';
    } else {
        quizzes.forEach(quiz => {
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter-item';
            chapterDiv.innerHTML = `<h3>${quiz.chapter_title}</h3><div class="chapter-buttons"><button class="btn minecraft-btn edit-quiz-btn" data-quiz-id="${quiz.id}">✏️ Edit</button><button class="btn minecraft-btn delete-quiz-btn" data-quiz-id="${quiz.id}">🗑️ Delete</button></div>`;
            chapterListContainer.appendChild(chapterDiv);
        });
    }
    showView('chapters');
}

function openQuizEditor(quiz = null) {
    quizEditorForm.reset();
    questionsEditorContainer.innerHTML = '';
    
    if (quiz) {
        quizEditorTitle.textContent = 'Edit Chapter';
        quizIdInput.value = quiz.id;
        chapterTitleInput.value = quiz.chapter_title;
        paragraphInput.value = quiz.paragraph;
        if (quiz.questions && quiz.questions.length > 0) {
            quiz.questions.forEach(q => addQuestionField(q));
        }
    } else {
        quizEditorTitle.textContent = 'Add New Chapter';
        quizIdInput.value = '';
        addQuestionField(); 
    }
    quizEditorModal.style.display = 'flex';
}

// In English Quiz/teacher-admin-script.js

function addQuestionField(question = {}) {
    const questionHtmlId = question.id ? `existing_${question.id}` : `new_${Date.now()}`;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-block';
    questionDiv.dataset.questionHtmlId = questionHtmlId;

    // Basic HTML structure for the question text and a container for options
    questionDiv.innerHTML = `
        <label>Question:</label>
        <textarea class="minecraft-input-field question-text" rows="3" required>${question.question_text || ''}</textarea>
        <div class="options-container"></div>
        <button type="button" class="btn minecraft-btn add-option-btn">+ Add Option</button>
        <label>Correct Answer:</label>
        <select class="minecraft-input-field correct-option"></select>
        <button type="button" class="btn minecraft-btn remove-question-btn">Remove Question</button>
    `;

    questionsEditorContainer.appendChild(questionDiv);

    // Dynamically add the options that already exist for this question
    const optionsContainer = questionDiv.querySelector('.options-container');
    const options = question.options ? Object.entries(question.options) : [['a', ''], ['b', '']]; // Default to 2 empty options
    options.forEach(([key, value]) => {
        addOptionInput(optionsContainer, key, value);
    });

    // Update the dropdown to show the correct options
    updateCorrectAnswerDropdown(questionDiv, question.correct_option);
}

// In English Quiz/teacher-admin-script.js

// This function creates the HTML for a single option input field
function addOptionInput(container, key, value = '') {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input-block';
    optionDiv.innerHTML = `
        <label class="option-label">Option ${key.toUpperCase()}:</label>
        <textarea class="minecraft-input-field option-text" data-option-key="${key}" rows="2" required>${value}</textarea>
        <button type="button" class="btn minecraft-btn remove-option-btn">Remove option</button>
    `;
    container.appendChild(optionDiv);
}

// This function updates the 'Correct Answer' dropdown based on the available options
function updateCorrectAnswerDropdown(questionDiv, selectedKey) {
    const correctOptionSelect = questionDiv.querySelector('.correct-option');
    const optionInputs = questionDiv.querySelectorAll('.option-text');
    
    correctOptionSelect.innerHTML = ''; // Clear existing options
    optionInputs.forEach(input => {
        const key = input.dataset.optionKey;
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `Option ${key.toUpperCase()}`;
        if (key === selectedKey) {
            option.selected = true;
        }
        correctOptionSelect.appendChild(option);
    });
}



// --- NEW, CORRECTED SUBMIT FUNCTION ---
// In English Quiz/teacher-admin-script.js

async function handleQuizFormSubmit(e) {
    e.preventDefault();
    const quizId = quizIdInput.value;
    const isEditing = !!quizId;

    // ... (quizData setup remains the same)
    const quizData = {
        grade: selectedGrade,
        category: selectedCategory,
        chapter_title: chapterTitleInput.value,
        paragraph: paragraphInput.value,
        author_id: currentUser.id
    };

    let upsertedQuizId = quizId;
    // ... (quiz upsert logic remains the same)
    if (isEditing) {
        const { error } = await supabaseClient.from('quizzes').update(quizData).eq('id', quizId);
        if (error) { console.error('Error updating quiz', error); return; }
    } else {
        const { data, error } = await supabaseClient.from('quizzes').insert(quizData).select().single();
        if (error) { console.error('Error inserting quiz', error); return; }
        upsertedQuizId = data.id;
    }

    const allPromises = [];
    const formQuestionIds = [];

    // Process all questions currently in the form
    document.querySelectorAll('#questions-editor-container .question-block').forEach(qDiv => {
        const questionHtmlId = qDiv.dataset.questionHtmlId;
        const optionsObject = {};
        
        // Dynamically build the options object
        qDiv.querySelectorAll('.option-text').forEach(opt => {
            optionsObject[opt.dataset.optionKey] = opt.value;
        });

        const questionData = {
            quiz_id: upsertedQuizId,
            question_text: qDiv.querySelector('.question-text').value,
            options: optionsObject, // Use the dynamically created object
            correct_option: qDiv.querySelector('.correct-option').value
        };

        if (questionHtmlId.startsWith('new_')) {
            allPromises.push(supabaseClient.from('questions').insert(questionData));
        } else {
            const existingId = questionHtmlId.split('_')[1];
            formQuestionIds.push(existingId);
            allPromises.push(supabaseClient.from('questions').update(questionData).eq('id', existingId));
        }
    });
    
    // ... (The rest of the function for deleting questions remains the same)
    if (isEditing) {
        // ...
    }
    
    await Promise.all(allPromises).catch(error => {
        console.error('Error during question update/insert:', error);
        alert('There was an error saving the questions. Please check the console for details.');
    });
    
    quizEditorModal.style.display = 'none';
    fetchAndDisplayChapters();
}


async function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this chapter and all its questions? This cannot be undone.')) return;
    
    await supabaseClient.from('submissions').delete().eq('quiz_id', quizId);
    await supabaseClient.from('questions').delete().eq('quiz_id', quizId);
    await supabaseClient.from('quizzes').delete().eq('id', quizId);

    fetchAndDisplayChapters();
}

// In English Quiz/teacher-admin-script.js

async function downloadSubmissions() {
    if (!selectedGrade || !selectedCategory) {
        alert("Please select a grade and category before downloading submissions.");
        return;
    }

    const { data, error } = await supabaseClient.rpc('get_submissions_for_export', {
        grade_param: parseInt(selectedGrade),
        category_param: selectedCategory
    });

    if (error) {
        alert('An error occurred while fetching submissions data. Please check the console for details.');
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        alert('No submissions found for this grade and category to download.');
        return;
    }

    const submissionsByTeacher = data.reduce((acc, submission) => {
        const teacher = submission.teacher_name || 'Unknown Teacher';
        if (!acc[teacher]) acc[teacher] = [];
        acc[teacher].push({
            'Student Name': submission.student_name,
            'Chapter': submission.chapter_title,
            'Score': submission.score,
            'Time (seconds)': submission.time_taken_seconds,
            'Grade': submission.grade,
            'Section': submission.section
        });
        return acc;
    }, {});

    const wb = XLSX.utils.book_new();
    for (const teacher in submissionsByTeacher) {
        const ws = XLSX.utils.json_to_sheet(submissionsByTeacher[teacher]);
        XLSX.utils.book_append_sheet(wb, ws, teacher.substring(0, 31));
    }
    XLSX.writeFile(wb, `Submissions_Grade${selectedGrade}_${selectedCategory}.xlsx`);
}
// Add event listener for the new button
document.addEventListener('click', async (e) => {
    // ... (existing event listeners) ...
    if (e.target.id === 'download-submissions-btn') downloadSubmissions();
});

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if(quizEditorForm) quizEditorForm.addEventListener('submit', handleQuizFormSubmit);

document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-grade]')) { selectedGrade = e.target.dataset.grade; showView('category'); }
    if (e.target.matches('[data-category]')) { selectedCategory = e.target.dataset.category; fetchAndDisplayChapters(); }
    if (e.target.id === 'back-to-grade') showView('grade');
    if (e.target.id === 'back-to-category') showView('category');
    if (e.target.id === 'add-new-quiz-btn') openQuizEditor();
    if (e.target.matches('.edit-quiz-btn')) {
        const quizId = e.target.dataset.quizId;
        const { data: quiz } = await supabaseClient.from('quizzes').select('*').eq('id', quizId).single();
        const { data: questions } = await supabaseClient.from('questions').select('*').eq('quiz_id', quizId);
        openQuizEditor({ ...quiz, questions });
    }
    if (e.target.matches('.delete-quiz-btn')) deleteQuiz(e.target.dataset.quizId);
    if (e.target.id === 'add-question-btn') addQuestionField();
    if (e.target.matches('.remove-question-btn')) e.target.closest('.question-block').remove();
    if (e.target.id === 'cancel-quiz-editor') quizEditorModal.style.display = 'none';

    // Handles adding a new option to a question
    if (e.target.matches('.add-option-btn')) {
        const questionBlock = e.target.closest('.question-block');
        const optionsContainer = questionBlock.querySelector('.options-container');
        const existingOptionsCount = optionsContainer.querySelectorAll('.option-input-block').length;
        const nextOptionChar = String.fromCharCode(97 + existingOptionsCount); // a, b, c, d...
        addOptionInput(optionsContainer, nextOptionChar);
        updateCorrectAnswerDropdown(questionBlock);
    }

    // Handles removing an option from a question
    if (e.target.matches('.remove-option-btn')) {
        const questionBlock = e.target.closest('.question-block');
        e.target.closest('.option-input-block').remove();
        // After removing, we must re-label and update the dropdown
        const remainingOptions = questionBlock.querySelectorAll('.option-input-block');
        remainingOptions.forEach((opt, index) => {
            const newKey = String.fromCharCode(97 + index);
            opt.querySelector('.option-label').textContent = `Option ${newKey.toUpperCase()}:`;
            opt.querySelector('.option-text').dataset.optionKey = newKey;
        });
        updateCorrectAnswerDropdown(questionBlock);
    }
    // --- END OF NEW LOGIC ---

    if (e.target.matches('.delete-quiz-btn')) deleteQuiz(e.target.dataset.quizId);
    if (e.target.id === 'add-question-btn') addQuestionField();
    // ... (the rest of the listeners)
});
document.addEventListener('DOMContentLoaded', init);
