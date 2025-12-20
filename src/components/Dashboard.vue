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
              <th>รายการ</th>
              <th>ราคารวม</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <!-- Add Customer Row -->
            <tr v-if="notReadyCustomers.length > 0">
              <td
                colspan="5"
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
                colspan="5"
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
                colspan="5"
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
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { ref as dbRef, onValue, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);

const stockStore = useStockStore();
const systemStore = useSystemStore();

const selectedCustomer = ref("");
const shippingData = ref({});
const savedNames = ref({});

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
