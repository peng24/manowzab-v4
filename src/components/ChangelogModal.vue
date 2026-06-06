<template>
  <Teleport to="body">
    <Transition name="changelog-fade">
      <div v-if="isOpen" class="changelog-overlay" @click.self="close">
        <Transition name="changelog-slide">
          <div v-if="isOpen" class="changelog-modal">
            <!-- Header -->
            <div class="changelog-header">
              <div class="changelog-title-row">
                <div class="changelog-title">
                  <i class="fa-solid fa-scroll"></i>
                  <span>Changelog</span>
                  <span class="changelog-version-badge">{{ currentVersion }}</span>
                </div>
                <button class="changelog-close" @click="close" title="ปิด">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <!-- Search -->
              <div class="changelog-search">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  ref="searchInput"
                  v-model="searchQuery"
                  type="text"
                  placeholder="ค้นหาการเปลี่ยนแปลง..."
                  @keydown.esc="close"
                />
                <button
                  v-if="searchQuery"
                  class="search-clear"
                  @click="searchQuery = ''"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <!-- Stats -->
              <div class="changelog-stats">
                <span class="stat-pill">
                  <i class="fa-solid fa-code-branch"></i>
                  {{ filteredChangelog.length }} เวอร์ชัน
                </span>
                <span class="stat-pill">
                  <i class="fa-solid fa-list-check"></i>
                  {{ totalChanges }} รายการ
                </span>
              </div>
            </div>

            <!-- Timeline -->
            <div class="changelog-body" ref="bodyRef">
              <div v-if="filteredChangelog.length === 0" class="changelog-empty">
                <i class="fa-solid fa-search"></i>
                <p>ไม่พบรายการที่ตรงกับ "{{ searchQuery }}"</p>
              </div>

              <div
                v-for="(entry, idx) in filteredChangelog"
                :key="entry.version"
                class="timeline-entry"
              >
                <!-- Timeline connector -->
                <div class="timeline-rail">
                  <div
                    :class="['timeline-dot', idx === 0 ? 'dot-latest' : '']"
                  ></div>
                  <div
                    v-if="idx < filteredChangelog.length - 1"
                    class="timeline-line"
                  ></div>
                </div>

                <!-- Version card -->
                <div :class="['version-card', idx === 0 ? 'card-latest' : '']">
                  <div
                    class="version-header"
                    @click="toggleExpand(entry.version)"
                  >
                    <div class="version-info">
                      <span class="version-number">v{{ entry.version }}</span>
                      <span v-if="idx === 0" class="latest-tag">ล่าสุด</span>
                      <span class="version-date">
                        <i class="fa-regular fa-calendar"></i>
                        {{ formatDate(entry.date) }}
                      </span>
                    </div>
                    <div class="version-meta">
                      <span
                        v-for="cat in getCategorySummary(entry)"
                        :key="cat.type"
                        :class="['cat-count', `cat-${cat.type}`]"
                        :title="cat.label"
                      >
                        {{ cat.icon }} {{ cat.count }}
                      </span>
                      <i
                        :class="[
                          'fa-solid',
                          expandedVersions.has(entry.version)
                            ? 'fa-chevron-up'
                            : 'fa-chevron-down',
                          'expand-icon',
                        ]"
                      ></i>
                    </div>
                  </div>

                  <!-- Collapsible content -->
                  <Transition name="expand">
                    <div
                      v-if="expandedVersions.has(entry.version)"
                      class="version-content"
                    >
                      <!-- Category sections -->
                      <div
                        v-for="cat in categoryOrder"
                        :key="cat.key"
                      >
                        <div
                          v-if="entry.changes[cat.key]?.length"
                          class="category-section"
                        >
                          <div :class="['category-badge', `badge-${cat.key}`]">
                            {{ cat.icon }} {{ cat.label }}
                          </div>
                          <ul class="change-list">
                            <li
                              v-for="(item, i) in entry.changes[cat.key]"
                              :key="i"
                              v-html="highlightSearch(item)"
                            ></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="changelog-footer">
              <button
                v-if="!allExpanded"
                class="footer-btn"
                @click="expandAll"
              >
                <i class="fa-solid fa-angles-down"></i> ขยายทั้งหมด
              </button>
              <button v-else class="footer-btn" @click="collapseAll">
                <i class="fa-solid fa-angles-up"></i> ยุบทั้งหมด
              </button>
              <span class="footer-credit">
                Manowzab Command Center
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useSystemStore } from '../stores/system'
import { changelog } from '../data/changelog'

const systemStore = useSystemStore()
const currentVersion = computed(() => systemStore.version)

const isOpen = ref(false)
const searchQuery = ref('')
const expandedVersions = ref(new Set())
const searchInput = ref(null)
const bodyRef = ref(null)

// Default: expand first 3 versions
const DEFAULT_EXPANDED_COUNT = 3

const categoryOrder = [
  { key: 'added', icon: '✨', label: 'เพิ่มใหม่' },
  { key: 'improved', icon: '⚡', label: 'ปรับปรุง' },
  { key: 'fixed', icon: '🐛', label: 'แก้ไขบั๊ก' },
  { key: 'removed', icon: '🗑️', label: 'ถอดออก' },
]

const filteredChangelog = computed(() => {
  if (!searchQuery.value.trim()) return changelog

  const q = searchQuery.value.toLowerCase()
  return changelog.filter((entry) => {
    // Match version
    if (entry.version.includes(q)) return true
    // Match change text
    return Object.values(entry.changes).some((items) =>
      items.some((item) => item.toLowerCase().includes(q))
    )
  })
})

const totalChanges = computed(() => {
  return filteredChangelog.value.reduce((sum, entry) => {
    return (
      sum +
      Object.values(entry.changes).reduce(
        (s, items) => s + items.length,
        0
      )
    )
  }, 0)
})

const allExpanded = computed(() => {
  return filteredChangelog.value.every((e) =>
    expandedVersions.value.has(e.version)
  )
})

function open() {
  isOpen.value = true
  searchQuery.value = ''
  // Reset expanded state: open first N
  expandedVersions.value = new Set(
    changelog.slice(0, DEFAULT_EXPANDED_COUNT).map((e) => e.version)
  )
  // Focus search on next tick
  nextTick(() => {
    if (searchInput.value) searchInput.value.focus()
  })
  // Lock body scroll
  document.body.style.overflow = 'hidden'
}

function close() {
  isOpen.value = false
  document.body.style.overflow = ''
}

function toggleExpand(version) {
  const s = new Set(expandedVersions.value)
  if (s.has(version)) {
    s.delete(version)
  } else {
    s.add(version)
  }
  expandedVersions.value = s
}

function expandAll() {
  expandedVersions.value = new Set(
    filteredChangelog.value.map((e) => e.version)
  )
}

function collapseAll() {
  expandedVersions.value = new Set()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ]
  const thaiYear = d.getFullYear() + 543
  const shortYear = String(thaiYear).slice(-2)
  return `${d.getDate()} ${months[d.getMonth()]} ${shortYear}`
}

function getCategorySummary(entry) {
  const result = []
  for (const cat of categoryOrder) {
    const count = entry.changes[cat.key]?.length || 0
    if (count > 0) {
      result.push({
        type: cat.key,
        icon: cat.icon,
        label: cat.label,
        count,
      })
    }
  }
  return result
}

function highlightSearch(text) {
  if (!searchQuery.value.trim()) return text
  const q = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${q})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// Keyboard support
function handleKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

// When search changes, expand all matching
watch(searchQuery, (q) => {
  if (q.trim()) {
    expandedVersions.value = new Set(
      filteredChangelog.value.map((e) => e.version)
    )
    // Scroll to top
    nextTick(() => {
      if (bodyRef.value) bodyRef.value.scrollTop = 0
    })
  }
})

// Register/unregister keydown listener
watch(isOpen, (val) => {
  if (val) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

// Expose open() for parent component
defineExpose({ open })
</script>

<style scoped>
/* ──────────────────── Overlay ──────────────────── */
.changelog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 16px;
}

/* ──────────────────── Modal ──────────────────── */
.changelog-modal {
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(165deg, #1a1d23 0%, #12141a 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.5),
    0 0 80px rgba(99, 102, 241, 0.08);
  overflow: hidden;
}

/* ──────────────────── Header ──────────────────── */
.changelog-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.changelog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.changelog-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3em;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.02em;
}

.changelog-title i {
  color: #a78bfa;
  font-size: 0.9em;
}

.changelog-version-badge {
  font-size: 0.55em;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  letter-spacing: 0.02em;
}

.changelog-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  font-size: 1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.changelog-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  transform: rotate(90deg);
}

/* ──────────────────── Search ──────────────────── */
.changelog-search {
  position: relative;
  margin-bottom: 12px;
}

.changelog-search i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 0.85em;
  pointer-events: none;
}

.changelog-search input {
  width: 100%;
  padding: 10px 40px 10px 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #e2e8f0;
  font-size: 0.9em;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.changelog-search input::placeholder {
  color: #475569;
}

.changelog-search input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.75em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.search-clear:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
}

/* ──────────────────── Stats ──────────────────── */
.changelog-stats {
  display: flex;
  gap: 8px;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75em;
  color: #64748b;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-pill i {
  font-size: 0.85em;
}

/* ──────────────────── Body / Timeline ──────────────────── */
.changelog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.changelog-body::-webkit-scrollbar {
  width: 6px;
}

.changelog-body::-webkit-scrollbar-track {
  background: transparent;
}

.changelog-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.changelog-empty {
  text-align: center;
  padding: 48px 20px;
  color: #475569;
}

.changelog-empty i {
  font-size: 2.5em;
  margin-bottom: 16px;
  opacity: 0.4;
  display: block;
}

.changelog-empty p {
  font-size: 0.9em;
}

/* ──────────────────── Timeline Entry ──────────────────── */
.timeline-entry {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  padding-top: 16px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #334155;
  border: 2px solid #475569;
  flex-shrink: 0;
  transition: all 0.3s ease;
  z-index: 1;
}

.dot-latest {
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  border-color: #a78bfa;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 12px rgba(99, 102, 241, 0.5); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8); }
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.02)
  );
  margin-top: 4px;
}

/* ──────────────────── Version Card ──────────────────── */
.version-card {
  flex: 1;
  margin-bottom: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.2s ease;
}

.version-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.card-latest {
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.04);
}

.card-latest:hover {
  border-color: rgba(99, 102, 241, 0.35);
}

.version-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.version-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.version-number {
  font-size: 1em;
  font-weight: 700;
  color: #f1f5f9;
  font-family: 'Inter', 'Segoe UI', monospace;
  letter-spacing: -0.01em;
}

.latest-tag {
  font-size: 0.65em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 6px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}

.version-date {
  font-size: 0.8em;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 5px;
}

.version-date i {
  font-size: 0.85em;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cat-count {
  font-size: 0.7em;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 600;
}

.cat-added {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.cat-improved {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.cat-fixed {
  background: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}

.cat-removed {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.expand-icon {
  color: #475569;
  font-size: 0.7em;
  margin-left: 4px;
  transition: transform 0.2s ease;
}

/* ──────────────────── Version Content ──────────────────── */
.version-content {
  padding: 0 16px 16px;
}

.category-section {
  margin-bottom: 12px;
}

.category-section:last-child {
  margin-bottom: 0;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75em;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.badge-added {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.15);
}

.badge-improved {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.15);
}

.badge-fixed {
  background: rgba(251, 146, 60, 0.1);
  color: #fb923c;
  border: 1px solid rgba(251, 146, 60, 0.15);
}

.badge-removed {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.15);
}

.change-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.change-list li {
  position: relative;
  padding: 6px 0 6px 18px;
  font-size: 0.82em;
  line-height: 1.6;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.change-list li:last-child {
  border-bottom: none;
}

.change-list li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 14px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #475569;
}

.change-list li :deep(mark) {
  background: rgba(250, 204, 21, 0.25);
  color: #fbbf24;
  border-radius: 2px;
  padding: 0 2px;
}

/* ──────────────────── Footer ──────────────────── */
.changelog-footer {
  padding: 12px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.footer-btn {
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  font-size: 0.8em;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.footer-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.footer-credit {
  font-size: 0.7em;
  color: #334155;
  letter-spacing: 0.02em;
}

/* ──────────────────── Animations ──────────────────── */
.changelog-fade-enter-active,
.changelog-fade-leave-active {
  transition: opacity 0.25s ease;
}

.changelog-fade-enter-from,
.changelog-fade-leave-to {
  opacity: 0;
}

.changelog-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.changelog-slide-leave-active {
  transition: all 0.2s ease-in;
}

.changelog-slide-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.changelog-slide-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-5px);
}

/* Expand / Collapse transition */
.expand-enter-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* ──────────────────── Responsive ──────────────────── */
@media (max-width: 480px) {
  .changelog-overlay {
    padding: 8px;
  }

  .changelog-modal {
    max-height: 95vh;
    border-radius: 16px;
  }

  .changelog-header {
    padding: 16px 16px 12px;
  }

  .changelog-title {
    font-size: 1.1em;
  }

  .changelog-body {
    padding: 16px;
  }

  .timeline-rail {
    width: 16px;
  }

  .timeline-entry {
    gap: 10px;
  }

  .version-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .version-meta {
    width: 100%;
    justify-content: flex-end;
  }

  .changelog-footer {
    padding: 10px 16px;
  }
}
</style>
