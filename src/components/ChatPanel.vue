<template>
  <div class="chat-panel">
    <div class="tools-bar">
      <h3 style="color: #fff; margin: 0">
        <i class="fa-solid fa-comments"></i> แชทสด
      </h3>
    </div>

    <div id="chat-viewport" ref="chatViewport" @scroll="handleScroll">
      <div id="chat-list">
        <div
          v-for="chat in chatStore.messages"
          :key="chat.id"
          :class="['chat-row', chat.isAdmin ? 'admin' : '', chat.type]"
        >
          <img :src="chat.avatar" class="avatar" loading="lazy" />
          <div class="chat-content">
            <div class="chat-header">
              <span class="badge-nick" :style="{ backgroundColor: chat.color }">
                {{ chat.displayName }}

                <i
                  v-if="chat.detectionMethod"
                  class="fa-solid fa-hand-point-up"
                  style="margin-left: 4px; opacity: 0.6"
                ></i>
              </span>
              <span
                v-if="chat.realName !== chat.displayName"
                class="real-name-sub"
              >
                ({{ chat.realName }})
              </span>
            </div>
            <div class="chat-msg">{{ chat.text }}</div>
          </div>
        </div>
      </div>
    </div>

    <button v-if="showScrollButton" class="new-msg-btn" @click="scrollToBottom">
      ข้อความใหม่ ⬇
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { useChatStore } from "../stores/chat";

const chatStore = useChatStore();
const chatViewport = ref(null);
const showScrollButton = ref(false);
let isUserScrolling = false;

// ตรวจจับการ Scroll
function handleScroll() {
  const el = chatViewport.value;
  if (!el) return;

  // ถ้า Scroll ขึ้นไปเกิน 100px จากด้านล่าง ถือว่า user กำลังดูประวัติ
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isUserScrolling = distanceToBottom > 100;
  showScrollButton.value = isUserScrolling;
}

// เลื่อนลงล่างสุด
function scrollToBottom() {
  const el = chatViewport.value;
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    showScrollButton.value = false;
    isUserScrolling = false;
  }
}

// เมื่อมีข้อความใหม่
watch(
  () => chatStore.messages.length,
  async () => {
    await nextTick();
    // ถ้า User ไม่ได้เลื่อนดูประวัติอยู่ ให้เลื่อนลงอัตโนมัติ
    if (!isUserScrolling) {
      scrollToBottom();
    } else {
      // ถ้าดูประวัติอยู่ ให้โชว์ปุ่มแจ้งเตือน
      showScrollButton.value = true;
    }
  }
);

onMounted(() => {
  scrollToBottom();
});
</script>
