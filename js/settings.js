// js/settings.js

const username = sessionStorage.getItem('kpi_username');
const role = sessionStorage.getItem('kpi_role');
let masterCategories = [];
let allIndicators = [];

if (role !== 'God Admin' && role !== 'Admin') {
    alert('ไม่มีสิทธิ์เข้าถึงหน้านี้');
    window.location.href = 'dashboard.html';
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();
});

// --- ส่วนที่ 1: โหลดและแสดงข้อมูล ---
async function loadData() {
    document.getElementById('loader').style.display = 'block';
    try {
        const response = await callAPI({ action: 'getAllIndicators', username: username });
        allIndicators = response.indicators;
        masterCategories = response.categories;
        
        renderTable();
        renderCategoryCheckboxes();
    } catch (error) {
        alert("โหลดข้อมูลล้มเหลว: " + error.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function renderTable() {
    let tbody = document.getElementById('indicatorsTableBody');
    tbody.innerHTML = '';
    
    if (allIndicators.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">ยังไม่มีข้อมูลตัวชี้วัด</td></tr>';
        return;
    }
    
    allIndicators.forEach(ind => {
        // Encode Object เป็น String เพื่อส่งผ่านปุ่ม Onclick
        let safeData = encodeURIComponent(JSON.stringify(ind));
        tbody.innerHTML += `
            <tr>
                <td><b>${ind.id}</b></td>
                <td>${ind.name}</td>
                <td>${ind.unit}</td>
                <td>${ind.multiplier}</td>
                <td style="color:var(--primary); font-weight:bold; font-size:16px;">${ind.operator}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openModal('${safeData}')" style="background:#ffc107; color:#000; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">แก้ไข</button>
                    <button onclick="deleteInd('${ind.id}')" style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">ลบ</button>
                </td>
            </tr>
        `;
    });
}

function renderCategoryCheckboxes() {
    let container = document.getElementById('categoryCheckboxes');
    container.innerHTML = '';
    
    masterCategories.forEach(cat => {
        // สร้าง Label ให้ดูง่าย (L1 > L2 > L3 > L4)
        let path = [cat.l1, cat.l2, cat.l3, cat.l4].filter(Boolean).join(' > ');
        if(cat.desc) path += ` (${cat.desc})`;
        
        container.innerHTML += `
            <label class="checkbox-item">
                <input type="checkbox" name="catMap" value="${cat.id}"> ${path}
            </label>
        `;
    });
}

// --- ส่วนที่ 2: เพิ่มหมวดหมู่ใหม่ (Category) ---
async function saveCategory() {
    let l1 = document.getElementById('catL1').value.trim();
    let l2 = document.getElementById('catL2').value.trim();
    let l3 = document.getElementById('catL3').value.trim();
    let l4 = document.getElementById('catL4').value.trim();
    let desc = document.getElementById('catDesc').value.trim();
    
    if(!l1) {
        alert('กรุณาระบุหมวดหมู่หลัก (L1) อย่างน้อย 1 ช่อง');
        return;
    }
    
    document.getElementById('catStatus').innerText = "กำลังบันทึก...";
    
    try {
        const res = await callAPI({
            action: 'saveNewCategory',
            username: username,
            l1: l1, l2: l2, l3: l3, l4: l4, desc: desc
        });
        
        document.getElementById('catStatus').innerText = res;
        document.getElementById('catL1').value = '';
        document.getElementById('catL2').value = '';
        document.getElementById('catL3').value = '';
        document.getElementById('catL4').value = '';
        document.getElementById('catDesc').value = '';
        
        loadData(); // รีโหลดข้อมูลเพื่อให้ Checkbox หมวดหมู่ใหม่โผล่ขึ้นมาทันที
        
        setTimeout(() => document.getElementById('catStatus').innerText = "", 4000);
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
        document.getElementById('catStatus').innerText = "";
    }
}

// --- ส่วนที่ 3: จัดการ Modal ตัวชี้วัด (Indicator) ---
function openModal(encodedData = null) {
    document.getElementById('indicatorModal').style.display = 'flex';
    document.getElementById('modalError').innerText = '';
    
    let targetArea = document.getElementById('yearlyTargetsArea');
    targetArea.innerHTML = ''; // ล้างแถวเป้าหมายเดิม
    
    // เคลียร์ Checkbox ทั้งหมดก่อน
    document.querySelectorAll('input[name="catMap"]').forEach(cb => cb.checked = false);

    if (encodedData) {
        // โหมดแก้ไข
        let ind = JSON.parse(decodeURIComponent(encodedData));
        document.getElementById('modalTitle').innerText = '✏️ แก้ไขตัวชี้วัด';
        document.getElementById('indId').value = ind.id;
        document.getElementById('indName').value = ind.name;
        document.getElementById('indUnit').value = ind.unit;
        document.getElementById('indMultiplier').value = ind.multiplier;
        
        // เซ็ตค่า Operator (ลบเครื่องหมาย ' ที่ติดมาจาก Google Sheet ออกก่อนโชว์)
        let opValue = ind.operator.toString().replace(/'/g, "");
        document.getElementById('indOperator').value = opValue;
        
        // ติ๊ก Checkbox ตาม Mapped Categories
        if (ind.categories && Array.isArray(ind.categories)) {
            ind.categories.forEach(catId => {
                let cb = document.querySelector(`input[name="catMap"][value="${catId}"]`);
                if (cb) cb.checked = true;
            });
        }
        
        // ดึงเป้าหมายรายปีมาสร้างเป็นแถว
        if (ind.targets) {
            for (const [year, target] of Object.entries(ind.targets)) {
                addYearlyTargetRow(year, target);
            }
        }
    } else {
        // โหมดเพิ่มใหม่
        document.getElementById('modalTitle').innerText = '✨ เพิ่มตัวชี้วัดใหม่';
        document.getElementById('indId').value = '';
        document.getElementById('indName').value = '';
        document.getElementById('indUnit').value = '';
        document.getElementById('indMultiplier').value = '100'; // ค่าตั้งต้น (ร้อยละ)
        document.getElementById('indOperator').value = '>='; // ค่าตั้งต้น
        addYearlyTargetRow('', ''); // แถมแถวว่างให้ 1 แถวสำหรับกรอกปีแรก
    }
}

function closeModal() {
    document.getElementById('indicatorModal').style.display = 'none';
}

function addYearlyTargetRow(year, target) {
    let container = document.getElementById('yearlyTargetsArea');
    let rowId = 'row_' + new Date().getTime() + Math.random(); 
    
    let rowHTML = `
        <div class="target-row" id="${rowId}">
            <input type="number" class="t-year" placeholder="ปี พ.ศ. เช่น 2569" value="${year}" style="width: 150px;" required>
            <input type="number" step="0.01" class="t-val" placeholder="เป้าหมาย เช่น 85" value="${target}" style="width: 150px;" required>
            <button type="button" class="btn-remove-target" onclick="document.getElementById('${rowId}').remove()">ลบ</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
}

// แปลงข้อมูลและส่งเข้า API
async function saveIndicatorData() {
    let indId = document.getElementById('indId').value;
    let name = document.getElementById('indName').value.trim();
    let unit = document.getElementById('indUnit').value.trim();
    let multiplier = document.getElementById('indMultiplier').value;
    let operator = document.getElementById('indOperator').value;
    
    if (!name || !multiplier) {
        document.getElementById('modalError').innerText = "กรุณากรอกชื่อตัวชี้วัดและตัวคูณให้ครบถ้วน";
        return;
    }

    // ดึงค่า ID ของหมวดหมู่ที่ถูกติ๊ก
    let selectedCats = [];
    document.querySelectorAll('input[name="catMap"]:checked').forEach(cb => {
        selectedCats.push(cb.value);
    });

    // ดึงค่าเป้าหมายรายปี แปลงเป็น Object { "2569": 85 }
    let targetsObj = {};
    let targetRows = document.querySelectorAll('.target-row');
    targetRows.forEach(row => {
        let y = row.querySelector('.t-year').value.trim();
        let v = parseFloat(row.querySelector('.t-val').value);
        if (y && !isNaN(v)) {
            targetsObj[y] = v;
        }
    });

    let payload = {
        username: username,
        action: indId ? 'updateIndicator' : 'saveIndicator',
        indId: indId,
        indData: {
            name: name,
            unit: unit,
            multiplier: multiplier,
            operator: operator,
            categories: selectedCats, // Array -> ระบบหลังบ้านจะ JSON.stringify ให้
            targets: targetsObj       // Object -> ระบบหลังบ้านจะ JSON.stringify ให้
        }
    };

    let btn = document.getElementById('btnSaveModal');
    btn.disabled = true; btn.innerText = "กำลังบันทึก...";

    try {
        const responseMsg = await callAPI(payload);
        closeModal();
        loadData(); // โหลดตารางใหม่
        alert(responseMsg);
    } catch (error) {
        document.getElementById('modalError').innerText = error.message;
    } finally {
        btn.disabled = false; btn.innerText = "บันทึกข้อมูล";
    }
}

async function deleteInd(indId) {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตัวชี้วัดนี้? ข้อมูลเป้าหมายและการ Mapping จะถูกลบทิ้งทั้งหมด")) {
        try {
            const responseMsg = await callAPI({ action: 'deleteIndicator', username: username, indId: indId });
            alert(responseMsg);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    }
}
