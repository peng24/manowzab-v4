<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="sm-content">
      <!-- Header -->
      <div class="sm-header">
        <div class="sm-title">
          <span class="sm-title-icon"><i class="fa-solid fa-box-open"></i></span>
          <span>รายการจัดส่ง</span>
        </div>
        <div class="sm-header-actions">
          <button class="btn btn-primary sm-head-btn" @click="showShippingLabels = true" title="พิมพ์ใบปะหน้าพัสดุ">
            <i class="fa-solid fa-print"></i> ปริ้นใบปะหน้า
          </button>
          <button class="btn btn-dark sm-head-btn" @click="showAddressImport = true" title="นำเข้าที่อยู่จาก Apple Note หรือแชท">
            <i class="fa-solid fa-file-import"></i> นำเข้าที่อยู่
          </button>
          <button class="btn btn-dark sm-close-btn" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i> ปิด
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="sm-stats">
        <div class="sm-stat" :class="{ active: viewMode === 'requested' }" @click="viewMode = 'requested'" style="cursor: pointer;">
          <span class="sm-stat-num">{{ shippingRequestedCustomers.length }}</span>
          <span class="sm-stat-label">รอจัดส่ง</span>
        </div>
        <div class="sm-stat urgent">
          <span class="sm-stat-num">{{ todayCount }}</span>
          <span class="sm-stat-label">ส่งวันนี้</span>
        </div>
        <div class="sm-stat pack-tonight" v-if="packTonightCount > 0">
          <span class="sm-stat-num">{{ packTonightCount }}</span>
          <span class="sm-stat-label"><i class="fa-solid fa-moon"></i> แพ็คคืนนี้</span>
        </div>
        <div class="sm-stat warn">
          <span class="sm-stat-num">{{ soonCount }}</span>
          <span class="sm-stat-label">1-3 วัน</span>
        </div>
        <div class="sm-stat unassigned" :class="{ active: viewMode === 'unassigned' }" v-if="unassignedCustomers.length > 0" @click="viewMode = 'unassigned'" style="cursor: pointer;">
          <span class="sm-stat-num">{{ unassignedCustomers.length }}</span>
          <span class="sm-stat-label">ฝากสินค้า</span>
        </div>
        <div class="sm-stat total-items">
          <span class="sm-stat-num">{{ totalItemCount }}</span>
          <span class="sm-stat-label">สินค้ารวม</span>
        </div>
      </div>

      <!-- 🚚 Shipping Cycle Bar -->
      <div class="sm-cycle-bar">
        <div class="sm-cycle-info">
          <span class="sm-cycle-icon"><i class="fa-solid fa-truck-fast"></i></span>
          <span class="sm-cycle-title">รอบจัดส่งหลัก:</span>
          <span class="sm-cycle-pill">{{ currentCycleLabel }}</span>
        </div>
        <div class="sm-cycle-actions">
          <label class="sm-cycle-label-inline" for="sm-cycle-select">เปลี่ยนรอบส่ง:</label>
          <select
            id="sm-cycle-select"
            class="sm-cycle-select"
            :value="systemStore.shippingCycle"
            @change="onShippingCycleChange($event.target.value)"
          >
            <option value="today">📅 ส่งวันนี้</option>
            <option value="tomorrow">⏭️ ส่งพรุ่งนี้</option>
            <option value="จันทร์">วันจันทร์</option>
            <option value="อังคาร">วันอังคาร</option>
            <option value="พุธ">วันพุธ</option>
            <option value="พฤหัส">วันพฤหัสบดี</option>
            <option value="ศุกร์">วันศุกร์</option>
            <option value="เสาร์">วันเสาร์</option>
            <option value="อาทิตย์">วันอาทิตย์</option>
          </select>
        </div>
      </div>

      <!-- Add Customer Form (manual) -->
      <div class="sm-add-form">
        <input
          type="text"
          v-model="newName"
          class="sm-input"
          placeholder="เพิ่มลูกค้า (ชื่อ)"
          @keyup.enter="addManualCustomer"
          list="customerNamesList"
        />
        <datalist id="customerNamesList">
          <option v-for="name in uniqueCustomerNames" :key="name" :value="name"></option>
        </datalist>
        <div style="position: relative;">
          <ThaiDatePicker v-model="newDateFormatted" position="bottom-right">
            <input
              type="text"
              :value="newDate"
              @input="onNewDateInput"
              class="sm-input sm-date"
              placeholder="วว/ดด/ปปปป"
              maxlength="10"
            />
          </ThaiDatePicker>
        </div>
        <button class="btn btn-success sm-add-btn" @click="addManualCustomer" :disabled="!newName.trim()">
          <i class="fa-solid fa-plus"></i> เพิ่ม
        </button>
      </div>

      <!-- Filter Mode Tabs -->
      <div class="sm-filter-tabs">
        <button 
          class="sm-tab-btn" 
          :class="{ active: viewMode === 'requested' }" 
          @click="viewMode = 'requested'"
        >
          <i class="fa-solid fa-truck"></i> เฉพาะคนที่แจ้งส่ง <span class="sm-tab-count">{{ shippingRequestedCustomers.length }}</span>
        </button>
        <button 
          class="sm-tab-btn" 
          :class="{ active: viewMode === 'unassigned' }" 
          @click="viewMode = 'unassigned'"
        >
          <i class="fa-solid fa-box-archive"></i> ฝากสินค้า / ยังไม่ระบุวันส่ง <span class="sm-tab-count">{{ unassignedCustomers.length }}</span>
        </button>
        <button 
          class="sm-tab-btn" 
          :class="{ active: viewMode === 'all' }" 
          @click="viewMode = 'all'"
        >
          <i class="fa-solid fa-layer-group"></i> ทั้งหมด <span class="sm-tab-count">{{ activeCustomers.length }}</span>
        </button>
      </div>

      <!-- 🔍 Search & Sub-Filter Quick Pills -->
      <div class="sm-filter-subbar">
        <div class="sm-search-wrap">
          <i class="fa-solid fa-magnifying-glass sm-search-icon"></i>
          <input
            type="text"
            v-model="shippingSearchQuery"
            class="sm-search-input"
            placeholder="ค้นหาชื่อลูกค้า, โน้ต, ที่อยู่..."
            @keydown.esc="shippingSearchQuery = ''"
          />
          <button
            v-if="shippingSearchQuery"
            type="button"
            class="sm-search-clear"
            @click="shippingSearchQuery = ''"
            title="ล้างคำค้นหา"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="sm-sub-pills">
          <button
            type="button"
            class="sm-sub-pill"
            :class="{ active: shippingSubFilter === 'all' }"
            @click="shippingSubFilter = 'all'"
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            class="sm-sub-pill pill-warn"
            :class="{ active: shippingSubFilter === 'no-address' }"
            @click="shippingSubFilter = shippingSubFilter === 'no-address' ? 'all' : 'no-address'"
            :title="'แสดงเฉพาะลูกค้าที่ยังไม่มีที่อยู่จัดส่ง'"
          >
            <i class="fa-solid fa-location-dot"></i> ยังไม่มีที่อยู่ ({{ noAddressCount }})
          </button>
          <button
            type="button"
            class="sm-sub-pill pill-print"
            :class="{ active: shippingSubFilter === 'unprinted' }"
            @click="shippingSubFilter = shippingSubFilter === 'unprinted' ? 'all' : 'unprinted'"
            :title="'แสดงเฉพาะลูกค้าที่ยังไม่ได้พิมพ์ใบปะหน้า'"
          >
            <i class="fa-solid fa-print"></i> ยังไม่พิมพ์ ({{ unprintedCount }})
          </button>
        </div>
      </div>

      <!-- Customer List -->
      <div class="sm-table-wrap" data-lenis-prevent>
        <table class="sm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ชื่อลูกค้า</th>
              <th>สินค้า</th>
              <th>วันส่ง</th>
              <th>นับถอยหลัง</th>
              <th>โน้ต</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedCustomers.length === 0">
              <td colspan="7" style="text-align: center; color: #888; padding: 30px;">
                <span v-if="shippingSearchQuery || shippingSubFilter !== 'all'">
                  🔍 ไม่พบรายการลูกค้าที่ตรงกับเงื่อนไขการค้นหา
                </span>
                <span v-else-if="viewMode === 'requested'">
                  📭 ยังไม่มีรายการลูกค้าที่แจ้งวันจัดส่ง — เพิ่มวันส่งจากรายการฝากสินค้า หรือเพิ่มลูกค้าด้วยมือ
                </span>
                <span v-else-if="viewMode === 'unassigned'">
                  🎉 ไม่มีรายการลูกค้าที่ฝากสินค้า (ยังไม่ระบุวันส่ง)
                </span>
                <span v-else>
                  ยังไม่มีรายการจัดส่ง — เพิ่มลูกค้าจาก Dashboard หรือเพิ่มด้วยมือ
                </span>
              </td>
            </tr>
            <tr
              v-for="(c, idx) in sortedCustomers"
              :key="c.id"
              :class="{
                'row-urgent': getCountdown(c.deliveryDate).days <= 0 && c.deliveryDate,
                'row-pack-tonight': isPackTonight(c),
                'row-done': c.status === 'done'
              }"
            >
              <td class="td-center td-index">{{ idx + 1 }}</td>
              <td>
                <input
                  type="text"
                  class="sm-edit-input sm-customer-name"
                  :value="c.name"
                  @change="updateField(c.id, 'name', $event.target.value)"
                />
                <div class="lifetime-bookings" v-if="c.totalBookings > 0">
                  <i class="fa-solid fa-crown"></i> ลูกค้าประจำ • เคยสั่งรวม {{ c.totalBookings }} ชิ้น
                </div>
                <div class="sm-addr-row">
                  <!-- 📚 Multi-address indicator badge when customer has > 1 address -->
                  <span
                    v-if="getCustomerAddressCount(c) > 1"
                    class="sm-multi-addr-pill"
                    @click="selectedCustomerForAddress = c"
                    :title="`ลูกค้ารายนี้มี ${getCustomerAddressCount(c)} ที่อยู่ — คลิกเพื่อเลือกหรือสลับที่อยู่จัดส่ง`"
                  >
                    <i class="fa-solid fa-layer-group"></i>
                    <span class="multi-count-num">{{ getCustomerAddressCount(c) }} ที่อยู่</span>
                    <span class="multi-count-action">
                      {{ getActiveAddressLabel(c) ? `(เลือก: ${getActiveAddressLabel(c)})` : '(เลือกที่อยู่)' }}
                    </span>
                  </span>

                  <!-- 📍 Address Status Pill -->
                  <span
                    class="sm-addr-mini-pill"
                    :class="hasAddress(c) ? 'has' : 'none'"
                    @click="selectedCustomerForAddress = c"
                    :title="hasAddress(c) ? getCustomerAddressSummary(c) : 'คลิกเพื่อใส่ที่อยู่ลูกค้าคนนี้'"
                  >
                    <i class="fa-solid fa-location-dot"></i>
                    <span class="pill-text">
                      <template v-if="hasAddress(c)">
                        {{ c.recipientName ? `ผู้รับ: ${c.recipientName}` : 'มีที่อยู่' }}
                      </template>
                      <template v-else>
                        ยังไม่มีที่อยู่
                      </template>
                    </span>
                  </span>

                  <!-- 💳 Payment Type Pill (โอน / COD / ยังไม่ระบุ) -->
                  <span
                    class="sm-payment-pill"
                    :class="getCustomerPaymentType(c) === 'cod' ? 'cod' : (getCustomerPaymentType(c) === 'transfer' ? 'transfer' : 'unspecified')"
                    @click.stop="togglePaymentType(c)"
                    :title="`รูปแบบส่ง: ${getPaymentTypeDisplay(c)} (คลิกเพื่อสลับ)`"
                  >
                    <i :class="getCustomerPaymentType(c) === 'cod' ? 'fa-solid fa-money-bill-wave' : (getCustomerPaymentType(c) === 'transfer' ? 'fa-solid fa-credit-card' : 'fa-regular fa-circle-question')"></i>
                    <span>{{ getPaymentTypeDisplay(c) }}</span>
                  </span>

                  <!-- 💬 Contact Channel Pill (Line / LineOA / โทร) -->
                  <span
                    class="sm-contact-pill"
                    :class="getCustomerContactChannel(c) || 'unspecified'"
                    @click.stop="toggleContactChannel(c)"
                    :title="`ช่องทางติดต่อ: ${getContactChannelDisplay(c)} (คลิกเพื่อสลับ Line / LineOA / โทร)`"
                  >
                    <i :class="getCustomerContactChannel(c) === 'lineoa' ? 'fa-solid fa-comment-dots' : (getCustomerContactChannel(c) === 'phone' ? 'fa-solid fa-phone' : (getCustomerContactChannel(c) === 'line' ? 'fa-brands fa-line' : 'fa-regular fa-comment'))"></i>
                    <span>{{ getContactChannelDisplay(c) }}</span>
                  </span>

                  <!-- 🖨️ Printed status badge with toggle -->
                  <span
                    class="sm-printed-pill"
                    :class="c.labelPrinted ? 'printed' : 'unprinted'"
                    @click.stop="togglePrinted(c)"
                    :title="c.labelPrinted ? 'พิมพ์ใบปะหน้าแล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)' : 'ยังไม่ได้พิมพ์ใบปะหน้า (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)'"
                  >
                    <i :class="c.labelPrinted ? 'fa-solid fa-circle-check' : 'fa-solid fa-print'"></i>
                    <span>{{ c.labelPrinted ? 'พิมพ์แล้ว' : 'ยังไม่พิมพ์' }}</span>
                  </span>
                </div>
              </td>
              <td class="td-center">
                <span class="item-count-auto" :title="getSessionBreakdown(c)">
                  {{ c.itemCount || 0 }} ชิ้น
                  <i v-if="c.sessions" class="fa-solid fa-circle-info session-info-icon"></i>
                </span>
              </td>
              <td class="td-center">
                <div class="date-cell">
                  <span v-if="c.deliveryDate" class="thai-date">{{ formatThaiDate(c.deliveryDate) }}</span>
                  <span v-else class="no-date">ระบุวันส่ง</span>
                  <ThaiDatePicker :modelValue="c.deliveryDate" position="bottom-center" @update:modelValue="val => updateField(c.id, 'deliveryDate', val)" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                    <input
                      type="text"
                      class="sm-date-input-text"
                      style="width: 100%; height: 100%; box-sizing: border-box;"
                      :value="formatToDDMMYYYY(c.deliveryDate)"
                      @input="onTableRowDateInput"
                      @change="handleTableDateChange(c.id, $event.target.value)"
                      placeholder="วว/ดด/ปปปป"
                      maxlength="10"
                    />
                  </ThaiDatePicker>
                </div>
              </td>
              <td class="td-center">
                <div class="countdown-cell">
                  <span class="countdown-badge" :class="'cd-' + getCountdown(c.deliveryDate).color">
                    {{ getCountdown(c.deliveryDate).text }}
                  </span>
                  <span v-if="isPackTonight(c)" class="pack-badge">
                    <i class="fa-solid fa-moon"></i> แพ็คคืนนี้
                  </span>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  class="sm-edit-input sm-note"
                  :value="c.note || ''"
                  placeholder="เพิ่มโน้ต..."
                  @change="updateField(c.id, 'note', $event.target.value)"
                />
              </td>
              <td class="td-center">
                <div class="action-btns">
                  <button
                    class="action-btn print-btn"
                    :class="{ 'is-printed': c.labelPrinted }"
                    @click="openPrintForCustomer(c)"
                    :title="c.labelPrinted ? 'พิมพ์แล้ว (คลิกเพื่อดู/พิมพ์ซ้ำเฉพาะคนนี้)' : 'พิมพ์ใบปะหน้าเฉพาะคนนี้'"
                  >
                    <i class="fa-solid fa-print"></i>
                  </button>
                  <button
                    v-if="c.status !== 'done'"
                    class="action-btn done-btn"
                    @click="markDone(c)"
                    title="เสร็จแล้ว"
                  ><i class="fa-solid fa-check"></i></button>
                  <button
                    v-else
                    class="action-btn undo-btn"
                    @click="undoDone(c)"
                    title="ยังไม่เสร็จ"
                  ><i class="fa-solid fa-rotate-left"></i></button>
                  <button
                    class="action-btn del-btn"
                    @click="deleteCustomer(c.id, c.name)"
                    title="นำออกจากรายการจัดส่ง (ย้ายไปฝากสินค้า)"
                  ><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 📱 Mobile Card View (for portrait smartphones) -->
        <div class="sm-mobile-cards">
          <div v-if="sortedCustomers.length === 0" style="text-align: center; color: #888; padding: 20px;">
            <span v-if="shippingSearchQuery || shippingSubFilter !== 'all'">🔍 ไม่พบรายการลูกค้าที่ตรงกับเงื่อนไขการค้นหา</span>
            <span v-else-if="viewMode === 'requested'">📭 ยังไม่มีรายการลูกค้าที่แจ้งวันจัดส่ง</span>
            <span v-else-if="viewMode === 'unassigned'">🎉 ไม่มีรายการลูกค้าที่ฝากสินค้า</span>
            <span v-else>ยังไม่มีรายการจัดส่ง</span>
          </div>
          <div
            v-for="(c, idx) in sortedCustomers"
            :key="c.id"
            :class="[
              'sm-card',
              getCountdown(c.deliveryDate).days <= 0 && c.deliveryDate ? 'row-urgent' : '',
              isPackTonight(c) ? 'row-pack-tonight' : '',
              c.status === 'done' ? 'row-done' : ''
            ]"
          >
            <div class="sm-card-header">
              <div class="sm-card-name">#{{ idx + 1 }} {{ c.name }}</div>
              <span class="countdown-badge" :class="'cd-' + getCountdown(c.deliveryDate).color">
                {{ getCountdown(c.deliveryDate).text }}
              </span>
            </div>
            <div class="sm-card-items">
              📦 สินค้า: {{ c.itemCount || 0 }} ชิ้น
              <span v-if="c.deliveryDate"> • ส่ง {{ formatThaiDate(c.deliveryDate) }}</span>
            </div>
            <div class="sm-card-addr">
              <div class="sm-card-addr-tags">
                <span
                  v-if="getCustomerAddressCount(c) > 1"
                  class="sm-multi-addr-pill"
                  @click="promptEditAddress(c)"
                  :title="`มี ${getCustomerAddressCount(c)} ที่อยู่ — คลิกเพื่อเลือกที่อยู่`"
                >
                  <i class="fa-solid fa-layer-group"></i>
                  <span class="multi-count-num">{{ getCustomerAddressCount(c) }} ที่อยู่</span>
                  <span class="multi-count-action">
                    {{ getActiveAddressLabel(c) ? `(เลือก: ${getActiveAddressLabel(c)})` : '(เลือกที่อยู่)' }}
                  </span>
                </span>
                <span v-if="hasAddress(c)" class="sm-addr-tag has" @click="promptEditAddress(c)" :title="getCustomerAddressSummary(c)">
                  📍 {{ getCustomerAddressSummary(c) }}
                </span>
                <span v-else class="sm-addr-tag none" @click="promptEditAddress(c)">
                  + ใส่ที่อยู่
                </span>
                <span
                  class="sm-payment-pill"
                  :class="getCustomerPaymentType(c) === 'cod' ? 'cod' : (getCustomerPaymentType(c) === 'transfer' ? 'transfer' : 'unspecified')"
                  @click.stop="togglePaymentType(c)"
                  :title="`รูปแบบส่ง: ${getPaymentTypeDisplay(c)} (คลิกเพื่อสลับ)`"
                >
                  <i :class="getCustomerPaymentType(c) === 'cod' ? 'fa-solid fa-money-bill-wave' : (getCustomerPaymentType(c) === 'transfer' ? 'fa-solid fa-credit-card' : 'fa-regular fa-circle-question')"></i>
                  <span>{{ getPaymentTypeDisplay(c) }}</span>
                </span>
                <!-- 💬 Contact Channel Pill (Line / LineOA / โทร) -->
                <span
                  class="sm-contact-pill"
                  :class="getCustomerContactChannel(c) || 'unspecified'"
                  @click.stop="toggleContactChannel(c)"
                  :title="`ช่องทางติดต่อ: ${getContactChannelDisplay(c)} (คลิกเพื่อสลับ Line / LineOA / โทร)`"
                >
                  <i :class="getCustomerContactChannel(c) === 'lineoa' ? 'fa-solid fa-comment-dots' : (getCustomerContactChannel(c) === 'phone' ? 'fa-solid fa-phone' : (getCustomerContactChannel(c) === 'line' ? 'fa-brands fa-line' : 'fa-regular fa-comment'))"></i>
                  <span>{{ getContactChannelDisplay(c) }}</span>
                </span>
              </div>
              <span
                class="sm-printed-pill"
                :class="c.labelPrinted ? 'printed' : 'unprinted'"
                @click.stop="togglePrinted(c)"
                :title="c.labelPrinted ? 'พิมพ์แล้ว (คลิกเพื่อสลับ)' : 'ยังไม่พิมพ์ (คลิกเพื่อสลับ)'"
              >
                <i :class="c.labelPrinted ? 'fa-solid fa-circle-check' : 'fa-solid fa-print'"></i>
                <span>{{ c.labelPrinted ? 'พิมพ์แล้ว' : 'ยังไม่พิมพ์' }}</span>
              </span>
            </div>
            <div class="sm-card-footer">
              <div style="font-size: 0.85em; color: #94a3b8;">{{ c.note || 'ไม่มีโน้ต' }}</div>
              <div class="action-btns">
                <button
                  class="action-btn print-btn"
                  :class="{ 'is-printed': c.labelPrinted }"
                  @click="openPrintForCustomer(c)"
                  title="พิมพ์ใบปะหน้าเฉพาะคนนี้"
                ><i class="fa-solid fa-print"></i> พิมพ์</button>
                <button
                  v-if="c.status !== 'done'"
                  class="action-btn done-btn"
                  @click="markDone(c)"
                  title="เสร็จแล้ว"
                ><i class="fa-solid fa-check"></i> เสร็จ</button>
                <button
                  v-else
                  class="action-btn undo-btn"
                  @click="undoDone(c)"
                  title="ยังไม่เสร็จ"
                ><i class="fa-solid fa-rotate-left"></i> ย้อน</button>
                <button
                  class="action-btn del-btn"
                  @click="deleteCustomer(c.id, c.name)"
                  title="นำออกจากรายการจัดส่ง (ย้ายไปฝากสินค้า)"
                ><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Toggle -->
      <div class="sm-footer">
        <label class="sm-toggle">
          <input type="checkbox" v-model="showDone" />
          <span>แสดงรายการที่เสร็จแล้ว ({{ doneCount }})</span>
        </label>
      </div>
    </div>

    <!-- 🖨️ Shipping Label Print Modal -->
    <ShippingLabelModal
      v-if="showShippingLabels"
      :customers="allCustomers"
      :addressBook="addressBook"
      :initialSelectedId="selectedCustomerForPrint"
      @close="showShippingLabels = false; selectedCustomerForPrint = null"
    />

    <!-- 📥 Address Import Modal -->
    <AddressImportModal
      v-if="showAddressImport"
      :customers="allCustomers"
      :addressBook="addressBook"
      @close="showAddressImport = false"
    />

    <!-- 📍 Multiple Address Manager Modal -->
    <CustomerAddressModal
      v-if="currentCustomerForModal"
      :customer="currentCustomerForModal"
      :addressBook="addressBook"
      @close="selectedCustomerForAddress = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted, watch, defineAsyncComponent } from "vue";
import { ref as dbRef, onValue, update, get } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useCustomerStore } from "../stores/customer";
import Swal from "sweetalert2";
import { markDone, undoDone, removeFromShippingList } from "../utils/deliveryActions";
import { restoreDeletedAddressBookCustomers } from "../utils/deliverySync";
import ThaiDatePicker from "./ThaiDatePicker.vue";

// 🚀 Performance: Lazy load modals on demand
const ShippingLabelModal = defineAsyncComponent(() => import("./ShippingLabelModal.vue"));
const AddressImportModal = defineAsyncComponent(() => import("./AddressImportModal.vue"));
const CustomerAddressModal = defineAsyncComponent(() => import("./CustomerAddressModal.vue"));
import { normalizeName, parseSingleAddress } from "../utils/addressParser";
import {
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
  formatShippingCycleLabel,
  shipDayOfWeekRegex,
  calcNextDayOfWeekDate,
} from "../utils/chatParserUtils";
import { logger } from "../utils/logger";

const emit = defineEmits(["close"]);

const stockStore = useStockStore();
const systemStore = useSystemStore();
const customerStore = useCustomerStore();

// State
const allCustomers = computed(() => customerStore.deliveryCustomersList);
const newName = ref("");
const newDate = ref("");
const showDone = ref(false);
const viewMode = ref("requested"); // 'requested' | 'unassigned' | 'all'
const showShippingLabels = ref(false);
const selectedCustomerForPrint = ref(null);
const showAddressImport = ref(false);
const selectedCustomerForAddress = ref(null);
const addressBook = computed(() => customerStore.addressBook);
const cleanupFns = [];

const currentCustomerForModal = computed(() => {
  if (!selectedCustomerForAddress.value) return null;
  return allCustomers.value.find((c) => c.id === selectedCustomerForAddress.value.id) || selectedCustomerForAddress.value;
});

const currentCycleLabel = computed(() => {
  return formatShippingCycleLabel(systemStore.shippingCycle);
});

async function onShippingCycleChange(newCycle) {
  await systemStore.setShippingCycle(newCycle);
  Swal.fire({
    icon: "success",
    title: `🚚 ตั้งรอบจัดส่งหลักเป็น: ${formatShippingCycleLabel(newCycle)}`,
    toast: true,
    position: "top-end",
    timer: 1800,
    showConfirmButton: false,
  });
}

const newDateFormatted = computed({
  get() {
    return parseDDMMYYYY(newDate.value) || '';
  },
  set(val) {
    if (!val) {
      newDate.value = '';
    } else {
      const parts = val.split('-');
      if (parts.length === 3) {
        newDate.value = `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
      }
    }
  }
});

// ✅ Thai month abbreviations
const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = (d.getFullYear() + 543) % 100; // พ.ศ. 2 หลัก
  return `${day} ${month} ${year}`;
}

function formatToDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

function parseDDMMYYYY(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) {
      y = (parseInt(y) > 50 ? '19' : '20') + y;
    } else if (y.length === 4 && parseInt(y) > 2500) {
      y = (parseInt(y) - 543).toString();
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function formatMaskedDateInput(v) {
  v = v.replace(/\D/g, "");
  if (v.length > 8) v = v.substring(0, 8);
  if (v.length >= 5) {
    v = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
  } else if (v.length >= 3) {
    v = `${v.substring(0, 2)}/${v.substring(2)}`;
  }
  return v;
}

function onNewDateInput(e) {
  newDate.value = formatMaskedDateInput(e.target.value);
  e.target.value = newDate.value;
}

function onTableRowDateInput(e) {
  e.target.value = formatMaskedDateInput(e.target.value);
}

function handleTableDateChange(id, val) {
  const parsed = parseDDMMYYYY(val);
  updateField(id, 'deliveryDate', parsed || null);
}

onMounted(() => {
  const unsubCustomers = customerStore.initCustomerListeners();
  if (unsubCustomers) cleanupFns.push(unsubCustomers);

  const unsubCycle = systemStore.initShippingCycleListener();
  if (unsubCycle) cleanupFns.push(unsubCycle);

  restoreDeletedAddressBookCustomers();
});

onUnmounted(() => {
  cleanupFns.forEach(fn => {
    if (typeof fn === 'function') {
      fn();
    }
  });
  cleanupFns.length = 0;
  logger.debug("🧹 Memory Cleaned Up!");
});

// Address Helpers
function getCustomerSavedAddresses(customer) {
  if (!customer) return [];
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  const inCust = customer.addresses;
  const inBook = addressBook.value && addressBook.value[norm]?.addresses;
  const rawList = inCust || inBook;
  let list = [];
  if (Array.isArray(rawList)) {
    list = rawList.filter(Boolean);
  } else if (rawList && typeof rawList === "object") {
    list = Object.values(rawList).filter(Boolean);
  }
  if (list.length > 0) return list;
  if (hasAddress(customer)) {
    const info = getCustomerAddressInfo(customer);
    return info ? [info] : [];
  }
  return [];
}

function getCustomerAddressCount(customer) {
  return getCustomerSavedAddresses(customer).length;
}

function getActiveAddressLabel(customer) {
  if (!customer) return "";
  const list = getCustomerSavedAddresses(customer);
  if (!list || list.length === 0) return "";

  // 1. Match by selectedAddressId
  if (customer.selectedAddressId) {
    const matched = list.find((a) => a.id === customer.selectedAddressId);
    if (matched) return matched.label || (matched.recipientName ? `${matched.recipientName}` : "");
  }

  // 2. Match by address string
  if (customer.address && customer.address.trim()) {
    const trimmed = customer.address.trim();
    const matched = list.find((a) => a.address && a.address.trim() === trimmed);
    if (matched) return matched.label || (matched.recipientName ? `${matched.recipientName}` : "");
  }

  // 3. Fallback to first item's label
  return list[0]?.label || "";
}

function getCustomerAddressInfo(customer) {
  if (customer.address && customer.address.trim()) {
    return {
      recipientName: customer.recipientName || "",
      phone: customer.phone || "",
      address: customer.address || "",
      postalCode: customer.postalCode || "",
    };
  }
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  if (addressBook.value && addressBook.value[norm]) {
    return addressBook.value[norm];
  }
  return null;
}

function hasAddress(customer) {
  const info = getCustomerAddressInfo(customer);
  return !!(info && info.address && info.address.trim());
}

function getCustomerAddressSummary(customer) {
  const info = getCustomerAddressInfo(customer);
  if (!info || !info.address) return "";
  const recipientPart = info.recipientName && info.recipientName !== customer.name ? `[ผู้รับ: ${info.recipientName}] ` : "";
  return `${recipientPart}${info.phone ? info.phone + ' • ' : ''}${info.address}`;
}

function promptEditAddress(customer) {
  selectedCustomerForAddress.value = customer;
}

// Computed
const activeCustomers = computed(() =>
  allCustomers.value.filter((c) => c.status !== "done")
);

const shippingRequestedCustomers = computed(() =>
  allCustomers.value.filter(
    (c) => c.status !== "done" && c.deliveryDate && c.deliveryDate.trim() !== ""
  )
);

const unassignedCustomers = computed(() =>
  allCustomers.value.filter(
    (c) => c.status !== "done" && (!c.deliveryDate || c.deliveryDate.trim() === "")
  )
);

const shippingSearchQuery = ref("");
const shippingSubFilter = ref("all"); // 'all' | 'no-address' | 'unprinted'

const noAddressCount = computed(() => {
  return customers.value.filter((c) => !hasAddress(c) && c.status !== "done").length;
});

const unprintedCount = computed(() => {
  return customers.value.filter((c) => !c.labelPrinted && c.status !== "done").length;
});

const customers = computed(() => {
  let base = [];
  if (viewMode.value === "requested") {
    base = shippingRequestedCustomers.value;
  } else if (viewMode.value === "unassigned") {
    base = unassignedCustomers.value;
  } else {
    base = activeCustomers.value;
  }

  if (showDone.value) {
    const doneList = allCustomers.value.filter((c) => c.status === "done");
    return [...base, ...doneList];
  }
  return base;
});

// 🚀 Optimization: Pre-calculate countdown days once before sorting (O(N) instead of O(N log N) Date object instantiations)
const sortedCustomers = computed(() => {
  let list = customers.value;
  if (!list || list.length === 0) return [];

  const q = shippingSearchQuery.value.trim().toLowerCase();
  const sub = shippingSubFilter.value;

  if (q) {
    list = list.filter((c) => {
      const nameMatch = (c.name || "").toLowerCase().includes(q);
      const noteMatch = (c.note || "").toLowerCase().includes(q);
      const addrSummary = (getCustomerAddressSummary(c) || "").toLowerCase();
      const addrMatch = addrSummary.includes(q);
      return nameMatch || noteMatch || addrMatch;
    });
  }

  if (sub === "no-address") {
    list = list.filter((c) => !hasAddress(c));
  } else if (sub === "unprinted") {
    list = list.filter((c) => !c.labelPrinted);
  }

  const decorated = list.map((c) => ({
    customer: c,
    days: getCountdown(c.deliveryDate).days,
    isDone: c.status === "done",
  }));

  decorated.sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    return a.days - b.days;
  });

  return decorated.map((d) => d.customer);
});

const todayCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => getCountdown(c.deliveryDate).days === 0).length
);

const packTonightCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => isPackTonight(c)).length
);

const soonCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => {
    const d = getCountdown(c.deliveryDate).days;
    return d > 0 && d <= 3;
  }).length
);

const totalItemCount = computed(() =>
  customers.value.reduce((sum, c) => sum + (c.itemCount || 0), 0)
);

const doneCount = computed(() =>
  allCustomers.value.filter((c) => c.status === "done").length
);

const uniqueCustomerNames = computed(() => {
  const names = new Set();
  
  allCustomers.value.forEach(c => {
    if (c.name) names.add(c.name);
  });

  if (addressBook.value) {
    Object.values(addressBook.value).forEach(b => {
      if (b && b.name) names.add(b.name);
    });
  }
  
  if (stockStore.stockData) {
    Object.values(stockStore.stockData).forEach(item => {
      if (item && item.owner) names.add(item.owner);
      if (item && item.queue) {
        item.queue.forEach(q => {
          if (q.owner) names.add(q.owner);
        });
      }
    });
  }
  
  return Array.from(names).sort();
});

// Countdown Logic
function getCountdown(deliveryDate) {
  if (!deliveryDate) return { text: "ยังไม่กำหนด", color: "gray", days: Infinity };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `เลย ${Math.abs(diffDays)} วัน!`, color: "overdue", days: diffDays };
  if (diffDays === 0) return { text: "ส่งวันนี้!", color: "red", days: 0 };
  if (diffDays === 1) return { text: "พรุ่งนี้", color: "orange", days: 1 };
  if (diffDays <= 3) return { text: `อีก ${diffDays} วัน`, color: "yellow", days: diffDays };
  return { text: `อีก ${diffDays} วัน`, color: "green", days: diffDays };
}

// Pack Tonight Logic — รายการที่ส่งพรุ่งนี้ ต้องแพ็คของคืนนี้
function isPackTonight(customer) {
  if (!customer.deliveryDate || customer.status === 'done') return false;
  const countdown = getCountdown(customer.deliveryDate);
  // ส่งพรุ่งนี้ (diffDays === 1) = ต้องแพ็คคืนนี้
  return countdown.days === 1;
}

function getSessionBreakdown(customer) {
  if (!customer.sessions) return "ไม่มีข้อมูลไลฟ์";
  return Object.entries(customer.sessions)
    .map(([vid, s]) => `${vid.substring(0, 8)}...: ${s.count} ชิ้น`)
    .join("\n");
}

// CRUD
function addManualCustomer() {
  let name = newName.value.trim();
  if (!name) return;

  let parsedDate = parseDDMMYYYY(newDate.value);

  // --- Apply Chat-Like Logic ---
  const shipNowMatch = name.match(/ส่งเลย|ส่งวันนี้|ส่งครับ|ส่งค่ะ|ส่งด้วย|พร้อมส่ง|ขอส่ง|แจ้งส่ง|รวมส่ง|(?:^|[^\u0E00-\u0E7F])ส่ง(?:$|[^\u0E00-\u0E7F\w])/);
  const shipTmrMatch = name.match(/ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่งวันพรุ่งนี้/);
  const shipDayOfWeekMatch = name.match(shipDayOfWeekRegex);
  const shipDateMatch = name.match(/ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?/);

  let matchedKeyword = null;
  if (shipTmrMatch) matchedKeyword = shipTmrMatch[0];
  else if (shipDayOfWeekMatch) matchedKeyword = shipDayOfWeekMatch[0];
  else if (shipDateMatch) matchedKeyword = shipDateMatch[0];
  else if (shipNowMatch) matchedKeyword = shipNowMatch[0];

  if (matchedKeyword) {
    // 1. Clean the name
    let cleanName = name
      .replace(matchedKeyword, "")
      .replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, "")
      .trim();

    if (cleanName.length > 0) {
      name = cleanName;
    }

    // 2. Auto-set the date if not explicitly manually filled in the date input
    if (!newDate.value) {
      let autoShipDate = new Date();
      if (shipTmrMatch) {
         autoShipDate.setDate(autoShipDate.getDate() + 1);
      } else if (shipDayOfWeekMatch) {
         const dayName = shipDayOfWeekMatch[1];
         autoShipDate = calcNextDayOfWeekDate(dayName);
      } else if (shipDateMatch) {
         const day = parseInt(shipDateMatch[1]);
         autoShipDate.setDate(day);
         const monthStr = shipDateMatch[2];
         if (monthStr) {
           const mNamesShort = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
           const mNamesFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
           const cleanMonth = monthStr.replace(/\./g, '');
           let mIndex = mNamesShort.indexOf(cleanMonth);
           if (mIndex === -1) mIndex = mNamesFull.indexOf(cleanMonth);
           if (mIndex !== -1) {
             autoShipDate.setMonth(mIndex);
           }
         }
         if (autoShipDate < new Date() && (new Date().getDate() - day) > 15) {
           autoShipDate.setMonth(autoShipDate.getMonth() + 1);
         }
      } else if (shipNowMatch) {
         autoShipDate = resolveShippingCycleDate(systemStore.shippingCycle);
      }
      parsedDate = formatDateToYYYYMMDD(autoShipDate);
    }
  }

  // Backup fallback: Default Shipping Cycle Date
  if (!parsedDate) {
    const cycleDate = resolveShippingCycleDate(systemStore.shippingCycle);
    parsedDate = formatDateToYYYYMMDD(cycleDate);
  }

  // Find if customer already exists to update them instead of duplicating
  let targetUid = "manual-" + Date.now();
  const targetNorm = normalizeName(name);
  const existingCustomer =
    allCustomers.value.find(c => normalizeName(c.name) === targetNorm && c.status !== "done") ||
    allCustomers.value.find(c => normalizeName(c.name) === targetNorm);
  if (existingCustomer) {
    targetUid = existingCustomer.id;
  }

  const normKey = normalizeName(name).replace(/[.#$[\]/]/g, "_");
  const defaultPaymentType = existingCustomer?.paymentType || (addressBook.value && addressBook.value[normKey]?.paymentType) || "";
  const defaultContactChannel = existingCustomer?.contactChannel || (addressBook.value && addressBook.value[normKey]?.contactChannel) || "";

  update(dbRef(db, `delivery_customers/${targetUid}`), {
    name,
    itemCount: existingCustomer ? (existingCustomer.itemCount ?? 0) : 0,
    deliveryDate: parsedDate,
    note: (existingCustomer && existingCustomer.note) || "",
    paymentType: defaultPaymentType,
    contactChannel: defaultContactChannel,
    status: "pending",
    labelPrinted: false,
    labelPrintedAt: null,
    createdAt: existingCustomer ? (existingCustomer.createdAt ?? Date.now()) : Date.now(),
    updatedAt: Date.now(),
  }).then(() => {
    newName.value = "";
    newDate.value = "";
    Swal.fire({ icon: "success", title: `เพิ่ม "${name}" แล้ว`, toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
  });
}

function updateField(id, field, value) {
  const updates = {
    [field]: value ?? "",
    updatedAt: Date.now(),
  };
  if (field === "deliveryDate" && value) {
    const cust = allCustomers.value.find((c) => c.id === id);
    if (cust && cust.status === "done") {
      updates.status = "pending";
      updates.labelPrinted = false;
      updates.labelPrintedAt = null;
    }
  }

  // 💳 Auto-sync paymentType to address_book if note specifies payment intent
  let paymentTypeChange = null;
  const cust = allCustomers.value.find((c) => c.id === id);
  const normKey = cust ? normalizeName(cust.name).replace(/[.#$[\]/]/g, "_") : "";

  if (field === "note" && typeof value === "string") {
    const noteLower = value.toLowerCase();
    if (noteLower.includes("cod") || noteLower.includes("ปลายทาง") || noteLower.includes("เก็บเงิน")) {
      updates.paymentType = "cod";
      if (cust) cust.paymentType = "cod";
      paymentTypeChange = "cod";
    } else if (noteLower.includes("โอน") || noteLower.includes("transfer")) {
      updates.paymentType = "transfer";
      if (cust) cust.paymentType = "transfer";
      paymentTypeChange = "transfer";
    }
  }

  if (paymentTypeChange && normKey) {
    if (addressBook.value && addressBook.value[normKey]) {
      addressBook.value[normKey].paymentType = paymentTypeChange;
    }
    const multiPathUpdates = {};
    Object.entries(updates).forEach(([k, v]) => {
      multiPathUpdates[`delivery_customers/${id}/${k}`] = v;
    });
    multiPathUpdates[`address_book/${normKey}/paymentType`] = paymentTypeChange;
    multiPathUpdates[`address_book/${normKey}/updatedAt`] = Date.now();
    update(dbRef(db), multiPathUpdates);
  } else {
    update(dbRef(db, `delivery_customers/${id}`), updates);
  }
}

function openPrintForCustomer(customer) {
  selectedCustomerForPrint.value = customer.id;
  showShippingLabels.value = true;
}

async function togglePrinted(customer) {
  const newStatus = !customer.labelPrinted;
  try {
    await update(dbRef(db, `delivery_customers/${customer.id}`), {
      labelPrinted: newStatus,
      labelPrintedAt: newStatus ? Date.now() : null,
    });
    Swal.fire({
      icon: "success",
      title: newStatus ? `ทำเครื่องหมาย "${customer.name}" พิมพ์แล้ว` : `ยกเลิกสถานะพิมพ์แล้วของ "${customer.name}"`,
      toast: true,
      position: "top-end",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to toggle labelPrinted:", err);
  }
}

// 💳 Payment Type Helpers (โอน / COD / ยังไม่ระบุ)
function getCustomerPaymentType(customer) {
  if (!customer) return "";
  if (customer.paymentType) {
    const pt = String(customer.paymentType).trim().toLowerCase();
    if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") {
      return "cod";
    }
    if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") {
      return "transfer";
    }
  }

  // 1. Fallback: check central address_book
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  const bookEntry = addressBook.value && norm ? addressBook.value[norm] : null;
  if (bookEntry && bookEntry.paymentType) {
    const pt = String(bookEntry.paymentType).trim().toLowerCase();
    if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") {
      return "cod";
    }
    if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") {
      return "transfer";
    }
  }

  // 2. Fallback: check active or saved address's paymentType
  const savedAddrs = getCustomerSavedAddresses(customer);
  const activeAddr = customer.selectedAddressId
    ? savedAddrs.find((a) => a.id === customer.selectedAddressId)
    : savedAddrs[0];
  if (activeAddr && activeAddr.paymentType) {
    const pt = String(activeAddr.paymentType).trim().toLowerCase();
    if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") {
      return "cod";
    }
    if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") {
      return "transfer";
    }
  }

  // 3. Fallback: check note or address for COD keywords
  const note = (customer.note || "").toLowerCase();
  const addr = (customer.address || "").toLowerCase();
  if (
    note.includes("cod") ||
    note.includes("ปลายทาง") ||
    note.includes("เก็บเงิน") ||
    addr.includes("cod") ||
    addr.includes("ปลายทาง")
  ) {
    return "cod";
  }

  return "";
}

function isCod(customer) {
  return getCustomerPaymentType(customer) === "cod";
}

function getPaymentTypeDisplay(customer) {
  const type = getCustomerPaymentType(customer);
  if (type === "cod") {
    const match = (customer?.note || "").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);
    if (match && match[1]) {
      return `COD (${match[1]}฿)`;
    }
    return "COD";
  }
  if (type === "transfer") {
    return "โอน";
  }
  return "ยังไม่ระบุ";
}

async function togglePaymentType(customer) {
  if (!customer) return;
  const current = getCustomerPaymentType(customer);
  const nextType = current === "cod" ? "transfer" : (current === "transfer" ? "cod" : "transfer");

  // ⚡ Optimistic UI update
  customer.paymentType = nextType;

  const timestamp = Date.now();
  const normKey = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");

  const multiPathUpdates = {
    [`delivery_customers/${customer.id}/paymentType`]: nextType,
    [`delivery_customers/${customer.id}/updatedAt`]: timestamp,
  };

  if (normKey) {
    multiPathUpdates[`address_book/${normKey}/paymentType`] = nextType;
    multiPathUpdates[`address_book/${normKey}/name`] = customer.name.trim();
    multiPathUpdates[`address_book/${normKey}/updatedAt`] = timestamp;
    if (addressBook.value && addressBook.value[normKey]) {
      addressBook.value[normKey].paymentType = nextType;
    }
  }

  // Also update in customer's active address if available
  const savedAddrs = getCustomerSavedAddresses(customer);
  if (savedAddrs.length > 0) {
    const updatedAddrs = savedAddrs.map((a) => ({
      ...a,
      paymentType: (customer.selectedAddressId && a.id === customer.selectedAddressId) || savedAddrs.length === 1
        ? nextType
        : (a.paymentType || nextType),
    }));
    multiPathUpdates[`delivery_customers/${customer.id}/addresses`] = updatedAddrs;
    if (normKey) {
      multiPathUpdates[`address_book/${normKey}/addresses`] = updatedAddrs;
    }
  }

  try {
    await update(dbRef(db), multiPathUpdates);
    Swal.fire({
      icon: "success",
      title: `บันทึกรูปแบบ "${customer.name}" เป็น "${nextType === 'cod' ? 'COD' : 'โอน'}" ไว้ในประวัติลูกค้าแล้ว`,
      toast: true,
      position: "top-end",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to toggle paymentType:", err);
  }
}

// 💬 Contact Channel Helpers (Line / LineOA / โทรศัพท์)
function getCustomerContactChannel(customer) {
  if (!customer) return "";
  if (customer.contactChannel) {
    const cc = String(customer.contactChannel).trim().toLowerCase();
    if (cc === "lineoa" || cc === "line_oa" || cc === "line-oa") return "lineoa";
    if (cc === "phone" || cc === "tel" || cc === "โทร" || cc === "โทรศัพท์") return "phone";
    if (cc === "line") return "line";
  }

  // 1. Fallback: check central address_book
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  const bookEntry = addressBook.value && norm ? addressBook.value[norm] : null;
  if (bookEntry && bookEntry.contactChannel) {
    const cc = String(bookEntry.contactChannel).trim().toLowerCase();
    if (cc === "lineoa" || cc === "line_oa" || cc === "line-oa") return "lineoa";
    if (cc === "phone" || cc === "tel" || cc === "โทร" || cc === "โทรศัพท์") return "phone";
    if (cc === "line") return "line";
  }

  // 2. Fallback: check active or saved address
  const savedAddrs = getCustomerSavedAddresses(customer);
  const activeAddr = customer.selectedAddressId
    ? savedAddrs.find((a) => a.id === customer.selectedAddressId)
    : savedAddrs[0];
  if (activeAddr && activeAddr.contactChannel) {
    const cc = String(activeAddr.contactChannel).trim().toLowerCase();
    if (cc === "lineoa" || cc === "line_oa" || cc === "line-oa") return "lineoa";
    if (cc === "phone" || cc === "tel" || cc === "โทร" || cc === "โทรศัพท์") return "phone";
    if (cc === "line") return "line";
  }

  return "";
}

function getContactChannelDisplay(customer) {
  const ch = getCustomerContactChannel(customer);
  if (ch === "lineoa") return "LineOA";
  if (ch === "phone") return "โทร";
  if (ch === "line") return "Line";
  return "-";
}

async function toggleContactChannel(customer) {
  if (!customer) return;
  const current = getCustomerContactChannel(customer);
  const next = current === "line" ? "lineoa" : (current === "lineoa" ? "phone" : "line");

  // ⚡ Optimistic UI update
  customer.contactChannel = next;

  const timestamp = Date.now();
  const normKey = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");

  const multiPathUpdates = {
    [`delivery_customers/${customer.id}/contactChannel`]: next,
    [`delivery_customers/${customer.id}/updatedAt`]: timestamp,
  };

  if (normKey) {
    multiPathUpdates[`address_book/${normKey}/contactChannel`] = next;
    multiPathUpdates[`address_book/${normKey}/name`] = customer.name.trim();
    multiPathUpdates[`address_book/${normKey}/updatedAt`] = timestamp;
    if (addressBook.value && addressBook.value[normKey]) {
      addressBook.value[normKey].contactChannel = next;
    }
  }

  // Also update in customer's active address if available
  const savedAddrs = getCustomerSavedAddresses(customer);
  if (savedAddrs.length > 0) {
    const updatedAddrs = savedAddrs.map((a) => ({
      ...a,
      contactChannel: (customer.selectedAddressId && a.id === customer.selectedAddressId) || savedAddrs.length === 1
        ? next
        : (a.contactChannel || next),
    }));
    multiPathUpdates[`delivery_customers/${customer.id}/addresses`] = updatedAddrs;
    if (normKey) {
      multiPathUpdates[`address_book/${normKey}/addresses`] = updatedAddrs;
    }
  }

  try {
    await update(dbRef(db), multiPathUpdates);
    const nextLabel = next === "lineoa" ? "LineOA" : (next === "phone" ? "โทรศัพท์" : "Line");
    Swal.fire({
      icon: "success",
      title: `บันทึกช่องทางติดต่อ "${customer.name}" เป็น "${nextLabel}" ไว้ในประวัติลูกค้าแล้ว`,
      toast: true,
      position: "top-end",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to toggle contactChannel:", err);
  }
}

function deleteCustomer(id, name) {
  return removeFromShippingList(id, name);
}
</script>

<style scoped>
.sm-content {
  background: rgba(11, 15, 23, 0.96);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 96%;
  width: 1040px;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  box-shadow:
    0 32px 96px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(243, 200, 117, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.sm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sm-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.2px;
}

.sm-title-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(243, 200, 117, 0.12);
  border: 1px solid rgba(243, 200, 117, 0.3);
  color: #f3c875;
  font-size: 0.95rem;
}

.sm-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.sm-close-btn {
  padding: 7px 14px;
  font-size: 0.88em;
  font-weight: 600;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Stats */
.sm-stats {
  display: flex;
  gap: 10px;
  padding: 14px 0 10px;
}

.sm-stat {
  flex: 1;
  background: rgba(255, 255, 255, 0.025);
  border-radius: 12px;
  padding: 10px 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: all 0.2s ease;
}

.sm-stat:hover {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(243, 200, 117, 0.3);
  transform: translateY(-1px);
}

.sm-stat.urgent {
  border-color: rgba(239, 68, 68, 0.26);
  background: rgba(239, 68, 68, 0.05);
}

.sm-stat.warn {
  border-color: rgba(245, 158, 11, 0.25);
  background: rgba(245, 158, 11, 0.045);
}

.sm-stat.unassigned {
  border-color: rgba(167, 139, 250, 0.25);
  background: rgba(139, 92, 246, 0.05);
}

.sm-stat.unassigned .sm-stat-num {
  color: #c4b5fd;
}

.sm-stat.pack-tonight {
  border-color: rgba(251, 146, 60, 0.35);
  background: rgba(249, 115, 22, 0.07);
  animation: pack-glow 2.8s ease-in-out infinite;
}

.sm-stat.total-items .sm-stat-num {
  color: #34d399;
}

.sm-stat.active {
  border-color: rgba(243, 200, 117, 0.55);
  background: rgba(243, 200, 117, 0.07);
  box-shadow:
    inset 0 2px 0 rgba(243, 200, 117, 0.85),
    0 4px 16px rgba(243, 200, 117, 0.1);
}

.sm-stat-num {
  display: block;
  font-size: 1.55em;
  font-weight: 700;
  line-height: 1.15;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}

.sm-stat.urgent .sm-stat-num { color: #f87171; }
.sm-stat.warn .sm-stat-num { color: #fbbf24; }
.sm-stat.pack-tonight .sm-stat-num { color: #fb923c; }

.sm-stat-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.78em;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 3px;
}

/* 🚚 Shipping Cycle Bar */
.sm-cycle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px 14px;
  margin: 2px 0;
  flex-wrap: wrap;
}

.sm-cycle-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sm-cycle-icon {
  font-size: 1em;
  color: #f3c875;
}

.sm-cycle-title {
  font-size: 0.9em;
  color: #94a3b8;
  font-weight: 500;
}

.sm-cycle-pill {
  background: rgba(243, 200, 117, 0.12);
  border: 1px solid rgba(243, 200, 117, 0.32);
  color: #f3c875;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.88em;
  font-weight: 600;
}

.sm-cycle-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sm-cycle-label-inline {
  font-size: 0.86em;
  color: #94a3b8;
}

.sm-cycle-select {
  background: #0f1520;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: #f8fafc;
  padding: 5px 12px;
  font-family: "Kanit", sans-serif;
  font-size: 0.88em;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.sm-cycle-select:hover, .sm-cycle-select:focus {
  border-color: rgba(243, 200, 117, 0.55);
  box-shadow: 0 0 0 2px rgba(243, 200, 117, 0.15);
}

/* Add Form */
.sm-add-form {
  display: flex;
  gap: 8px;
  padding: 10px 0 8px;
  align-items: center;
}

.sm-input {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #f8fafc;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  flex: 1;
  transition: all 0.2s ease;
}

.sm-input::placeholder {
  color: #64748b;
}

.sm-input:focus {
  outline: none;
  border-color: rgba(243, 200, 117, 0.55);
  background: rgba(15, 21, 32, 0.9);
  box-shadow: 0 0 0 2px rgba(243, 200, 117, 0.14);
}

.sm-date { max-width: 155px; flex: unset; text-align: center; }
.sm-add-btn { padding: 9px 18px; font-size: 0.95em; border-radius: 10px; white-space: nowrap; }

/* Filter Tabs (Segmented Luxury Track) */
.sm-filter-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 2px 0 8px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
}

.sm-tab-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #94a3b8;
  font-family: "Kanit", sans-serif;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sm-tab-count {
  font-size: 0.85em;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
}

.sm-tab-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
}

.sm-tab-btn.active {
  background: rgba(243, 200, 117, 0.13);
  border-color: rgba(243, 200, 117, 0.35);
  color: #fde68a;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.sm-tab-btn.active .sm-tab-count {
  background: rgba(243, 200, 117, 0.22);
  color: #fde68a;
}

/* 🔍 Filter Subbar: Search & Sub-Filter Pills */
.sm-filter-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 0 10px;
  flex-wrap: wrap;
}

.sm-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
}

.sm-search-icon {
  position: absolute;
  left: 12px;
  font-size: 0.88em;
  color: #64748b;
  pointer-events: none;
}

.sm-search-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #f8fafc;
  font-family: "Kanit", sans-serif;
  font-size: 0.92em;
  outline: none;
  transition: all 0.2s ease;
}

.sm-search-input::placeholder {
  color: #64748b;
}

.sm-search-input:focus {
  border-color: rgba(243, 200, 117, 0.5);
  box-shadow: 0 0 0 2px rgba(243, 200, 117, 0.12);
  background: rgba(15, 21, 32, 0.9);
}

.sm-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 3px 6px;
  font-size: 0.85em;
  border-radius: 50%;
}

.sm-search-clear:hover {
  color: #f87171;
  background: rgba(255, 255, 255, 0.08);
}

.sm-sub-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-sub-pill {
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  font-family: "Kanit", sans-serif;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.sm-sub-pill:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #f8fafc;
}

.sm-sub-pill.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.45);
  color: #7dd3fc;
}

.sm-sub-pill.pill-warn.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(248, 113, 113, 0.45);
  color: #fca5a5;
}

.sm-sub-pill.pill-print.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(251, 191, 36, 0.45);
  color: #fde68a;
}

/* Table */
.sm-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  background: rgba(8, 11, 18, 0.45);
}

.sm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.94em;
}

.sm-table th {
  background: #131823;
  color: #94a3b8;
  padding: 10px 10px;
  font-size: 0.85em;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sm-table th:first-child,
.sm-table th:nth-child(3),
.sm-table th:nth-child(4),
.sm-table th:nth-child(5),
.sm-table th:last-child {
  text-align: center;
}

.sm-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: middle;
}

.sm-table tbody tr {
  transition: background 0.15s ease;
}

.sm-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.td-center { text-align: center; }

.td-index {
  width: 44px;
  font-size: 1.15em;
  font-weight: 700;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.row-urgent {
  background: rgba(239, 68, 68, 0.05) !important;
}

.row-pack-tonight {
  background: rgba(249, 115, 22, 0.05) !important;
  box-shadow: inset 3px 0 0 #fb923c;
}

.row-done {
  opacity: 0.45;
}

/* Auto Item Count */
.item-count-auto {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 1.18em;
  font-weight: 700;
  color: #34d399;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.session-info-icon {
  font-size: 0.72em;
  color: #64748b;
  cursor: help;
}

.session-info-icon:hover {
  color: #cbd5e1;
}

/* Lifetime Bookings (ลูกค้าประจำ) */
.lifetime-bookings {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.86em;
  font-weight: 600;
  color: #e5c17b;
  margin-top: 2px;
  padding-left: 6px;
  opacity: 0.92;
  letter-spacing: 0.2px;
}

.lifetime-bookings i {
  font-size: 0.85em;
}

/* Thai Date Cell */
.date-cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
  padding: 4px 8px;
  border-radius: 8px;
  gap: 6px;
  cursor: text;
  transition: background 0.15s ease;
}

.date-cell:hover {
  background: rgba(255, 255, 255, 0.05);
}

.thai-date {
  font-size: 1.02em;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
}

.no-date {
  color: #64748b;
  font-size: 0.88em;
  white-space: nowrap;
}

.sm-date-input-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  text-align: center;
  font-family: inherit;
  font-size: 0.95em;
  border-radius: 6px;
  cursor: text;
  transition: all 0.2s;
}

.sm-date-input-text:focus {
  opacity: 1;
  background: #0f1520;
  border-color: rgba(243, 200, 117, 0.55);
  outline: none;
  z-index: 10;
}

/* Editable Inputs */
.sm-edit-input {
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  width: 100%;
  transition: border-color 0.2s, background 0.2s;
}

.sm-customer-name {
  font-size: 1.32em;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.2px;
  line-height: 1.25;
  padding: 2px 6px;
}

.sm-edit-input:hover { border-color: rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.03); }
.sm-edit-input:focus { border-color: rgba(243, 200, 117, 0.55); outline: none; background: #0f1520; }

.sm-note {
  max-width: 150px;
  font-size: 0.9em;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 6px 10px;
}

.sm-note::placeholder {
  color: #64748b;
}

/* Countdown Cell (stacked layout for badge + pack indicator) */
.countdown-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

/* Countdown Badge */
.countdown-badge {
  display: inline-block;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.84em;
  font-weight: 700;
  white-space: nowrap;
}

.cd-overdue { background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; animation: pulse-urgent 1.8s infinite; }
.cd-red { background: rgba(239, 68, 68, 0.16); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; animation: pulse-urgent 2.2s infinite; }
.cd-orange { background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.3); color: #fcd34d; }
.cd-yellow { background: rgba(234, 179, 8, 0.12); border: 1px solid rgba(234, 179, 8, 0.25); color: #fde047; }
.cd-green { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: #6ee7b7; }
.cd-gray { background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8; }

/* Pack Tonight Badge */
.pack-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.76em;
  font-weight: 700;
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border: 1px solid rgba(249, 115, 22, 0.3);
  white-space: nowrap;
  animation: pack-pulse 2.2s ease-in-out infinite;
}

@keyframes pulse-urgent {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.25); }
  50% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}

@keyframes pack-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.2); }
  50% { box-shadow: 0 0 8px 1px rgba(249, 115, 22, 0.14); }
}

@keyframes pack-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.15); }
  50% { box-shadow: 0 0 12px 2px rgba(249, 115, 22, 0.08); }
}

/* Action Buttons */
.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.action-btn {
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 0.92em;
  cursor: pointer;
  padding: 0;
  border-radius: 9px;
  transition: all 0.16s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.action-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.action-btn.print-btn {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.25);
  color: #7dd3fc;
}

.action-btn.print-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
}

.action-btn.print-btn.is-printed {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.action-btn.done-btn {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.action-btn.done-btn:hover {
  background: rgba(16, 185, 129, 0.24);
  border-color: #10b981;
  color: #6ee7b7;
}

.action-btn.undo-btn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.action-btn.undo-btn:hover {
  background: rgba(245, 158, 11, 0.22);
  border-color: #f59e0b;
}

.action-btn.del-btn {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.09);
  color: #94a3b8;
}

.action-btn.del-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fca5a5;
}

/* Footer */
.sm-footer {
  padding: 12px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 8px;
}

.sm-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 0.9em;
  cursor: pointer;
}

.sm-toggle input { accent-color: #f3c875; }

/* Header Action Buttons */
.sm-head-btn {
  padding: 7px 14px;
  font-size: 0.88em;
  font-weight: 600;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

/* Subtle Tonal Address & Meta Pills in Table & Card */
.sm-addr-row, .sm-card-addr {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-addr-mini-pill,
.sm-payment-pill,
.sm-contact-pill,
.sm-printed-pill,
.sm-multi-addr-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.86em;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  line-height: 1.4;
}

.sm-addr-mini-pill.has {
  background: rgba(16, 185, 129, 0.1);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.sm-addr-mini-pill.has:hover {
  background: rgba(16, 185, 129, 0.18);
  border-color: rgba(16, 185, 129, 0.45);
}

.sm-addr-mini-pill.none {
  background: rgba(255, 255, 255, 0.035);
  color: #cbd5e1;
  border: 1px dashed rgba(255, 255, 255, 0.22);
}

.sm-addr-mini-pill.none:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.4);
}

/* Payment Type Pill */
.sm-payment-pill.transfer {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.26);
}

.sm-payment-pill.transfer:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.sm-payment-pill.cod {
  background: rgba(243, 200, 117, 0.12);
  color: #fde68a;
  border: 1px solid rgba(243, 200, 117, 0.3);
}

.sm-payment-pill.cod:hover {
  background: rgba(243, 200, 117, 0.22);
  border-color: rgba(243, 200, 117, 0.55);
}

.sm-payment-pill.unspecified {
  background: rgba(148, 163, 184, 0.07);
  color: #94a3b8;
  border: 1px dashed rgba(148, 163, 184, 0.28);
}

.sm-payment-pill.unspecified:hover {
  background: rgba(148, 163, 184, 0.14);
  border-color: rgba(203, 213, 225, 0.5);
  color: #f1f5f9;
}

/* Contact Channel Pill */
.sm-contact-pill.line {
  background: rgba(34, 197, 94, 0.1);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.sm-contact-pill.line:hover {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.45);
}

.sm-contact-pill.lineoa {
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.28);
}

.sm-contact-pill.lineoa:hover {
  background: rgba(16, 185, 129, 0.22);
  border-color: rgba(16, 185, 129, 0.5);
}

.sm-contact-pill.phone {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.26);
}

.sm-contact-pill.phone:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.sm-contact-pill.unspecified {
  background: rgba(148, 163, 184, 0.07);
  color: #94a3b8;
  border: 1px dashed rgba(148, 163, 184, 0.28);
}

.sm-contact-pill.unspecified:hover {
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(203, 213, 225, 0.45);
  color: #e2e8f0;
}

/* Printed Status Pill */
.sm-printed-pill.printed {
  background: rgba(16, 185, 129, 0.11);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.28);
}

.sm-printed-pill.printed:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
}

.sm-printed-pill.unprinted {
  background: rgba(245, 158, 11, 0.09);
  color: #fcd34d;
  border: 1px dashed rgba(245, 158, 11, 0.3);
}

.sm-printed-pill.unprinted:hover {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.55);
}

.sm-card-name {
  font-size: 1.35em;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.2px;
}

/* 📚 Multi-Address Indicator Pill */
.sm-multi-addr-pill {
  background: rgba(139, 92, 246, 0.12);
  color: #c4b5fd;
  border: 1px solid rgba(167, 139, 250, 0.3);
  white-space: nowrap;
}

.sm-multi-addr-pill:hover {
  background: rgba(139, 92, 246, 0.22);
  border-color: rgba(196, 181, 253, 0.55);
  color: #ffffff;
}

.sm-multi-addr-pill .multi-count-num {
  font-weight: 700;
  color: #ddd6fe;
}

.sm-multi-addr-pill .multi-count-action {
  font-size: 0.92em;
  color: #ede9fe;
  font-weight: 500;
  opacity: 0.92;
}

.sm-card-addr-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.sm-mobile-cards .action-btn {
  width: auto;
  height: auto;
  padding: 6px 12px;
  font-size: 0.88em;
}

.multi-count {
  font-weight: 700;
  color: #60a5fa;
  margin-right: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .sm-content { padding: 14px; }
  .sm-stats { flex-wrap: wrap; gap: 8px; }
  .sm-stat { min-width: calc(33.33% - 6px); }
  .sm-add-form { flex-wrap: wrap; }
  .sm-input { min-width: 100%; }
  .sm-date { max-width: unset; min-width: 100%; }
  .sm-filter-tabs { flex-wrap: wrap; }
  .sm-table { font-size: 0.8em; }
  .sm-note { max-width: 100px; }
  .sm-head-btn, .sm-close-btn { font-size: 0.8em; padding: 6px 10px; }
}

/* Print Clean Setup */
@media print {
  .sm-content {
    display: none !important;
  }
  .dashboard-overlay {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
  }
}
</style>
