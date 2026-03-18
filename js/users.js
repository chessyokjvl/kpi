// js/users.js

const username = sessionStorage.getItem('kpi_username');
const role = sessionStorage.getItem('kpi_role');
let allUsersList = [];
let uniqueTags = []; // เก็บชื่อหมวดหมู่ทั้งหมดเพื่อสร้าง Checkbox

if (role !== 'God Admin') {
    alert('เฉพาะ God Admin เท่านั้นที่เข้าถึงหน้านี้ได้');
    window.location.href = 'dashboard.html';
}

document.addEventListener("DOMContentLoaded", () => {
    loadUsersData();
});

async function loadUsersData() {
    document.getElementById('loader').style.display = 'block';
    try {
        const response = await callAPI({ action: 'getAllUsers', username: username });
        allUsersList = response.users;
        
        // สกัดชื่อหมวดหมู่ Level 1, 2, 3, 4 แบบไม่ซ้ำกัน ออกมาทำ Tag
        let tagSet = new Set();
        response.categories.forEach(c => {
            if(c.l1) tagSet.add(c.l1);
            if(c.l2) tagSet.add(c.l2);
            if(c.l3) tagSet.add(c.l3);
            if(c.l4) tagSet.add(c.l4);
        });
        uniqueTags = Array.from(tagSet).sort();
        
        renderUsersTable();
        renderTagCheckboxes();
    } catch (error) {
        alert("โหลดข้อมูลล้มเหลว: " + error.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function renderUsersTable() {
    let tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    allUsersList.forEach(u => {
        let badgeClass = u.role === 'God Admin' ? 'role-God' : '';
        // ใช้ JSON.stringify ช่วยส่ง Object
        let safeData = encodeURIComponent(JSON.stringify(u));
        let tagsDisplay = u.tags.includes('ALL') ? '<b style="color:green;">[ALL] เข้าถึงได้ทุกหมวด</b>' : u.tags.join(', ');

        tbody.innerHTML += `
            <tr>
                <td><b>${u.username}</b></td>
                <td>${u.password}</td>
                <td><span class="role-badge ${badgeClass}">${u.role}</span></td>
                <td style="font-size: 13px;">${tagsDisplay}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openUserModal('${safeData}')" style="background:#ffc107; color:#000; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">แก้ไข</button>
                    ${u.username !== username ? `<button onclick="deleteUserRow('${u.username}')" style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">ลบ</button>` : ''}
                </td>
            </tr>
        `;
    });
}

function renderTagCheckboxes() {
    let container = document.getElementById('tagCheckboxes');
    container.innerHTML = '';
    
    uniqueTags.forEach(tag => {
        container.innerHTML += `
            <label class="checkbox-item">
                <input type="checkbox" name="userTags" value="${tag}"> ${tag}
            </label>
        `;
    });
}

function toggleAllTags(checkbox) {
    document.querySelectorAll('input[name="userTags"]').forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

function openUserModal(encodedData = null) {
    document.getElementById('userModal').style.display = 'flex';
    document.getElementById('modalError').innerText = '';
    
    // เคลียร์ Checkbox
    document.getElementById('checkAllTags').checked = false;
    document.querySelectorAll('input[name="userTags"]').forEach(cb => cb.checked = false);

    if (encodedData) {
        let u = JSON.parse(decodeURIComponent(encodedData));
        document.getElementById('modalTitle').innerText = '✏️ แก้ไขข้อมูลผู้ใช้งาน';
        document.getElementById('editMode').value = 'true';
        document.getElementById('uName').value = u.username;
        document.getElementById('uName').disabled = true; // ห้ามแก้ Username
        document.getElementById('uName').style.background = '#eee';
        document.getElementById('uPass').value = u.password;
        document.getElementById('uRole').value = u.role;
        
        if (u.tags.includes('ALL')) {
            document.getElementById('checkAllTags').checked = true;
            toggleAllTags({checked: true});
        } else {
            u.tags.forEach(t => {
                let cb = document.querySelector(`input[name="userTags"][value="${t}"]`);
                if (cb) cb.checked = true;
            });
        }
    } else {
        document.getElementById('modalTitle').innerText = '✨ เพิ่มผู้ใช้งานใหม่';
        document.getElementById('editMode').value = 'false';
        document.getElementById('uName').value = '';
        document.getElementById('uName').disabled = false;
        document.getElementById('uName').style.background = '#fff';
        document.getElementById('uPass').value = '';
        document.getElementById('uRole').value = 'User';
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function saveUserData() {
    let isEdit = document.getElementById('editMode').value === 'true';
    let uName = document.getElementById('uName').value.trim();
    let uPass = document.getElementById('uPass').value.trim();
    let uRole = document.getElementById('uRole').value;
    
    if (!uName || !uPass) {
        document.getElementById('modalError').innerText = "กรุณากรอก Username และ Password";
        return;
    }

    let selectedTags = [];
    if (document.getElementById('checkAllTags').checked) {
        selectedTags.push('ALL');
    } else {
        document.querySelectorAll('input[name="userTags"]:checked').forEach(cb => {
            selectedTags.push(cb.value);
        });
    }

    let payload = {
        username: username, // คนที่กำลังกดยืนยัน (God Admin)
        action: isEdit ? 'updateUser' : 'saveUser',
        targetUsername: uName, // ชื่อคนที่ถูกแก้ไข
        userData: {
            username: uName,
            password: uPass,
            role: uRole,
            tags: selectedTags.length > 0 ? selectedTags : ['NONE']
        }
    };

    let btn = document.getElementById('btnSaveUser');
    btn.disabled = true; btn.innerText = "กำลังบันทึก...";

    try {
        const responseMsg = await callAPI(payload);
        closeUserModal();
        loadUsersData(); // โหลดตารางใหม่
        alert(responseMsg);
    } catch (error) {
        document.getElementById('modalError').innerText = error.message;
    } finally {
        btn.disabled = false; btn.innerText = "บันทึกข้อมูล";
    }
}

async function deleteUserRow(targetUsername) {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${targetUsername}" ?`)) {
        try {
            const responseMsg = await callAPI({ action: 'deleteUser', username: username, targetUsername: targetUsername });
            alert(responseMsg);
            loadUsersData();
        } catch (error) {
            alert(error.message);
        }
    }
}
