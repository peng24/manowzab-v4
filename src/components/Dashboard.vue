<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="dashboard-content">
      <div class="dashboard-header">
        <div class="dash-title">🚚 คิวจัดส่ง (รอบปัจจุบัน)</div>
        <button class="btn btn-dark" @click="$emit('close')">ปิด</button>
      </div>

      <div style="overflow-x: auto; flex: 1">
        <table class="shipping-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ลูกค้า (แก้ไขได้)</th>
              <th>แชท</th>
              <th>รายการ</th>
              <th>ราคารวม</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <!-- Add Customer Row -->
            <tr v-if="notReadyCustomers.length > 0">
              <td
                colspan="6"
                style="text-align: center; padding: 10px; background: #2a2a2a"
              >
                <div
                  style="
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <i class="fa-solid fa-user-plus"></i>
                  <select
                    v-model="selectedCustomer"
                    style="
                      padding: 5px;
                      border-radius: 4px;
                      background: #444;
                      color: #fff;
                      border: 1px solid #555;
                      max-width: 200px;
                    "
                  >
                    <option value="">-- เลือกลูกค้าเพื่อส่งของ --</option>
                    <option
                      v-for="customer in notReadyCustomers"
                      :key="customer.uid"
                      :value="customer.uid"
                    >
                      {{ customer.name }} ({{ customer.itemCount }} รายการ)
                    </option>
                  </select>
                  <button
                    class="btn btn-success"
                    @click="addToShipping"
                    style="padding: 4px 10px; font-size: 0.9em"
                    :disabled="!selectedCustomer"
                  >
                    เพิ่ม
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr
              v-if="shippingList.length === 0 && notReadyCustomers.length === 0"
            >
              <td
                colspan="6"
                style="text-align: center; color: #888; padding: 20px"
              >
                ยังไม่มีรายการที่แจ้งพร้อมส่ง
              </td>
            </tr>

            <!-- Shipping List -->
            <tr v-for="(item, index) in shippingList" :key="item.uid">
              <td>{{ index + 1 }}</td>
              <td>
                <input
                  class="edit-input"
                  v-model="item.editableName"
                  @change="updateCustomerName(item.uid, item.editableName)"
                  placeholder="พิมพ์ชื่อแล้ว Enter"
                />
              </td>
              <td style="font-size: 0.9em">{{ item.itemsText }}</td>
              <td style="text-align: center">
                <button
                  class="btn-icon-chat"
                  @click="openChatHistory(item.uid, item)"
                  title="ดูประวัติแชท"
                >
                  <i class="fa-solid fa-comments"></i>
                </button>
              </td>
              <td style="color: #ffd700; font-weight: bold">
                ฿{{ item.totalPrice.toLocaleString() }}
              </td>
              <td style="text-align: center">
                <button
                  class="btn btn-dark"
                  style="
                    background: #d32f2f;
                    color: white;
                    padding: 4px 8px;
                    font-size: 0.8em;
                  "
                  @click="removeFromShipping(item.uid)"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>

            <!-- All Ready Message -->
            <tr
              v-if="shippingList.length > 0 && notReadyCustomers.length === 0"
            >
              <td
                colspan="6"
                style="text-align: center; color: #00e676; padding: 10px"
              >
                ✅ ลูกค้าทุกคนอยู่ในรายการส่งของแล้ว
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Chat History Modal -->
  <div
    v-if="selectedChatUid"
    class="chat-history-modal"
    @click.self="selectedChatUid = null"
  >
    <div class="chat-history-content">
      <div class="chat-history-header">
        <div class="user-info">
          <img
            :src="
              selectedChatUser.avatar ||
              'https://www.gstatic.com/youtube/img/creator/avatars/sample_avatar.png'
            "
            class="avatar-small"
          />
          <div>
            <h3>{{ selectedChatUser.name }}</h3>
            <div class="sub-text">ประวัติแชทแจ้งโอน/ส่งของ</div>
          </div>
        </div>
        <button class="btn-close" @click="selectedChatUid = null">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>

      <div class="chat-history-body" id="history-body">
        <div
          v-if="userChatHistory.length === 0"
          style="text-align: center; color: #555; margin-top: 50px"
        >
          - ไม่มีประวัติแชท -
        </div>
        <div
          v-for="(msg, index) in userChatHistory"
          :key="index"
          class="chat-bubble-row"
        >
          <div class="chat-bubble-time">
            {{ new Date(msg.timestamp).toLocaleTimeString("th-TH") }}
          </div>
          <div class="chat-bubble-text">{{ msg.text }}</div>
        </div>
      </div>

      <div class="chat-history-footer">
        <button class="btn-sync-chat" @click="syncChatFromMemory">
          <i class="fa-solid fa-rotate"></i> ดึงข้อความย้อนหลัง (Sync)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useChatStore } from "../stores/chat";
import { ref as dbRef, onValue, update, push, get } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);

const stockStore = useStockStore();
const systemStore = useSystemStore();
const chatStore = useChatStore();

const selectedCustomer = ref("");
const shippingData = ref({});
const savedNames = ref({});

// Chat History State
const selectedChatUid = ref(null);
const selectedChatUser = ref({});
const userChatHistory = ref([]);

// Calculate customer orders
const customerOrders = computed(() => {
  const orders = {};

  Object.keys(stockStore.stockData).forEach((num) => {
    const item = stockStore.stockData[num];
    if (item?.uid) {
      if (!orders[item.uid]) {
        orders[item.uid] = {
          name: item.owner,
          uid: item.uid,
          items: [],
          totalPrice: 0,
        };
      }

      const price = item.price ? parseInt(item.price) : 0;
      orders[item.uid].items.push({ num, price });
      orders[item.uid].totalPrice += price;
    }
  });

  return orders;
});

// Get ready customers (in shipping list)
const shippingList = computed(() => {
  const currentShipping = shippingData.value[systemStore.currentVideoId] || {};

  return Object.keys(customerOrders.value)
    .filter((uid) => currentShipping[uid]?.ready)
    .map((uid) => {
      const order = customerOrders.value[uid];
      const itemsText = order.items
        .map((i) => `#${i.num}${i.price > 0 ? `(${i.price})` : ""}`)
        .join(", ");

      return {
        uid,
        name: savedNames.value[uid]?.nick || order.name,
        editableName: savedNames.value[uid]?.nick || order.name,
        itemsText,
        totalPrice: order.totalPrice,
      };
    });
});

// Get not ready customers
const notReadyCustomers = computed(() => {
  const currentShipping = shippingData.value[systemStore.currentVideoId] || {};

  return Object.keys(customerOrders.value)
    .filter((uid) => !currentShipping[uid]?.ready)
    .map((uid) => ({
      uid,
      name: savedNames.value[uid]?.nick || customerOrders.value[uid].name,
      itemCount: customerOrders.value[uid].items.length,
    }));
});

function addToShipping() {
  if (!selectedCustomer.value) return;

  const path = `shipping/${systemStore.currentVideoId}/${selectedCustomer.value}`;
  update(dbRef(db, path), {
    ready: true,
    timestamp: Date.now(),
  })
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "เพิ่มลงรายการส่งของแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });
      selectedCustomer.value = "";
    })
    .catch((error) => {
      console.error("Error adding to shipping:", error);
      Swal.fire("Error", "เพิ่มไม่สำเร็จ", "error");
    });
}

function removeFromShipping(uid) {
  Swal.fire({
    title: "ลบออกจากรายการ?",
    text: "คุณต้องการลบลูกค้าคนนี้ออกจากรายการส่งของหรือไม่?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#d32f2f",
  }).then((result) => {
    if (result.isConfirmed) {
      const path = `shipping/${systemStore.currentVideoId}/${uid}`;
      update(dbRef(db, path), { ready: null })
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "ลบออกจากรายการแล้ว",
            timer: 1500,
            showConfirmButton: false,
          });
        })
        .catch((error) => {
          console.error("Error removing from shipping:", error);
          Swal.fire("Error", "ลบไม่สำเร็จ", "error");
        });
    }
  });
}

function updateCustomerName(uid, name) {
  if (!name || !name.trim()) return;

  update(dbRef(db, `nicknames/${uid}`), { nick: name.trim() })
    .then(() => {
      console.log("✅ Updated nickname:", name);
    })
    .catch((error) => {
      console.error("Error updating nickname:", error);
    });
}

// Chat History Functions
async function openChatHistory(uid, item) {
  selectedChatUid.value = uid;
  selectedChatUser.value = {
    name: item.name,
    avatar: null, // เดี๋ยวค่อยดึงจาก chatStore ถ้าต้องการเป๊ะๆ
  };

  // Find avatar from chatStore recent messages (optional optimization)
  const found = chatStore.messages.find((m) => m.uid === uid);
  if (found) selectedChatUser.value.avatar = found.avatar;

  // Load History
  const historyRef = dbRef(
    db,
    `shipping/${systemStore.currentVideoId}/${uid}/history`
  );
  try {
    const snapshot = await get(historyRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      userChatHistory.value = Object.values(data).sort(
        (a, b) => a.timestamp - b.timestamp
      );
    } else {
      userChatHistory.value = [];
    }

    // Auto scroll down
    setTimeout(() => {
      const body = document.getElementById("history-body");
      if (body) body.scrollTop = body.scrollHeight;
    }, 100);
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
}

function syncChatFromMemory() {
  if (!selectedChatUid.value) return;

  // Filter messages from memory
  const memoryMsgs = chatStore.messages.filter(
    (m) => m.uid === selectedChatUid.value
  );

  if (memoryMsgs.length === 0) {
    Swal.fire("ไม่พบข้อมูล", "ไม่พบข้อความของลูกค้านี้ในหน่วยความจำ", "info");
    return;
  }

  // Check duplicates and push
  let count = 0;
  const historyRef = dbRef(
    db,
    `shipping/${systemStore.currentVideoId}/${selectedChatUid.value}/history`
  );

  memoryMsgs.forEach((memMsg) => {
    // Check if distinct message text is already in history (simple check)
    const exists = userChatHistory.value.some(
      (h) =>
        h.text === memMsg.text && Math.abs(h.timestamp - memMsg.timestamp) < 5000
    );

    if (!exists) {
      push(historyRef, {
        text: memMsg.text,
        timestamp: memMsg.timestamp,
        type: "user",
      });
      count++;
    }
  });

  if (count > 0) {
    // Reload UI
    openChatHistory(selectedChatUid.value, selectedChatUser.value);
    Swal.fire("Success", `Sync เพิ่ม ${count} ข้อความ`, "success");
  } else {
    Swal.fire("Up to date", "ไม่มีข้อความใหม่ให้ Sync", "info");
  }
}


onMounted(() => {
  // Listen to shipping data
  onValue(dbRef(db, "shipping"), (snapshot) => {
    shippingData.value = snapshot.val() || {};
  });

  // Listen to saved names
  onValue(dbRef(db, "nicknames"), (snapshot) => {
    savedNames.value = snapshot.val() || {};
  });
});
</script>

<style scoped>
.dashboard-content {
  background: #121212;
  border-radius: 8px;
  max-width: 95%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
</style>
