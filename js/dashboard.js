// js/dashboard.js

let activeCharts = [];
let allCategories = [];
const username = sessionStorage.getItem('kpi_username');

document.addEventListener("DOMContentLoaded", () => {
    loadInitialData();

    // ผูก Event Listener ให้ Dropdown
    document.getElementById('filterL1').addEventListener('change', updateL2Dropdown);
    document.getElementById('filterL2').addEventListener('change', updateL3Dropdown);
    document.getElementById('filterL3').addEventListener('change', updateL4Dropdown);
    document.getElementById('filterL4').addEventListener('change', loadDashboardData);
});

async function loadInitialData() {
    try {
        const data = await callAPI({ action: 'getInitData', username: username });
        allCategories = data.categories;

        let l1Set = new Set(allCategories.map(c => c.l1).filter(Boolean));
        let l1Select = document.getElementById('filterL1');
        l1Select.innerHTML = '<option value="">-- เลือก L1 --</option>';
        l1Set.forEach(l1 => l1Select.innerHTML += `<option value="${l1}">${l1}</option>`);
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}

function updateL2Dropdown() {
    let l1 = document.getElementById('filterL1').value;
    let l2Select = document.getElementById('filterL2');
    let l3Select = document.getElementById('filterL3');
    let l4Select = document.getElementById('filterL4');
    
    l2Select.innerHTML = '<option value="">-- ทั้งหมดใน L1 --</option>';
    l3Select.innerHTML = '<option value="">-- ทั้งหมดใน L2 --</option>';
    l4Select.innerHTML = '<option value="">-- ทั้งหมดใน L3 --</option>';
    l3Select.disabled = true; l4Select.disabled = true;

    if (!l1) { 
        l2Select.disabled = true; 
        clearDashboard(); 
        return; 
    }
    
    l2Select.disabled = false;
    let l2Set = new Set(allCategories.filter(c => c.l1 === l1 && c.l2).map(c => c.l2));
    l2Set.forEach(l2 => l2Select.innerHTML += `<option value="${l2}">${l2}</option>`);
    
    loadDashboardData();
}

function updateL3Dropdown() {
    let l1 = document.getElementById('filterL1').value;
    let l2 = document.getElementById('filterL2').value;
    let l3Select = document.getElementById('filterL3');
    let l4Select = document.getElementById('filterL4');
    
    l3Select.innerHTML = '<option value="">-- ทั้งหมดใน L2 --</option>';
    l4Select.innerHTML = '<option value="">-- ทั้งหมดใน L3 --</option>';
    l4Select.disabled = true;
    
    if (!l2) { l3Select.disabled = true; loadDashboardData(); return; }
    
    l3Select.disabled = false;
    let l3Set = new Set(allCategories.filter(c => c.l1 === l1 && c.l2 === l2 && c.l3).map(c => c.l3));
    l3Set.forEach(l3 => l3Select.innerHTML += `<option value="${l3}">${l3}</option>`);
    
    loadDashboardData();
}

function updateL4Dropdown() {
    let l1 = document.getElementById('filterL1').value;
    let l2 = document.getElementById('filterL2').value;
    let l3 = document.getElementById('filterL3').value;
    let l4Select = document.getElementById('filterL4');
    
    l4Select.innerHTML = '<option value="">-- ทั้งหมดใน L3 --</option>';
    
    if (!l3) { l4Select.disabled = true; loadDashboardData(); return; }
    
    l4Select.disabled = false;
    let l4Set = new Set(allCategories.filter(c => c.l1 === l1 && c.l2 === l2 && c.l3 === l3 && c.l4).map(c => c.l4));
    l4Set.forEach(l4 => l4Select.innerHTML += `<option value="${l4}">${l4}</option>`);
    
    loadDashboardData();
}

function clearDashboard() {
    document.getElementById('summaryTableArea').style.display = 'none';
    document.getElementById('categoryDescDisplay').style.display = 'none';
    document.getElementById('chartsContainer').innerHTML = '';
    activeCharts.forEach(c => c.destroy());
    activeCharts = [];
}

async function loadDashboardData() {
    let l1 = document.getElementById('filterL1').value;
    if (!l1) return;

    let l2 = document.getElementById('filterL2').value;
    let l3 = document.getElementById('filterL3').value;
    let l4 = document.getElementById('filterL4').value;

    document.getElementById('loader').style.display = 'block';
    clearDashboard();

    try {
        const dataPayload = await callAPI({
            action: 'getDashboardData',
            l1: l1, l2: l2, l3: l3, l4: l4
        });
        
        renderDashboard(dataPayload);
    } catch (error) {
        alert("ดึงข้อมูลกราฟล้มเหลว: " + error.message);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function renderDashboard(dataPayload) {
    let tableArea = document.getElementById('summaryTableArea');
    let tbody = document.getElementById('dashTableBody');
    let container = document.getElementById('chartsContainer');
    let descArea = document.getElementById('categoryDescDisplay');
    
    if (dataPayload.description) {
        descArea.innerHTML = `<strong>ℹ️ คำอธิบายหมวดหมู่:</strong> ${dataPayload.description}`;
        descArea.style.display = 'block';
    }
    
    let kpiList = dataPayload.kpiList;
    if (kpiList.length === 0) {
        container.innerHTML = "<p style='grid-column: 1 / -1; text-align:center;'>ไม่พบตัวชี้วัดในหมวดหมู่นี้</p>";
        return;
    }

    tableArea.style.display = 'block';
    
    kpiList.forEach((kpi, index) => {
        let isPass = kpi.status === 'ผ่านเป้า';
        let color = isPass ? '#28a745' : (kpi.latestValue === '-' ? '#333' : '#dc3545');
        
        tbody.innerHTML += `
            <tr>
                <td>${kpi.id}</td>
                <td>${kpi.name}</td>
                <td>${kpi.target}</td>
                <td><strong>${kpi.latestValue}</strong></td>
                <td style="color:${color}; font-weight:bold;">${kpi.status}</td>
            </tr>`;

        if(kpi.periods.length > 0) {
            let div = document.createElement('div');
            div.className = 'chart-box';
            div.innerHTML = `<h4 style="margin-top:0; color:#003366; font-size:15px;">${kpi.name}</h4><canvas id="canvas_${index}"></canvas>`;
            container.appendChild(div);

            let ctx = document.getElementById(`canvas_${index}`).getContext('2d');
            let targetLine = kpi.targetLines; // ใช้ข้อมูลเป้าหมายที่คำนวณแยกตามปีมาจาก API

            let chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: kpi.periods,
                    datasets: [
                        { label: 'ผลงานจริง', data: kpi.values, borderColor: '#005bb5', backgroundColor: '#005bb5', tension: 0, pointRadius: 4, fill: false },
                        { label: 'เป้าหมาย', data: targetLine, borderColor: '#dc3545', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false }
                    ]
                },
                options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
            });
            activeCharts.push(chart);
        }
    });
}
