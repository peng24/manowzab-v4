<template>
  <div
    v-memo="[
      item.owner,
      item.price,
      item.backdated,
      item.time,
      ownerCount,
      queueLength,
      isHighlighted,
      isCancelled,
      isNewOrder,
      cancelledName
    ]"
    :class="[
      'stock-item',
      item.owner ? 'sold' : '',
      isNewOrder ? 'new-order' : '',
      isHighlighted ? 'highlight' : '',
      isCancelled ? 'cancelled-blink' : '',
    ]"
    @click="$emit('select', index)"
    :id="`stock-${index}`"
  >
    <div class="stock-num">{{ index }}</div>
    
    <div v-if="isCancelled && !item.owner" class="stock-status cancelled-name">
      ❌ {{ cancelledName }}
    </div>
    <div v-else :class="['stock-status', { empty: !item.owner }]">
      {{ item.owner || "ว่าง" }}
    </div>

    <div
      v-if="item.owner && ownerCount >= 1"
      class="owner-count-badge"
      :title="`${item.owner} จองทั้งหมด ${ownerCount} ชิ้น — คลิกเพื่อจัดการ`"
      @click.stop="$emit('show-owner', item.owner)"
    >👗 {{ ownerCount }} ตัว</div>

    <div
      v-if="item.owner && item.backdated"
      class="backdated-time"
      :title="`จองย้อนหลัง: ${formattedTime}`"
    >
      🕒 {{ formattedTime }}
    </div>

    <div v-if="item.price" class="stock-price">
      {{ item.price }} บาท
    </div>

    <div v-if="queueLength > 0" class="queue-badge">
      +{{ queueLength }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  index: { type: Number, required: true },
  item: { type: Object, default: () => ({}) },
  ownerCount: { type: Number, default: 0 },
  queueLength: { type: Number, default: 0 },
  isHighlighted: { type: Boolean, default: false },
  isCancelled: { type: Boolean, default: false },
  cancelledName: { type: String, default: '' },
  isNewOrder: { type: Boolean, default: false },
});

defineEmits(['select', 'show-owner']);

const formattedTime = computed(() => {
  if (!props.item.time) return '';
  const date = new Date(props.item.time);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
});
</script>
