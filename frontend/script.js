// API Configuration
const API_BASE_URL = 'https://trackmate-production-888b.up.railway.app'; // ✅ Railway backend URL
const ATTENDANCE_API_URL = `${API_BASE_URL}/getAttendance`; // Endpoint in your backend

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.querySelector('.btn-text');
const btnSpinner = document.querySelector('.btn-spinner');
const logoutBtn = document.getElementById('logoutBtn');
const errorMessage = document.getElementById('errorMessage');
const coursesContainer = document.getElementById('coursesContainer');
const filterBtns = document.querySelectorAll('.filter-btn');

// Student Data Elements
const studentName = document.getElementById('studentName');
const displayAdmissionNo = document.getElementById('displayAdmissionNo');
const department = document.getElementById('department');
const batch = document.getElementById('batch');
const section = document.getElementById('section');
const currentSemester = document.getElementById('currentSemester');

// Statistics Elements
const totalSubjects = document.getElementById('totalSubjects');
const totalPresent = document.getElementById('totalPresent');
const totalAbsent = document.getElementById('totalAbsent');
const overallPercent = document.getElementById('overallPercent');

// Progress Elements
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');

// Summary Elements
const safeCount = document.getElementById('safeCount');
const warningCount = document.getElementById('warningCount');
const dangerCount = document.getElementById('dangerCount');

// Global Variables
let currentCourses = [];
let currentStudentData = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterCourses(btn.dataset.filter);
    });
});

// Initialize the application
function initApp() {
    const savedData = localStorage.getItem('trackmate_student_data');
    const savedUsername = localStorage.getItem('trackmate_username');
    
    if (savedData && savedUsername) {
        try {
            showDashboard();
            processAttendanceData(JSON.parse(savedData));
            displayAdmissionNo.textContent = savedUsername;
        } catch (e) {
            showLogin();
        }
    } else {
        showLogin();
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError('Please enter both admission number and password');
        return;
    }

    setLoginButtonState(true);
    hideError();

    try {
        // ✅ Call your Railway backend instead of direct API
        const response = await fetch(ATTENDANCE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admission_no: username, password })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch attendance');
        }

        const data = await response.json();
        await processAPIResponse(data, username);
        
    } catch (error) {
        showError(error.message);
        setLoginButtonState(false);
    }
}

// Process API response
async function processAPIResponse(data, username) {
    if (!data.response || !data.response.data || data.response.data.length === 0) {
        throw new Error('No attendance data found for your account. Please check your credentials.');
    }

    // Filter out the "Total" entry and process actual courses
    const courseData = data.response.data.filter(course => 
        course.cdata && course.cdata.course_code && course.cdata.course_code !== "Total"
    );

    if (courseData.length === 0) {
        throw new Error('No course data available for current semester');
    }

    // Store the data
    localStorage.setItem('trackmate_student_data', JSON.stringify(courseData));
    localStorage.setItem('trackmate_username', username);
    
    showDashboard();
    processAttendanceData(courseData);
}

// Everything else (UI updates, progress bars, logout, filtering) remains the same
