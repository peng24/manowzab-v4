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
            <div class="flex gap-1">
                 <button class="btn-icon-sm" @click="fixHistoryData" title="คำนวณยอดใหม่ (Fix Data)">
                   <i class="fa-solid fa-wrench"></i>
                 </button>
                 <button class="btn-icon-sm" @click="history.fetchHistoryList" title="รีเฟรช">
                   <i class="fa-solid fa-rotate-right"></i>
                 </button>
            </div>
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
                <div v-if="isDetailsLoading" class="flex items-center justify-center p-4 w-full text-muted">
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูล...
                </div>
                <template v-else>
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
                </template>
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
                
                <div class="view-toggles flex gap-2 ml-4">
                    <button 
                        class="btn btn-sm" 
                        :class="viewMode === 'list' ? 'btn-primary' : 'btn-outline'"
                        @click="viewMode = 'list'"
                        title="List View"
                    >
                        <i class="fa-solid fa-list"></i>
                    </button>
                    <button 
                        class="btn btn-sm" 
                        :class="viewMode === 'grid' ? 'btn-primary' : 'btn-outline'"
                        @click="viewMode = 'grid'"
                        title="Grid View"
                    >
                        <i class="fa-solid fa-th"></i>
                    </button>
                    <button 
                        v-if="viewMode === 'grid'"
                        class="btn btn-sm btn-outline" 
                        @click="isFullscreen = !isFullscreen"
                        title="Full Screen"
                    >
                        <i class="fa-solid fa-expand"></i>
                    </button>
                </div>
             </div>

             <!-- Table -->
             <!-- Table (List View) -->
             <div v-if="viewMode === 'list'" class="table-container">
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
                   <tr v-for="(order, index) in filteredOrders" :key="order.stockId" @click="openEditModal({ id: order.stockId, ...order })" class="cursor-pointer hover:bg-slate-700">
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
             
             <!-- Grid View -->
             <div v-else class="grid-container" :class="{ 'fullscreen-grid': isFullscreen }">
                <div v-if="isFullscreen" class="fullscreen-header">
                     <h2>รายการขาย {{ selectedItem.title }}</h2>
                     <button class="btn btn-danger" @click="isFullscreen = false">
                        <i class="fa-solid fa-compress"></i> ออก
                     </button>
                </div>
             
                <div class="grid-content">
                    <div 
                        v-for="item in allGridItems" 
                        :key="item.id"
                        class="grid-item cursor-pointer hover:border-blue-400"
                        :class="{ 'empty': item.isEmpty, 'sold': !item.isEmpty }"
                        @click="openEditModal(item)"
                    >
                        <div class="item-num">{{ item.id }}</div>
                        <div class="item-status">{{ item.isEmpty ? '-ว่าง-' : item.owner }}</div>
                        <div v-if="!item.isEmpty && item.price" class="item-price">{{ item.price }}</div>
                    </div>
                </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  </div>

  <!-- Edit Modal (Teleport or Overlay) -->
  <Teleport to="body">
    <div v-if="isEditModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" @click.self="closeEditModal">
        <div class="bg-[#1e293b] p-6 rounded-lg w-[90%] max-w-sm shadow-2xl border border-slate-600">
            <h3 class="text-xl text-white mb-4 flex items-center gap-2">
              <i class="fa-solid fa-pen-to-square"></i> แก้ไขรายการที่ {{ editingItem?.id }}
            </h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">ชื่อลูกค้า</label>
                    <input v-model="editForm.owner" type="text" class="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" placeholder="ใส่ชื่อลูกค้า">
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">ราคา</label>
                    <input v-model.number="editForm.price" type="number" class="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white">
                </div>
            </div>
            
            <div class="mt-6 flex gap-2 justify-end">
               <button class="btn btn-danger mr-auto" @click="clearItem">
                  <i class="fa-solid fa-eraser"></i> ล้าง
               </button>
               <button class="btn btn-outline" @click="closeEditModal">ยกเลิก</button>
               <button class="btn btn-success" @click="saveEdit">
                  <i class="fa-solid fa-save"></i> บันทึก
               </button>
            </div>
        </div>
    </div>
  </Teleport>
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
const viewMode = ref("list"); // 'list' | 'grid'
const isFullscreen = ref(false);

const isDetailsLoading = ref(false);

// Edit Modal State
const isEditModalOpen = ref(false);
const editingItem = ref(null); // { id, owner, price, uid, ... }
const editForm = ref({
  owner: "",
  price: 0
});

onMounted(() => {
  history.fetchHistoryList();
});

async function selectLive(item) {
  selectedId.value = item.videoId;
  selectedItem.value = { ...item }; // Copy basic info
  searchQuery.value = ""; // Reset search
  
  // Fetch details from stock node
  isDetailsLoading.value = true;
  const { orders, stockSize } = await history.fetchHistoryDetails(item.videoId);
  selectedItem.value.orders = orders;
  selectedItem.value.stockSize = stockSize;
  isDetailsLoading.value = false;
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

// Grid Items Logic (Fill gaps 1..stockSize)
const allGridItems = computed(() => {
    if (!selectedItem.value) return [];
    const size = selectedItem.value.stockSize || 70;
    const orders = selectedItem.value.orders || {};
    const items = [];

    for (let i = 1; i <= size; i++) {
        // Find if order exists for this number
        const order = orders[i];
        
        items.push({
            id: i,
            ...order,
            isEmpty: !order || !order.owner
        });
    }
    
    // If search exists, filter the list?
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        return items.filter(item => 
           item.id.toString().includes(q) || 
           (item.owner && item.owner.toLowerCase().includes(q))
        );
    }

    return items;
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

// Edit Modal Functions
function openEditModal(item) {
    editingItem.value = { ...item };
    editForm.value = {
        owner: item.owner || "",
        price: item.price || 0
    };
    isEditModalOpen.value = true;
}

function closeEditModal() {
    isEditModalOpen.value = false;
    editingItem.value = null;
}

async function saveEdit() {
    if (!editingItem.value) return;
    
    // Optimistic Update
    const updatedData = {
        owner: editForm.value.owner,
        price: editForm.value.price,
        uid: editingItem.value.uid || 'manual-' + Date.now(),
        method: editingItem.value.method || 'manual-edit'
    };

    // Update Local State
    if (!selectedItem.value.orders) selectedItem.value.orders = {};
    selectedItem.value.orders[editingItem.value.id] = {
        ...updatedData,
        timestamp: editingItem.value.timestamp || Date.now()
    };

    // Update Firebase
    await history.updateHistoryItem(selectedId.value, editingItem.value.id, updatedData);
    
    closeEditModal();
}

async function clearItem() {
     if (!editingItem.value) return;
     
      const result = await Swal.fire({
        title: "ล้างรายการนี้?",
        text: `ต้องการเคลียร์รายการที่ ${editingItem.value.id} ใช่ไหม?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: "ล้างเลย",
        cancelButtonText: "ยกเลิก"
      });
      
      if (result.isConfirmed) {
          // Local Update
           if (selectedItem.value.orders) {
               delete selectedItem.value.orders[editingItem.value.id];
           }
           
           // Firebase Update
           await history.updateHistoryItem(selectedId.value, editingItem.value.id, null);
           closeEditModal();
      }
}
async function fixHistoryData() {
    const result = await Swal.fire({
        title: "คำนวณยอดใหม่?",
        text: "ระบบจะสแกนรายการทั้งหมดและคำนวณยอดขายใหม่ (อาจใช้เวลาสักครู่)",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "เริ่มคำนวณ",
        cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
        await history.recalculateAllHistory();
        Swal.fire("เสร็จสิ้น", "คำนวณยอดขายทั้งหมดใหม่เรียบร้อยแล้ว", "success");
    }
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

/* Grid View CSS */
.grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #0f172a;
}

.grid-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 15px;
    padding-bottom: 50px;
}

.grid-item {
    aspect-ratio: 1.4;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 5px;
}

.grid-item.empty {
    opacity: 0.4;
    border-style: dashed;
}

.grid-item.sold {
    background: rgba(16, 185, 129, 0.1);
    border-color: #10b981;
}

.item-num {
    position: absolute;
    top: 4px;
    left: 8px;
    font-size: 1.2em;
    font-weight: bold;
    color: #64748b;
}

.item-status {
    font-size: 1.1em;
    font-weight: 500;
    color: #e2e8f0;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.grid-item.empty .item-status {
    color: #64748b;
    font-style: italic;
}

.item-price {
    font-size: 0.85em;
    color: #fbbf24;
    font-weight: bold;
    margin-top: 2px;
}

/* Toggle Buttons */
.btn-primary { background: #3b82f6; color: white; border: none; }
.btn-outline { background: transparent; border: 1px solid #475569; color: #94a3b8; }
.btn-outline:hover { background: #334155; color: white; }
.btn-sm { padding: 4px 8px; font-size: 0.9em; }

/* Fullscreen Grid */
.fullscreen-grid {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: #0f172a;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.fullscreen-header {
    padding: 15px 20px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fullscreen-header h2 { margin: 0; color: white; font-size: 1.25em; }

.fullscreen-grid .grid-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}
</style>
