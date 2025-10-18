// API Configuration
const API_BASE_URL = 'https://abes.platform.simplifii.com/api/v1';
const ATTENDANCE_API_URL = `${API_BASE_URL}/custom/getCFMappedWithStudentID`;

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
        // Try direct API access without authentication first
        await fetchStudentAttendanceDirect(username, password);
        
    } catch (error) {
        showError(error.message);
        setLoginButtonState(false);
    }
}

// Fetch student attendance data directly (main approach)
async function fetchStudentAttendanceDirect(username, password) {
    showLoadingState('Connecting to college server...');
    
    try {
        // Based on your inspect data, the API works with just the embed_attendance_summary parameter
        const params = new URLSearchParams({
            'embed_attendance_summary': '1'
        });

        const apiUrl = `${ATTENDANCE_API_URL}?${params}`;
        
        console.log('API URL:', apiUrl);
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Origin': window.location.origin,
            'Referer': window.location.href
        };

        // Try with Basic Authentication first
        headers['Authorization'] = `Basic ${btoa(username + ':' + password)}`;
        
        console.log('Request headers:', headers);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers,
            credentials: 'include'
        });

        console.log('Response status:', response.status);

        if (response.status === 403 || response.status === 401) {
            // If Basic Auth fails, try without authentication
            console.log('Basic Auth failed, trying without authentication...');
            return await fetchWithoutAuth(username);
        }

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        
        console.log('API Response:', data);
        
        await processAPIResponse(data, username);
        
    } catch (error) {
        console.error('Direct fetch error:', error);
        throw new Error('Failed to connect to college server: ' + error.message);
    }
}

// Try without authentication
async function fetchWithoutAuth(username) {
    showLoadingState('Attempting connection...');
    
    try {
        const params = new URLSearchParams({
            'embed_attendance_summary': '1'
        });

        const apiUrl = `${ATTENDANCE_API_URL}?${params}`;
        
        console.log('Trying without auth:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Origin': window.location.origin
            }
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        await processAPIResponse(data, username);
        
    } catch (error) {
        console.error('Without auth error:', error);
        // Try with CORS proxy as last resort
        await tryWithCorsProxy(username);
    }
}

// Try with CORS proxy
async function tryWithCorsProxy(username) {
    showLoadingState('Using alternative connection...');
    
    try {
        const params = new URLSearchParams({
            'embed_attendance_summary': '1'
        });

        const originalUrl = `${ATTENDANCE_API_URL}?${params}`;
        
        // Try different CORS proxies
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
            `https://cors-anywhere.herokuapp.com/${originalUrl}`
        ];

        let data = null;
        
        for (const proxyUrl of proxies) {
            try {
                console.log('Trying proxy:', proxyUrl);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    data = await response.json();
                    console.log('Proxy success with data:', data);
                    break;
                }
            } catch (error) {
                console.log(`Proxy failed:`, error.message);
                continue;
            }
        }

        if (!data) {
            throw new Error('All connection methods failed');
        }

        await processAPIResponse(data, username);
        
    } catch (error) {
        console.error('Proxy error:', error);
        throw new Error('Cannot connect to college server. Please try again later.');
    }
}

// Process API response
async function processAPIResponse(data, username) {
    console.log('Processing API response:', data);
    
    if (data.msg && data.msg !== "" && data.msg !== "Success") {
        throw new Error(data.msg || 'API returned an error');
    }

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

// Process attendance data and update UI
function processAttendanceData(courses) {
    hideLoadingState();
    
    if (!courses || courses.length === 0) {
        showNoDataState();
        return;
    }

    currentCourses = courses;
    currentStudentData = courses[0];

    updateStudentInfo();
    calculateOverallStatistics();
    updateProgressBar();
    renderCourses();
    updateSummary();
}

// Update student information in the header
function updateStudentInfo() {
    const student = currentStudentData;
    const username = localStorage.getItem('trackmate_username') || 'Unknown';
    
    displayAdmissionNo.textContent = username;
    studentName.textContent = `Student`;
    department.textContent = student.dept || 'IT';
    batch.textContent = student.batch || '2027';
    section.textContent = student.section || 'A';
    
    // Find the most common semester
    const semesters = currentCourses.map(course => course.semester).filter(s => s);
    const mostCommonSemester = semesters.length > 0 ? 
        semesters.sort((a,b) => 
            semesters.filter(v => v === a).length - semesters.filter(v => v === b).length
        ).pop() : '5';
    
    currentSemester.textContent = mostCommonSemester;
}

// Calculate overall attendance statistics
function calculateOverallStatistics() {
    let totalPresentCount = 0;
    let totalAbsentCount = 0;
    let totalClassesCount = 0;
    let subjectsCount = currentCourses.length;

    currentCourses.forEach(course => {
        const summary = course.attendance_summary;
        if (summary) {
            totalPresentCount += summary.Present || 0;
            totalAbsentCount += summary.Absent || 0;
            totalClassesCount += summary.Total || 0;
        }
    });

    const overallPercentage = totalClassesCount > 0 ? 
        Math.round((totalPresentCount / totalClassesCount) * 100) : 0;

    // Update statistics display
    totalSubjects.textContent = subjectsCount;
    totalPresent.textContent = totalPresentCount;
    totalAbsent.textContent = totalAbsentCount;
    overallPercent.textContent = `${overallPercentage}%`;
}

// Update progress bar
function updateProgressBar() {
    const present = parseInt(totalPresent.textContent) || 0;
    const total = (parseInt(totalPresent.textContent) || 0) + (parseInt(totalAbsent.textContent) || 0);
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    progressPercent.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;

    // Update status message
    if (percentage >= 75) {
        progressStatus.textContent = 'Excellent! Your attendance is above 75%';
        progressFill.style.background = 'linear-gradient(90deg, var(--accent), #00e676)';
    } else if (percentage >= 65) {
        progressStatus.textContent = 'Warning! Your attendance is between 65-75%';
        progressFill.style.background = 'linear-gradient(90deg, var(--warning), #ffb74d)';
    } else {
        progressStatus.textContent = 'Critical! Your attendance is below 65%';
        progressFill.style.background = 'linear-gradient(90deg, var(--danger), #ef5350)';
    }
}

// Render courses in the UI
function renderCourses() {
    coursesContainer.innerHTML = '';

    currentCourses.forEach(course => {
        const courseCard = createCourseCard(course);
        coursesContainer.appendChild(courseCard);
    });
}

// Create a course card element
function createCourseCard(course) {
    const card = document.createElement('div');
    const summary = course.attendance_summary;
    const percentValue = summary ? (parseFloat(summary.Percent) || 0) : 0;
    
    // Determine attendance status
    let status = 'safe';
    if (percentValue < 75) status = 'warning';
    if (percentValue < 65) status = 'danger';

    card.className = `course-card ${status}`;
    card.dataset.status = status;
    card.dataset.percent = percentValue;

    card.innerHTML = `
        <div class="course-header ${status}">
            <div class="course-code">${course.cdata.course_code}</div>
            <div class="attendance-percent">${summary ? summary.Percent : '0%'}</div>
        </div>
        <div class="course-body">
            <div class="course-name">${course.cdata.course_name}</div>
            <div class="course-info">
                <span><i class="fas fa-chalkboard-teacher"></i> ${course.faculty_name || 'Not Assigned'}</span>
                <span><i class="fas fa-graduation-cap"></i> Sem ${course.semester || 'N/A'}</span>
            </div>
            <div class="course-meta">
                <span><i class="fas fa-calendar"></i> ${course.cdata.academic_session || '2025-26'}</span>
                <span><i class="fas fa-users"></i> ${course.cdata.students_count_formatted || '0'} students</span>
            </div>
            <div class="attendance-details">
                <div class="attendance-item">
                    <span class="attendance-label">Present</span>
                    <span class="attendance-value present">${summary ? summary.Present : 0}</span>
                </div>
                <div class="attendance-item">
                    <span class="attendance-label">Absent</span>
                    <span class="attendance-value absent">${summary ? summary.Absent : 0}</span>
                </div>
                <div class="attendance-item">
                    <span class="attendance-label">Leave</span>
                    <span class="attendance-value">${summary ? (summary.Leave || 0) : 0}</span>
                </div>
                <div class="attendance-item">
                    <span class="attendance-label">Exempt</span>
                    <span class="attendance-value">${summary ? (summary.Exempt || 0) : 0}</span>
                </div>
                <div class="attendance-item">
                    <span class="attendance-label">Total Classes</span>
                    <span class="attendance-value total">${summary ? summary.Total : 0}</span>
                </div>
            </div>
            <div class="course-progress">
                <div class="course-progress-bar">
                    <div class="course-progress-fill ${status}" style="width: ${percentValue}%"></div>
                </div>
                <div class="progress-status">
                    ${getAttendanceStatusText(percentValue)}
                </div>
            </div>
        </div>
    `;

    // Set progress bar color based on status
    const progressFill = card.querySelector('.course-progress-fill');
    if (status === 'safe') {
        progressFill.style.background = 'var(--accent)';
    } else if (status === 'warning') {
        progressFill.style.background = 'var(--warning)';
    } else {
        progressFill.style.background = 'var(--danger)';
    }

    return card;
}

// Get attendance status text
function getAttendanceStatusText(percentage) {
    if (percentage >= 75) return '✅ Good attendance (Above 75%)';
    if (percentage >= 65) return '⚠️ Needs improvement (65-75%)';
    return '❌ Critical attendance (Below 65%)';
}

// Update summary section
function updateSummary() {
    let safe = 0, warning = 0, danger = 0;

    currentCourses.forEach(course => {
        const summary = course.attendance_summary;
        const percent = summary ? (parseFloat(summary.Percent) || 0) : 0;
        if (percent >= 75) safe++;
        else if (percent >= 65) warning++;
        else danger++;
    });

    safeCount.textContent = `${safe} subject${safe !== 1 ? 's' : ''}`;
    warningCount.textContent = `${warning} subject${warning !== 1 ? 's' : ''}`;
    dangerCount.textContent = `${danger} subject${danger !== 1 ? 's' : ''}`;
}

// Filter courses based on selected filter
function filterCourses(filter) {
    const courseCards = document.querySelectorAll('.course-card');
    
    courseCards.forEach(card => {
        const status = card.dataset.status;
        
        let show = true;
        switch(filter) {
            case 'safe':
                show = status === 'safe';
                break;
            case 'warning':
                show = status === 'warning';
                break;
            case 'danger':
                show = status === 'danger';
                break;
            default:
                show = true;
        }
        
        card.style.display = show ? 'block' : 'none';
    });
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('trackmate_student_data');
    localStorage.removeItem('trackmate_username');
    currentCourses = [];
    currentStudentData = null;
    showLogin();
}

// Show login section
function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    loginForm.reset();
    hideError();
}

// Show dashboard section
function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
}

// Set login button state
function setLoginButtonState(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        btnText.textContent = 'Connecting...';
        btnSpinner.classList.remove('hidden');
    } else {
        loginBtn.disabled = false;
        btnText.textContent = 'Sign In';
        btnSpinner.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorMessage.classList.add('hidden');
}

// Show loading state
function showLoadingState(message = 'Loading...') {
    coursesContainer.innerHTML = `
        <div class="no-data">
            <i class="fas fa-sync-alt fa-spin"></i>
            <p>${message}</p>
        </div>
    `;
}

// Hide loading state
function hideLoadingState() {
    // Loading state is cleared when courses are rendered
}

// Show no data state
function showNoDataState() {
    coursesContainer.innerHTML = `
        <div class="no-data">
            <i class="fas fa-inbox"></i>
            <p>No attendance data available for the current semester</p>
            <p style="margin-top: 10px; font-size: 0.9rem; opacity: 0.7;">
                Please check your credentials or contact administration
            </p>
        </div>
    `;
}

// Add custom styles
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .course-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 0.85rem;
            color: var(--gray);
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .course-meta span {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .attendance-value.present {
            color: var(--accent);
            font-weight: bold;
        }
        
        .attendance-value.absent {
            color: var(--danger);
            font-weight: bold;
        }
        
        .attendance-value.total {
            color: var(--primary);
            font-weight: bold;
        }
        
        .course-progress {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #f0f0f0;
        }
        
        .course-progress-bar {
            width: 100%;
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .course-progress-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.5s ease;
        }
        
        .progress-status {
            font-size: 0.8rem;
            color: var(--gray);
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

// Initialize custom styles when DOM is loaded
document.addEventListener('DOMContentLoaded', addCustomStyles);