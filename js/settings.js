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
        // ใช้ JSON.stringify ช่วยส่ง Object ผ่าน Onclick
        let safeData = encodeURIComponent(JSON.stringify(ind));
        tbody.innerHTML += `
            <tr>
                <td><b>${ind.id}</b></td>
                <td>${ind.name}</td>
                <td>${ind.unit}</td>
                <td>${ind.multiplier}</td>
                <td style="color:var(--primary); font-weight:bold;">${ind.operator}</td>
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
        // สร้าง Label ให้ดูง่าย เช่น [HA] HA ตอน II - HA ตอน II-2
        let path = [cat.l1, cat.l2, cat.l3, cat.l4].filter(Boolean).join(' > ');
        if(cat.desc) path += ` (${cat.desc})`;
        
        container.innerHTML += `
            <label class="checkbox-item">
                <input type="checkbox" name="catMap" value="${cat.id}"> ${path}
            </label>
        `;
    });
}

// เปิด Modal (แยกโหมดเพิ่มใหม่ / แก้ไข)
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
        
        // แก้ไข Operator ที่มี ' นำหน้าจาก Google Sheet ให้แสดงผลปกติ
        let opValue = ind.operator.toString().replace(/'/g, "");
        document.getElementById('indOperator').value = opValue;
        
        // ติ๊ก Checkbox ตาม Mapped Categories
        ind.categories.forEach(catId => {
            let cb = document.querySelector(`input[name="catMap"][value="${catId}"]`);
            if (cb) cb.checked = true;
        });
        
        // ดึงเป้าหมายรายปีมาสร้างเป็นแถว
        for (const [year, target] of Object.entries(ind.targets)) {
            addYearlyTargetRow(year, target);
        }
    } else {
        // โหมดเพิ่มใหม่
        document.getElementById('modalTitle').innerText = '✨ เพิ่มตัวชี้วัดใหม่';
        document.getElementById('indId').value = '';
        document.getElementById('indName').value = '';
        document.getElementById('indUnit').value = '';
        document.getElementById('indMultiplier').value = '100'; // Default
        document.getElementById('indOperator').value = '>='; // Default
        addYearlyTargetRow('', ''); // แถมแถวว่างให้ 1 แถว
    }
}

function closeModal() {
    document.getElementById('indicatorModal').style.display = 'none';
}

function addYearlyTargetRow(year, target) {
    let container = document.getElementById('yearlyTargetsArea');
    let rowId = 'row_' + new Date().getTime() + Math.random(); // สร้าง ID ป้องกันการซ้ำ
    
    let rowHTML = `
        <div class="target-row" id="${rowId}">
            <input type="number" class="t-year" placeholder="ปี เช่น 2026" value="${year}" style="width: 120px;" required>
            <input type="number" step="0.01" class="t-val" placeholder="เป้าหมาย เช่น 85" value="${target}" style="width: 150px;" required>
            <button type="button" class="btn-remove-target" onclick="document.getElementById('${rowId}').remove()">ลบ</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
}

// รวบรวมข้อมูลและส่ง API
async function saveIndicatorData() {
    let indId = document.getElementById('indId').value;
    let name = document.getElementById('indName').value.trim();
    let unit = document.getElementById('indUnit').value.trim();
    let multiplier = document.getElementById('indMultiplier').value;
    let operator = document.getElementById('indOperator').value;
    
    if (!name || !multiplier) {
        document.getElementById('modalError').innerText = "กรุณากรอกชื่อและตัวคูณให้ครบถ้วน";
        return;
    }

    // 1. ดึงค่า Checkbox ที่ถูกติ๊กมาใส่ Array
    let selectedCats = [];
    document.querySelectorAll('input[name="catMap"]:checked').forEach(cb => {
        selectedCats.push(cb.value);
    });

    // 2. ดึงค่าเป้าหมายรายปีมาประกอบเป็น JSON Object
    let targetsObj = {};
    let targetRows = document.querySelectorAll('.target-row');
    targetRows.forEach(row => {
        let y = row.querySelector('.t-year').value.trim();
        let v = parseFloat(row.querySelector('.t-val').value);
        if (y && !isNaN(v)) {
            targetsObj[y] = v;
        }
    });

    // ประกอบร่างข้อมูลส่ง API
    let payload = {
        username: username,
        action: indId ? 'updateIndicator' : 'saveIndicator',
        indId: indId, // จะถูกใช้เฉพาะตอน Update
        indData: {
            name: name,
            unit: unit,
            multiplier: multiplier,
            operator: operator,
            categories: selectedCats,
            targets: targetsObj
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
    if (confirm("การลบตัวชี้วัด จะไม่สามารถกู้คืนได้ แน่ใจหรือไม่?")) {
        try {
            const responseMsg = await callAPI({ action: 'deleteIndicator', username: username, indId: indId });
            alert(responseMsg);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    }
}
