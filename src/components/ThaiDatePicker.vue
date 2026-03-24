<template>
  <div class="thai-datepicker-container" ref="containerRef">
    <!-- Trigger -->
    <div class="trigger-wrap" @click.stop="openCalendar" @focusin="openCalendar">
      <slot>
        <button type="button" class="fallback-btn">📅</button>
      </slot>
    </div>

    <!-- Calendar Popup -->
    <Teleport to="body">
      <div v-if="isOpen" class="td-popup" :style="popupStyle" @click.stop>
        <div class="td-header">
        <button type="button" class="td-btn" @click.prevent="prevMonth">&lt;</button>
        <div class="td-month-year">
          <select v-model="currentMonth" class="td-select" @change="onMonthYearChange">
            <option v-for="(m, i) in thaiMonthNames" :key="i" :value="i">{{ m }}</option>
          </select>
          <input type="number" v-model.number="displayYear" class="td-year-input" @change="onYearChange" />
        </div>
        <button type="button" class="td-btn" @click.prevent="nextMonth">&gt;</button>
      </div>
      <div class="td-grid-days">
        <div v-for="w in weekdays" :key="w" class="td-weekday">{{ w }}</div>
        <div v-for="b in blankDays" :key="'blk'+b" class="td-day empty"></div>
        <button 
          v-for="d in daysInMonth" 
          :key="d" 
          type="button"
          class="td-day-btn" 
          :class="{ selected: isSelected(d), today: isToday(d) }"
          @click.prevent="selectDate(d)"
        >
          {{ d }}
        </button>
      </div>
      <div class="td-footer">
        <button type="button" class="td-footer-btn clear" @click.prevent="clearDate">ล้าง</button>
        <button type="button" class="td-footer-btn today" @click.prevent="selectToday">วันนี้</button>
      </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' }, // YYYY-MM-DD
  position: { type: String, default: 'bottom-left' } // popup position
});
const emit = defineEmits(['update:modelValue', 'change']);

const thaiMonthNames = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];
const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const containerRef = ref(null);
const isOpen = ref(false);
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());
const displayYear = ref(currentYear.value + 543);
const popupStyle = ref({});

const updatePosition = () => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  
  let top = rect.bottom;
  let left = rect.left;
  
  if (props.position.includes('right')) {
    left = rect.right - 260; // 260 is popup width approx
  } else if (props.position.includes('center')) {
    left = rect.left + (rect.width / 2) - 130;
  }
  
  if (props.position.includes('top')) {
    top = rect.top - 310;
  }
  
  // Boundary constraints
  if (top + 310 > window.innerHeight) {
    top = Math.max(10, rect.top - 310);
  }
  if (left < 0) left = 10;
  if (left + 260 > window.innerWidth) left = window.innerWidth - 270;
  
  popupStyle.value = {
    position: 'fixed',
    top: `${top + 4}px`,
    left: `${left}px`,
    zIndex: 999999
  };
};

// sync year to displayYear
watch(currentYear, (val) => {
  displayYear.value = val + 543;
});

const onYearChange = () => {
  if (displayYear.value >= 2500) {
    currentYear.value = displayYear.value - 543;
  }
};
const onMonthYearChange = () => {
  // trigger reactivity
};

watch(isOpen, async (val) => {
  if (val) {
    if (props.modelValue && props.modelValue.includes('-')) {
      const parts = props.modelValue.split('-');
      if (parts.length === 3) {
        currentYear.value = parseInt(parts[0]);
        currentMonth.value = parseInt(parts[1]) - 1;
      }
    } else {
      const d = new Date();
      currentYear.value = d.getFullYear();
      currentMonth.value = d.getMonth();
    }
    await nextTick();
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
  } else {
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
  }
});

const blankDays = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay();
});

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
});

const isSelected = (d) => {
  if (!props.modelValue) return false;
  const parts = props.modelValue.split('-');
  if (parts.length === 3) {
    return parseInt(parts[0]) === currentYear.value &&
           parseInt(parts[1]) - 1 === currentMonth.value &&
           parseInt(parts[2]) === d;
  }
  return false;
};

const isToday = (d) => {
  const now = new Date();
  return now.getFullYear() === currentYear.value &&
         now.getMonth() === currentMonth.value &&
         now.getDate() === d;
};

const prevMonth = () => {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value--; }
  else { currentMonth.value--; }
};
const nextMonth = () => {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++; }
  else { currentMonth.value++; }
};

const selectDate = (d) => {
  const y = currentYear.value;
  const m = String(currentMonth.value + 1).padStart(2, '0');
  const day = String(d).padStart(2, '0');
  const val = `${y}-${m}-${day}`;
  emit('update:modelValue', val);
  emit('change', val);
  isOpen.value = false;
};

const selectToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const val = `${y}-${m}-${d}`;
  emit('update:modelValue', val);
  emit('change', val);
  isOpen.value = false;
};

const clearDate = () => {
  emit('update:modelValue', null);
  emit('change', null);
  isOpen.value = false;
};

const toggleCalendar = () => {
  isOpen.value = !isOpen.value;
};
const openCalendar = () => {
  isOpen.value = true;
};
const closeCalendar = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target) && !e.target.closest('.td-popup')) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', closeCalendar));
onUnmounted(() => {
  document.removeEventListener('click', closeCalendar);
  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
});
</script>

<style scoped>
.thai-datepicker-container {
  position: relative;
  display: inline-block;
  width: 100%;
}
.trigger-wrap {
  width: 100%;
  height: 100%;
}
.fallback-btn {
  background: transparent; border: none; cursor: pointer; font-size: 1.2em;
}
.td-popup {
  width: 260px;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.5);
  padding: 12px;
}

.td-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.td-btn {
  background: #333; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 1.1em;
}
.td-btn:hover { background: #555; }
.td-month-year {
  display: flex; gap: 4px; align-items: center;
}
.td-select, .td-year-input {
  background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; padding: 2px 4px; font-family: "Kanit", sans-serif; font-size: 0.9em; outline: none;
}
.td-year-input {
  width: 60px; text-align: center;
}

.td-grid-days {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;
}
.td-weekday { font-size: 0.8em; color: #888; font-weight: bold; margin-bottom: 4px; }
.td-day-btn {
  background: transparent; border: 1px solid transparent; color: #e0e0e0; border-radius: 4px; padding: 6px 0; cursor: pointer; font-size: 0.95em; font-family: inherit; transition: all 0.1s;
}
.td-day-btn:hover { background: #333; border-color: #555; }
.td-day-btn.selected { background: #3b82f6; color: #fff; border-color: #3b82f6; font-weight: bold; }
.td-day-btn.today { border-color: #3b82f6; color: #60a5fa; }

.td-footer {
  display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;
}
.td-footer-btn { background: #333; border: none; padding: 6px 14px; border-radius: 4px; color: #fff; cursor: pointer; font-size: 0.85em; font-family: inherit; transition: background 0.15s; }
.td-footer-btn:hover { background: #444; }
.td-footer-btn.today { background: #10b981; }
.td-footer-btn.today:hover { background: #059669; }
</style>
