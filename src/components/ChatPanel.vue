<template>
  <div class="chat-panel">
    <div class="tools-bar">
      <button
        :class="['btn', 'btn-mute', systemStore.isSoundOn ? 'active' : '']"
        @click="toggleSound"
      >
        {{ systemStore.isSoundOn ? "🔊 เสียง: เปิด" : "🔇 เสียง: ปิด" }}
      </button>

      <button class="btn btn-dark" @click="resetVoice">🔇 Reset</button>

      <!-- ✅ ปุ่มบันทึกแชท -->
      <button class="btn btn-success" @click="downloadCSV">
        <i class="fa-solid fa-file-csv"></i> CSV
      </button>

      <div style="margin-left: auto; display: flex; gap: 2px">
        <button class="btn btn-dark" @click="adjustZoom(-2)">A-</button>
        <button class="btn btn-dark" @click="adjustZoom(2)">A+</button>
      </div>
    </div>

    <div id="chat-viewport" ref="chatViewport" @scroll="handleScroll">
      <div id="chat-list">
        <div
          v-if="chatStore.messages.length === 0"
          style="text-align: center; color: #888; padding: 20px"
        >
          ยังไม่มีข้อความ
        </div>

        <div
          v-for="msg in chatStore.messages"
          :key="msg.id"
          :class="['chat-row', msg.isAdmin ? 'admin' : 'normal']"
        >
          <img :src="msg.avatar" class="avatar" />
          <div class="chat-content">
            <div class="chat-header">
              <span
                :class="['badge-nick', msg.isAdmin ? 'vip-admin' : '']"
                :style="{ background: msg.color }"
                @click="
                  askNickname(
                    msg.uid,
                    getCurrentNickname(msg.uid, msg.realName)
                  )
                "
                style="cursor: pointer"
                :title="'คลิกเพื่อตั้งชื่อเล่น'"
              >
                {{ getCurrentNickname(msg.uid, msg.realName) }}
              </span>

              <span
                v-if="
                  msg.realName &&
                  getCurrentNickname(msg.uid, msg.realName) !== msg.realName
                "
                class="real-name-sub"
              >
                ({{ msg.realName }})
              </span>

              <span
                v-if="msg.detectionMethod"
                class="tag-source"
                :class="msg.detectionMethod"
              >
                <i
                  :class="
                    msg.detectionMethod === 'ai'
                      ? 'fa-solid fa-robot'
                      : 'fa-solid fa-bolt'
                  "
                ></i>
              </span>
            </div>
            <div class="chat-msg">{{ msg.text }}</div>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="showScrollButton"
      class="scroll-bottom-btn"
      @click="scrollToBottom"
    >
      ⬇️ แชทใหม่
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useSystemStore } from "../stores/system";
import { useChatStore } from "../stores/chat";
import { useNicknameStore } from "../stores/nickname";
import { useAudio } from "../composables/useAudio";
import { ref as dbRef, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const systemStore = useSystemStore();
const chatStore = useChatStore();
const nicknameStore = useNicknameStore();
const { queueSpeech, resetVoice: resetAudio } = useAudio();

const chatViewport = ref(null);
const showScrollButton = ref(false);
const fontSize = ref(16);

// ✅ ฟังก์ชันดึง nickname แบบ Real-time
function getCurrentNickname(uid, realName) {
  return nicknameStore.getNickname(uid, realName);
}

function toggleSound() {
  systemStore.isSoundOn = !systemStore.isSoundOn;
  if (systemStore.isSoundOn) {
    queueSpeech("เปิดเสียงค่ะ");
  }
}

function resetVoice() {
  resetAudio();
  if (systemStore.isSoundOn) {
    queueSpeech("รีเซ็ตเสียงแล้ว");
  }
}

// ✅ เพิ่มฟังก์ชันบันทึก CSV
function downloadCSV() {
  if (chatStore.fullChatLog.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ยังไม่มีข้อความแชทเข้ามา",
      timer: 2000,
    });
    return;
  }

  chatStore.downloadChatCSV(systemStore.currentVideoId);
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    timer: 1500,
    showConfirmButton: false,
  });
}

function adjustZoom(delta) {
  fontSize.value += delta;
  document.documentElement.style.setProperty(
    "--chat-size",
    fontSize.value + "px"
  );
}

// ✅ แก้ไขฟังก์ชัน handleScroll (เอา 100 มารวมกับบรรทัดเดียวกัน)
function handleScroll() {
  if (!chatViewport.value) return;
  const isAtBottom =
    chatViewport.value.scrollHeight -
    chatViewport.value.scrollTop -
    chatViewport.value.clientHeight;
  100;
  showScrollButton.value = !isAtBottom;
}

function scrollToBottom() {
  if (chatViewport.value) {
    chatViewport.value.scrollTop = chatViewport.value.scrollHeight;
  }
}

function askNickname(uid, currentName) {
  if (!uid) return;

  Swal.fire({
    title: "ตั้งชื่อเล่น",
    input: "text",
    inputValue: currentName,
    inputPlaceholder: "ใส่ชื่อเล่นใหม่",
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const nickname = result.value.trim();
      if (nickname) {
        update(dbRef(db, `nicknames/${uid}`), { nick: nickname })
          .then(() => {
            Swal.fire({
              icon: "success",
              title: "บันทึกแล้ว",
              text: `เปลี่ยนชื่อเป็น "${nickname}"`,
              timer: 1500,
              showConfirmButton: false,
            });
          })
          .catch((error) => {
            console.error("Error saving nickname:", error);
            Swal.fire("Error", "บันทึกไม่สำเร็จ", "error");
          });
      }
    }
  });
}

// Auto-scroll on new messages
watch(
  () => chatStore.messages.length,
  () => {
    if (!showScrollButton.value && chatViewport.value) {
      setTimeout(() => {
        chatViewport.value.scrollTop = chatViewport.value.scrollHeight;
      }, 50);
    }
  }
);
</script>
