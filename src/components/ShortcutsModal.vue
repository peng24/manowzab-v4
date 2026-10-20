<template>
  <Teleport to="body">
    <Transition name="shortcut-fade">
      <div v-if="isOpen" class="shortcut-overlay" @click.self="close">
        <Transition name="shortcut-slide">
          <div v-if="isOpen" class="shortcut-modal">
            <!-- Header -->
            <div class="shortcut-header">
              <div class="shortcut-title-row">
                <div class="shortcut-title">
                  <i class="fa-solid fa-keyboard" style="color: #38bdf8;"></i>
                  <span>รวมคีย์ลัดระบบ (Hotkeys)</span>
                </div>
                <button class="shortcut-close" @click="close" title="ปิด (Esc)">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <p class="shortcut-subtitle">
                กดปุ่มคีย์ลัดบนคีย์บอร์ดเพื่อสั่งงานระบบได้อย่างรวดเร็วระหว่างไลฟ์สด
              </p>
            </div>

            <!-- Body -->
            <div class="shortcut-body">
              <!-- Group 1: ทั่วไป & การควบคุม -->
              <div class="shortcut-group">
                <div class="group-heading">
                  <i class="fa-solid fa-sliders"></i>
                  <span>การควบคุมทั่วไป & เสียง</span>
                </div>
                <div class="shortcut-grid">
                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>Shift</kbd> + <kbd>M</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">เปิด / ปิดเสียงอ่าน (Mute Audio)</span>
                      <span class="desc-sub">หยุดหรือเปิดเสียงสังเคราะห์ TTS และ SFX ทันที</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>Alt</kbd> + <kbd>C</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">ซ่อน / แสดงหน้าต่างแชตสด (Toggle Chat)</span>
                      <span class="desc-sub">ขยายตารางสต็อกเต็มหน้าจอ หรือเปิดแถบแชตกลับมา</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>Shift</kbd> + <kbd>F</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">โฟกัสช่อง YouTube Video ID</span>
                      <span class="desc-sub">กระโดดไปพิมพ์หรือวางรหัสไลฟ์สตรีมทันที</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>Esc</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">ปิดหน้าต่าง Modal / ป๊อปอัปทั้งหมด</span>
                      <span class="desc-sub">ปิดหน้าต่างคิว, หน้าจัดส่ง, หรือหน้าต่างช่วยเหลือ</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>?</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">เปิดหน้ารวมคีย์ลัดนี้</span>
                      <span class="desc-sub">กด Shift + / บนคีย์บอร์ดเพื่อเปิดดูได้ตลอดเวลา</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Group 2: จัดการสต็อก & คิว -->
              <div class="shortcut-group">
                <div class="group-heading">
                  <i class="fa-solid fa-boxes-stacked"></i>
                  <span>การจัดการสต็อก & คิวจอง</span>
                </div>
                <div class="shortcut-grid">
                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>←</kbd> / <kbd>→</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">เลื่อนรายการก่อนหน้า / ถัดไป</span>
                      <span class="desc-sub">ขณะเปิดหน้าต่างคิว กดเพื่อบันทึกและเลื่อนช่องทันที</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>Enter</kbd> หรือ <kbd>Ctrl</kbd> + <kbd>S</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">บันทึกการแก้ไขคิว</span>
                      <span class="desc-sub">บันทึกลำดับคิวและปิดหน้าต่าง</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>คลิก</kbd> <span class="badge-mini">👗 X ตัว</span>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">ดูและจัดการสินค้าทั้งหมดของลูกค้า</span>
                      <span class="desc-sub">คลิกป้ายสีเขียวบนการ์ดสต็อกเพื่อดูทุกเบอร์ที่ลูกค้าจอง</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <kbd>พิมพ์เลข</kbd> + <kbd>Enter</kbd>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">กระโดดไปเบอร์สต็อกทันที (Quick Jump)</span>
                      <span class="desc-sub">พิมพ์ตัวเลขในช่องค้นหาสต็อกแล้วกด Enter เพื่อเลื่อนไปหา</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Group 3: คำสั่งแอดมินในแชต -->
              <div class="shortcut-group">
                <div class="group-heading">
                  <i class="fa-solid fa-terminal"></i>
                  <span>คำสั่งพิมพ์ด่วนในแชตสด (Admin Commands)</span>
                </div>
                <div class="shortcut-grid">
                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <code>!ปิด</code> หรือ <code>แอดมินพาลูกนอน</code>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">เปิดโหมดพาลูกนอน (Away Mode)</span>
                      <span class="desc-sub">แจ้งเตือนลูกค้าและเริ่มนับเวลาที่แอดมินไม่อยู่หน้าจอ</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <code>!เปิด</code> หรือ <code>ลูกหลับแล้ว</code>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">ปิดโหมดพาลูกนอน</span>
                      <span class="desc-sub">กลับสู่สถานะพร้อมไลฟ์สดปกติ</span>
                    </div>
                  </div>

                  <div class="shortcut-card">
                    <div class="shortcut-keys">
                      <code>[เบอร์] ยกเลิก</code>
                    </div>
                    <div class="shortcut-desc">
                      <span class="desc-main">ยกเลิกรายการสต็อก</span>
                      <span class="desc-sub">เช่น <code>12 ยกเลิก</code> หรือ <code>ยกเลิก 12 พี่สมหญิง</code></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="shortcut-footer">
              <span class="footer-tip">
                <i class="fa-solid fa-lightbulb"></i>
                เคล็ดลับ: สามารถกด <strong>Shift + M</strong> เพื่อปิดเสียงชั่วคราวเวลาคุยโทรศัพท์ได้ทันที
              </span>
              <button class="btn btn-primary shortcut-btn-close" @click="close">
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from "vue";

const isOpen = ref(false);

function open() {
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

defineExpose({
  open,
  close,
});
</script>

<style scoped>
.shortcut-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.shortcut-modal {
  background: linear-gradient(180deg, #18181b 0%, #09090b 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.15);
  overflow: hidden;
}

.shortcut-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.shortcut-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shortcut-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25em;
  font-weight: 700;
  font-family: "Kanit", sans-serif;
  color: #f8fafc;
}

.shortcut-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shortcut-close:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fff;
}

.shortcut-subtitle {
  margin: 6px 0 0;
  font-size: 0.88em;
  color: #94a3b8;
  font-family: "Kanit", sans-serif;
}

.shortcut-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.shortcut-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
  font-weight: 700;
  color: #38bdf8;
  font-family: "Kanit", sans-serif;
  border-bottom: 1px solid rgba(56, 189, 248, 0.15);
  padding-bottom: 6px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 10px;
}

.shortcut-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s ease;
}

.shortcut-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-1px);
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85em;
  font-weight: 700;
  color: #cbd5e1;
  white-space: nowrap;
  min-width: 110px;
}

kbd {
  background: #27272a;
  border: 1px solid #3f3f46;
  border-bottom-width: 2.5px;
  border-radius: 6px;
  padding: 3px 7px;
  font-family: monospace;
  font-size: 0.92em;
  color: #f1f5f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

code {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 5px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.9em;
  color: #38bdf8;
}

.badge-mini {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.85em;
}

.shortcut-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: "Kanit", sans-serif;
}

.desc-main {
  font-size: 0.9em;
  font-weight: 600;
  color: #f1f5f9;
}

.desc-sub {
  font-size: 0.78em;
  color: #94a3b8;
  line-height: 1.3;
}

.shortcut-footer {
  padding: 14px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-tip {
  font-size: 0.82em;
  color: #94a3b8;
  font-family: "Kanit", sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.footer-tip i {
  color: #fbbf24;
}

.shortcut-btn-close {
  padding: 6px 18px;
  font-size: 0.88em;
  border-radius: 8px;
  cursor: pointer;
}

/* Animations */
.shortcut-fade-enter-active,
.shortcut-fade-leave-active {
  transition: opacity 0.2s ease;
}

.shortcut-fade-enter-from,
.shortcut-fade-leave-to {
  opacity: 0;
}

.shortcut-slide-enter-active,
.shortcut-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}

.shortcut-slide-enter-from,
.shortcut-slide-leave-to {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

@media (max-width: 640px) {
  .shortcut-grid {
    grid-template-columns: 1fr;
  }
  .shortcut-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
