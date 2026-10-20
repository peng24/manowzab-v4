<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown.esc="close">
        <div class="blacklist-modal-container" role="dialog" aria-modal="true">
          <!-- Modal Header -->
          <div class="bl-modal-header">
            <div class="bl-header-left">
              <div class="bl-header-icon">
                <i class="fa-solid fa-user-slash"></i>
              </div>
              <div class="bl-header-titles">
                <h3 class="bl-modal-title">จัดการรายชื่อที่ถูกแบน (Blacklist)</h3>
                <span class="bl-modal-subtitle">
                  ผู้ใช้ที่ถูกแบนจะไม่สามารถจองสินค้าได้ และระบบจะปิดเสียงอ่าน/เอฟเฟกต์อัตโนมัติ
                </span>
              </div>
            </div>
            <div class="bl-header-actions">
              <span class="bl-count-badge">
                {{ filteredBlacklist.length }} / {{ blacklistStore.blacklistCount }} คน
              </span>
              <button type="button" class="bl-close-btn" @click="close" title="ปิดหน้าต่าง (Esc)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Quick Add Ban Form -->
          <div class="bl-add-box">
            <div class="bl-add-title">
              <i class="fa-solid fa-plus-circle text-danger"></i>
              <span>เพิ่มรายชื่อแบนใหม่</span>
            </div>
            <div class="bl-add-form">
              <input
                type="text"
                v-model.trim="newBanName"
                class="bl-input bl-input-name"
                placeholder="ชื่อลูกค้า หรือ Channel ID..."
                @keydown.enter.prevent="handleAddBan"
              />
              <select v-model="newBanReason" class="bl-input bl-select-reason">
                <option value="CF แล้วไม่โอน / หายเงียบ">CF แล้วไม่โอน / หายเงียบ</option>
                <option value="ก่อกวน / กวนประสาทในไลฟ์">ก่อกวน / กวนประสาทในไลฟ์</option>
                <option value="ยกเลิกออเดอร์ซ้ำๆ">ยกเลิกออเดอร์ซ้ำๆ</option>
                <option value="ใช้คำพูดไม่สุภาพ">ใช้คำพูดไม่สุภาพ</option>
                <option value="custom">เหตุผลอื่นๆ (ระบุเอง)...</option>
              </select>
              <input
                v-if="newBanReason === 'custom'"
                type="text"
                v-model.trim="newCustomReason"
                class="bl-input bl-input-custom-reason"
                placeholder="ระบุเหตุผล..."
                @keydown.enter.prevent="handleAddBan"
              />
              <button
                type="button"
                class="bl-btn bl-btn-add"
                :disabled="!newBanName || isSubmitting"
                @click="handleAddBan"
              >
                <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-ban"></i>
                <span>แบนผู้ใช้นี้</span>
              </button>
            </div>
          </div>

          <!-- Search and Filter Bar -->
          <div class="bl-search-bar">
            <div class="bl-search-wrap">
              <i class="fa-solid fa-magnifying-glass bl-search-icon"></i>
              <input
                type="text"
                v-model="searchQuery"
                class="bl-search-input"
                placeholder="ค้นหาชื่อลูกค้า, เหตุผล, หรือแอดมินที่แบน..."
              />
              <button
                v-if="searchQuery"
                type="button"
                class="bl-search-clear"
                @click="searchQuery = ''"
                title="ล้างคำค้นหา"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Blacklist Items List -->
          <div class="bl-content-body">
            <div v-if="filteredBlacklist.length === 0" class="bl-empty-state">
              <i class="fa-solid fa-shield-halved bl-empty-icon"></i>
              <h4>{{ searchQuery ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีรายชื่อที่ถูกแบน' }}</h4>
              <p>
                {{ searchQuery ? 'ลองค้นหาด้วยคำอื่น หรือกดล้างการค้นหา' : 'เพิ่มรายชื่อแบนได้จากฟอร์มด้านบน หรือคลิกปุ่มแบนในแชทสด' }}
              </p>
            </div>

            <div v-else class="bl-list-grid">
              <div
                v-for="user in filteredBlacklist"
                :key="user.key"
                class="bl-user-card"
              >
                <div class="bl-user-left">
                  <div class="bl-user-avatar">
                    <i class="fa-solid fa-user-slash"></i>
                  </div>
                  <div class="bl-user-info">
                    <div class="bl-user-name-row">
                      <span class="bl-user-name">{{ user.displayName || user.key }}</span>
                      <span class="bl-badge-banned">🚫 ถูกแบน</span>
                    </div>
                    <div class="bl-user-reason-row">
                      <span class="bl-reason-label">สาเหตุ:</span>
                      <span class="bl-reason-val">{{ user.reason || 'CF แล้วไม่โอน / ก่อกวน' }}</span>
                    </div>
                    <div class="bl-user-meta">
                      <span class="bl-meta-item" v-if="user.bannedAt">
                        <i class="fa-regular fa-clock"></i> {{ formatBanTime(user.bannedAt) }}
                      </span>
                      <span class="bl-meta-item" v-if="user.bannedBy">
                        <i class="fa-solid fa-user-shield"></i> โดย: {{ user.bannedBy }}
                      </span>
                      <span class="bl-meta-item bl-channel-key" v-if="user.channelId" :title="user.channelId">
                        <i class="fa-brands fa-youtube"></i> ID: {{ truncateId(user.channelId) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="bl-user-actions">
                  <button
                    type="button"
                    class="bl-btn bl-btn-unban"
                    @click="confirmUnban(user)"
                    title="ปลดแบนผู้ใช้นี้"
                  >
                    <i class="fa-solid fa-user-check"></i>
                    <span>ปลดแบน</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="bl-modal-footer">
            <div class="bl-footer-note">
              <i class="fa-solid fa-circle-info text-info"></i>
              <span>คำแนะนำ: แอดมินสามารถพิมพ์คำสั่ง <code>แบน [ชื่อ]</code> หรือ <code>ปลดแบน [ชื่อ]</code> ในช่องแชทสดได้โดยตรง</span>
            </div>
            <button type="button" class="bl-btn bl-btn-close" @click="close">
              ปิด
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from "vue";
import { useBlacklistStore } from "../stores/blacklist";
import Swal from "sweetalert2";

const blacklistStore = useBlacklistStore();

const isOpen = ref(false);
const searchQuery = ref("");
const newBanName = ref("");
const newBanReason = ref("CF แล้วไม่โอน / หายเงียบ");
const newCustomReason = ref("");
const isSubmitting = ref(false);

function open() {
  isOpen.value = true;
  searchQuery.value = "";
  newBanName.value = "";
  newCustomReason.value = "";
}

function close() {
  isOpen.value = false;
}

const filteredBlacklist = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const list = blacklistStore.blacklistArray;
  if (!query) return list;

  return list.filter((item) => {
    const name = (item.displayName || "").toLowerCase();
    const reason = (item.reason || "").toLowerCase();
    const bannedBy = (item.bannedBy || "").toLowerCase();
    const channelId = (item.channelId || "").toLowerCase();
    const key = (item.key || "").toLowerCase();
    return (
      name.includes(query) ||
      reason.includes(query) ||
      bannedBy.includes(query) ||
      channelId.includes(query) ||
      key.includes(query)
    );
  });
});

async function handleAddBan() {
  if (!newBanName.value.trim()) return;

  const reason =
    newBanReason.value === "custom"
      ? (newCustomReason.value.trim() || "CF แล้วไม่โอน / ก่อกวน")
      : newBanReason.value;

  isSubmitting.value = true;
  try {
    await blacklistStore.banUser({
      displayName: newBanName.value.trim(),
      reason,
      bannedBy: "แอดมิน (หน้าต่าง Blacklist)",
    });

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `แบนคุณ ${newBanName.value.trim()} เรียบร้อยแล้ว`,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });

    newBanName.value = "";
    newCustomReason.value = "";
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถแบนผู้ใช้ได้",
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmUnban(user) {
  const userName = user.displayName || user.key;
  const result = await Swal.fire({
    title: `ปลดแบนคุณ ${userName}?`,
    text: "หลังจากปลดแบน ลูกค้าจะสามารถส่งเสียงและทำการจองสินค้าได้ตามปกติ",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#64748b",
    confirmButtonText: "ใช่, ปลดแบน",
    cancelButtonText: "ยกเลิก",
  });

  if (result.isConfirmed) {
    try {
      await blacklistStore.unbanUser(user.key || user.channelId || user.displayName);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `ปลดแบนคุณ ${userName} แล้ว`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถปลดแบนได้",
      });
    }
  }
}

function formatBanTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateId(id) {
  if (!id) return "";
  if (id.length <= 16) return id;
  return id.substring(0, 8) + "..." + id.substring(id.length - 6);
}

defineExpose({
  open,
  close,
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.blacklist-modal-container {
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f8fafc;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.bl-modal-header {
  padding: 18px 24px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bl-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bl-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.bl-modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: #f8fafc;
}

.bl-modal-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
  display: block;
  margin-top: 2px;
}

.bl-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bl-count-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.bl-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s;
}

.bl-close-btn:hover {
  background: #334155;
  color: #f8fafc;
}

/* Quick Add Box */
.bl-add-box {
  background: #1a2234;
  padding: 14px 24px;
  border-bottom: 1px solid #334155;
}

.bl-add-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 10px;
}

.bl-add-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.bl-input {
  background: #0f172a;
  border: 1px solid #334155;
  color: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.bl-input:focus {
  border-color: #38bdf8;
}

.bl-input-name {
  flex: 1 1 200px;
}

.bl-select-reason {
  flex: 1 1 200px;
  cursor: pointer;
}

.bl-input-custom-reason {
  flex: 1 1 160px;
}

.bl-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.bl-btn-add {
  background: #ef4444;
  color: #fff;
  white-space: nowrap;
}

.bl-btn-add:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.bl-btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Search Bar */
.bl-search-bar {
  padding: 12px 24px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.bl-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.bl-search-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
  font-size: 0.9rem;
}

.bl-search-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid #334155;
  color: #f8fafc;
  padding: 8px 36px 8px 36px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.bl-search-input:focus {
  border-color: #38bdf8;
}

.bl-search-clear {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

/* Content Body */
.bl-content-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  min-height: 250px;
}

.bl-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 16px;
  color: #64748b;
}

.bl-empty-icon {
  font-size: 3.5rem;
  margin-bottom: 14px;
  color: #334155;
}

.bl-empty-state h4 {
  font-size: 1.1rem;
  color: #cbd5e1;
  margin: 0 0 6px 0;
}

.bl-empty-state p {
  font-size: 0.85rem;
  margin: 0;
}

/* List Grid */
.bl-list-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bl-user-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-left: 4px solid #ef4444;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: all 0.2s;
}

.bl-user-card:hover {
  background: #141e33;
  border-color: #475569;
  border-left-color: #ef4444;
}

.bl-user-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.bl-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.bl-user-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.bl-user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bl-user-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bl-badge-banned {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.bl-user-reason-row {
  font-size: 0.85rem;
  color: #fca5a5;
  display: flex;
  gap: 6px;
}

.bl-reason-label {
  color: #94a3b8;
}

.bl-reason-val {
  font-weight: 500;
}

.bl-user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: #64748b;
  flex-wrap: wrap;
  margin-top: 2px;
}

.bl-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bl-channel-key {
  font-family: monospace;
}

.bl-user-actions {
  flex-shrink: 0;
}

.bl-btn-unban {
  background: #10b981;
  color: #fff;
  padding: 6px 14px;
  font-size: 0.82rem;
}

.bl-btn-unban:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* Modal Footer */
.bl-modal-footer {
  padding: 14px 24px;
  background: #0f172a;
  border-top: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bl-footer-note {
  font-size: 0.8rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bl-footer-note code {
  background: #1e293b;
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.bl-btn-close {
  background: #334155;
  color: #f8fafc;
  padding: 6px 18px;
}

.bl-btn-close:hover {
  background: #475569;
}

@media (max-width: 640px) {
  .bl-user-card {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .bl-user-actions {
    display: flex;
    justify-content: flex-end;
  }
  .bl-modal-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .bl-btn-close {
    text-align: center;
    justify-content: center;
  }
}
</style>
