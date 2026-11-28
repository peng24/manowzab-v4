<template>
  <Teleport to="body">
    <Transition name="amm-fade">
      <div
        v-if="visible"
        class="amm-overlay"
        @click.self="emitClose"
      >
        <div class="amm-modal" role="dialog" aria-modal="true" aria-label="ตรวจสอบและรวมชื่อลูกค้าซ้ำ">
          <!-- Header -->
          <div class="amm-header">
            <div class="amm-header-left">
              <div class="amm-icon-box">
                <i class="fa-solid fa-code-merge"></i>
              </div>
              <div>
                <h2 class="amm-title">ตรวจสอบและรวมชื่อลูกค้าซ้ำ</h2>
                <p class="amm-subtitle">
                  เปรียบเทียบ <b>ไอดี (UID)</b> • <b>เบอร์โทร</b> • <b>ที่อยู่จัดส่ง</b> ก่อนรวม เพื่อป้องกันส่งของผิดคน
                </p>
              </div>
            </div>
            <button type="button" class="amm-close-btn" @click="emitClose" title="ปิด (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Mode Tabs -->
          <div class="amm-tabs">
            <button
              type="button"
              class="amm-tab"
              :class="{ active: activeTab === 'auto' }"
              @click="activeTab = 'auto'"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>พบซ้ำอัตโนมัติ</span>
              <span class="amm-tab-count" :class="{ alert: visibleGroups.length > 0 }">
                {{ visibleGroups.length }} กลุ่ม
              </span>
            </button>
            <button
              type="button"
              class="amm-tab"
              :class="{ active: activeTab === 'manual' }"
              @click="activeTab = 'manual'"
            >
              <i class="fa-solid fa-object-group"></i>
              <span>เลือกคู่รวมเอง (Manual)</span>
            </button>

            <div class="amm-tabs-spacer"></div>

            <button
              v-if="dismissedGroupIds.size > 0 && activeTab === 'auto'"
              type="button"
              class="amm-reset-dismissed-btn"
              @click="dismissedGroupIds = new Set()"
              title="แสดงกลุ่มที่กดข้ามไว้ทั้งหมดอีกครั้ง"
            >
              <i class="fa-solid fa-rotate-left"></i> แสดงกลุ่มที่ข้าม ({{ dismissedGroupIds.size }})
            </button>
          </div>

          <!-- ============ TAB 1: AUTO DETECTED DUPLICATES ============ -->
          <div v-if="activeTab === 'auto'" class="amm-body">
            <!-- Sub-toolbar: Filter & Search -->
            <div class="amm-subbar">
              <div class="amm-search-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  v-model="groupSearch"
                  class="amm-search-input"
                  placeholder="ค้นหาในรายการที่พบซ้ำ (ชื่อ, เบอร์โทร, ไอดี, ที่อยู่)..."
                />
                <button v-if="groupSearch" type="button" class="amm-clear-btn" @click="groupSearch = ''">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div class="amm-filter-pills">
                <button
                  type="button"
                  class="amm-pill"
                  :class="{ active: confidenceFilter === 'all' }"
                  @click="confidenceFilter = 'all'"
                >
                  ทั้งหมด ({{ visibleGroups.length }})
                </button>
                <button
                  type="button"
                  class="amm-pill high"
                  :class="{ active: confidenceFilter === 'high' }"
                  @click="confidenceFilter = 'high'"
                >
                  🟢 ตรงกันชัดเจน ({{ highCount }})
                </button>
                <button
                  type="button"
                  class="amm-pill medium"
                  :class="{ active: confidenceFilter === 'medium' }"
                  @click="confidenceFilter = 'medium'"
                >
                  🟡 ชื่อซ้ำ/คล้าย ({{ mediumCount }})
                </button>
                <button
                  type="button"
                  class="amm-pill split"
                  :class="{ active: confidenceFilter === 'split' }"
                  @click="confidenceFilter = 'split'"
                >
                  🆔 ไอดีแยกหลายรายการ ({{ splitIdCount }})
                </button>
                <button
                  v-if="warningCount > 0"
                  type="button"
                  class="amm-pill warning"
                  :class="{ active: confidenceFilter === 'warning' }"
                  @click="confidenceFilter = 'warning'"
                >
                  🔴 ระวังคนละคน ({{ warningCount }})
                </button>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="filteredGroups.length === 0" class="amm-empty">
              <i class="fa-solid fa-circle-check amm-empty-icon"></i>
              <div class="amm-empty-title">
                {{ visibleGroups.length === 0 ? "ไม่พบลูกค้าซ้ำในสมุดที่อยู่!" : "ไม่พบกลุ่มซ้ำตามตัวกรองนี้" }}
              </div>
              <div class="amm-empty-sub">
                {{
                  visibleGroups.length === 0
                    ? "ข้อมูลไอดี เบอร์โทร และที่อยู่ของลูกค้าเรียบร้อยดี หรือสามารถสลับไปแท็บ 'เลือกคู่รวมเอง' เพื่อรวมด้วยตนเองได้"
                    : "ลองล้างคำค้นหาหรือเปลี่ยนตัวกรองด้านบน"
                }}
              </div>
            </div>

            <!-- Duplicate Group List -->
            <div v-else class="amm-group-list">
              <div
                v-for="group in filteredGroups"
                :key="group.groupId"
                class="amm-group-card"
                :class="[`conf-${group.confidence}`, { focused: focusGroupId === group.groupId }]"
              >
                <!-- Group Header -->
                <div class="amm-group-head">
                  <div class="amm-group-meta">
                    <span class="amm-conf-badge" :class="group.confidence">
                      <template v-if="group.confidence === 'high'">🟢 น่าจะเป็นคนเดียวกัน</template>
                      <template v-else-if="group.confidence === 'warning'">🔴 ระวัง! ข้อมูลต่างกัน อาจเป็นคนละคน</template>
                      <template v-else>🟡 ควรตรวจไอดี/เบอร์/ที่อยู่ก่อนรวม</template>
                    </span>

                    <div class="amm-reason-tags">
                      <span v-for="r in group.reasons" :key="r" class="amm-reason-tag" :class="r">
                        {{ formatReasonLabel(r) }}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="amm-dismiss-btn"
                    @click="dismissGroup(group.groupId)"
                    title="ไม่ใช่คนเดียวกัน / ข้ามกลุ่มนี้ชั่วคราว"
                  >
                    <i class="fa-solid fa-eye-slash"></i> คนละคน / ข้าม
                  </button>
                </div>

                <!-- Conflict Banner if warning -->
                <div v-if="group.hasDifferentRealYoutubeIds || group.hasDifferentPhones || group.hasAddressConflict" class="amm-conflict-bar">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <span>
                    <b v-if="group.hasDifferentRealYoutubeIds">พบ YouTube ID แท้คนละบัญชี</b>
                    <b v-if="group.hasDifferentRealYoutubeIds && (group.hasDifferentPhones || group.hasAddressConflict)"> • </b>
                    <b v-if="group.hasDifferentPhones">เบอร์โทรไม่ตรงกัน</b>
                    <b v-if="group.hasDifferentPhones && group.hasAddressConflict"> • </b>
                    <b v-if="group.hasAddressConflict">ที่อยู่ไม่ตรงกัน</b>
                    — กรุณาตรวจสอบให้แน่ใจว่าเป็นลูกค้าคนเดียวกันก่อนกดรวม
                  </span>
                </div>

                <!-- Member Comparison Cards -->
                <div class="amm-members-grid">
                  <div
                    v-for="member in group.members"
                    :key="member.candidateId"
                    class="amm-member-card"
                    :class="{
                      'is-primary': getSelectedPrimaryId(group) === member.candidateId,
                      'is-selected-sec':
                        getSelectedPrimaryId(group) !== member.candidateId &&
                        isSecondaryChecked(group, member.candidateId),
                      'is-unchecked':
                        getSelectedPrimaryId(group) !== member.candidateId &&
                        !isSecondaryChecked(group, member.candidateId),
                    }"
                    @click="setPrimaryForGroup(group, member.candidateId)"
                  >
                    <!-- Card Top Role Bar -->
                    <div class="amm-member-top">
                      <label class="amm-role-radio" @click.stop>
                        <input
                          type="radio"
                          :name="`primary-${group.groupId}`"
                          :checked="getSelectedPrimaryId(group) === member.candidateId"
                          @change="setPrimaryForGroup(group, member.candidateId)"
                        />
                        <span v-if="getSelectedPrimaryId(group) === member.candidateId" class="amm-role-pill primary">
                          ★ ชื่อหลัก (เก็บไว้)
                        </span>
                        <span v-else class="amm-role-pill secondary">
                          ตั้งเป็นชื่อหลัก
                        </span>
                      </label>

                      <label
                        v-if="getSelectedPrimaryId(group) !== member.candidateId"
                        class="amm-include-check"
                        @click.stop
                        title="ติ๊กเพื่อนำรายการนี้มารวมเข้าชื่อหลัก"
                      >
                        <input
                          type="checkbox"
                          :checked="isSecondaryChecked(group, member.candidateId)"
                          @change="toggleSecondary(group, member.candidateId)"
                        />
                        <span>รวมรายการนี้</span>
                      </label>
                    </div>

                    <!-- Customer Name & Order Summary -->
                    <div class="amm-member-name-row">
                      <span class="amm-member-name">{{ member.name }}</span>
                      <div class="amm-member-stats">
                        <span v-if="member.pendingItemCount > 0" class="amm-stat pending" title="สินค้าค้างจัดส่ง">
                          📦 ค้างส่ง {{ member.pendingItemCount }} ชิ้น
                        </span>
                        <span v-if="member.totalBookings > 0" class="amm-stat vip" title="ยอดซื้อสะสมทั้งหมด">
                          ⭐ {{ member.totalBookings }} ออเดอร์
                        </span>
                        <span v-if="member.deliveryDate" class="amm-stat date" title="วันนัดจัดส่ง">
                          📅 {{ member.deliveryDate }}
                        </span>
                      </div>
                    </div>

                    <!-- 1. ID / UID Inspection -->
                    <div class="amm-field-row">
                      <div class="amm-field-label"><i class="fa-solid fa-fingerprint"></i> ไอดี (ID):</div>
                      <div class="amm-field-val amm-id-list">
                        <span
                          v-for="uc in member.youtubeIds"
                          :key="uc"
                          class="amm-id-chip yt"
                          :title="`YouTube Channel ID แท้: ${uc}`"
                        >
                          <i class="fa-brands fa-youtube"></i> {{ shortenId(uc) }}
                        </span>
                        <span
                          v-for="h in member.handles"
                          :key="h"
                          class="amm-id-chip handle"
                          :title="`YouTube Handle: ${h}`"
                        >
                          {{ h }}
                        </span>
                        <span
                          v-for="tid in member.tempIds"
                          :key="tid"
                          class="amm-id-chip temp"
                          :title="`ไอดีชั่วคราว/สร้างเองใน delivery_customers: ${tid}`"
                        >
                          {{ shortenId(tid) }}
                        </span>
                        <span
                          v-for="bk in member.addressBookKeys"
                          :key="`bk-${bk}`"
                          class="amm-id-chip book"
                          :title="`คีย์ในสมุดที่อยู่: address_book/${bk}`"
                        >
                          📒 {{ bk }}
                        </span>
                        <span v-if="member.realNames.length > 0" class="amm-realname-note">
                          (ชื่อช่อง: {{ member.realNames.join(", ") }})
                        </span>
                        <span
                          v-if="
                            member.youtubeIds.length === 0 &&
                            member.tempIds.length === 0 &&
                            member.addressBookKeys.length === 0
                          "
                          class="amm-empty-val"
                        >
                          ไม่มีไอดี
                        </span>
                      </div>
                    </div>

                    <!-- 2. Phone Inspection -->
                    <div class="amm-field-row">
                      <div class="amm-field-label"><i class="fa-solid fa-phone"></i> เบอร์โทร:</div>
                      <div class="amm-field-val">
                        <template v-if="member.phonesDisplay.length > 0">
                          <span
                            v-for="ph in member.phonesDisplay"
                            :key="ph"
                            class="amm-phone-chip"
                            :class="getPhoneComparisonClass(group, member, ph)"
                          >
                            {{ ph }}
                          </span>
                        </template>
                        <span v-else class="amm-empty-val">ยังไม่มีเบอร์โทร</span>
                      </div>
                    </div>

                    <!-- 3. Recipient & Address Inspection -->
                    <div class="amm-field-row">
                      <div class="amm-field-label"><i class="fa-solid fa-location-dot"></i> ที่อยู่:</div>
                      <div class="amm-field-val amm-addr-val">
                        <div v-if="member.recipientName && member.recipientName !== member.name" class="amm-recipient-line">
                          ผู้รับ: <b>{{ member.recipientName }}</b>
                        </div>
                        <div
                          v-if="member.hasAddress"
                          class="amm-addr-text"
                          :class="getAddressComparisonClass(group, member)"
                        >
                          {{ member.address }}
                        </div>
                        <div v-else class="amm-empty-val">ยังไม่มีที่อยู่จัดส่ง</div>
                        <div v-if="member.addressCount > 1" class="amm-extra-addr">
                          🏠 มีทั้งหมด {{ member.addressCount }} ที่อยู่บันทึกไว้
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Group Action Footer -->
                <div class="amm-group-foot">
                  <div class="amm-preview-line">
                    <template v-if="getGroupPreview(group)">
                      <i class="fa-solid fa-circle-info text-info"></i>
                      <span>
                        หลังรวม: เก็บชื่อ <b>"{{ getGroupPreview(group).keptName }}"</b>
                        <template v-if="getGroupPreview(group).canonicalDeliveryUid">
                          • ไอดีหลัก <code>{{ shortenId(getGroupPreview(group).canonicalDeliveryUid) }}</code>
                        </template>
                        • ที่อยู่รวม <b>{{ getGroupPreview(group).addressCount }}</b> รายการ
                        <template v-if="getGroupPreview(group).pendingItemCount > 0">
                          • ค้างส่ง <b>{{ getGroupPreview(group).pendingItemCount }}</b> ชิ้น
                        </template>
                        <template v-if="getGroupPreview(group).totalBookings > 0">
                          • สะสม <b>{{ getGroupPreview(group).totalBookings }}</b> ออเดอร์
                        </template>
                      </span>
                    </template>
                    <span v-else class="amm-empty-val">กรุณาติ๊กเลือกรายชื่อที่ต้องการรวมอย่างน้อย 1 รายการ</span>
                  </div>

                  <button
                    type="button"
                    class="amm-merge-btn"
                    :class="{ warn: group.confidence === 'warning' }"
                    :disabled="isMerging || !getGroupPreview(group)"
                    @click="executeGroupMerge(group)"
                  >
                    <i v-if="isMerging && mergingGroupId === group.groupId" class="fa-solid fa-circle-notch fa-spin"></i>
                    <i v-else class="fa-solid fa-code-merge"></i>
                    <span>รวมข้อมูลเข้าชื่อหลัก</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ============ TAB 2: MANUAL PAIR MERGE ============ -->
          <div v-else class="amm-body">
            <div class="amm-manual-intro">
              <i class="fa-solid fa-circle-info"></i>
              <span>เลือกลูกค้า 2 รายการเพื่อเปรียบเทียบ <b>ไอดี • เบอร์โทร • ที่อยู่</b> ด้านล่างแล้วรวมเข้าด้วยกัน (ไม่สูญเสียที่อยู่และยอดจอง)</span>
            </div>

            <div class="amm-manual-pickers">
              <!-- Primary Picker -->
              <div class="amm-picker-box primary">
                <label class="amm-picker-label">★ ชื่อหลัก (เก็บชื่อนี้ไว้)</label>
                <input
                  type="text"
                  v-model="manualPrimarySearch"
                  class="amm-picker-search"
                  placeholder="พิมพ์ค้นหาชื่อ / เบอร์โทร / ไอดี..."
                />
                <div class="amm-picker-list">
                  <button
                    v-for="cand in filteredManualPrimaryList"
                    :key="cand.candidateId"
                    type="button"
                    class="amm-picker-item"
                    :class="{ selected: manualPrimaryId === cand.candidateId }"
                    :disabled="manualSecondaryId === cand.candidateId"
                    @click="manualPrimaryId = cand.candidateId"
                  >
                    <div class="amm-pi-main">
                      <b>{{ cand.name }}</b>
                      <span v-if="cand.hasRealYouTubeId" class="amm-mini-yt">YT</span>
                    </div>
                    <div class="amm-pi-sub">
                      <span>{{ cand.phone || "ไม่มีเบอร์" }}</span>
                      <span v-if="cand.hasAddress">• มีที่อยู่</span>
                      <span v-if="cand.pendingItemCount > 0">• ค้าง {{ cand.pendingItemCount }}</span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Swap Button -->
              <div class="amm-swap-col">
                <button
                  type="button"
                  class="amm-swap-btn"
                  @click="swapManualSelection"
                  :disabled="!manualPrimaryId && !manualSecondaryId"
                  title="สลับชื่อหลัก / ชื่อรอง"
                >
                  <i class="fa-solid fa-right-left"></i>
                </button>
              </div>

              <!-- Secondary Picker -->
              <div class="amm-picker-box secondary">
                <label class="amm-picker-label">🔀 ชื่อรอง (รวมเข้าชื่อหลัก)</label>
                <input
                  type="text"
                  v-model="manualSecondarySearch"
                  class="amm-picker-search"
                  placeholder="พิมพ์ค้นหาชื่อ / เบอร์โทร / ไอดี..."
                />
                <div class="amm-picker-list">
                  <button
                    v-for="cand in filteredManualSecondaryList"
                    :key="cand.candidateId"
                    type="button"
                    class="amm-picker-item"
                    :class="{ selected: manualSecondaryId === cand.candidateId }"
                    :disabled="manualPrimaryId === cand.candidateId"
                    @click="manualSecondaryId = cand.candidateId"
                  >
                    <div class="amm-pi-main">
                      <b>{{ cand.name }}</b>
                      <span v-if="cand.hasRealYouTubeId" class="amm-mini-yt">YT</span>
                    </div>
                    <div class="amm-pi-sub">
                      <span>{{ cand.phone || "ไม่มีเบอร์" }}</span>
                      <span v-if="cand.hasAddress">• มีที่อยู่</span>
                      <span v-if="cand.pendingItemCount > 0">• ค้าง {{ cand.pendingItemCount }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Side-by-Side Comparison for Manual Pair -->
            <div v-if="manualPrimary && manualSecondary" class="amm-manual-compare">
              <div class="amm-compare-status" :class="manualComparisonClass">
                <div class="amm-compare-badges">
                  <span v-if="manualComparison.sharedPhones.length > 0" class="amm-cmp-pill ok">
                    ✅ เบอร์โทรตรงกัน ({{ manualComparison.sharedPhones.join(", ") }})
                  </span>
                  <span v-else-if="manualComparison.hasDifferentPhones" class="amm-cmp-pill danger">
                    ⚠️ เบอร์โทรต่างกัน!
                  </span>

                  <span v-if="manualComparison.addressMatchType === 'exact'" class="amm-cmp-pill ok">
                    ✅ ที่อยู่ตรงกัน
                  </span>
                  <span v-else-if="manualComparison.addressMatchType === 'similar'" class="amm-cmp-pill ok">
                    ✅ ที่อยู่คล้ายกันมาก
                  </span>
                  <span v-else-if="manualComparison.addressMatchType === 'conflict'" class="amm-cmp-pill danger">
                    ⚠️ ที่อยู่ต่างกัน!
                  </span>

                  <span v-if="manualComparison.sharedYoutubeIds.length > 0" class="amm-cmp-pill ok">
                    ✅ YouTube ID เดียวกัน
                  </span>
                  <span v-else-if="manualComparison.hasDifferentRealYoutubeIds" class="amm-cmp-pill danger">
                    ⚠️ YouTube ID คนละบัญชี!
                  </span>

                  <span v-if="manualComparison.reasons.length === 0 && !manualComparison.hasConflict" class="amm-cmp-pill info">
                    ℹ️ กรุณาตรวจสอบข้อมูลทั้ง 2 ฝั่งก่อนกดรวม
                  </span>
                </div>
              </div>

              <div class="amm-members-grid">
                <div
                  v-for="(item, idx) in [
                    { label: '★ ชื่อหลัก (เก็บไว้)', role: 'primary', cand: manualPrimary },
                    { label: '🔀 ชื่อรอง (จะถูกรวมเข้าชื่อหลัก)', role: 'secondary', cand: manualSecondary },
                  ]"
                  :key="idx"
                  class="amm-member-card"
                  :class="item.role === 'primary' ? 'is-primary' : 'is-selected-sec'"
                >
                  <div class="amm-member-top">
                    <span class="amm-role-pill" :class="item.role">{{ item.label }}</span>
                  </div>
                  <div class="amm-member-name-row">
                    <span class="amm-member-name">{{ item.cand.name }}</span>
                    <div class="amm-member-stats">
                      <span v-if="item.cand.pendingItemCount > 0" class="amm-stat pending">
                        📦 ค้างส่ง {{ item.cand.pendingItemCount }} ชิ้น
                      </span>
                      <span v-if="item.cand.totalBookings > 0" class="amm-stat vip">
                        ⭐ {{ item.cand.totalBookings }} ออเดอร์
                      </span>
                    </div>
                  </div>
                  <div class="amm-field-row">
                    <div class="amm-field-label"><i class="fa-solid fa-fingerprint"></i> ไอดี:</div>
                    <div class="amm-field-val amm-id-list">
                      <span v-for="uc in item.cand.youtubeIds" :key="uc" class="amm-id-chip yt">
                        <i class="fa-brands fa-youtube"></i> {{ shortenId(uc) }}
                      </span>
                      <span v-for="tid in item.cand.tempIds" :key="tid" class="amm-id-chip temp">
                        {{ shortenId(tid) }}
                      </span>
                      <span v-for="bk in item.cand.addressBookKeys" :key="`mbk-${bk}`" class="amm-id-chip book">
                        📒 {{ bk }}
                      </span>
                      <span v-if="!item.cand.youtubeIds.length && !item.cand.tempIds.length && !item.cand.addressBookKeys.length" class="amm-empty-val">
                        ไม่มีไอดี
                      </span>
                    </div>
                  </div>
                  <div class="amm-field-row">
                    <div class="amm-field-label"><i class="fa-solid fa-phone"></i> เบอร์โทร:</div>
                    <div class="amm-field-val">
                      <span v-if="item.cand.phonesDisplay.length">{{ item.cand.phonesDisplay.join(", ") }}</span>
                      <span v-else class="amm-empty-val">ยังไม่มีเบอร์โทร</span>
                    </div>
                  </div>
                  <div class="amm-field-row">
                    <div class="amm-field-label"><i class="fa-solid fa-location-dot"></i> ที่อยู่:</div>
                    <div class="amm-field-val amm-addr-val">
                      <div v-if="item.cand.recipientName && item.cand.recipientName !== item.cand.name" class="amm-recipient-line">
                        ผู้รับ: <b>{{ item.cand.recipientName }}</b>
                      </div>
                      <div v-if="item.cand.hasAddress" class="amm-addr-text">{{ item.cand.address }}</div>
                      <div v-else class="amm-empty-val">ยังไม่มีที่อยู่จัดส่ง</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="amm-group-foot">
                <div class="amm-preview-line" v-if="manualPreview">
                  <i class="fa-solid fa-circle-info text-info"></i>
                  <span>
                    ผลลัพธ์หลังรวม: เก็บชื่อ <b>"{{ manualPreview.keptName }}"</b>
                    <template v-if="manualPreview.canonicalDeliveryUid">
                      • ไอดีหลัก <code>{{ shortenId(manualPreview.canonicalDeliveryUid) }}</code>
                    </template>
                    • ที่อยู่รวม <b>{{ manualPreview.addressCount }}</b> รายการ
                    <template v-if="manualPreview.pendingItemCount > 0">
                      • ค้างส่ง <b>{{ manualPreview.pendingItemCount }}</b> ชิ้น
                    </template>
                  </span>
                </div>
                <button
                  type="button"
                  class="amm-merge-btn"
                  :class="{ warn: manualComparison.hasConflict }"
                  :disabled="isMerging"
                  @click="executeManualMerge"
                >
                  <i v-if="isMerging && mergingGroupId === 'manual'" class="fa-solid fa-circle-notch fa-spin"></i>
                  <i v-else class="fa-solid fa-code-merge"></i>
                  <span>รวม "{{ manualSecondary.name }}" เข้า "{{ manualPrimary.name }}"</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { ref as dbRef, get, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import { escapeHtml } from "../utils/dbUtils";
import {
  buildCustomerMergePlan,
  compareCustomerPair,
  normalizePhoneDigits,
} from "../utils/addressMergeUtils";
import Swal from "sweetalert2";

const props = defineProps({
  visible: { type: Boolean, default: false },
  groups: { type: Array, default: () => [] },
  candidates: { type: Array, default: () => [] },
  addressBook: { type: Object, default: () => ({}) },
  deliveryCustomers: { type: Object, default: () => ({}) },
  nicknames: { type: Object, default: () => ({}) },
  initialFocusCustomerName: { type: String, default: "" },
});

const emit = defineEmits(["close", "merged"]);

const activeTab = ref("auto");
const groupSearch = ref("");
const confidenceFilter = ref("all");
const dismissedGroupIds = ref(new Set());
const focusGroupId = ref("");

// Per-group primary selection & checked secondary candidate IDs
const selectedPrimaryByGroup = ref({});
const excludedSecondariesByGroup = ref({});

// Manual merge tab state
const manualPrimarySearch = ref("");
const manualSecondarySearch = ref("");
const manualPrimaryId = ref("");
const manualSecondaryId = ref("");

const isMerging = ref(false);
const mergingGroupId = ref("");

function emitClose() {
  if (isMerging.value) return;
  emit("close");
}

function handleEsc(e) {
  if (e.key === "Escape" && props.visible) {
    emitClose();
  }
}

onMounted(() => window.addEventListener("keydown", handleEsc));
onUnmounted(() => window.removeEventListener("keydown", handleEsc));

// Initialize focus when modal opens for a specific customer
watch(
  () => [props.visible, props.initialFocusCustomerName],
  ([isVis, focusName]) => {
    if (!isVis) return;
    groupSearch.value = "";
    confidenceFilter.value = "all";
    focusGroupId.value = "";

    if (focusName) {
      const targetNorm = focusName.trim().toLowerCase();
      const matchedGroup = (props.groups || []).find((g) =>
        g.members.some((m) => m.normName === targetNorm)
      );
      if (matchedGroup) {
        activeTab.value = "auto";
        focusGroupId.value = matchedGroup.groupId;
        // Ensure not dismissed
        if (dismissedGroupIds.value.has(matchedGroup.groupId)) {
          const next = new Set(dismissedGroupIds.value);
          next.delete(matchedGroup.groupId);
          dismissedGroupIds.value = next;
        }
        groupSearch.value = focusName;
      } else {
        // Customer not in auto-duplicate list -> open Manual Merge with them pre-selected as primary
        activeTab.value = "manual";
        const matchedCand = (props.candidates || []).find(
          (c) => c.normName === targetNorm
        );
        manualPrimaryId.value = matchedCand ? matchedCand.candidateId : "";
        manualPrimarySearch.value = focusName;
        manualSecondaryId.value = "";
        manualSecondarySearch.value = "";
      }
    } else {
      activeTab.value = (props.groups || []).length > 0 ? "auto" : "manual";
    }
  },
  { immediate: true }
);

const visibleGroups = computed(() =>
  (props.groups || []).filter((g) => !dismissedGroupIds.value.has(g.groupId))
);

const highCount = computed(
  () => visibleGroups.value.filter((g) => g.confidence === "high").length
);
const mediumCount = computed(
  () => visibleGroups.value.filter((g) => g.confidence === "medium").length
);
const warningCount = computed(
  () => visibleGroups.value.filter((g) => g.confidence === "warning").length
);
const splitIdCount = computed(
  () => visibleGroups.value.filter((g) => g.reasons.includes("split_ids")).length
);

const filteredGroups = computed(() => {
  let list = visibleGroups.value;
  if (confidenceFilter.value === "high") {
    list = list.filter((g) => g.confidence === "high");
  } else if (confidenceFilter.value === "medium") {
    list = list.filter((g) => g.confidence === "medium");
  } else if (confidenceFilter.value === "warning") {
    list = list.filter((g) => g.confidence === "warning");
  } else if (confidenceFilter.value === "split") {
    list = list.filter((g) => g.reasons.includes("split_ids"));
  }

  const q = groupSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter((g) =>
      g.members.some(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.recipientName && m.recipientName.toLowerCase().includes(q)) ||
          m.phonesDisplay.some((p) => p.includes(q)) ||
          m.phoneDigits.some((p) => p.includes(q)) ||
          (m.address && m.address.toLowerCase().includes(q)) ||
          m.youtubeIds.some((id) => id.toLowerCase().includes(q)) ||
          m.tempIds.some((id) => id.toLowerCase().includes(q))
      )
    );
  }
  return list;
});

function getSelectedPrimaryId(group) {
  const chosen = selectedPrimaryByGroup.value[group.groupId];
  if (chosen && group.members.some((m) => m.candidateId === chosen)) {
    return chosen;
  }
  return group.defaultPrimaryId;
}

function setPrimaryForGroup(group, candidateId) {
  selectedPrimaryByGroup.value = {
    ...selectedPrimaryByGroup.value,
    [group.groupId]: candidateId,
  };
  // If newly chosen primary was previously excluded as secondary, un-exclude it
  const excl = excludedSecondariesByGroup.value[group.groupId];
  if (excl && excl.has(candidateId)) {
    const nextSet = new Set(excl);
    nextSet.delete(candidateId);
    excludedSecondariesByGroup.value = {
      ...excludedSecondariesByGroup.value,
      [group.groupId]: nextSet,
    };
  }
}

function isSecondaryChecked(group, candidateId) {
  const excl = excludedSecondariesByGroup.value[group.groupId];
  return !(excl && excl.has(candidateId));
}

function toggleSecondary(group, candidateId) {
  const current = excludedSecondariesByGroup.value[group.groupId] || new Set();
  const next = new Set(current);
  if (next.has(candidateId)) {
    next.delete(candidateId);
  } else {
    next.add(candidateId);
  }
  excludedSecondariesByGroup.value = {
    ...excludedSecondariesByGroup.value,
    [group.groupId]: next,
  };
}

function dismissGroup(groupId) {
  const next = new Set(dismissedGroupIds.value);
  next.add(groupId);
  dismissedGroupIds.value = next;
}

function getGroupMergeParts(group) {
  const primaryId = getSelectedPrimaryId(group);
  const primary = group.members.find((m) => m.candidateId === primaryId) || group.members[0];
  const secondaries = group.members.filter(
    (m) => m.candidateId !== primary.candidateId && isSecondaryChecked(group, m.candidateId)
  );
  return { primary, secondaries };
}

function getGroupPreview(group) {
  const { primary, secondaries } = getGroupMergeParts(group);
  if (!primary || secondaries.length === 0) return null;
  try {
    const plan = buildCustomerMergePlan({
      primary,
      secondaries,
      addressBook: props.addressBook,
      deliveryCustomers: props.deliveryCustomers,
      nicknames: props.nicknames,
    });
    return plan.summary;
  } catch {
    return null;
  }
}

function getPhoneComparisonClass(group, member, displayPhone) {
  const primaryId = getSelectedPrimaryId(group);
  const primary = group.members.find((m) => m.candidateId === primaryId);
  if (!primary || primary.candidateId === member.candidateId) return "";
  const digits = normalizePhoneDigits(displayPhone);
  if (!digits || primary.phoneDigits.length === 0) return "";
  return primary.phoneDigits.includes(digits) ? "match" : "diff";
}

function getAddressComparisonClass(group, member) {
  const primaryId = getSelectedPrimaryId(group);
  const primary = group.members.find((m) => m.candidateId === primaryId);
  if (!primary || primary.candidateId === member.candidateId) return "";
  const cmp = compareCustomerPair(primary, member);
  if (cmp.addressMatchType === "exact" || cmp.addressMatchType === "similar") {
    return "match";
  }
  if (cmp.addressMatchType === "conflict") return "diff";
  return "";
}

function shortenId(id) {
  if (!id) return "";
  if (id.length <= 18) return id;
  return `${id.slice(0, 10)}…${id.slice(-5)}`;
}

function formatReasonLabel(reason) {
  const map = {
    same_uid: "🆔 YouTube ID ตรงกัน",
    same_phone: "📞 เบอร์โทรตรงกัน",
    same_address: "📍 ที่อยู่ตรงกัน",
    similar_address: "📍 ที่อยู่คล้ายกัน",
    same_recipient: "🏷️ ชื่อผู้รับตรงกัน",
    same_name: "👤 ชื่อซ้ำกัน",
    similar_name: "👤 ชื่อคล้ายกัน",
    split_ids: "🆔 มีหลายไอดีแยกกัน",
  };
  return map[reason] || reason;
}

// Manual tab helpers
const sortedCandidates = computed(() =>
  [...(props.candidates || [])].sort((a, b) => a.name.localeCompare(b.name, "th"))
);

function filterCandidateList(query) {
  const q = query.trim().toLowerCase();
  if (!q) return sortedCandidates.value.slice(0, 60);
  return sortedCandidates.value
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.recipientName && c.recipientName.toLowerCase().includes(q)) ||
        c.phonesDisplay.some((p) => p.includes(q)) ||
        c.phoneDigits.some((p) => p.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        c.youtubeIds.some((id) => id.toLowerCase().includes(q)) ||
        c.tempIds.some((id) => id.toLowerCase().includes(q))
    )
    .slice(0, 60);
}

const filteredManualPrimaryList = computed(() =>
  filterCandidateList(manualPrimarySearch.value)
);
const filteredManualSecondaryList = computed(() =>
  filterCandidateList(manualSecondarySearch.value)
);

const manualPrimary = computed(
  () => sortedCandidates.value.find((c) => c.candidateId === manualPrimaryId.value) || null
);
const manualSecondary = computed(
  () => sortedCandidates.value.find((c) => c.candidateId === manualSecondaryId.value) || null
);

const manualComparison = computed(() => {
  if (!manualPrimary.value || !manualSecondary.value) {
    return {
      sharedPhones: [],
      hasDifferentPhones: false,
      addressMatchType: "none",
      sharedYoutubeIds: [],
      hasDifferentRealYoutubeIds: false,
      reasons: [],
      hasConflict: false,
    };
  }
  return compareCustomerPair(manualPrimary.value, manualSecondary.value);
});

const manualComparisonClass = computed(() => {
  if (manualComparison.value.hasConflict) return "conflict";
  if (manualComparison.value.hasStrongEvidence) return "match";
  return "neutral";
});

const manualPreview = computed(() => {
  if (!manualPrimary.value || !manualSecondary.value) return null;
  try {
    return buildCustomerMergePlan({
      primary: manualPrimary.value,
      secondaries: [manualSecondary.value],
      addressBook: props.addressBook,
      deliveryCustomers: props.deliveryCustomers,
      nicknames: props.nicknames,
    }).summary;
  } catch {
    return null;
  }
});

function swapManualSelection() {
  const tmpId = manualPrimaryId.value;
  manualPrimaryId.value = manualSecondaryId.value;
  manualSecondaryId.value = tmpId;

  const tmpSearch = manualPrimarySearch.value;
  manualPrimarySearch.value = manualSecondarySearch.value;
  manualSecondarySearch.value = tmpSearch;
}

async function runAtomicMerge(primary, secondaries, hasConflictWarning, tagId) {
  const secNamesHtml = secondaries
    .map((s) => `<b>"${escapeHtml(s.name)}"</b>`)
    .join(", ");

  const conflictHtml = hasConflictWarning
    ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.45);color:#fca5a5;font-size:0.88em;text-align:left;">
         ⚠️ <b>คำเตือน:</b> พบข้อมูลเบอร์โทร / ที่อยู่ หรือ YouTube ID ต่างกัน — โปรดมั่นใจว่าเป็นลูกค้าคนเดียวกันจริงก่อนยืนยัน
       </div>`
    : "";

  // Preview plan before asking confirmation
  const previewPlan = buildCustomerMergePlan({
    primary,
    secondaries,
    addressBook: props.addressBook,
    deliveryCustomers: props.deliveryCustomers,
    nicknames: props.nicknames,
  });

  const confirmRes = await Swal.fire({
    titleText: `รวมข้อมูลเข้าชื่อ "${primary.name}"?`,
    html: `
      <div style="text-align:left;font-size:0.92em;line-height:1.55;color:#cbd5e1;">
        <div>• <b>ชื่อหลักที่เก็บไว้:</b> <span style="color:#4ade80;">"${escapeHtml(primary.name)}"</span></div>
        <div>• <b>รายชื่อที่นำมารวม:</b> ${secNamesHtml}</div>
        <div>• <b>ไอดีหลักหลังรวม:</b> <code>${escapeHtml(previewPlan.canonicalDeliveryUid || previewPlan.primaryNormKey)}</code></div>
        <div>• <b>ที่อยู่หลังรวม:</b> ${previewPlan.summary.addressCount} ที่อยู่ (ไม่ลบที่อยู่ที่ต่างกัน)</div>
        ${previewPlan.summary.pendingItemCount > 0 ? `<div>• <b>ยอดค้างจัดส่งที่รักษาไว้:</b> ${previewPlan.summary.pendingItemCount} ชิ้น</div>` : ""}
        ${previewPlan.summary.totalBookings > 0 ? `<div>• <b>ยอดซื้อสะสมรวม:</b> ${previewPlan.summary.totalBookings} ออเดอร์</div>` : ""}
        ${conflictHtml}
      </div>
    `,
    icon: hasConflictWarning ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยันรวมข้อมูล",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: hasConflictWarning ? "#f59e0b" : "#10b981",
    cancelButtonColor: "#334155",
  });

  if (!confirmRes.isConfirmed) return;

  isMerging.value = true;
  mergingGroupId.value = tagId;

  try {
    // Optionally inspect active live video stock so live board owner names also stay in sync
    let activeVideoId = null;
    let activeVideoStock = null;
    try {
      const vidSnap = await get(dbRef(db, "system/activeVideo"));
      const activeVal = vidSnap.val();
      activeVideoId =
        typeof activeVal === "string"
          ? activeVal
          : activeVal?.videoId || activeVal?.id || null;
      if (activeVideoId && activeVideoId !== "demo") {
        const stockSnap = await get(dbRef(db, `stock/${activeVideoId}`));
        activeVideoStock = stockSnap.val() || null;
      }
    } catch {
      // Non-fatal: proceed with address_book + delivery_customers + nicknames merge
    }

    const finalPlan = buildCustomerMergePlan({
      primary,
      secondaries,
      addressBook: props.addressBook,
      deliveryCustomers: props.deliveryCustomers,
      nicknames: props.nicknames,
      activeVideoId,
      activeVideoStock,
      now: Date.now(),
    });

    if (Object.keys(finalPlan.multiPathUpdates).length > 0) {
      await update(dbRef(db), finalPlan.multiPathUpdates);
    }

    if (tagId === "manual") {
      manualSecondaryId.value = "";
      manualSecondarySearch.value = "";
    }

    emit("merged", finalPlan.summary);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      titleText: `รวมข้อมูลเข้าชื่อ "${primary.name}" สำเร็จ!`,
      showConfirmButton: false,
      timer: 2600,
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "ไม่สามารถรวมข้อมูลได้",
      text: err?.message || String(err),
    });
  } finally {
    isMerging.value = false;
    mergingGroupId.value = "";
  }
}

async function executeGroupMerge(group) {
  const { primary, secondaries } = getGroupMergeParts(group);
  if (!primary || secondaries.length === 0) return;
  const hasConflict =
    group.confidence === "warning" ||
    secondaries.some((s) => compareCustomerPair(primary, s).hasConflict);
  await runAtomicMerge(primary, secondaries, hasConflict, group.groupId);
}

async function executeManualMerge() {
  if (!manualPrimary.value || !manualSecondary.value) return;
  await runAtomicMerge(
    manualPrimary.value,
    [manualSecondary.value],
    manualComparison.value.hasConflict,
    "manual"
  );
}
</script>

<style scoped>
.amm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.amm-modal {
  width: 100%;
  max-width: 1060px;
  max-height: 90vh;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f8fafc;
}

.amm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}

.amm-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.amm-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15em;
  flex-shrink: 0;
}

.amm-title {
  margin: 0;
  font-size: 1.12em;
  font-weight: 700;
  color: #f8fafc;
}

.amm-subtitle {
  margin: 2px 0 0;
  font-size: 0.82em;
  color: #94a3b8;
}

.amm-subtitle b {
  color: #e2e8f0;
}

.amm-close-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.amm-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.4);
}

/* Tabs */
.amm-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #0b1120;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.amm-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.88em;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.amm-tab.active {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}

.amm-tab-count {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.82em;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.amm-tab-count.alert {
  background: rgba(245, 158, 11, 0.28);
  color: #fde68a;
}

.amm-tabs-spacer {
  flex: 1;
}

.amm-reset-dismissed-btn {
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.14);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  font-size: 0.8em;
  font-family: inherit;
  cursor: pointer;
}

/* Body */
.amm-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Subbar */
.amm-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.amm-search-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 380px;
  display: flex;
  align-items: center;
}

.amm-search-wrap > i {
  position: absolute;
  left: 11px;
  color: #64748b;
  font-size: 0.85em;
}

.amm-search-input {
  width: 100%;
  padding: 7px 30px 7px 32px;
  background: #0b1120;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f8fafc;
  font-size: 0.85em;
  font-family: inherit;
}

.amm-search-input:focus {
  outline: none;
  border-color: #fbbf24;
}

.amm-clear-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.amm-filter-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.amm-pill {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 0.8em;
  font-family: inherit;
  cursor: pointer;
}

.amm-pill.active {
  background: rgba(59, 130, 246, 0.22);
  border-color: rgba(59, 130, 246, 0.55);
  color: #93c5fd;
  font-weight: 600;
}

/* Empty state */
.amm-empty {
  text-align: center;
  padding: 48px 20px;
  color: #94a3b8;
}

.amm-empty-icon {
  font-size: 2.8em;
  color: #10b981;
  margin-bottom: 10px;
}

.amm-empty-title {
  font-size: 1.05em;
  font-weight: 700;
  color: #e2e8f0;
}

.amm-empty-sub {
  font-size: 0.85em;
  margin-top: 6px;
  color: #64748b;
}

/* Group Cards */
.amm-group-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.amm-group-card {
  background: #131c31;
  border: 1px solid #26344d;
  border-radius: 12px;
  overflow: hidden;
}

.amm-group-card.conf-high {
  border-left: 4px solid #10b981;
}

.amm-group-card.conf-medium {
  border-left: 4px solid #f59e0b;
}

.amm-group-card.conf-warning {
  border-left: 4px solid #ef4444;
}

.amm-group-card.focused {
  border-color: #fbbf24;
}

.amm-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid #1e293b;
  flex-wrap: wrap;
}

.amm-group-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.amm-conf-badge {
  font-size: 0.8em;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
}

.amm-conf-badge.high {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.amm-conf-badge.medium {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.amm-conf-badge.warning {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.45);
}

.amm-reason-tags {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.amm-reason-tag {
  font-size: 0.76em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.amm-reason-tag.same_phone,
.amm-reason-tag.same_address,
.amm-reason-tag.same_uid {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.32);
}

.amm-reason-tag.split_ids {
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.32);
}

.amm-dismiss-btn {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 0.78em;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.amm-dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.amm-conflict-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: rgba(239, 68, 68, 0.12);
  border-bottom: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  font-size: 0.82em;
}

/* Members Side-by-Side Grid */
.amm-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
  padding: 12px 14px;
}

.amm-member-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1.5px solid #293548;
  border-radius: 10px;
  padding: 11px 13px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.amm-member-card.is-primary {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.amm-member-card.is-selected-sec {
  border-color: rgba(245, 158, 11, 0.55);
  background: rgba(245, 158, 11, 0.05);
}

.amm-member-card.is-unchecked {
  opacity: 0.48;
  border-style: dashed;
}

.amm-member-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.amm-role-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.amm-role-pill {
  font-size: 0.76em;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 5px;
}

.amm-role-pill.primary {
  background: rgba(16, 185, 129, 0.22);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.45);
}

.amm-role-pill.secondary {
  background: rgba(148, 163, 184, 0.14);
  color: #94a3b8;
}

.amm-include-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78em;
  color: #fbbf24;
  cursor: pointer;
}

.amm-member-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.amm-member-name {
  font-size: 1.04em;
  font-weight: 700;
  color: #f8fafc;
}

.amm-member-stats {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.amm-stat {
  font-size: 0.73em;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.amm-stat.pending {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.amm-stat.vip {
  background: rgba(168, 85, 247, 0.2);
  color: #d8b4fe;
}

.amm-stat.date {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
}

.amm-field-row {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 6px;
  font-size: 0.84em;
  align-items: start;
}

.amm-field-label {
  color: #94a3b8;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.amm-field-val {
  color: #e2e8f0;
  min-width: 0;
  word-break: break-word;
}

.amm-id-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.amm-id-chip {
  font-family: monospace;
  font-size: 0.84em;
  padding: 1px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.amm-id-chip.yt {
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.amm-id-chip.handle {
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.amm-id-chip.temp {
  background: rgba(148, 163, 184, 0.14);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.amm-id-chip.book {
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.amm-realname-note {
  font-size: 0.82em;
  color: #94a3b8;
}

.amm-phone-chip {
  display: inline-block;
  font-family: monospace;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 4px;
  background: rgba(255, 255, 255, 0.06);
}

.amm-phone-chip.match {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.amm-phone-chip.diff {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.amm-addr-val {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.amm-recipient-line {
  font-size: 0.92em;
  color: #cbd5e1;
}

.amm-addr-text {
  font-family: "Sarabun", sans-serif;
  line-height: 1.4;
  color: #e2e8f0;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
}

.amm-addr-text.match {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.28);
  color: #a7f3d0;
}

.amm-addr-text.diff {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fecaca;
}

.amm-extra-addr {
  font-size: 0.8em;
  color: #c084fc;
}

.amm-empty-val {
  color: #64748b;
  font-style: italic;
}

/* Group Footer */
.amm-group-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.85);
  border-top: 1px solid #1e293b;
  flex-wrap: wrap;
}

.amm-preview-line {
  font-size: 0.83em;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.amm-preview-line code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  color: #7dd3fc;
}

.amm-merge-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: #fff;
  font-size: 0.86em;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.amm-merge-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.amm-merge-btn.warn {
  background: #d97706;
}

.amm-merge-btn.warn:hover:not(:disabled) {
  background: #b45309;
}

.amm-merge-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Manual Merge Tab */
.amm-manual-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.28);
  color: #bfdbfe;
  font-size: 0.85em;
}

.amm-manual-pickers {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: stretch;
}

.amm-picker-box {
  background: #131c31;
  border: 1px solid #26344d;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.amm-picker-box.primary {
  border-top: 3px solid #10b981;
}

.amm-picker-box.secondary {
  border-top: 3px solid #f59e0b;
}

.amm-picker-label {
  font-size: 0.84em;
  font-weight: 700;
  color: #e2e8f0;
}

.amm-picker-search {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  background: #0b1120;
  border: 1px solid #334155;
  border-radius: 7px;
  color: #f8fafc;
  font-size: 0.84em;
  font-family: inherit;
}

.amm-picker-search:focus {
  outline: none;
  border-color: #38bdf8;
}

.amm-picker-list {
  max-height: 185px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.amm-picker-item {
  width: 100%;
  text-align: left;
  padding: 6px 9px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-family: inherit;
  cursor: pointer;
}

.amm-picker-item:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.16);
}

.amm-picker-item.selected {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.55);
}

.amm-picker-item:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.amm-pi-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.86em;
}

.amm-mini-yt {
  font-size: 0.7em;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
}

.amm-pi-sub {
  font-size: 0.75em;
  color: #94a3b8;
  display: flex;
  gap: 5px;
  margin-top: 2px;
}

.amm-swap-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.amm-swap-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  cursor: pointer;
}

.amm-swap-btn:hover:not(:disabled) {
  background: #334155;
  color: #fff;
}

.amm-manual-compare {
  background: #131c31;
  border: 1px solid #26344d;
  border-radius: 12px;
  overflow: hidden;
}

.amm-compare-status {
  padding: 9px 14px;
  border-bottom: 1px solid #1e293b;
}

.amm-compare-status.match {
  background: rgba(16, 185, 129, 0.1);
}

.amm-compare-status.conflict {
  background: rgba(239, 68, 68, 0.12);
}

.amm-compare-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.amm-cmp-pill {
  font-size: 0.78em;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.amm-cmp-pill.ok {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.amm-cmp-pill.danger {
  background: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
}

.amm-cmp-pill.info {
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
}

/* Transitions (GPU-only) */
.amm-fade-enter-active,
.amm-fade-leave-active {
  transition: opacity 0.18s ease;
}

.amm-fade-enter-from,
.amm-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .amm-manual-pickers {
    grid-template-columns: 1fr;
  }
  .amm-swap-col {
    padding: 2px 0;
  }
  .amm-members-grid {
    grid-template-columns: 1fr;
  }
}
</style>
