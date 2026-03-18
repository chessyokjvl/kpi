// js/entry.js

const username = sessionStorage.getItem('kpi_username');
const role = sessionStorage.getItem('kpi_role');

// ตรวจสอบสิทธิ์อีกชั้น ป้องกัน Guest เข้าหน้านี้
if (role === 'Guest') {
    alert('Guest ไม่มีสิทธิ์เข้าถึงหน้านี้');
    window.location.href = 'dashboard.html';
}

document.addEventListener("DOMContentLoaded", () => {
    loadInitialData();
    loadHistoryTable();
});

// โหลดรายการ KPI ที่ User มีสิทธิ์บันทึก
async function loadInitialData() {
    try {
        const data = await callAPI({ action: 'getInitData', username: username });
        let kpiSel = document.getElementById('kpiSelect');
        kpiSel.innerHTML = '<option value="">-- กรุณาเลือกตัวชี้วัด --</option>';
        
        data.kpis.forEach(k => {
            kpiSel.innerHTML += `<option value="${k.id}">[${k.id}] ${k.name}</option>`;
        });
        
        if (data.kpis.length === 0) {
            kpiSel.innerHTML = '<option value="">-- ไม่พบตัวชี้วัดที่ท่านรับผิดชอบ --</option>';
            document.getElementById('btnSave').disabled = true;
        }
    } catch (error) {
        document.getElementById('entryError').innerText = "ไม่สามารถโหลดข้อมูลตัวชี้วัดได้: " + error.message;
    }
}

// โหลดประวัติลงตาราง
async function loadHistoryTable() {
    document.getElementById('tableLoader').style.display = 'block';
    let tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    try {
        const history = await callAPI({ action: 'getKpiHistory', username: username });
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666;">ไม่พบประวัติข้อมูลของคุณ</td></tr>';
        } else {
            history.forEach(row => {
                tbody.innerHTML += `
                    <tr>
                        <td>${row.period}</td>
                        <td><b>[${row.indId}]</b> ${row.indName}</td>
                        <td><strong>${row.value}</strong></td>
                        <td>${row.recordedBy}</td>
                        <td style="font-size:12px; color:#666;">${row.timestamp}</td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button onclick="setEditMode('${row.dataId}', '${row.indId}', '${row.period}', ${row.value})" style="background:#ffc107; color:#000; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">แก้ไข</button>
                            <button onclick="deleteRecord('${row.dataId}')" style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">ลบ</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว: ${error.message}</td></tr>`;
    } finally {
        document.getElementById('tableLoader').style.display = 'none';
    }
}

// ส่งข้อมูล (แยก Insert หรือ Update อัตโนมัติจากค่า Hidden ID)
async function submitData() {
    let dataId = document.getElementById('editDataId').value;
    let kpiId = document.getElementById('kpiSelect').value;
    let period = document.getElementById('period').value.trim();
    let val = document.getElementById('actualValue').value;

    if (!kpiId || !period || !val) {
        document.getElementById('entryError').innerText = "*กรุณากรอกข้อมูลให้ครบถ้วน (เลือกตัวชี้วัด, ระบุงวดเวลา, ใส่ผลงาน)";
        return;
    }
    
    document.getElementById('entryError').innerText = "";
    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.innerText = "กำลังประมวลผล...";

    try {
        let responseMessage;
        if (dataId) {
            // โหมดแก้ไข
            responseMessage = await callAPI({
                action: 'updateKpiData',
                username: username,
                dataId: dataId,
                indId: kpiId,
                period: period,
                actualValue: val
            });
        } else {
            // โหมดบันทึกใหม่
            responseMessage = await callAPI({
                action: 'saveKpiData',
                username: username,
                indId: kpiId,
                period: period,
                actualValue: val
            });
        }
        
        // เมื่อสำเร็จ
        document.getElementById('saveStatus').innerText = responseMessage;
        cancelEdit(); // เคลียร์ฟอร์ม
        loadHistoryTable(); // โหลดตารางใหม่
        
        setTimeout(() => document.getElementById('saveStatus').innerText = "", 3000);
    } catch (error) {
        document.getElementById('entryError').innerText = error.message;
    } finally {
        btnSave.disabled = false;
    }
}

// ดูดข้อมูลจากตารางกลับขึ้นไปบนฟอร์ม
function setEditMode(dataId, indId, period, value) {
    document.getElementById('formTitle').innerText = "✏️ แก้ไขข้อมูลผลการดำเนินงาน";
    document.getElementById('editDataId').value = dataId;
    document.getElementById('kpiSelect').value = indId;
    document.getElementById('period').value = period;
    document.getElementById('actualValue').value = value;
    
    const btnSave = document.getElementById('btnSave');
    btnSave.innerText = "อัปเดตข้อมูล";
    btnSave.style.background = "#ffc107";
    btnSave.style.color = "#000";
    
    document.getElementById('btnCancel').style.display = 'inline-block';
    
    // เลื่อนหน้าจอขึ้นไปที่ฟอร์มด้านบนอย่างนุ่มนวล
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ยกเลิกการแก้ไข และล้างฟอร์ม
function cancelEdit() {
    document.getElementById('formTitle').innerText = "📝 บันทึกผลการดำเนินงานใหม่";
    document.getElementById('editDataId').value = '';
    document.getElementById('period').value = '';
    document.getElementById('actualValue').value = '';
    
    const btnSave = document.getElementById('btnSave');
    btnSave.innerText = "บันทึกข้อมูล";
    btnSave.style.background = "var(--primary)";
    btnSave.style.color = "white";
    
    document.getElementById('btnCancel').style.display = 'none';
    document.getElementById('entryError').innerText = "";
}

// ฟังก์ชันลบข้อมูล
async function deleteRecord(dataId) {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การลบไม่สามารถกู้คืนได้")) {
        try {
            const responseMessage = await callAPI({
                action: 'deleteKpiData',
                username: username,
                dataId: dataId
            });
            alert(responseMessage);
            loadHistoryTable();
        } catch (error) {
            alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
        }
    }
}
