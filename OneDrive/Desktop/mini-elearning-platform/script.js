// Course data
const courses = [
    {
        id: 1,
        title: "Engineering mathematics",
        description: "Learn the basics of Engineering mathematics",
        fullDescription: "Master Engineering mathematics from scratch. This comprehensive course covers differential equations,vector,line integral,complex analysis, and more. Perfect for beginners!",
        duration: "6 weeks",
        level: "Beginner",
        lessons: [
            "Introduction to differential equation",
            "First order differential equation",
            "Vectors ",
            "Complex variables,limit",
            "Cauchy riemann equation",
            "Mapping"
        ]
    },
    {
        id: 2,
        title: "Strength of materials",
        description: "Deep understanding about strength of materials",
        fullDescription: "Recognise a structural system that is stable ad in equilibrium",
        duration: "4 weeks",
        level: "Intermediate",
        lessons: [
            "Equilibrum of forces",
            "Hooke's law",
            "Shear force",
            "Elastic bulcking",
            "Torsion",
            "Mohr's circle"
        ]
    },
    {
        id: 3,
        title: "Circut theory",
        description: "Understand the concept of circuit theory",
        fullDescription: "Understand network response to certain input signals",
        duration: "8 weeks",
        level: "Intermediate",
        lessons: [
            "Passsive circuit element",
            "Transfomers",
            "Network functions",
            "Laplace transform",
            "Resonance",
            "KCL loop current"
        ]
    },
    {
        id: 4,
        title: "Thermodynamics",
        description: "Master the concept of thermodynamics ",
        fullDescription: "Learn the basic concept ,definitions and laws in thermodynamics ",
        duration: "10 weeks",
        level: "Beginner",
        lessons: [
            "Zeroth law ",
            "Open and close system",
            "Pure substances",
            "first and second law of thermodynamics",
            "Heat and work",
            "Ideal gas "
        ]
    }
];

// Get completed courses from memory
let completedCourses = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    displayCourses();
    checkUserLogin();
    setupModalEvents();
});

// Display courses on the page
function displayCourses() {
    const coursesList = document.getElementById('coursesList');
    coursesList.innerHTML = '';

    courses.forEach(course => {
        const isCompleted = completedCourses.includes(course.id);
        const courseCard = document.createElement('div');
        courseCard.className = `course-card ${isCompleted ? 'completed' : ''}`;
        courseCard.innerHTML = `
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div class="course-meta">
                <span>⏱️ ${course.duration}</span> | 
                <span>📊 ${course.level}</span>
            </div>
        `;
        courseCard.addEventListener('click', () => showCourseDetail(course));
        coursesList.appendChild(courseCard);
    });
}

// Show course detail in modal
function showCourseDetail(course) {
    const modal = document.getElementById('courseModal');
    const courseDetail = document.getElementById('courseDetail');
    const isCompleted = completedCourses.includes(course.id);

    courseDetail.innerHTML = `
        <h2>${course.title}</h2>
        <p><strong>Duration:</strong> ${course.duration} | <strong>Level:</strong> ${course.level}</p>
        <p>${course.fullDescription}</p>
        <h3>Course Content:</h3>
        <ul>
            ${course.lessons.map(lesson => `<li>${lesson}</li>`).join('')}
        </ul>
        <button class="btn-primary btn-complete ${isCompleted ? 'completed' : ''}" 
                onclick="toggleCourseCompletion(${course.id})">
            ${isCompleted ? '✓ Completed' : 'Mark as Complete'}
        </button>
    `;

    modal.style.display = 'block';
}

// Toggle course completion
function toggleCourseCompletion(courseId) {
    const index = completedCourses.indexOf(courseId);
    
    if (index === -1) {
        completedCourses.push(courseId);
    } else {
        completedCourses.splice(index, 1);
    }

    // Update display
    displayCourses();
    
    // Find and update the course detail view
    const course = courses.find(c => c.id === courseId);
    if (course) {
        showCourseDetail(course);
    }
}

// Setup modal close events
function setupModalEvents() {
    const modal = document.getElementById('courseModal');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Check if user is logged in
function checkUserLogin() {
    const welcomeMsg = document.getElementById('welcomeMsg');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginLink = document.getElementById('loginLink');

    // Check if there's a current user (would be in memory)
    const currentUser = getCurrentUser();

    if (currentUser) {
        welcomeMsg.textContent = `Welcome, ${currentUser.name}`;
        logoutBtn.style.display = 'inline-block';
        loginLink.style.display = 'none';

        logoutBtn.onclick = () => {
            logout();
        };
    }
}

// Get current user from memory (placeholder for actual implementation)
function getCurrentUser() {
    // In a real app, you'd check session/token
    // For this prototype, we'll return null
    return null;
}

// Logout function
function logout() {
    // Clear user session
    window.location.reload();
}