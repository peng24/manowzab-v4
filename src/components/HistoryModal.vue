<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="history-modal-container">
      
      <!-- HEADER -->
      <div class="modal-header">
        <h2><i class="fa-solid fa-clock-rotate-left"></i> ประวัติการขาย (History)</h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- SIDEBAR: List of Lives -->
        <div class="sidebar">
          <div class="sidebar-header">
            <span>รายการย้อนหลัง</span>
            <button class="btn-icon-sm" @click="history.fetchHistoryList" title="รีเฟรช">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
          </div>
          
          <div v-if="history.isLoading.value" class="text-center p-10 text-muted">
            <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...
          </div>

          <div v-else class="sidebar-list">
             <div 
               v-for="item in history.historyList.value" 
               :key="item.videoId"
               class="sidebar-item"
               :class="{ active: selectedId === item.videoId }"
               @click="selectLive(item)"
             >
               <div class="item-title">{{ item.title || "ไม่มีชื่อ" }}</div>
               <div class="item-date">
                 <i class="fa-regular fa-calendar"></i> {{ formatDate(item.timestamp) }}
               </div>
               <div class="item-meta">
                 ยอด: {{ formatCurrency(item.totalSales || 0) }}
               </div>
             </div>
             
             <div v-if="history.historyList.value.length === 0" class="text-center p-10 text-muted">
                ไม่พบข้อมูลประวัติ
             </div>
          </div>
        </div>

        <!-- MAIN CONTENT: Details -->
        <div class="main-content">
          <div v-if="!selectedItem" class="empty-state">
            <i class="fa-solid fa-arrow-left"></i>
            <p>เลือกรายการทางซ้ายเพื่อดูรายละเอียด</p>
          </div>

          <div v-else class="content-wrapper">
             <!-- Top Stats -->
             <div class="stats-bar">
                <div class="stat-box">
                   <div class="stat-label">ยอดขายรวม</div>
                   <div class="stat-value text-success">{{ formatCurrency(totalRevenue) }}</div>
                </div>
                <div class="stat-box">
                   <div class="stat-label">จำนวนสินค้า</div>
                   <div class="stat-value">{{ filteredOrders.length }} ชิ้น</div>
                </div>
                <div class="stat-actions">
                   <button class="btn btn-danger" @click="handleDelete">
                     <i class="fa-solid fa-trash"></i> ลบ
                   </button>
                   <button class="btn btn-success" @click="exportCSV">
                     <i class="fa-solid fa-file-csv"></i> Export CSV
                   </button>
                </div>
             </div>

             <!-- Controls -->
             <div class="controls-bar">
                <div class="search-wrapper">
                  <i class="fa-solid fa-magnifying-glass search-icon"></i>
                  <input 
                    v-model="searchQuery" 
                    type="text" 
                    class="search-input" 
                    placeholder="ค้นหาชื่อลูกค้า, รหัสสินค้า..."
                  >
                </div>
             </div>

             <!-- Table -->
             <div class="table-container">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th width="80">ลำดับ</th>
                     <th width="100">รหัส</th>
                     <th>ลูกค้า</th>
                     <th width="120" class="text-right">ราคา</th>
                     <th width="100" class="text-center">ช่องทาง</th>
                     <th width="120">เวลา</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr v-if="filteredOrders.length === 0">
                      <td colspan="6" class="text-center py-20 text-muted">ไม่พบข้อมูลคำสั่งซื้อ</td>
                   </tr>
                   <tr v-for="(order, index) in filteredOrders" :key="order.stockId">
                     <td class="text-muted">#{{ index + 1 }}</td>
                     <td class="font-bold">{{ order.stockId }}</td>
                     <td>
                        <div class="customer-name">{{ order.owner }}</div>
                        <div class="customer-uid text-sm text-muted">{{ order.uid }}</div>
                     </td>
                     <td class="text-right font-mono">{{ formatCurrency(order.price || 0) }}</td>
                     <td class="text-center">
                        <span class="badge" :class="order.method === 'manual-force' ? 'badge-warn' : 'badge-info'">
                           {{ order.method || 'System' }}
                        </span>
                     </td>
                     <td class="text-sm text-muted">
                        {{ formatTime(order.timestamp) }}
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useHistory } from "../composables/useHistory";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);
const history = useHistory();

const selectedId = ref(null);
const selectedItem = ref(null);
const searchQuery = ref("");

onMounted(() => {
  history.fetchHistoryList();
});

function selectLive(item) {
  selectedId.value = item.videoId;
  selectedItem.value = item;
  searchQuery.value = ""; // Reset search
}

// Convert orders object to array
const ordersList = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return [];
  
  return Object.keys(selectedItem.value.orders).map(key => ({
     stockId: key,
     ...selectedItem.value.orders[key]
  })).sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
});

// Filter Logic
const filteredOrders = computed(() => {
  if (!searchQuery.value) return ordersList.value;
  const q = searchQuery.value.toLowerCase();
  
  return ordersList.value.filter(o => 
     o.stockId.toString().includes(q) ||
     (o.owner && o.owner.toLowerCase().includes(q))
  );
});

// Stats Logic (Recalculate based on filtered view or all? Usually all is better for Summary)
// But let's show stats for the VIEW (Filtered) or Total? Let's go with Total of Selected Live
const totalRevenue = computed(() => {
  // Use filtered for dynamic stats, or ordersList for absolute total? 
  // Requirement says "Total Revenue" usually implies the whole live.
  // Let's use filtered to be interactive.
  return filteredOrders.value.reduce((sum, o) => sum + (o.price || 0), 0);
});

// Formatters
function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(val) {
   return new Intl.NumberFormat('th-TH').format(val);
}

// Actions
async function handleDelete() {
  const result = await Swal.fire({
    title: "ยืนยันการลบ?",
    text: `ต้องการลบประวัติ "${selectedItem.value.title}" และแชททั้งหมด?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ลบข้อมูล",
    cancelButtonText: "ยกเลิก"
  });

  if (result.isConfirmed) {
     await history.deleteHistory(selectedId.value);
     selectedId.value = null;
     selectedItem.value = null;
     Swal.fire("เรียบร้อย", "ลบข้อมูลสำเร็จแล้ว", "success");
  }
}

function exportCSV() {
  if (filteredOrders.value.length === 0) {
     Swal.fire("ไม่มีข้อมูล", "ไม่พบรายการสั่งซื้อ", "warning");
     return;
  }

  let csvContent = "\uFEFFDate,Time,Stock ID,Customer Name,Price,Source\n"; // BOM for Thai
  
  const dateStr = formatDate(selectedItem.value.timestamp).split(' ')[0]; // Just date part

  filteredOrders.value.forEach(order => {
     const timeStr = formatTime(order.timestamp);
     const safeName = order.owner ? order.owner.replace(/"/g, '""') : "";
     
     csvContent += `"${dateStr}","${timeStr}",${order.stockId},"${safeName}",${order.price || 0},"${order.method || 'unknown'}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `sales_history_${selectedId.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<style scoped>
.history-modal-container {
  background: var(--bg-panel, #0f172a);
  width: 95%;
  max-width: 1100px;
  height: 85vh;
  border-radius: 12px;
  border: 1px solid var(--border-color, #334155);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 15px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
}
.btn-close:hover { color: #fff; }

.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 300px;
  background: #1e293b;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 10px 15px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  color: #94a3b8;
  font-size: 0.9em;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
}

.sidebar-item {
  padding: 15px;
  border-bottom: 1px solid #334155;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-item:hover { background: #334155; }
.sidebar-item.active { background: #2563eb; border-color: #2563eb; }

.item-title {
  color: #f1f5f9;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}
.item-date { color: #94a3b8; font-size: 0.85em; }
.item-meta { margin-top: 5px; color: #10b981; font-size: 0.9em; font-weight: bold; }

.sidebar-item.active .item-date,
.sidebar-item.active .item-meta { color: #cbd5e1; }

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  position: relative;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 1.2em;
  gap: 15px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.stats-bar {
  display: flex;
  padding: 20px;
  gap: 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.stat-box {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  padding: 15px;
  border-radius: 8px;
}
.stat-label { color: #94a3b8; font-size: 0.9em; margin-bottom: 5px; }
.stat-value { font-size: 1.5em; font-weight: bold; color: #fff; }

.controls-bar {
  padding: 15px 20px;
  border-bottom: 1px solid #334155;
}

.search-wrapper {
  position: relative;
  max-width: 400px;
}
.search-input {
  width: 100%;
  padding: 10px 10px 10px 40px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #fff;
  font-size: 1em;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #1e293b;
  color: #94a3b8;
  padding: 12px 15px;
  text-align: left;
  font-weight: 500;
  position: sticky;
  top: 0;
}

.data-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #1e293b;
  color: #e2e8f0;
}

.data-table tr:hover td {
  background: #1e293b;
}

.font-bold { font-weight: 600; }
.font-mono { font-family: 'Courier New', monospace; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
.text-success { color: #10b981; }
.text-sm { font-size: 0.85em; }

.badge {
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.75em;
  font-weight: 600;
}
.badge-info { background: #3b82f6; color: white; }
.badge-warn { background: #f59e0b; color: white; }

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-icon-sm { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
.btn-icon-sm:hover { color: #fff; }

/* Responsive */
@media (max-width: 768px) {
  .history-modal-container {
     flex-direction: column;
     height: 95vh;
  }
  .sidebar { width: 100%; height: 200px; border-right: none; border-bottom: 1px solid #334155; }
  .modal-body { flex-direction: column; }
}
</style>
