// js/navbar.js

// เช็คสถานะ Login ทันที
const currentUser = sessionStorage.getItem('kpi_username');
const userRole = sessionStorage.getItem('kpi_role');

// ถ้าไม่มี user ในระบบ และไม่ได้อยู่หน้า index.html ให้เด้งกลับไปหน้า Login
if (!currentUser && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/JVL-RCA-Management/')) {
    window.location.href = 'index.html';
}

function renderNavbar() {
    const path = window.location.pathname;
    let navLinks = '';

    // ซ่อนเมนูบันทึกข้อมูล ถ้าเป็น Guest
    if (userRole !== 'Guest') {
        navLinks += `<a href="entry.html" class="${path.includes('entry') ? 'active' : ''}">📝 จัดการข้อมูล KPI</a>`;
    }
    
    // ทุกคนเห็น Dashboard
    navLinks += `<a href="dashboard.html" class="${path.includes('dashboard') ? 'active' : ''}">📊 Dashboard & Run Chart</a>`;
    
    // เฉพาะ Admin เห็นหน้าตั้งค่า
    if (userRole === 'God Admin' || userRole === 'Admin') {
        navLinks += `<a href="settings.html" class="${path.includes('settings') ? 'active' : ''}">⚙️ จัดการหมวดหมู่</a>`;
    }

    const navHTML = `
        <div class="topbar">
            <div class="topbar-left">
                <button class="menu-toggle" onclick="toggleMobileMenu()">☰</button>
                <img src="https://www.rploei.go.th/ec2/wp-content/uploads/2017/08/cropped-cropped-cropped-3.png" alt="Logo" class="nav-logo">
                <h3 class="nav-title">JVL KPI Management</h3>
            </div>
            <div class="topbar-right">
                <span>👤 ${currentUser} (${userRole})</span>
                <button class="btn-logout" onclick="logout()">ออกจากระบบ</button>
            </div>
        </div>
        <nav id="mobileMenu" class="nav-menu">
            ${navLinks}
        </nav>
    `;

    // แทรก Navbar ไว้บนสุดของ body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// เมื่อโหลดไฟล์ HTML เสร็จ ให้สร้าง Navbar ทันที (ยกเว้นหน้า login)
if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    document.addEventListener("DOMContentLoaded", renderNavbar);
}
