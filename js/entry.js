// js/entry.js

const username = sessionStorage.getItem('kpi_username');
const role = sessionStorage.getItem('kpi_role');
let kpiMasterData = []; // เก็บข้อมูล KPI ไว้เช็คสูตร

if (role === 'Guest') {
    alert('Guest ไม่มีสิทธิ์เข้าถึงหน้านี้');
    window.location.href = 'dashboard.html';
}

document.addEventListener("DOMContentLoaded", () => {
    loadInitialData();
    loadHistoryTable();
});

async function loadInitialData() {
    try {
        const data = await callAPI({ action: 'getInitData', username: username });
        kpiMasterData = data.kpis;
        
        let kpiSel = document.getElementById('kpiSelect');
        kpiSel.innerHTML = '<option value="">-- กรุณาเลือกตัวชี้วัด --</option>';
        
        kpiMasterData.forEach(k => {
            kpiSel.innerHTML += `<option value="${k.id}">[${k.id}] ${k.name}</option>`;
        });
        
        if (kpiMasterData.length === 0) {
            kpiSel.innerHTML = '<option value="">-- ไม่พบตัวชี้วัดที่ท่านรับผิดชอบ --</option>';
            document.getElementById('btnSave').disabled = true;
        }

        // เมื่อเปลี่ยนตัวชี้วัด ให้ล้างช่องตัวเลขและเช็คเงื่อนไขตัวหาร
        kpiSel.addEventListener('change', function() {
            let selected = kpiMasterData.find(k => k.id === this.value);
            document.getElementById('valA').value = '';
            document.getElementById('valB').value = '';
            document.getElementById('actualValue').value = '';
            
            if (selected) {
                document.getElementById('unitDisplay').innerText = `(${selected.unit})`;
                // ถ้า Multiplier = 1 (เป็นค่าจำนวนเต็ม) ให้ปิดช่องตัวหาร
                if (selected.multiplier == 1) {
                    document.getElementById('valB').disabled = true;
                    document.getElementById('hintB').innerText = "(ไม่ต้องกรอก)";
                } else {
                    document.getElementById('valB').disabled = false;
                    document.getElementById('hintB').innerText = "";
                }
            }
        });

    } catch (error) {
        document.getElementById('entryError').innerText = "โหลดข้อมูลล้มเหลว: " + error.message;
    }
}

// ฟังก์ชันคำนวณผลลัพธ์อัตโนมัติ (Trigger เมื่อมีการพิมพ์ตัวเลข)
function calculateResult() {
    let kpiId = document.getElementById('kpiSelect').value;
    if (!kpiId) return;

    let selectedKpi = kpiMasterData.find(k => k.id === kpiId);
    let a = parseFloat(document.getElementById('valA').value) || 0;
    let b = parseFloat(document.getElementById('valB').value) || 0;
    let resultInput = document.getElementById('actualValue');

    if (selectedKpi.multiplier == 1) {
        resultInput.value = a; // เป็นจำนวนเต็ม
    } else {
        if (b > 0) {
            let calc = (a / b) * selectedKpi.multiplier;
            // ปัดเศษ 2 ตำแหน่ง หากมีทศนิยม
            resultInput.value = Number.isInteger(calc) ? calc : calc.toFixed(2);
        } else {
            resultInput.value = ''; // รอตัวหาร
        }
    }
}

async function loadHistoryTable() {
    document.getElementById('tableLoader').style.display = 'block';
    let tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    try {
        const history = await callAPI({ action: 'getKpiHistory', username: username });
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#666;">ไม่พบประวัติข้อมูลของคุณ</td></tr>';
        } else {
            history.forEach(row => {
                let denDisplay = row.den == 0 ? '-' : row.den;
                tbody.innerHTML += `
                    <tr>
                        <td>${row.period}</td>
                        <td><b>[${row.indId}]</b> ${row.indName}</td>
                        <td>${row.num}</td>
                        <td>${denDisplay}</td>
                        <td><strong>${row.value}</strong></td>
                        <td style="font-size:13px;">${row.recordedBy}<br><span style="color:#888; font-size:11px;">${row.timestamp}</span></td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button onclick="setEditMode('${row.dataId}', '${row.indId}', '${row.period}', '${row.num}', '${row.den}', '${row.value}')" style="background:#ffc107; color:#000; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">แก้ไข</button>
                            <button onclick="deleteRecord('${row.dataId}')" style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">ลบ</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว: ${error.message}</td></tr>`;
    } finally {
        document.getElementById('tableLoader').style.display = 'none';
    }
}

async function submitData() {
    let dataId = document.getElementById('editDataId').value;
    let kpiId = document.getElementById('kpiSelect').value;
    let period = document.getElementById('period').value.trim();
    let num = document.getElementById('valA').value;
    let den = document.getElementById('valB').value || 0; // ถ้าโดน Disable ไว้ จะจับค่า 0 มาแทน
    let actualValue = document.getElementById('actualValue').value;

    if (!kpiId || !period || num === '' || actualValue === '') {
        document.getElementById('entryError').innerText = "*กรุณากรอกข้อมูลให้ครบถ้วน";
        return;
    }
    
    document.getElementById('entryError').innerText = "";
    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.innerText = "กำลังประมวลผล...";

    try {
        let payload = {
            action: dataId ? 'updateKpiData' : 'saveKpiData',
            username: username,
            indId: kpiId,
            period: period,
            num: num,
            den: den,
            actualValue: actualValue
        };
        if (dataId) payload.dataId = dataId;

        const responseMessage = await callAPI(payload);
        document.getElementById('saveStatus').innerText = responseMessage;
        cancelEdit(); 
        loadHistoryTable(); 
        
        setTimeout(() => document.getElementById('saveStatus').innerText = "", 3000);
    } catch (error) {
        document.getElementById('entryError').innerText = error.message;
    } finally {
        btnSave.disabled = false;
    }
}

function setEditMode(dataId, indId, period, num, den, actualValue) {
    document.getElementById('formTitle').innerText = "✏️ แก้ไขข้อมูลผลการดำเนินงาน";
    document.getElementById('editDataId').value = dataId;
    
    let kpiSel = document.getElementById('kpiSelect');
    kpiSel.value = indId;
    kpiSel.dispatchEvent(new Event('change')); // กระตุ้นให้เปลี่ยนชื่อหน่วยและปลดล็อกช่องตัวหาร

    document.getElementById('period').value = period;
    document.getElementById('valA').value = num;
    document.getElementById('valB').value = den == 0 ? '' : den;
    document.getElementById('actualValue').value = actualValue;
    
    const btnSave = document.getElementById('btnSave');
    btnSave.innerText = "อัปเดตข้อมูล";
    btnSave.style.background = "#ffc107";
    btnSave.style.color = "#000";
    
    document.getElementById('btnCancel').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('formTitle').innerText = "📝 บันทึกผลการดำเนินงานใหม่";
    document.getElementById('editDataId').value = '';
    document.getElementById('period').value = '';
    document.getElementById('valA').value = '';
    document.getElementById('valB').value = '';
    document.getElementById('actualValue').value = '';
    
    const btnSave = document.getElementById('btnSave');
    btnSave.innerText = "บันทึกข้อมูล";
    btnSave.style.background = "var(--primary)";
    btnSave.style.color = "white";
    
    document.getElementById('btnCancel').style.display = 'none';
    document.getElementById('entryError').innerText = "";
}

async function deleteRecord(dataId) {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การลบไม่สามารถกู้คืนได้")) {
        try {
            const responseMessage = await callAPI({ action: 'deleteKpiData', username: username, dataId: dataId });
            alert(responseMessage);
            loadHistoryTable();
        } catch (error) {
            alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
        }
    }
}
