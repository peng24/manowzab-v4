<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="history-modal-container">
      
      <!-- HEADER -->
      <div class="modal-header">
        <div class="modal-header-left">
          <button
            type="button"
            class="btn-mobile-sidebar"
            @click="mobileSidebarOpen = !mobileSidebarOpen"
            title="แสดง/ซ่อนรายการไลฟ์ย้อนหลัง"
          >
            <i class="fa-solid" :class="mobileSidebarOpen ? 'fa-xmark' : 'fa-bars'"></i>
            <span>เลือกไลฟ์</span>
          </button>
          <h2><i class="fa-solid fa-clock-rotate-left"></i> ประวัติการขาย (History)</h2>
        </div>
        <div class="modal-header-right">
          <a :href="`${baseUrl}history/`" target="_blank" class="btn-open-tab" title="เปิดแบบเต็มหน้าจอในแท็บใหม่">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> เปิดหน้าแยก
          </a>
          <button class="btn-close" @click="$emit('close')" title="ปิดหน้าต่าง">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Mobile Sidebar Backdrop -->
        <div
          v-if="mobileSidebarOpen"
          class="mobile-sidebar-backdrop"
          @click="mobileSidebarOpen = false"
        ></div>

        <!-- SIDEBAR: List of Lives -->
        <div class="sidebar" :class="{ 'mobile-open': mobileSidebarOpen }">
          <div class="sidebar-header">
            <div class="sidebar-title-group">
              <span>รายการย้อนหลัง</span>
              <span v-if="filteredHistoryList.length > 0" class="sidebar-count-pill">
                {{ filteredHistoryList.length }}
              </span>
            </div>
            <div class="sidebar-tools">
              <button class="btn-icon-sm" @click="history.fetchHistoryList" title="รีเฟรชรายการ">
                <i class="fa-solid fa-rotate-right"></i>
              </button>
              <button class="btn-icon-sm" @click="fixHistoryData" title="คำนวณยอดขายใหม่ทั้งหมด">
                <i class="fa-solid fa-wrench"></i>
              </button>
              <button class="btn-icon-sm-danger" @click="openCleanupModal" title="ล้างประวัติเก่าเกิน 3 เดือน">
                <i class="fa-solid fa-broom"></i>
              </button>
            </div>
          </div>
          
          <div class="sidebar-search-bar">
            <i class="fa-solid fa-magnifying-glass sidebar-search-icon"></i>
            <input
              v-model="sidebarSearchQuery"
              type="text"
              class="sidebar-search-input"
              placeholder="ค้นหาชื่อไลฟ์ / วันที่ / ID..."
            />
            <button
              v-if="sidebarSearchQuery"
              type="button"
              class="sidebar-search-clear"
              @click="sidebarSearchQuery = ''"
              title="ล้างค้นหา"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div v-if="history.isLoading.value" class="sidebar-state-msg">
            <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดรายการ...
          </div>

          <div v-else class="sidebar-list">
             <div 
               v-for="item in filteredHistoryList" 
               :key="item.videoId"
               class="sidebar-item"
               :class="{ active: selectedId === item.videoId }"
               @click="handleSelectLive(item)"
             >
               <div class="sidebar-item-top">
                 <span class="item-date-chip">
                   <i class="fa-regular fa-calendar"></i> {{ formatDate(item.timestamp) }}
                 </span>
                 <span v-if="item.totalItems > 0" class="item-sold-chip">
                   {{ item.totalItems }} ตัว
                 </span>
               </div>
               <div class="item-title" :title="item.title || item.videoId">{{ item.title || "ไม่มีชื่อไลฟ์" }}</div>
               <div class="item-meta">
                 <span class="item-meta-label">ยอดขาย</span>
                 <span class="item-meta-value">฿{{ (item.totalSales || 0).toLocaleString() }}</span>
               </div>
             </div>
             
             <div v-if="filteredHistoryList.length === 0" class="sidebar-state-msg">
                <i class="fa-regular fa-folder-open" style="font-size: 1.5em; opacity: 0.45;"></i>
                <span>{{ sidebarSearchQuery ? 'ไม่พบชื่อไลฟ์ที่ค้นหา' : 'ยังไม่มีข้อมูลประวัติการขาย' }}</span>
             </div>
          </div>
        </div>

        <!-- MAIN CONTENT: Details -->
        <div class="main-content">
          <div v-if="!selectedItem" class="empty-state">
            <div class="empty-state-card">
              <div class="empty-state-icon">
                <i class="fa-solid fa-clock-rotate-left"></i>
              </div>
              <h3>เลือกไลฟ์ย้อนหลังที่ต้องการดู</h3>
              <p>เลือกรายการจากแถบด้านซ้าย เพื่อดูสต็อก ไซส์ ราคา แก้ไขคิว หรือย้อนอ่านแชททั้งหมดของไลฟ์นั้น</p>
              <div class="empty-state-actions">
                <button
                  v-if="filteredHistoryList.length > 0"
                  type="button"
                  class="btn btn-open-latest"
                  @click="handleSelectLive(filteredHistoryList[0])"
                >
                  <i class="fa-solid fa-play"></i> เปิดไลฟ์ล่าสุด
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-mobile-pick"
                  @click="mobileSidebarOpen = true"
                >
                  <i class="fa-solid fa-list"></i> เลือกรายการไลฟ์
                </button>
              </div>
            </div>
          </div>

          <div v-else class="content-wrapper">
             <!-- Overview Header (Clean 2-row hierarchy, zero horizontal clipping) -->
             <div class="stats-bar-header">
                <div class="history-live-title-bar">
                  <div v-if="!isEditingTitle" class="history-live-title-left">
                    <button
                      type="button"
                      class="btn-mobile-inline-menu"
                      @click="mobileSidebarOpen = true"
                      title="เปลี่ยนไลฟ์ย้อนหลัง"
                    >
                      <i class="fa-solid fa-bars"></i>
                    </button>
                    <span class="history-live-dot" title="ชื่อไลฟ์ย้อนหลัง">
                      <i class="fa-solid fa-tower-broadcast"></i>
                    </span>
                    <div class="history-title-stack">
                      <span class="history-live-title-text" :title="selectedItem.title || selectedItem.videoId">
                        {{ selectedItem.title || "ไม่มีชื่อไลฟ์" }}
                      </span>
                      <div class="history-title-submeta">
                        <span v-if="selectedItem.timestamp" class="history-title-date">
                          <i class="fa-regular fa-calendar"></i> {{ formatDate(selectedItem.timestamp) }}
                        </span>
                        <span class="history-title-vid" :title="'YouTube Video ID: ' + selectedItem.videoId">
                          {{ selectedItem.videoId }}
                        </span>
                        <button
                          type="button"
                          class="btn-title-icon"
                          @click="startEditTitle"
                          title="แก้ไขชื่อไลฟ์"
                        >
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        <button
                          type="button"
                          class="btn-title-icon"
                          :disabled="isFetchingTitle"
                          @click="refreshTitleFromYouTube(selectedItem.videoId, false)"
                          title="ดึงชื่อไลฟ์จาก YouTube"
                        >
                          <i class="fa-solid" :class="isFetchingTitle ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="history-live-title-edit">
                    <input
                      ref="editTitleInputRef"
                      v-model="editingTitleText"
                      type="text"
                      class="history-title-edit-input"
                      placeholder="ระบุชื่อไลฟ์..."
                      @keyup.enter="saveEditedTitle"
                      @keyup.esc="cancelEditTitle"
                    />
                    <button type="button" class="btn-title-save" @click="saveEditedTitle" title="บันทึกชื่อไลฟ์">
                      <i class="fa-solid fa-check"></i> บันทึก
                    </button>
                    <button type="button" class="btn-title-cancel" @click="cancelEditTitle" title="ยกเลิก">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>

                  <div class="header-actions">
                    <button class="btn-hist-primary" @click="openOnMainBoard" title="เปิดไลฟ์นี้ขึ้นกระดานหลัก">
                      <i class="fa-solid fa-arrow-up-right-from-square"></i>
                      <span>เปิดที่หน้าหลัก</span>
                    </button>
                    <button class="btn-hist-secondary" @click="exportCSV" title="ดาวน์โหลดรายงานยอดขายเป็นไฟล์ CSV">
                      <i class="fa-solid fa-file-csv"></i>
                      <span>Export CSV</span>
                    </button>
                    <span class="header-actions-divider"></span>
                    <button class="btn-hist-ghost-warn" @click="confirmClearHistoryStock" title="ล้างข้อมูลการจองในกระดานนี้">
                      <i class="fa-solid fa-eraser"></i>
                    </button>
                    <button class="btn-hist-ghost-danger" @click="handleDelete" title="ลบไลฟ์สดนี้ถาวร">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div v-if="isDetailsLoading" class="history-loading-inline">
                    <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูลรายการ...
                </div>
                <template v-else>
                  <div class="header-kpi-row">
                    <div class="kpi-chip kpi-stock-size">
                      <span class="kpi-label">จำนวนรายการ</span>
                      <input
                        type="number"
                        v-model.lazy="localStockSize"
                        class="edit-input"
                        min="1"
                        max="300"
                        @change="saveStockSize"
                      />
                    </div>

                    <button
                      type="button"
                      class="kpi-chip kpi-clickable"
                      :class="{ 'kpi-active': statusFilter === 'sold' && viewMode !== 'chat' }"
                      @click="toggleStatusFilter('sold')"
                      title="คลิกเพื่อกรองดูเฉพาะตัวที่ขายแล้ว"
                    >
                      <span class="kpi-label">ขายแล้ว</span>
                      <span class="stat-sold">{{ animatedSoldCount }}</span>
                      <span class="kpi-total">/{{ selectedItem.stockSize || 70 }}</span>
                      <span class="sale-percent-badge" :class="[percentColorClass, { 'pulse': isPulsingPercent }]">
                        {{ animatedPercentage }}%
                      </span>
                    </button>

                    <button
                      type="button"
                      class="kpi-chip kpi-clickable"
                      :class="{ 'kpi-active': statusFilter === 'vacant' && viewMode !== 'chat' }"
                      @click="toggleStatusFilter('vacant')"
                      title="คลิกเพื่อกรองดูเฉพาะตัวที่ยังว่าง"
                    >
                      <span class="kpi-label">เหลือว่าง</span>
                      <span class="kpi-vacant-val">{{ vacantCount }}</span>
                    </button>

                    <div
                      class="total-sales-badge"
                      :class="{ 'pulse': isPulsingSales }"
                      :title="historySalesTooltip"
                    >
                      <span class="sales-label">ยอดขาย:</span>
                      <span class="sales-amount">฿{{ animatedHistoryTotalSales.toLocaleString() }}</span>
                    </div>
                  </div>

                  <div class="mini-progress-track">
                    <div class="mini-progress-fill" :style="{ width: soldPercentage + '%', background: progressBarColor }">
                      <div class="mini-shimmer"></div>
                    </div>
                  </div>
                </template>
             </div>

             <!-- Unified Controls Bar: Search + Quick Status Filter + Segmented View Tabs -->
             <div class="controls-bar">
                <div class="search-wrapper">
                  <i class="fa-solid fa-magnifying-glass search-icon"></i>
                  <input 
                    v-model="searchQuery" 
                    type="text" 
                    class="search-input" 
                    :placeholder="viewMode === 'chat' ? 'ค้นหาชื่อลูกค้า, ข้อความแชท...' : 'ค้นหาชื่อลูกค้า, รหัส, ไซส์ (เช่น อก52)...'"
                  >
                  <button
                    v-if="searchQuery"
                    type="button"
                    class="search-clear-btn"
                    @click="searchQuery = ''"
                    title="ล้างคำค้นหา"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div v-if="viewMode === 'grid'" class="status-filter-pills">
                  <button
                    type="button"
                    class="status-pill"
                    :class="{ active: statusFilter === 'all' }"
                    @click="statusFilter = 'all'"
                  >ทั้งหมด</button>
                  <button
                    type="button"
                    class="status-pill pill-sold"
                    :class="{ active: statusFilter === 'sold' }"
                    @click="statusFilter = 'sold'"
                  >ขายแล้ว ({{ soldCount }})</button>
                  <button
                    type="button"
                    class="status-pill pill-vacant"
                    :class="{ active: statusFilter === 'vacant' }"
                    @click="statusFilter = 'vacant'"
                  >ว่าง ({{ vacantCount }})</button>
                </div>
                
                <div class="view-toggles">
                  <div class="segmented-control">
                    <button 
                        class="seg-btn" 
                        :class="{ active: viewMode === 'grid' }"
                        @click="setViewMode('grid')"
                        title="มุมมองกระดานสต็อก (Grid View)"
                    >
                        <i class="fa-solid fa-table-cells"></i> กระดาน
                    </button>
                    <button 
                        class="seg-btn" 
                        :class="{ active: viewMode === 'list' }"
                        @click="setViewMode('list')"
                        title="มุมมองรายการตาราง (List View)"
                    >
                        <i class="fa-solid fa-list"></i> รายการ
                    </button>
                    <button 
                        class="seg-btn" 
                        :class="{ active: viewMode === 'chat' }"
                        @click="setViewMode('chat')"
                        title="ดูประวัติแชทย้อนหลัง (เหมือนตอนไลฟ์สด)"
                    >
                        <i class="fa-solid fa-comments"></i> แชท
                        <span v-if="loadedChatVideoId === selectedId && historyChats.length > 0" class="chat-mode-count">{{ historyChats.length }}</span>
                    </button>
                  </div>
                  <button 
                      v-if="viewMode === 'grid'"
                      class="btn-expand-grid" 
                      @click="isFullscreen = !isFullscreen"
                      :title="isFullscreen ? 'ออกจากเต็มจอ' : 'ขยายกระดานเต็มจอ'"
                  >
                      <i class="fa-solid" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i>
                  </button>
                </div>
             </div>

             <!-- Table (List View — Friendly, No Raw UIDs) -->
             <div v-if="viewMode === 'list'" class="table-container">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th width="64">#</th>
                     <th width="86">รหัส</th>
                     <th>ลูกค้า & สเปกสินค้า</th>
                     <th width="110" class="text-right">ราคา</th>
                     <th width="115" class="text-center">ที่มา</th>
                     <th width="110">เวลา</th>
                     <th width="104" class="text-center">จัดการ</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr v-if="filteredOrders.length === 0">
                      <td colspan="7" class="table-empty-cell">
                        <i class="fa-regular fa-face-smile-wink" style="margin-right: 6px; opacity: 0.6;"></i>
                        {{ searchQuery ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีรายการจองในไลฟ์นี้' }}
                      </td>
                   </tr>
                   <tr
                     v-for="(order, index) in filteredOrders"
                     :key="order.stockId"
                     class="order-row-clickable"
                     @click="openQueueModal(order.stockId)"
                   >
                     <td class="text-muted">{{ index + 1 }}</td>
                     <td>
                       <span class="list-stock-badge">#{{ order.stockId }}</span>
                     </td>
                     <td>
                        <div class="customer-name-row">
                          <span class="customer-name">{{ order.owner }}</span>
                          <span v-if="order.backdated" class="list-backdated-tag" :title="getBookingTooltip(order.timestamp, true)">
                            <i class="fa-solid fa-clock-rotate-left"></i> ย้อนหลัง
                          </span>
                        </div>
                        <div v-if="formatFullStockDetails(order)" class="history-list-spec">
                          <i class="fa-solid fa-ruler"></i> {{ formatFullStockDetails(order) }}
                        </div>
                     </td>
                     <td class="text-right list-price-cell">
                       <span v-if="order.price && Number(order.price) > 0">฿{{ Number(order.price).toLocaleString() }}</span>
                       <span v-else class="text-muted">—</span>
                     </td>
                     <td class="text-center">
                        <span class="source-pill" :class="getSourceBadgeClass(order.method, order.source)">
                           {{ formatSourceLabel(order.method, order.source) }}
                        </span>
                     </td>
                     <td class="text-sm text-muted">
                        {{ formatTime(order.timestamp) }}
                     </td>
                     <td class="text-center">
                        <div class="action-btns">
                           <button class="btn-action btn-action-edit" @click.stop="openQueueModal(order.stockId)" title="แก้ไขคิว / ราคา / ไซส์">
                             <i class="fa-solid fa-pen-to-square"></i>
                           </button>
                           <button class="btn-action btn-action-delete" @click.stop="processHistoryCancel(order.stockId, order.uid, order.owner)" title="ยกเลิกการจอง">
                             <i class="fa-solid fa-user-xmark"></i>
                           </button>
                        </div>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>
             
             <!-- Grid View (Clean 3-row StockItemCard Hierarchy) -->
             <div v-else-if="viewMode === 'grid'" class="grid-container" :class="{ 'fullscreen-grid': isFullscreen }">
                <div v-if="isFullscreen" class="fullscreen-header">
                     <h2><i class="fa-solid fa-table-cells"></i> {{ selectedItem.title }}</h2>
                     <button class="btn btn-danger btn-sm" @click="isFullscreen = false">
                        <i class="fa-solid fa-compress"></i> ออกจากเต็มจอ
                     </button>
                </div>

                <div v-if="allGridItems.length === 0" class="grid-empty-msg">
                  <i class="fa-solid fa-filter-circle-xmark"></i>
                  <span>ไม่พบรายการที่ตรงกับตัวกรองหรือคำค้นหา</span>
                  <button
                    v-if="statusFilter !== 'all' || searchQuery"
                    type="button"
                    class="btn btn-sm btn-outline"
                    @click="statusFilter = 'all'; searchQuery = ''"
                  >แสดงทั้งหมด</button>
                </div>
             
                <div v-else class="grid-content">
                    <div 
                        v-for="item in allGridItems" 
                        :key="item.id"
                        class="grid-item"
                        :class="{ 'empty': item.isEmpty, 'sold': !item.isEmpty }"
                        @click="openQueueModal(item.id)"
                    >
                        <div class="grid-card-top">
                          <div class="item-num">{{ item.id }}</div>
                          <div class="grid-card-top-right">
                            <div
                              v-if="item.price && Number(item.price) > 0"
                              class="stock-price"
                              :title="`ราคา: ฿${Number(item.price).toLocaleString()} บาท`"
                            >
                              ฿{{ Number(item.price).toLocaleString() }}
                            </div>
                            <div v-if="getQueueLength(item.id) > 0" class="queue-badge" :title="`มีคิวสำรอง ${getQueueLength(item.id)} คน`">
                              +{{ getQueueLength(item.id) }}
                            </div>
                          </div>
                        </div>
                        
                        <div class="grid-card-center">
                          <div class="item-status" :class="{ empty: item.isEmpty }">
                            <span>{{ item.isEmpty ? 'ว่าง' : item.owner }}</span>
                            <i
                              v-if="!item.isEmpty && item.backdated"
                              class="fa-solid fa-clock-rotate-left backdated-inline-icon"
                              :title="getBookingTooltip(item.time, true)"
                            ></i>
                          </div>
                        </div>
                        
                        <div class="grid-card-meta" v-if="(!item.isEmpty && getOwnerCount(item.owner, item.uid) >= 1) || formatCompactStockSize(item)">
                          <div
                            v-if="!item.isEmpty && getOwnerCount(item.owner, item.uid) >= 1"
                            class="owner-count-badge"
                            :title="`${item.owner} จองทั้งหมด ${getOwnerCount(item.owner, item.uid)} ชิ้น — คลิกเพื่อดูรายการทั้งหมด`"
                            @click.stop="showOwnerItems(item.owner)"
                          >×{{ getOwnerCount(item.owner, item.uid) }}</div>

                          <span
                            v-if="formatCompactStockSize(item)"
                            class="history-size-meta"
                            :title="`สเปกสินค้า: ${formatFullStockDetails(item)}`"
                          >{{ formatCompactStockSize(item) }}</span>
                        </div>
                    </div>
                </div>
             </div>

             <!-- Historical Chat View (Identical Hybrid Live Chat UI) -->
             <div v-else-if="viewMode === 'chat'" class="history-chat-container">
               <div class="history-chat-toolbar">
                 <div class="history-chat-tabs">
                   <button
                     type="button"
                     class="chat-tab"
                     :class="{ active: chatIntentTab === 'all' }"
                     @click="chatIntentTab = 'all'"
                   >
                     ทั้งหมด <span class="hchat-tab-count">{{ historyChatTabCounts.all }}</span>
                   </button>
                   <button
                     type="button"
                     class="chat-tab tab-cf"
                     :class="{ active: chatIntentTab === 'buy' }"
                     @click="chatIntentTab = 'buy'"
                   >
                     จอง (CF) <span v-if="historyChatTabCounts.buy > 0" class="hchat-tab-count">{{ historyChatTabCounts.buy }}</span>
                   </button>
                   <button
                     type="button"
                     class="chat-tab tab-shipping"
                     :class="{ active: chatIntentTab === 'shipping' }"
                     @click="chatIntentTab = 'shipping'"
                   >
                     ส่ง <span v-if="historyChatTabCounts.shipping > 0" class="hchat-tab-count">{{ historyChatTabCounts.shipping }}</span>
                   </button>
                   <button
                     type="button"
                     class="chat-tab tab-cancel"
                     :class="{ active: chatIntentTab === 'cancel' }"
                     @click="chatIntentTab = 'cancel'"
                   >
                     ยกเลิก <span v-if="historyChatTabCounts.cancel > 0" class="hchat-tab-count">{{ historyChatTabCounts.cancel }}</span>
                   </button>
                   <button
                     type="button"
                     class="chat-tab tab-question"
                     :class="{ active: chatIntentTab === 'question' }"
                     @click="chatIntentTab = 'question'"
                   >
                     คำถาม <span v-if="historyChatTabCounts.question > 0" class="hchat-tab-count">{{ historyChatTabCounts.question }}</span>
                   </button>
                   <button
                     type="button"
                     class="chat-tab tab-admin"
                     :class="{ active: chatIntentTab === 'admin' }"
                     @click="chatIntentTab = 'admin'"
                   >
                     แอดมิน <span v-if="historyChatTabCounts.admin > 0" class="hchat-tab-count">{{ historyChatTabCounts.admin }}</span>
                   </button>
                 </div>

                 <div class="history-chat-tools">
                   <span v-if="chatAuthorFilter" class="hchat-author-chip">
                     <i class="fa-solid fa-filter"></i> {{ chatAuthorFilter }}
                     <button type="button" class="hchat-chip-clear" @click="chatAuthorFilter = ''" title="ล้างตัวกรองชื่อ">
                       <i class="fa-solid fa-xmark"></i>
                     </button>
                   </span>
                   <button type="button" class="btn btn-sm btn-outline" @click="scrollHistoryChat('top')" title="เลื่อนไปข้อความแรก">
                     <i class="fa-solid fa-angles-up"></i>
                   </button>
                   <button type="button" class="btn btn-sm btn-outline" @click="scrollHistoryChat('bottom')" title="เลื่อนไปข้อความล่าสุด">
                     <i class="fa-solid fa-angles-down"></i>
                   </button>
                   <button
                     type="button"
                     class="btn btn-sm btn-success"
                     @click="exportHistoryChatCSV"
                     :disabled="filteredHistoryChats.length === 0"
                     title="ดาวน์โหลดประวัติแชทเป็นไฟล์ CSV"
                   >
                     <i class="fa-solid fa-file-csv"></i> แชท CSV
                   </button>
                 </div>
               </div>

               <div id="history-chat-viewport" ref="historyChatViewport" data-lenis-prevent>
                 <div v-if="isChatLoading" class="history-chat-empty">
                   <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5em; color: #38bdf8;"></i>
                   <span>กำลังโหลดประวัติแชท...</span>
                 </div>

                 <div v-else-if="filteredHistoryChats.length === 0" class="history-chat-empty">
                   <i class="fa-regular fa-comment-dots" style="font-size: 1.8em; color: #64748b;"></i>
                   <span>{{ historyChats.length === 0 ? 'ยังไม่มีข้อมูลประวัติแชทสำหรับไลฟ์นี้' : 'ไม่พบข้อความแชทที่ตรงกับเงื่อนไข' }}</span>
                 </div>

                 <div v-else class="history-chat-list">
                   <div
                     v-for="chat in filteredHistoryChats"
                     :key="chat.id"
                     :class="['chat-row', chat.isAdmin ? 'admin' : '', chat.type, isHistoryChatBanned(chat) ? 'banned' : '']"
                     :style="getHistoryChatRowStyle(chat)"
                   >
                     <div class="avatar-col">
                       <div class="avatar-container">
                         <img
                           v-if="chat.avatar"
                           :src="chat.avatar"
                           class="avatar"
                           loading="lazy"
                           decoding="async"
                           @error="(e) => (e.target.style.display = 'none')"
                         />
                         <div
                           class="avatar-fallback"
                           :style="{ backgroundColor: getCustomerRowColor(chat) || chat.color || '#38bdf8' }"
                         >
                           {{ (chat.displayName || chat.authorName || '?')[0] }}
                         </div>
                       </div>

                       <span v-if="isHistoryChatBanned(chat)" class="status-badge-under badge-banned">
                         🚫 แบน
                       </span>
                       <span
                         v-else-if="getIntentBadge(chat.type)"
                         class="status-badge-under"
                         :class="getIntentBadge(chat.type).class"
                       >
                         {{ getIntentBadge(chat.type).icon }} {{ getIntentBadge(chat.type).label }}
                       </span>
                     </div>

                     <div class="chat-bubble-container">
                       <div class="chat-meta">
                         <span class="chat-time">{{ formatChatClockTime(chat.timestamp) }}</span>
                         <span
                           class="chat-name"
                           @click="toggleHistoryAuthorFilter(chat)"
                           title="คลิกเพื่อกรองดูเฉพาะแชทของคนนี้"
                         >
                           <span class="chat-name-dot" :style="{ backgroundColor: getCustomerRowColor(chat) || chat.color || '#94a3b8' }"></span>
                           <span class="chat-name-text">{{ chat.displayName || chat.authorName || 'ลูกค้า' }}</span>
                         </span>

                         <div
                           v-if="getHistoryCustomerMeta(chat)?.hasAddress || getHistoryCustomerMeta(chat)?.contactChannel || getHistoryCustomerMeta(chat)?.paymentType"
                           class="cust-meta-cluster"
                         >
                           <span
                             v-if="getHistoryCustomerMeta(chat)?.hasAddress"
                             class="cust-mini-badge addr"
                             title="มีที่อยู่จัดส่งแล้ว"
                           >
                             <i class="fa-solid fa-location-dot"></i>
                           </span>
                           <span
                             v-if="getHistoryCustomerMeta(chat)?.contactChannel"
                             class="cust-mini-badge channel"
                             :class="getHistoryCustomerMeta(chat).contactChannel"
                             :title="`ช่องทางติดต่อ: ${getChannelLabel(getHistoryCustomerMeta(chat).contactChannel)}`"
                           >
                             <i :class="getChannelIcon(getHistoryCustomerMeta(chat).contactChannel)"></i>
                             <span class="mini-txt">{{ getChannelShortText(getHistoryCustomerMeta(chat).contactChannel) }}</span>
                           </span>
                           <span
                             v-if="getHistoryCustomerMeta(chat)?.paymentType"
                             class="cust-mini-badge pay"
                             :class="getHistoryCustomerMeta(chat).paymentType"
                             :title="getHistoryCustomerMeta(chat).paymentType === 'cod' ? 'COD (เก็บปลายทาง)' : 'โอนเงิน'"
                           >
                             <i :class="getHistoryCustomerMeta(chat).paymentType === 'cod' ? 'fa-solid fa-box' : 'fa-solid fa-money-bill-transfer'"></i>
                             <span class="mini-txt">{{ getHistoryCustomerMeta(chat).paymentType === 'cod' ? 'COD' : 'โอน' }}</span>
                           </span>
                         </div>

                         <button
                           type="button"
                           class="btn-author-filter"
                           :class="{ 'is-active': isHistoryAuthorFiltered(chat) }"
                           @click.stop="toggleHistoryAuthorFilter(chat)"
                           :title="isHistoryAuthorFiltered(chat) ? 'ยกเลิกกรองคนนี้' : 'กรองดูเฉพาะคนนี้'"
                         >
                           <i class="fa-solid fa-filter"></i>
                         </button>
                       </div>

                       <div class="chat-bubble">
                         <div class="chat-text">
                           <template v-if="resolveStoredProxyName(chat)">
                             <span v-html="renderAdminProxyHtml(chat, resolveStoredProxyName(chat))"></span>
                           </template>
                           <template v-else-if="resolveChatRuns(chat)">
                             <template v-for="(run, idx) in resolveChatRuns(chat)" :key="idx">
                               <span v-if="run.text">{{ run.text }}</span>
                               <img
                                 v-else-if="run.emoji && run.emoji.image"
                                 :src="run.emoji.image.thumbnails?.[0]?.url || run.emoji.image.url"
                                 :alt="run.emoji.emojiId || 'emoji'"
                                 class="emoji-image"
                                 loading="lazy"
                                 decoding="async"
                               />
                             </template>
                           </template>
                           <template v-else>
                             {{ chat.text }}
                           </template>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  </div>

  <!-- Historical Queue Modal (Teleport or Overlay) -->
  <Teleport to="body">
    <div v-if="showQueueModal" class="queue-modal-overlay" @click.self="closeQueueModal">
      <div class="queue-modal">
        <div class="queue-header">
          <h3 class="text-success">
            <i class="fa-solid fa-list-ol"></i> รายการประวัติที่ {{ editingId }}
          </h3>
          <div style="display: flex; gap: 8px; align-items: center">
            <button class="btn btn-dark btn-sm" @click="saveAndNavigate('prev')" title="บันทึกและไปรายการก่อนหน้า (ลูกศรซ้าย)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button class="btn btn-dark btn-sm" @click="saveAndNavigate('next')" title="บันทึกและไปรายการถัดไป (ลูกศรขวา)">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button class="btn btn-danger btn-sm" @click="clearItemData" title="ล้างข้อมูล">
              <i class="fa-solid fa-eraser"></i> ล้าง
            </button>
            <button class="btn btn-dark" @click="closeQueueModal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        
        <div class="queue-body">
          <div class="price-input-section">
            <label class="price-label">
              <i class="fa-solid fa-tag"></i> ราคา
            </label>
            <div class="price-input-row">
              <input
                type="number"
                v-model.number="editingPrice"
                ref="priceInputRef"
                class="price-input-field"
                placeholder="0"
                @keyup.enter="saveQueueChanges()"
              />
              <span class="price-unit">บาท</span>
            </div>
            <div class="details-input-row">
              <label class="details-inline-label">
                <i class="fa-solid fa-ruler"></i> สเปก/ไซส์
              </label>
              <input
                type="text"
                v-model="editingDetails"
                class="details-input-field"
                placeholder="เช่น อก 52 ยาว 29 ไซส์ 2XL"
                @keyup.enter="saveQueueChanges()"
              />
            </div>
          </div>
          
          <div class="queue-list">
            <div v-if="tempQueue.length === 0" class="queue-empty-state">
              <i class="fa-solid fa-inbox" style="font-size: 1.8em; opacity: 0.3; margin-bottom: 4px"></i>
              ไม่มีการจอง
            </div>
            
            <div
              v-for="(person, index) in tempQueue"
              :key="index"
              class="queue-item"
              :class="{ 'queue-item--owner': index === 0, 'queue-item--backup': index > 0 }"
              draggable="true"
              @dragstart="dragStart(index)"
              @dragover.prevent
              @drop="drop(index)"
            >
              <div class="flex-center gap-10" style="flex: 1">
                <div class="drag-handle">
                  <i class="fa-solid fa-grip-vertical"></i>
                </div>
                <span class="queue-rank" :class="{ 'queue-rank--owner': index === 0 }">#{{ index + 1 }}</span>
                <span v-if="index === 0" class="owner-badge">
                  <i class="fa-solid fa-crown"></i> ได้ของ
                </span>
                <span v-else class="backup-badge">
                  สำรอง
                </span>
                
                <div class="autocomplete-wrapper">
                  <input
                    type="text"
                    v-model="person.owner"
                    class="queue-input"
                    :ref="el => setQueueInputRef(el, index)"
                    @input="onAutocompleteInput(index)"
                    @focus="onAutocompleteFocus(index)"
                    @blur="onAutocompleteBlur"
                    @keydown="handleAutocompleteKeydown($event, index)"
                    autocomplete="off"
                  />
                  <div
                    v-if="activeAutocompleteIdx === index && filteredSuggestions.length > 0"
                    class="autocomplete-dropdown"
                  >
                    <div
                      v-for="(suggestion, sIdx) in filteredSuggestions"
                      :key="suggestion"
                      class="autocomplete-item"
                      :class="{ active: sIdx === highlightedSuggestionIdx }"
                      @mousedown.prevent="selectSuggestion(suggestion, index)"
                    >
                      <span v-html="highlightMatch(suggestion, person.owner)"></span>
                    </div>
                  </div>
                </div>
                
                <div
                  v-if="person.time"
                  class="queue-item-time backdated"
                  :title="getBookingTooltip(person.time, true)"
                >
                  <i class="fa-solid fa-clock-rotate-left backdated-icon"></i>
                  <span class="backdated-label">ย้อนหลัง</span>
                  <span class="backdated-sep">•</span>
                  <span class="backdated-val">{{ formatBackdatedDetail(person.time) }}</span>
                </div>
              </div>
              
              <div class="queue-actions">
                <button class="btn btn-dark btn-sm" @click="removeQueueItem(index)" title="ลบ">
                  <i class="fa-solid fa-trash text-error"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="queue-footer">
          <button class="btn btn-dark" @click="manualReserve">
            <i class="fa-solid fa-plus"></i> เพิ่มชื่อ
          </button>
          <button class="btn btn-success" @click="saveQueueChanges">
            <i class="fa-solid fa-save"></i> บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { isOutstandingBooking } from "../utils/deliveryState";
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useHistory } from "../composables/useHistory";
import { ref as dbRef, onValue, get, remove, update, runTransaction, set } from "firebase/database";
import { db } from "../composables/useFirebase";
import { escapeHtml } from "../utils/dbUtils";
import { normalizeCustomerName, isProxyUid, syncDeliveryCustomerForOwner } from "../utils/deliverySync";
import { formatBackdatedDetail, formatNormalBookingTime, getBookingTooltip } from "../utils/timeFormatUtils";
import { formatCompactStockSize, formatFullStockDetails, matchesStockDetailsQuery } from "../utils/stockSizeUtils";
import { useSystemStore } from "../stores/system";
import { useStockStore } from "../stores/stock";
import { useCustomerStore } from "../stores/customer";
import { useBlacklistStore } from "../stores/blacklist";
import {
  formatChatClockTime,
  getCustomerRowColor,
  getChatRowStyle as buildHybridChatRowStyle,
  getIntentBadge,
  getChannelLabel,
  getChannelShortText,
  getChannelIcon,
  renderAdminProxyHtml,
  resolveChatRuns,
  resolveStoredProxyName,
} from "../utils/chatDisplayUtils";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);
const history = useHistory();
const systemStore = useSystemStore();
const stockStore = useStockStore();
const customerStore = useCustomerStore();
const blacklistStore = useBlacklistStore();
const baseUrl = import.meta.env.BASE_URL || "/";

const selectedId = ref(null);
const selectedItem = ref(null);
const searchQuery = ref("");
const sidebarSearchQuery = ref("");
const savedHistoryViewMode =
  typeof localStorage !== "undefined" ? localStorage.getItem("manowzab_history_view_mode") : null;
const viewMode = ref(
  ["grid", "list", "chat"].includes(savedHistoryViewMode) ? savedHistoryViewMode : "grid"
); // 'grid' | 'list' | 'chat'
const statusFilter = ref("all"); // 'all' | 'sold' | 'vacant'
const mobileSidebarOpen = ref(false);
const isFullscreen = ref(false);
const isDetailsLoading = ref(false);

// Historical Live Title Edit / Refresh State
const isEditingTitle = ref(false);
const editingTitleText = ref("");
const editTitleInputRef = ref(null);
const isFetchingTitle = ref(false);
const autoResolvedTitleIds = new Set();

const filteredHistoryList = computed(() => {
  const list = history.historyList.value || [];
  const q = sidebarSearchQuery.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((item) => {
    const title = (item.title || "").toLowerCase();
    const vid = (item.videoId || "").toLowerCase();
    const dateStr = item.timestamp ? formatDate(item.timestamp).toLowerCase() : "";
    return title.includes(q) || vid.includes(q) || dateStr.includes(q);
  });
});

// Historical Chat State
const historyChats = ref([]);
const loadedChatVideoId = ref(null);
const isChatLoading = ref(false);
const chatIntentTab = ref("all");
const chatAuthorFilter = ref("");
const historyChatViewport = ref(null);

// Scoped Customer Total Purchases State
const deliveryCustomers = computed(() => customerStore.deliveryCustomersList);
const activeOwnerName = ref(null);
const pastItems = ref([]);

// Queue Modal State
const showQueueModal = ref(false);
const editingId = ref(null);
const editingPrice = ref(0);
const editingDetails = ref("");
const tempQueue = ref([]);
const priceInputRef = ref(null);
let draggingIndex = null;

// Autocomplete State
const activeAutocompleteIdx = ref(null);
const highlightedSuggestionIdx = ref(-1);
const queueInputRefs = ref({});

function setQueueInputRef(el, index) {
  if (el) queueInputRefs.value[index] = el;
}

// Active dynamic listeners cleanup references
const pageListeners = [];
const sessionListeners = [];
let cleanupHistoryOwnerModal = null;
let autocompleteTimer = null;

function cleanupSessionListeners() {
  sessionListeners.forEach(unsub => {
    if (typeof unsub === "function") unsub();
  });
  sessionListeners.length = 0;
}

let unsubCustomerStore = null;

onMounted(() => {
  history.fetchHistoryList();
  unsubCustomerStore = customerStore.initCustomerListeners();

  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  isHistoryModalUnmounted = true;
  selectLiveGeneration++;
  cleanupSessionListeners();
  if (unsubCustomerStore) {
    unsubCustomerStore();
    unsubCustomerStore = null;
  }
  pageListeners.forEach(unsub => {
    if (typeof unsub === "function") unsub();
  });
  if (cleanupHistoryOwnerModal) {
    cleanupHistoryOwnerModal();
    cleanupHistoryOwnerModal = null;
  }
  if (autocompleteTimer) {
    clearTimeout(autocompleteTimer);
    autocompleteTimer = null;
  }
  if (typeof Swal !== "undefined" && Swal.isVisible()) {
    Swal.close();
  }
  cancelAnimHandle(soldAnimFrame);
  cancelAnimHandle(pctAnimFrame);
  cancelAnimHandle(historySalesAnimFrame);
  if (pulsingPercentTimer) {
    clearTimeout(pulsingPercentTimer);
    pulsingPercentTimer = null;
  }
  if (pulsingSalesTimer) {
    clearTimeout(pulsingSalesTimer);
    pulsingSalesTimer = null;
  }
  window.removeEventListener('keydown', handleGlobalKeydown);
});

async function handleSelectLive(item) {
  mobileSidebarOpen.value = false;
  await selectLive(item);
}

function toggleStatusFilter(target) {
  if (viewMode.value !== "grid") {
    setViewMode("grid");
    statusFilter.value = target;
    return;
  }
  statusFilter.value = statusFilter.value === target ? "all" : target;
}

function formatSourceLabel(method, source) {
  const m = String(method || source || "").toLowerCase();
  if (m.includes("manual")) return "แอดมินเพิ่ม";
  if (m.includes("queue")) return "คิวสำรอง";
  if (m.includes("ai")) return "AI";
  if (m.includes("regex") || m.includes("chat") || m.includes("explicit") || m.includes("buy") || m.includes("proxy")) {
    return "แชทสด";
  }
  return "ระบบ";
}

function getSourceBadgeClass(method, source) {
  const m = String(method || source || "").toLowerCase();
  if (m.includes("manual")) return "src-manual";
  if (m.includes("queue")) return "src-queue";
  if (m.includes("ai")) return "src-ai";
  return "src-chat";
}

let selectLiveGeneration = 0;
let isHistoryModalUnmounted = false;

// Setup dynamic real-time listener when a session is selected
async function selectLive(item) {
  const gen = ++selectLiveGeneration;
  cleanupSessionListeners();

  isEditingTitle.value = false;
  editingTitleText.value = "";
  selectedId.value = item.videoId;
  selectedItem.value = { ...item, orders: {}, stockSize: 70 };
  searchQuery.value = ""; // Reset search
  statusFilter.value = "all";
  historyChats.value = [];
  loadedChatVideoId.value = null;
  chatIntentTab.value = "all";
  chatAuthorFilter.value = "";

  // Auto-resolve missing or placeholder live title cleanly
  const currentTitle = (item.title || "").trim();
  const isMissingTitle = !currentTitle || currentTitle === "ไม่มีชื่อ" || currentTitle === "ไม่มีชื่อไลฟ์" || currentTitle === item.videoId;
  if (isMissingTitle) {
    const activeTitle = typeof systemStore.liveTitle === "string" ? systemStore.liveTitle.trim() : "";
    if (item.videoId === systemStore.currentVideoId && activeTitle && activeTitle !== "รอกระแสข้อมูล...") {
      selectedItem.value.title = activeTitle;
      if (typeof history.updateHistoryTitle === "function") {
        history.updateHistoryTitle(item.videoId, activeTitle).catch(() => {});
      }
    } else if (!autoResolvedTitleIds.has(item.videoId)) {
      autoResolvedTitleIds.add(item.videoId);
      refreshTitleFromYouTube(item.videoId, true);
    }
  }

  isDetailsLoading.value = true;
  // Fetch details initially
  const { orders, stockSize } = await history.fetchHistoryDetails(item.videoId);
  if (gen !== selectLiveGeneration || isHistoryModalUnmounted || selectedId.value !== item.videoId) {
    return;
  }
  selectedItem.value.orders = orders;
  selectedItem.value.stockSize = stockSize;
  isDetailsLoading.value = false;

  if (viewMode.value === "chat") {
    loadChatsForSelected();
  }

  // Real-time stock sync
  const stockRef = dbRef(db, `stock/${item.videoId}`);
  const unsubStock = onValue(stockRef, (snapshot) => {
    const val = snapshot.val() || {};
    if (selectedItem.value && selectedId.value === item.videoId) {
      selectedItem.value.orders = val;
    }
  });
  sessionListeners.push(unsubStock);

  // Real-time stockSize sync
  const sizeRef = dbRef(db, `settings/${item.videoId}/stockSize`);
  const unsubSize = onValue(sizeRef, (snapshot) => {
    const val = snapshot.val();
    if (selectedItem.value && selectedId.value === item.videoId && val) {
      selectedItem.value.stockSize = val;
    }
  });
  sessionListeners.push(unsubSize);
}

async function startEditTitle() {
  if (!selectedItem.value) return;
  editingTitleText.value = selectedItem.value.title || "";
  isEditingTitle.value = true;
  await nextTick();
  editTitleInputRef.value?.focus();
  editTitleInputRef.value?.select?.();
}

function cancelEditTitle() {
  isEditingTitle.value = false;
  editingTitleText.value = "";
}

async function saveEditedTitle() {
  const vid = selectedId.value;
  const cleanTitle = editingTitleText.value.trim();
  if (!vid || !cleanTitle) {
    cancelEditTitle();
    return;
  }
  try {
    if (typeof history.updateHistoryTitle === "function") {
      await history.updateHistoryTitle(vid, cleanTitle);
    }
    if (selectedItem.value && selectedId.value === vid) {
      selectedItem.value.title = cleanTitle;
    }
    if (systemStore.currentVideoId === vid) {
      systemStore.liveTitle = cleanTitle;
      await set(dbRef(db, "system/activeVideoTitle"), cleanTitle);
    }
    isEditingTitle.value = false;
    Swal.fire({
      icon: "success",
      title: "บันทึกชื่อไลฟ์เรียบร้อย",
      timer: 1300,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Save title error:", err);
    Swal.fire("ผิดพลาด", "ไม่สามารถบันทึกชื่อไลฟ์ได้", "error");
  }
}

async function refreshTitleFromYouTube(vid, silent = false) {
  if (!vid || typeof history.syncMissingHistoryTitle !== "function") return;
  isFetchingTitle.value = true;
  try {
    const resolved = await history.syncMissingHistoryTitle(vid);
    if (resolved && resolved.title) {
      if (selectedItem.value && selectedId.value === vid) {
        selectedItem.value.title = resolved.title;
        if (!selectedItem.value.timestamp && resolved.timestamp) {
          selectedItem.value.timestamp = resolved.timestamp;
        }
      }
      if (systemStore.currentVideoId === vid) {
        systemStore.liveTitle = resolved.title;
        await set(dbRef(db, "system/activeVideoTitle"), resolved.title);
      }
      if (!silent) {
        Swal.fire({
          icon: "success",
          title: "ดึงชื่อไลฟ์จาก YouTube สำเร็จ",
          text: resolved.title,
          timer: 1800,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    } else if (!silent) {
      Swal.fire({
        icon: "info",
        title: "ไม่พบข้อมูลชื่อไลฟ์บน YouTube",
        text: "สามารถกดปุ่มดินสอเพื่อตั้งชื่อด้วยตนเองได้ครับ",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
    }
  } catch (err) {
    if (!silent) {
      Swal.fire("ผิดพลาด", "ไม่สามารถดึงชื่อจาก YouTube ได้", "error");
    }
  } finally {
    isFetchingTitle.value = false;
  }
}

// ======================================================
// 💬 Historical Chat Replay Logic (Read-Only, Hybrid UI)
// ======================================================
async function setViewMode(mode) {
  viewMode.value = mode;
  try {
    localStorage.setItem("manowzab_history_view_mode", mode);
  } catch (e) {
    // ignore storage errors
  }
  if (mode !== "grid") {
    isFullscreen.value = false;
  }
  if (mode === "chat" && selectedId.value) {
    await loadChatsForSelected();
  }
}

async function loadChatsForSelected() {
  const vid = selectedId.value;
  if (!vid) return;
  if (loadedChatVideoId.value === vid) {
    nextTick(() => scrollHistoryChat("bottom"));
    return;
  }
  isChatLoading.value = true;
  try {
    const chats = await history.fetchHistoryChats(vid);
    if (selectedId.value === vid) {
      historyChats.value = chats;
      loadedChatVideoId.value = vid;
      await nextTick();
      scrollHistoryChat("bottom");
    }
  } finally {
    if (selectedId.value === vid) {
      isChatLoading.value = false;
    }
  }
}

function isHistoryChatBanned(chat) {
  if (!chat) return false;
  if (chat.isBanned || chat.type === "banned") return true;
  return blacklistStore.isBanned(chat.uid, chat.realName || chat.displayName || chat.authorName);
}

function getHistoryChatRowStyle(chat) {
  return buildHybridChatRowStyle(chat, isHistoryChatBanned(chat));
}

function getHistoryCustomerMeta(chat) {
  if (!chat || chat.isAdmin) return null;
  const name = chat.displayName || chat.realName || chat.authorName;
  const realName = chat.realName || chat.authorName || name;
  return customerStore.getCustomerMetaByName(name, chat.uid, realName);
}

function isHistoryAuthorFiltered(chat) {
  if (!chatAuthorFilter.value || !chat) return false;
  const target = normalizeCustomerName(chatAuthorFilter.value);
  const name = normalizeCustomerName(chat.displayName || chat.realName || chat.authorName || "");
  return Boolean(target && name && target === name);
}

function toggleHistoryAuthorFilter(chat) {
  const name = (chat?.displayName || chat?.authorName || "").trim();
  if (!name) return;
  if (isHistoryAuthorFiltered(chat)) {
    chatAuthorFilter.value = "";
  } else {
    chatAuthorFilter.value = name;
  }
}

function scrollHistoryChat(position = "bottom") {
  const el = historyChatViewport.value;
  if (!el) return;
  el.scrollTop = position === "top" ? 0 : el.scrollHeight;
}

const historyChatTabCounts = computed(() => {
  const counts = { all: 0, buy: 0, shipping: 0, cancel: 0, question: 0, admin: 0 };
  for (const m of historyChats.value) {
    counts.all++;
    if (m.type === "buy") counts.buy++;
    else if (m.type === "shipping") counts.shipping++;
    else if (m.type === "cancel") counts.cancel++;
    else if (m.type === "question") counts.question++;
    if (m.isAdmin) counts.admin++;
  }
  return counts;
});

const filteredHistoryChats = computed(() => {
  let list = historyChats.value;
  if (chatIntentTab.value === "admin") {
    list = list.filter((m) => m.isAdmin);
  } else if (chatIntentTab.value !== "all") {
    list = list.filter((m) => m.type === chatIntentTab.value);
  }

  if (chatAuthorFilter.value) {
    const target = normalizeCustomerName(chatAuthorFilter.value);
    list = list.filter((m) => {
      const name = normalizeCustomerName(m.displayName || m.realName || m.authorName || "");
      const proxy = normalizeCustomerName(m.proxyCustomerName || "");
      return name === target || proxy === target;
    });
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((m) => {
      const name = (m.displayName || m.realName || m.authorName || "").toLowerCase();
      const text = (m.text || "").toLowerCase();
      const proxy = (m.proxyCustomerName || "").toLowerCase();
      return name.includes(q) || text.includes(q) || proxy.includes(q);
    });
  }

  return list;
});

function exportHistoryChatCSV() {
  if (filteredHistoryChats.value.length === 0) return;
  let csv = "\uFEFFTime,Author,Type,Message\n";
  for (const chat of filteredHistoryChats.value) {
    const t = formatChatClockTime(chat.timestamp);
    const author = String(chat.displayName || chat.authorName || "").replace(/"/g, '""');
    const type = String(chat.type || "general").replace(/"/g, '""');
    const text = String(chat.text || "").replace(/"/g, '""').replace(/\r?\n/g, " ");
    csv += `"${t}","${author}","${type}","${text}"\n`;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `chat_history_${selectedId.value || "session"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function openOnMainBoard() {
  if (!selectedId.value) return;
  const vid = selectedId.value;
  systemStore.currentVideoId = vid;
  stockStore.connectToStock(vid);
  try {
    await set(dbRef(db, "system/activeVideo"), vid);
    if (selectedItem.value?.title) {
      await set(dbRef(db, "system/activeVideoTitle"), selectedItem.value.title);
    }
  } catch (err) {
    console.error("Sync activeVideo error:", err);
  }
  emit("close");
  Swal.fire({
    icon: "success",
    title: "เปิดไลฟ์ที่หน้าหลักแล้ว",
    text: `เปิดกระดานสำหรับ ${selectedItem.value?.title || vid}`,
    timer: 1500,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
  });
}

// Convert orders object to array (only booked items with owner; guard sparse array null holes)
const ordersList = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return [];
  
  return Object.keys(selectedItem.value.orders)
    .filter((key) => {
      const item = selectedItem.value.orders[key];
      return Boolean(item && typeof item === "object" && item.owner);
    })
    .map((key) => {
      const item = selectedItem.value.orders[key];
      return {
        stockId: key,
        ...item,
        timestamp: item.timestamp || item.time || 0
      };
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
});

// Filter Logic
const filteredOrders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return ordersList.value;
  
  return ordersList.value.filter(o => 
     o.stockId.toString().includes(q) ||
     (o.owner && o.owner.toLowerCase().includes(q)) ||
     matchesStockDetailsQuery(o, q)
  );
});

// Unique customer names for autocomplete
const customerNames = computed(() => {
    if (!selectedItem.value || !selectedItem.value.orders) return [];
    const names = new Set();
    Object.values(selectedItem.value.orders).forEach(order => {
        if (order && order.owner) names.add(order.owner);
    });
    return [...names].sort();
});

// Grid Items Logic
const allGridItems = computed(() => {
    if (!selectedItem.value) return [];
    const size = selectedItem.value.stockSize || 70;
    const orders = selectedItem.value.orders || {};
    const items = [];

    for (let i = 1; i <= size; i++) {
        const order = orders[i];
        items.push({
            id: i,
            ...order,
            isEmpty: !order || !order.owner
        });
    }
    
    let filtered = items;
    if (statusFilter.value === "sold") {
        filtered = filtered.filter((item) => !item.isEmpty);
    } else if (statusFilter.value === "vacant") {
        filtered = filtered.filter((item) => item.isEmpty);
    }

    if (searchQuery.value) {
        const q = searchQuery.value.trim().toLowerCase();
        return filtered.filter(item => 
           item.id.toString().includes(q) || 
           (item.owner && item.owner.toLowerCase().includes(q)) ||
           matchesStockDetailsQuery(item, q)
        );
    }

    return filtered;
});

// Stats Logic (Progress Bar & Badges)
const soldCount = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return 0;
  return Object.values(selectedItem.value.orders).filter((item) => item && item.owner).length;
});

const vacantCount = computed(() => {
  const size = selectedItem.value?.stockSize || 70;
  return Math.max(0, size - soldCount.value);
});

const soldPercentage = computed(() => {
  if (!selectedItem.value) return 0;
  const size = selectedItem.value.stockSize || 70;
  if (size === 0) return 0;
  return Math.round((soldCount.value / size) * 100);
});

const totalRevenue = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return 0;
  return Object.values(selectedItem.value.orders).reduce(
    (sum, o) => sum + (o && o.owner && parseInt(o.price) > 0 ? parseInt(o.price) : 0),
    0
  );
});

// Animated Counter Logic
const animatedSoldCount = ref(0);
const animatedPercentage = ref(0);
const isPulsingPercent = ref(false);
let soldAnimFrame = null;
let pctAnimFrame = null;
let pulsingPercentTimer = null;

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function animateValue(fromVal, toVal, duration, onUpdate, onDone) {
  const startTime = performance.now();
  let frame = null;
  let cancelled = false;
  function step(now) {
    if (cancelled) return;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);
    const current = Math.round(fromVal + (toVal - fromVal) * easedProgress);
    onUpdate(current);
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      frame = null;
      if (onDone) onDone();
    }
  }
  frame = requestAnimationFrame(step);
  return {
    cancel() {
      cancelled = true;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
}

function cancelAnimHandle(handle) {
  if (!handle) return;
  if (typeof handle.cancel === "function") handle.cancel();
  else cancelAnimationFrame(handle);
}

watch(soldCount, (newVal, oldVal) => {
  cancelAnimHandle(soldAnimFrame);
  const from = oldVal ?? 0;
  soldAnimFrame = animateValue(from, newVal, 500, (v) => {
    animatedSoldCount.value = v;
  });
}, { immediate: true });

watch(soldPercentage, (newVal, oldVal) => {
  cancelAnimHandle(pctAnimFrame);
  const from = oldVal ?? 0;
  isPulsingPercent.value = true;
  if (pulsingPercentTimer) clearTimeout(pulsingPercentTimer);
  pulsingPercentTimer = setTimeout(() => {
    isPulsingPercent.value = false;
    pulsingPercentTimer = null;
  }, 600);
  pctAnimFrame = animateValue(from, newVal, 500, (v) => {
    animatedPercentage.value = v;
  });
}, { immediate: true });

const percentColorClass = computed(() => {
  const pct = soldPercentage.value;
  if (pct <= 20) return 'pct-low';
  if (pct <= 50) return 'pct-medium';
  if (pct <= 80) return 'pct-high';
  return 'pct-complete';
});

// 💰 Historical Session Sales Revenue
const historyTotalSales = computed(() => {
  const orders = selectedItem.value?.orders;
  let sum = 0;
  if (orders && typeof orders === "object") {
    Object.values(orders).forEach((item) => {
      if (item && item.owner && item.price) {
        const p = parseInt(item.price, 10);
        if (!isNaN(p) && p > 0) sum += p;
      }
    });
  }
  if (sum > 0) return sum;
  if (
    selectedItem.value &&
    selectedItem.value.totalSales !== undefined &&
    selectedItem.value.totalSales > 0 &&
    (isDetailsLoading.value || soldCount.value > 0)
  ) {
    return selectedItem.value.totalSales;
  }
  return 0;
});

const animatedHistoryTotalSales = ref(historyTotalSales.value);
let historySalesAnimFrame = null;
const isPulsingSales = ref(false);
let pulsingSalesTimer = null;

const historySalesTooltip = computed(() => {
  const total = historyTotalSales.value.toLocaleString();
  return `ยอดขายรวมในไลฟ์นี้: ฿${total} (${soldCount.value} รายการ)`;
});

watch(historyTotalSales, (newVal, oldVal) => {
  cancelAnimHandle(historySalesAnimFrame);
  const from = oldVal ?? 0;
  isPulsingSales.value = true;
  if (pulsingSalesTimer) clearTimeout(pulsingSalesTimer);
  pulsingSalesTimer = setTimeout(() => {
    isPulsingSales.value = false;
    pulsingSalesTimer = null;
  }, 600);
  historySalesAnimFrame = animateValue(from, newVal, 500, (v) => {
    animatedHistoryTotalSales.value = v;
  });
}, { immediate: true });

const motivationalText = computed(() => {
  const percentage = soldPercentage.value;
  if (percentage === 0) return "✌️ เริ่มต้นกันเลย!";
  if (percentage <= 20) return "✌️ เริ่มต้นกันเลย!";
  if (percentage <= 50) return "🔥 ไฟเริ่มติดแล้ว!";
  if (percentage <= 80) return "🚀 ยอดพุ่งมากแม่!";
  if (percentage < 100) return "💎 จะหมดแล้ว!";
  return "🎉 ปังปุริเย่ หมดเกลี้ยง!";
});

const progressBarColor = computed(() => {
  const percentage = soldPercentage.value;
  if (percentage <= 30)
    return "linear-gradient(90deg, #ff6b35 0%, #ff4500 100%)";
  if (percentage <= 60)
    return "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)";
  return "linear-gradient(90deg, #10b981 0%, #059669 100%)";
});

// Formatters
function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(val) {
   return new Intl.NumberFormat('th-TH').format(val);
}

// Scoped Owner count badge (👗 N ตัว)
const ownerItemCounts = computed(() => {
  const counts = {};
  const customersByName = Object.fromEntries(deliveryCustomers.value.map(c => [normalizeCustomerName(c.name), c]));
  Object.entries(selectedItem.value?.orders || {}).forEach(([id, item]) => {
    if (!item?.owner) return;
    const norm = normalizeCustomerName(item.owner);
    const customer = customersByName[norm];
    if (!isOutstandingBooking(customer?.sessions?.[selectedId.value], id, item)) return;
    if (norm) counts[norm] = (counts[norm] || 0) + 1;
  });
  return counts;
});

function getOwnerCount(ownerName, uid = null) {
  const norm = normalizeCustomerName(ownerName);
  const currentCount = (norm && ownerItemCounts.value[norm] !== undefined)
    ? ownerItemCounts.value[norm]
    : (ownerItemCounts.value[ownerName] || 0);
  const cust = deliveryCustomers.value.find(
    (c) => c.status !== "done" && ((uid && c.uid === uid) || (norm && normalizeCustomerName(c.name) === norm) || c.name === ownerName)
  );
  if (cust) {
    let pastCount = 0;
    if (cust.sessions) {
      Object.keys(cust.sessions).forEach((vid) => {
        if (vid !== selectedId.value) {
          const session = cust.sessions[vid];
          if (session && session.status !== "done") {
            pastCount += session.count || 0;
          }
        }
      });
    }
    return currentCount + pastCount;
  }
  return currentCount;
}

// Date parser helper
function extractDateFromTitle(title) {
  if (!title) return "";
  const dateRegex = /(\d{1,2})\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})?/i;
  const match = title.match(dateRegex);
  if (match) {
    const day = match[1];
    const month = match[2];
    const year = match[3] ? ` ${match[3]}` : "";
    return `${day} ${month}${year}`;
  }
  return title.length > 15 ? title.substring(0, 15) + "..." : title;
}

function getStockItem(num) {
  if (!selectedItem.value || !selectedItem.value.orders) return {};
  return selectedItem.value.orders[num] || {};
}

function getQueueLength(num) {
  const item = getStockItem(num);
  return item && item.queue ? item.queue.length : 0;
}

// Autocomplete filter logic
const filteredSuggestions = computed(() => {
  if (activeAutocompleteIdx.value === null) return [];
  const person = tempQueue.value[activeAutocompleteIdx.value];
  if (!person) return [];
  const query = (person.owner || "").trim().toLowerCase();
  if (!query) return customerNames.value.slice(0, 10);
  return customerNames.value
    .filter((name) => name.toLowerCase().includes(query) && name.toLowerCase() !== query)
    .slice(0, 10);
});

function onAutocompleteInput(index) {
  activeAutocompleteIdx.value = index;
  highlightedSuggestionIdx.value = -1;
}

function onAutocompleteFocus(index) {
  activeAutocompleteIdx.value = index;
  highlightedSuggestionIdx.value = -1;
}

function onAutocompleteBlur() {
  if (autocompleteTimer) clearTimeout(autocompleteTimer);
  autocompleteTimer = setTimeout(() => {
    activeAutocompleteIdx.value = null;
    highlightedSuggestionIdx.value = -1;
    autocompleteTimer = null;
  }, 150);
}

function selectSuggestion(name, index) {
  tempQueue.value[index].owner = name;
  activeAutocompleteIdx.value = null;
  highlightedSuggestionIdx.value = -1;
}

function scrollActiveSuggestionIntoView() {
  nextTick(() => {
    const el = document.querySelector(".autocomplete-dropdown .autocomplete-item.active");
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
}

function handleAutocompleteKeydown(event, index) {
  const suggestions = filteredSuggestions.value;
  if (suggestions.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedSuggestionIdx.value = Math.min(
      highlightedSuggestionIdx.value + 1,
      suggestions.length - 1,
    );
    scrollActiveSuggestionIntoView();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedSuggestionIdx.value = Math.max(highlightedSuggestionIdx.value - 1, 0);
    scrollActiveSuggestionIntoView();
  } else if (event.key === "Enter" && highlightedSuggestionIdx.value >= 0) {
    event.preventDefault();
    selectSuggestion(suggestions[highlightedSuggestionIdx.value], index);
  } else if (event.key === "Escape") {
    activeAutocompleteIdx.value = null;
    highlightedSuggestionIdx.value = -1;
  }
}

function highlightMatch(text, query) {
  if (!text) return "";
  const safeText = escapeHtml(text);
  if (!query) return safeText;
  const q = query.trim();
  if (!q) return safeText;
  const safeQuery = escapeHtml(q);
  const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safeText.replace(regex, '<span class="autocomplete-highlight">$1</span>');
}

function resolveHistoryCustomerUid(ownerName) {
  const norm = normalizeCustomerName(ownerName || "");
  if (norm) {
    for (const order of Object.values(selectedItem.value?.orders || {})) {
      if (order?.owner && order?.uid && normalizeCustomerName(order.owner) === norm) {
        return order.uid;
      }
    }
    const cust = (deliveryCustomers.value || []).find(
      (c) => c?.name && normalizeCustomerName(c.name) === norm && (c.uid || c.id)
    );
    if (cust) return cust.uid || cust.id;
  }
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Queue modal edits
function openQueueModal(num) {
  const item = getStockItem(num);
  editingId.value = num;
  editingPrice.value = item.price || 0;
  editingDetails.value = formatFullStockDetails(item);
  tempQueue.value = [];
  if (item.owner) {
    tempQueue.value.push({
      owner: item.owner,
      originalOwner: item.owner,
      uid: item.uid || resolveHistoryCustomerUid(item.owner),
      time: item.time || Date.now(),
      source: item.source || "manual",
      backdated: item.backdated || null,
    });
  }
  if (item.queue) {
    try {
      const q = typeof item.queue === 'string' ? JSON.parse(item.queue) : item.queue;
      if (Array.isArray(q)) {
        tempQueue.value.push(
          ...JSON.parse(JSON.stringify(q)).map((entry) => ({
            ...entry,
            originalOwner: entry?.owner || "",
          }))
        );
      }
    } catch (e) {
      console.error("Error parsing queue:", e);
    }
  }
  showQueueModal.value = true;
  nextTick(() => { if (priceInputRef.value) priceInputRef.value.focus(); });
}

function closeQueueModal() {
  showQueueModal.value = false;
}

function dragStart(index) {
  draggingIndex = index;
}

function drop(index) {
  if (draggingIndex === null || draggingIndex === index || draggingIndex < 0 || draggingIndex >= tempQueue.value.length) {
    draggingIndex = null;
    return;
  }
  const itemToMove = tempQueue.value[draggingIndex];
  if (!itemToMove) {
    draggingIndex = null;
    return;
  }
  tempQueue.value.splice(draggingIndex, 1);
  tempQueue.value.splice(index, 0, itemToMove);
  draggingIndex = null;
}

function removeQueueItem(index) {
  tempQueue.value.splice(index, 1);
}

function manualReserve() {
  tempQueue.value.push({
    owner: "",
    uid: "manual-" + Date.now(),
    time: Date.now(),
    source: "manual",
    backdated: true,
  });
  nextTick(() => {
    const newIndex = tempQueue.value.length - 1;
    const el = queueInputRefs.value[newIndex];
    if (el) el.focus();
  });
}

function clearItemData() {
  Swal.fire({
    title: 'ล้างข้อมูลรายการนี้?',
    text: 'ราคาและรายชื่อจะถูกล้างทั้งหมด',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#555',
    confirmButtonText: 'ล้างเลย',
    cancelButtonText: 'ยกเลิก',
    background: '#1e1e1e',
    color: '#fff',
  }).then((result) => {
    if (result.isConfirmed) {
      editingPrice.value = 0;
      editingDetails.value = "";
      tempQueue.value = [];
      Swal.fire({
        icon: 'success',
        title: 'ล้างแล้ว',
        text: 'กดบันทึกเพื่อยืนยัน',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        background: '#1e1e1e',
        color: '#fff',
      });
    }
  });
}

// Scoped recalculation of deliveries and history totals
async function updateDeliveryAndHistoryTotals(videoId) {
  if (!videoId) return;

  try {
    const [deliveryCustSnap, stockSnap] = await Promise.all([
      get(dbRef(db, "delivery_customers")),
      get(dbRef(db, `stock/${videoId}`))
    ]);

    const deliveryData = deliveryCustSnap.val() || {};
    const allStock = stockSnap.val() || {};

    const sessionCounts = {};
    let totalSales = 0;
    let totalItems = 0;

    Object.values(allStock).forEach((item) => {
      if (item && item.owner) {
        totalItems++;
        const p = parseInt(item.price, 10);
        const validPrice = isNaN(p) ? 0 : p;
        totalSales += validPrice;

        const normName = normalizeCustomerName(item.owner);
        const key = normName || item.uid || "unknown";
        if (!sessionCounts[key]) {
          sessionCounts[key] = {
            count: 0,
            totalPrice: 0,
            uid: item.uid || "",
            name: item.owner,
          };
        }
        sessionCounts[key].count++;
        sessionCounts[key].totalPrice += validPrice;
        if (item.uid && !isProxyUid(item.uid) && (!sessionCounts[key].uid || isProxyUid(sessionCounts[key].uid))) {
          sessionCounts[key].uid = item.uid;
        }
      }
    });

    // Reuse the same transaction as live bookings; retain shipped-item identities.
    const owners = new Map(Object.values(sessionCounts).map(stats => [normalizeCustomerName(stats.name), stats]));
    Object.entries(deliveryData).forEach(([uid, customer]) => {
      if (customer.sessions?.[videoId] && !owners.has(normalizeCustomerName(customer.name))) {
        owners.set(normalizeCustomerName(customer.name), { name: customer.name, uid });
      }
    });
    await Promise.all(Array.from(owners.values(), ({ name, uid }) =>
      syncDeliveryCustomerForOwner(name, uid, videoId, allStock)));
    const multiPathUpdates = {};
    multiPathUpdates[`history/${videoId}/totalSales`] = totalSales;
    multiPathUpdates[`history/${videoId}/totalItems`] = totalItems;
    multiPathUpdates[`history/${videoId}/lastUpdated`] = Date.now();

    // Sales history remains a single multi-path write.
    if (Object.keys(multiPathUpdates).length > 0) {
      await update(dbRef(db), multiPathUpdates);
    }
    if (selectedItem.value && selectedId.value === videoId) {
      selectedItem.value.totalSales = totalSales;
    }
  } catch (err) {
    console.error("Error in updateDeliveryAndHistoryTotals:", err);
  }
}

// Save Queue Changes Scoped
async function saveQueueChanges(preventClose = false) {
  if (!selectedId.value || !editingId.value) return;
  const num = editingId.value;
  const videoId = selectedId.value;

  const currentDbItem = getStockItem(num);
  const newOwnerName = tempQueue.value.length > 0 ? tempQueue.value[0].owner : null;

  const validQueue = tempQueue.value
    .map((entry) => {
      const trimmedOwner = typeof entry?.owner === "string" ? entry.owner.trim() : "";
      const origNorm = normalizeCustomerName(entry?.originalOwner || "");
      const newNorm = normalizeCustomerName(trimmedOwner);
      const isDifferentCustomer = Boolean(origNorm && newNorm && origNorm !== newNorm);
      const { originalOwner, ...cleanEntry } = entry || {};
      return {
        ...cleanEntry,
        owner: trimmedOwner,
        uid: isDifferentCustomer
          ? resolveHistoryCustomerUid(trimmedOwner)
          : (cleanEntry.uid || resolveHistoryCustomerUid(trimmedOwner)),
        _ownerChanged: isDifferentCustomer,
      };
    })
    .filter((entry) => entry.owner.length > 0);

  const cleanPrice = Number(editingPrice.value) || 0;
  const cleanDetails = typeof editingDetails.value === "string" ? editingDetails.value.trim() : "";

  let newData = null;
  if (validQueue.length > 0) {
    const first = validQueue[0];
    const rest = validQueue.slice(1).map(({ _ownerChanged, ...r }) => r);
    const ownerWasReplaced =
      first._ownerChanged ||
      (!currentDbItem.owner && Boolean(first.owner));

    newData = {
      owner: first.owner,
      uid: first.uid || resolveHistoryCustomerUid(first.owner),
      time: ownerWasReplaced ? Date.now() : (first.time || Date.now()),
      source: first.source || "manual-edit",
      price: cleanPrice > 0 ? cleanPrice : null,
      details: cleanDetails || null,
      size: null,
      queue: rest,
      backdated: ownerWasReplaced ? true : (first.backdated || null),
    };
  }

  if (newData) {
    await history.updateHistoryItem(videoId, num, newData);
  } else {
    const preserved = {};
    if (cleanPrice > 0) preserved.price = cleanPrice;
    if (cleanDetails) preserved.details = cleanDetails;
    if (Object.keys(preserved).length > 0) {
      // Atomic single write: clears owner/uid/queue/size while preserving price & details with zero flash
      await set(dbRef(db, `stock/${videoId}/${num}`), preserved);
    } else {
      await history.updateHistoryItem(videoId, num, null);
    }
  }

  await updateDeliveryAndHistoryTotals(videoId);

  if (preventClose === true) {
    return;
  }

  closeQueueModal();
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
  });
}

// Scoped transaction cancel
async function processHistoryCancel(num, uid = null, ownerName = null) {
  if (!selectedId.value) return;
  const videoId = selectedId.value;
  const itemRef = dbRef(db, `stock/${videoId}/${num}`);

  try {
    await runTransaction(itemRef, (currentData) => {
      if (!currentData) return null;

      const isOwner =
        (!uid && !ownerName) ||
        (uid && currentData.uid === uid) ||
        (ownerName && currentData.owner === ownerName);

      if (isOwner) {
        if (currentData.queue && currentData.queue.length > 0) {
          const next = currentData.queue[0];
          const nextQ = currentData.queue.slice(1);

          return {
            ...currentData,
            owner: next.owner,
            uid: next.uid,
            time: Date.now(),
            queue: nextQ,
            source: "queue",
            backdated: next.backdated || null,
          };
        } else {
          const preservedPrice = Number(currentData.price);
          const hasPrice = !isNaN(preservedPrice) && preservedPrice > 0;
          const preservedDetails =
            typeof currentData.details === "string" && currentData.details.trim()
              ? currentData.details.trim()
              : "";
          if (hasPrice || preservedDetails) {
            const kept = {};
            if (hasPrice) kept.price = preservedPrice;
            if (preservedDetails) kept.details = preservedDetails;
            return kept;
          }
          return null;
        }
      } else {
        if (currentData.queue && currentData.queue.length > 0) {
          currentData.queue = currentData.queue.filter((q) => {
            const matchesUid = uid && q.uid === uid;
            const matchesName = ownerName && q.owner === ownerName;
            return !(matchesUid || matchesName);
          });
        }
        return currentData;
      }
    });

    await updateDeliveryAndHistoryTotals(videoId);

    Swal.fire({
      icon: "success",
      title: "ยกเลิกรายการเรียบร้อย",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500
    });

  } catch (e) {
    console.error("History cancel failed: ", e);
  }
}

// Scoped navigation and global keys
const localStockSize = ref(70);

watch(
  () => selectedItem.value?.stockSize,
  (newVal) => {
    if (newVal && newVal !== localStockSize.value) {
      localStockSize.value = newVal;
    }
  },
  { immediate: true }
);

async function saveStockSize() {
  if (!selectedId.value) return;
  const newSize = parseInt(localStockSize.value);

  if (!newSize || newSize < 1) {
    Swal.fire({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "จำนวนรายการต้องมากกว่า 0",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });
    return;
  }

  const sizeRef = dbRef(db, `settings/${selectedId.value}/stockSize`);
  await set(sizeRef, newSize);

  await updateDeliveryAndHistoryTotals(selectedId.value);

  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    text: `จำนวนรายการ: ${newSize}`,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
  });
}

async function saveAndNavigate(direction) {
  await saveQueueChanges(true);

  const size = selectedItem.value?.stockSize || 70;
  let nextId = editingId.value;
  if (direction === 'prev') {
    nextId = Math.max(1, nextId - 1);
  } else if (direction === 'next') {
    nextId = Math.min(size, nextId + 1);
  }

  if (nextId !== editingId.value) {
    if (activeAutocompleteIdx.value !== null) {
      activeAutocompleteIdx.value = null;
    }
    openQueueModal(nextId);
  } else {
    closeQueueModal();
  }
}

function handleGlobalKeydown(e) {
  if (!showQueueModal.value) return;

  if (e.key === 'ArrowLeft') {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    e.preventDefault();
    saveAndNavigate('prev');
  } else if (e.key === 'ArrowRight') {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    e.preventDefault();
    saveAndNavigate('next');
  }
}

// Clear Board for historical session
function confirmClearHistoryStock() {
  if (!selectedId.value) return;
  Swal.fire({
    title: "ล้างกระดาน?",
    text: "ข้อมูลของประวัตินี้จะหายหมดนะ!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ล้างเลย",
    cancelButtonText: "ยกเลิก",
    background: '#1e293b',
    color: '#fff'
  }).then(async (r) => {
    if (r.isConfirmed) {
      const stockRef = dbRef(db, `stock/${selectedId.value}`);
      await remove(stockRef);

      await updateDeliveryAndHistoryTotals(selectedId.value);
      
      Swal.fire("ล้างเรียบร้อย", "ล้างข้อมูลกระดานสำเร็จแล้ว", "success");
    }
  });
}

// Scoped Customer Total Purchases modal
watch(
  [() => selectedItem.value?.orders, () => deliveryCustomers.value],
  () => {
    if (activeOwnerName.value) {
      updateOwnerItemsModal();
    }
  },
  { deep: true }
);

function updateOwnerItemsModal() {
  if (!activeOwnerName.value || !Swal.isVisible()) return;

  const ownerName = activeOwnerName.value;
  const videoId = selectedId.value;

  const customer = deliveryCustomers.value.find(c => normalizeCustomerName(c.name) === normalizeCustomerName(ownerName));
  const currentItems = [];
  if (selectedItem.value && selectedItem.value.orders) {
    Object.keys(selectedItem.value.orders).forEach((num) => {
      const item = selectedItem.value.orders[num];
      if (item.owner === ownerName && isOutstandingBooking(customer?.sessions?.[videoId], num, item)) {
        currentItems.push({
          num: parseInt(num),
          price: item.price || 0,
          time: item.time || 0,
          backdated: !!item.backdated,
          videoId: videoId,
          isToday: true,
          title: extractDateFromTitle(selectedItem.value.title)
        });
      }
    });
  }

  const allItems = [...currentItems, ...pastItems.value];

  allItems.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.videoId === b.videoId) {
      return a.num - b.num;
    }
    return b.time - a.time;
  });

  const totalPrice = allItems.reduce((sum, i) => sum + (parseInt(i.price) || 0), 0);

  const itemsHtml = allItems.map((item) => {
    const priceText = item.price ? `${parseInt(item.price).toLocaleString()}` : '';
    const timeText = item.time
      ? (item.backdated
          ? `<span style="color:#fbbf24; font-weight:600;"><i class="fa-solid fa-clock-rotate-left"></i> ย้อนหลัง • ${escapeHtml(formatBackdatedDetail(item.time))}</span>`
          : `<span style="color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${escapeHtml(formatNormalBookingTime(item.time))}</span>`)
      : '';
    const removeDetail = escapeHtml(`${item.num}|${item.videoId}`);

    return `<div style="display:flex; align-items:center; gap:10px; padding:10px 12px; margin:4px 0; background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius:10px; border:1px solid #2a2a4a; transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#2a2a4a'">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:linear-gradient(135deg, #0ea5e9, #2563eb); color:#fff; font-weight:700; padding:2px 10px; border-radius:20px; font-size:0.85em; white-space:nowrap;">#${item.num}</span>
          <span style="background:rgba(255, 255, 255, 0.08); color:#cbd5e1; border:1px solid rgba(255, 255, 255, 0.15); font-weight:500; padding:2px 8px; border-radius:20px; font-size:0.8em; white-space:nowrap;">${escapeHtml(item.title)}</span>
          ${priceText ? `<span style="color:#fbbf24; font-weight:600; font-size:0.85em;">💰 ${priceText} ฿</span>` : ''}
        </div>
        ${timeText ? `<div style="font-size:0.75em; margin-top:4px; padding-left:2px;">${timeText}</div>` : ''}
      </div>
      <button type="button" data-remove-owner-history="${removeDetail}"
              style="background:linear-gradient(135deg, #dc2626, #b91c1c); color:white; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:0.8em; font-weight:600; flex-shrink:0; transition:transform 0.2s, box-shadow 0.2s; box-shadow:0 2px 6px rgba(220,38,38,0.3);">
        <i class="fa-solid fa-trash-can"></i> ลบ
      </button>
    </div>`;
  }).join('');

  Swal.update({
    html: `<div style="text-align:left;">
      <div style="display:flex; justify-content:center; gap:16px; margin-bottom:12px;">
        <div style="text-align:center; background:#1a1a2e; padding:8px 16px; border-radius:10px; border:1px solid #2a2a4a;">
          <div style="font-size:1.4em; font-weight:700; color:#38bdf8;">${allItems.length}</div>
          <div style="font-size:0.7em; color:#9ca3af;">รายการ</div>
        </div>
        <div style="text-align:center; background:#1a1a2e; padding:8px 16px; border-radius:10px; border:1px solid #2a2a4a;">
          <div style="font-size:1.4em; font-weight:700; color:#fbbf24;">฿${totalPrice.toLocaleString()}</div>
          <div style="font-size:0.7em; color:#9ca3af;">ราคารวม</div>
        </div>
      </div>
      <div style="max-height:280px; overflow-y:auto; padding-right:4px;">
        ${itemsHtml}
      </div>
    </div>`
  });
}

async function showOwnerItems(ownerName) {
  let uid = null;
  if (selectedItem.value && selectedItem.value.orders) {
    Object.values(selectedItem.value.orders).forEach((item) => {
      if (item.owner === ownerName && item.uid) {
        uid = item.uid;
      }
    });
  }

  const cust = deliveryCustomers.value.find(
    (c) => (uid && c.uid === uid) || c.name === ownerName
  );

  const videoId = selectedId.value;
  const pastPendingVids = [];
  if (cust && cust.sessions) {
    Object.keys(cust.sessions).forEach((vid) => {
      if (vid !== videoId && cust.sessions[vid].status !== "done") {
        pastPendingVids.push(vid);
      }
    });
  }

  if (cleanupHistoryOwnerModal) {
    cleanupHistoryOwnerModal();
    cleanupHistoryOwnerModal = null;
  }

  activeOwnerName.value = ownerName;
  pastItems.value = [];

  let localCleanup = null;

  Swal.fire({
    titleText: `👗 ${ownerName}`,
    html: `<div style="text-align:center; padding:30px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:#0ea5e9;"></i><div style="margin-top:10px; font-size:0.9em; color:#9ca3af;">กำลังโหลดข้อมูล...</div></div>`,
    background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
    color: '#fff',
    showConfirmButton: true,
    confirmButtonText: '<i class="fa-solid fa-xmark"></i> ปิด',
    confirmButtonColor: '#374151',
    showCloseButton: true,
    width: 420,
    willClose: () => {
      if (localCleanup) localCleanup();
    },
    didOpen: () => {
      const handler = async (detailStr) => {
        const [numStr, vid] = String(detailStr || '').split('|');
        const num = parseInt(numStr);
        if (!Number.isFinite(num) || !vid) return;
        const isCurrentSession = vid === videoId;

        const result = await Swal.fire({
          titleText: `ลบ #${num} ของ ${ownerName}?`,
          text: !isCurrentSession
            ? `ยกเลิกรายการจองนี้จากรอบส่งย้อนหลัง (หากมีคิวสำรองจะเลื่อนขึ้นมาแทน)`
            : `ยกเลิกรายการจองนี้ของลูกค้า (หากมีคิวสำรองจะเลื่อนขึ้นมาแทน)`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ลบเลย',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#d32f2f',
          background: '#1e1e1e',
          color: '#fff',
        });

        if (result.isConfirmed) {
          if (isCurrentSession) {
            await processHistoryCancel(num, uid, ownerName);
          } else {
            const pastItemRef = dbRef(db, `stock/${vid}/${num}`);
            await runTransaction(pastItemRef, (currentData) => {
              if (!currentData || !currentData.owner) return currentData;

              const isOwnerMatch =
                (!uid && !ownerName) ||
                (uid && currentData.uid === uid) ||
                (ownerName && normalizeCustomerName(currentData.owner) === normalizeCustomerName(ownerName));

              if (isOwnerMatch) {
                if (currentData.queue && currentData.queue.length > 0) {
                  const next = currentData.queue[0];
                  const nextQ = currentData.queue.slice(1);
                  return {
                    ...currentData,
                    owner: next.owner,
                    uid: next.uid,
                    time: Date.now(),
                    queue: nextQ,
                    source: "queue",
                    backdated: next.backdated || null,
                  };
                } else {
                  const preservedPrice = Number(currentData.price);
                  const hasPrice = !isNaN(preservedPrice) && preservedPrice > 0;
                  const preservedDetails =
                    typeof currentData.details === "string" && currentData.details.trim()
                      ? currentData.details.trim()
                      : "";
                  if (hasPrice || preservedDetails) {
                    const kept = {};
                    if (hasPrice) kept.price = preservedPrice;
                    if (preservedDetails) kept.details = preservedDetails;
                    return kept;
                  }
                  return null;
                }
              }
              return currentData;
            });

            await updateDeliveryAndHistoryTotals(vid);

            pastItems.value = pastItems.value.filter((i) => !(i.num === num && i.videoId === vid));
          }

          const remainingCurrentCount =
            selectedItem.value && selectedItem.value.orders
              ? Object.values(selectedItem.value.orders).filter((item) => item && item.owner === ownerName).length
              : 0;
          if (remainingCurrentCount + pastItems.value.length > 0) {
            await showOwnerItems(ownerName);
          } else {
            Swal.fire({
              icon: 'success',
              title: `ลบ #${num} เรียบร้อย`,
              toast: true,
              position: 'top-end',
              timer: 1500,
              showConfirmButton: false,
            });
          }
        } else {
          await showOwnerItems(ownerName);
        }
      };

      const htmlContainer = Swal.getHtmlContainer();
      const delegatedClick = (e) => {
        const btn = e.target?.closest?.('[data-remove-owner-history]');
        if (btn) {
          handler(btn.getAttribute('data-remove-owner-history'));
        }
      };
      if (htmlContainer) {
        htmlContainer.addEventListener('click', delegatedClick);
      }

      const swalEl = Swal.getPopup();
      let observer = null;
      let observerTimeout = null;
      let cleaned = false;

      localCleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (htmlContainer) {
          htmlContainer.removeEventListener('click', delegatedClick);
        }
        if (activeOwnerName.value === ownerName) {
          activeOwnerName.value = null;
        }
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (observerTimeout) {
          clearTimeout(observerTimeout);
          observerTimeout = null;
        }
        if (cleanupHistoryOwnerModal === localCleanup) {
          cleanupHistoryOwnerModal = null;
        }
      };
      cleanupHistoryOwnerModal = localCleanup;

      observer = new MutationObserver(() => {
        if (!document.contains(swalEl)) {
          localCleanup();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      observerTimeout = setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }, 60000);
    },
  });

  updateOwnerItemsModal();

  if (pastPendingVids.length > 0) {
    try {
      const fetchedPastItems = [];
      const promises = pastPendingVids.map(async (vid) => {
        const [stockSnap, historySnap] = await Promise.all([
          get(dbRef(db, `stock/${vid}`)),
          get(dbRef(db, `history/${vid}`))
        ]);
        const stockData = stockSnap.val() || {};
        const historyData = historySnap.val() || {};
        const title = historyData.title || vid;
        const cleanTitle = extractDateFromTitle(title);

        Object.keys(stockData).forEach((num) => {
          const item = stockData[num];
          if ((item.owner === ownerName || (item.uid && cust.uid && item.uid === cust.uid)) && isOutstandingBooking(cust.sessions?.[vid], num, item)) {
            fetchedPastItems.push({
              num: parseInt(num),
              price: item.price || 0,
              time: item.time || 0,
              videoId: vid,
              isToday: false,
              title: cleanTitle
            });
          }
        });
      });

      await Promise.all(promises);
      if (activeOwnerName.value !== ownerName) return;
      pastItems.value = fetchedPastItems;
      updateOwnerItemsModal();
    } catch (e) {
      console.error("Error fetching past session items:", e);
    }
  }
}

// Actions
async function handleDelete() {
  const result = await Swal.fire({
    title: "ยืนยันการลบ?",
    text: `ต้องการลบประวัติ "${selectedItem.value.title}" และแชททั้งหมด?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ลบข้อมูล",
    cancelButtonText: "ยกเลิก"
  });

  if (result.isConfirmed) {
     cleanupSessionListeners();
     await history.deleteHistory(selectedId.value);
     selectedId.value = null;
     selectedItem.value = null;
     Swal.fire("เรียบร้อย", "ลบข้อมูลสำเร็จแล้ว", "success");
  }
}

function exportCSV() {
  if (filteredOrders.value.length === 0) {
     Swal.fire("ไม่มีข้อมูล", "ไม่พบรายการสั่งซื้อ", "warning");
     return;
  }

  let csvContent = "\uFEFFDate,Time,Stock ID,Customer Name,Price,Source,Details\n";
  const dateStr = formatDate(selectedItem.value.timestamp).split(' ')[0];

  filteredOrders.value.forEach(order => {
     const timeStr = formatTime(order.timestamp);
     const safeName = order.owner ? order.owner.replace(/"/g, '""') : "";
     const safeDetails = formatFullStockDetails(order).replace(/"/g, '""');
     
     csvContent += `"${dateStr}","${timeStr}",${order.stockId},"${safeName}",${order.price || 0},"${order.method || 'unknown'}","${safeDetails}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `sales_history_${selectedId.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function fixHistoryData() {
    const result = await Swal.fire({
        title: "คำนวณยอดใหม่?",
        text: "ระบบจะสแกนรายการทั้งหมดและคำนวณยอดขายใหม่ (อาจใช้เวลาสักครู่)",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "เริ่มคำนวณ",
        cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
        await history.recalculateAllHistory();
        Swal.fire("เสร็จสิ้น", "คำนวณยอดขายทั้งหมดใหม่เรียบร้อยแล้ว", "success");
    }
}

async function openCleanupModal() {
  Swal.fire({
    title: "กำลังประเมินขนาดข้อมูล...",
    html: "ระบบกำลังคำนวณขนาดข้อมูลย้อนหลังเกิน 3 เดือน กรุณารอสักครู่",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const preview = await history.getCleanupPreview();
    Swal.close();

    if (preview.olderLivesCount === 0) {
      Swal.fire({
        title: "ไม่มีประวัติเก่า",
        text: "ไม่พบข้อมูลประวัติย้อนหลังเกิน 3 เดือนให้ลบ",
        icon: "info",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#3b82f6",
        background: '#0f172a',
        color: '#fff'
      });
      return;
    }

    const sizeInMB = preview.estimatedSizeInBytes / (1024 * 1024);
    const sizeText = sizeInMB >= 1 
      ? `${sizeInMB.toFixed(2)} MB` 
      : `${(preview.estimatedSizeInBytes / 1024).toFixed(2)} KB`;

    const livesListHtml = preview.olderLives.map(live => {
      const dateStr = formatDate(live.timestamp);
      return `<li style="text-align: left; padding: 6px 8px; border-bottom: 1px solid #334155; font-size: 0.9em; display: flex; justify-content: space-between;">
        <span style="color: #cbd5e1;">${escapeHtml(live.title || 'ไม่มีชื่อไลฟ์')}</span>
        <span style="color: #f87171; font-weight: bold; font-family: monospace;">[${escapeHtml(dateStr.split(' ')[0])}]</span>
      </li>`;
    }).slice(0, 8).join('') + (preview.olderLivesCount > 8 ? `<li style="text-align: center; padding-top: 8px; color: #94a3b8; font-style: italic;">...และอีก ${preview.olderLivesCount - 8} ไลฟ์</li>` : '');

    const confirmHtml = `
      <div style="font-size: 0.95rem; text-align: left; line-height: 1.5;">
        <div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px; color: #fca5a5;">
          <strong>พบประวัติย้อนหลังทั้งหมด:</strong> ${preview.totalLives} ไลฟ์<br>
          <strong>เกิน 3 เดือนย้อนหลัง:</strong> ${preview.olderLivesCount} ไลฟ์<br>
          <strong>พื้นที่ฐานข้อมูลโดยประมาณที่จะได้รับคืน:</strong> <span style="font-weight: bold; color: #ef4444;">${sizeText}</span>
        </div>
        <div style="font-weight: bold; margin-bottom: 8px; color: #e2e8f0;">รายชื่อไลฟ์สดที่จะถูกลบ:</div>
        <ul style="max-height: 150px; overflow-y: auto; padding-left: 0; margin: 0 0 15px 0; background: #0f172a; border-radius: 6px; border: 1px solid #334155; list-style-type: none;">
          ${livesListHtml}
        </ul>
        <div style="color: #f87171; font-weight: bold; text-align: center;">
          ⚠️ คำเตือน: ประวัติการขาย รายการจองสต็อก และแชทสดทั้งหมดของไลฟ์เหล่านี้จะถูกลบถาวร ไม่สามารถกู้คืนได้!
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: "ล้างประวัติย้อนหลัง?",
      html: confirmHtml,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#475569",
      confirmButtonText: `ยืนยันการลบ ${preview.olderLivesCount} ไลฟ์`,
      cancelButtonText: "ยกเลิก",
      background: '#1e293b',
      color: '#fff',
      width: 500
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "กำลังลบข้อมูล...",
        html: "กรุณารอระบบเคลียร์ข้อมูลสักครู่",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const videoIdsToDelete = preview.olderLives.map(live => live.videoId);
      await history.deleteMultipleHistory(videoIdsToDelete);
      
      if (selectedId.value && videoIdsToDelete.includes(selectedId.value)) {
        cleanupSessionListeners();
        selectedId.value = null;
        selectedItem.value = null;
      }

      Swal.fire({
        title: "ลบสำเร็จแล้ว!",
        text: `ทำการเคลียร์พื้นที่ฐานข้อมูลเรียบร้อย คืนพื้นที่ประมาณ ${sizeText}`,
        icon: "success",
        confirmButtonColor: "#10b981",
        background: '#0f172a',
        color: '#fff'
      });
    }
  } catch (error) {
    console.error("Cleanup error:", error);
    Swal.fire({
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถคำนวณหรือลบข้อมูลได้ในขณะนี้",
      icon: "error",
      confirmButtonColor: "#ef4444",
      background: '#0f172a',
      color: '#fff'
    });
  }
}
</script>

<style scoped>
.history-modal-container {
  background: rgba(11, 15, 23, 0.98);
  width: 96vw;
  max-width: 1320px;
  height: 90vh;
  border-radius: 20px;
  border: 1px solid rgba(229, 184, 105, 0.24);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 32px 100px rgba(0, 0, 0, 0.82),
    0 0 40px rgba(229, 184, 105, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.modal-header {
  padding: 13px 20px;
  background: linear-gradient(180deg, rgba(16, 22, 38, 0.96), rgba(11, 15, 23, 0.96));
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.modal-header-left,
.modal-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-mobile-sidebar,
.btn-mobile-inline-menu,
.btn-mobile-pick {
  display: none;
}

.btn-open-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.32);
  color: #7dd3fc;
  text-decoration: none;
  font-size: 0.84em;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-open-tab:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #ffffff;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.18rem;
  color: #f3cf7a;
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
}

.btn-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 1.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-close:hover {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.45);
  color: #ffffff;
}

.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.mobile-sidebar-backdrop {
  display: none;
}

/* Sidebar */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: rgba(13, 18, 30, 0.96);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  color: #cbd5e1;
  font-size: 0.88em;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-title-group {
  display: flex;
  align-items: center;
  gap: 7px;
}

.sidebar-count-pill {
  font-size: 0.78em;
  font-weight: 700;
  color: #f3cf7a;
  background: rgba(229, 184, 105, 0.14);
  border: 1px solid rgba(229, 184, 105, 0.28);
  padding: 1px 7px;
  border-radius: 999px;
}

.sidebar-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sidebar-state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 16px;
  color: #64748b;
  font-size: 0.88em;
  text-align: center;
}

.sidebar-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 10px;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.sidebar-search-icon {
  position: absolute;
  left: 20px;
  color: #64748b;
  font-size: 0.8em;
  pointer-events: none;
}

.sidebar-search-input {
  width: 100%;
  padding: 7px 28px 7px 30px;
  background: rgba(30, 41, 59, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  color: #f8fafc;
  font-size: 0.84em;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.sidebar-search-input:focus {
  border-color: rgba(229, 184, 105, 0.6);
  background: rgba(15, 23, 42, 0.95);
  box-shadow: 0 0 0 2px rgba(229, 184, 105, 0.16);
}

.sidebar-search-clear {
  position: absolute;
  right: 16px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.85em;
  padding: 2px 4px;
}

.sidebar-search-clear:hover {
  color: #ffffff;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.sidebar-item {
  padding: 11px 12px;
  margin: 5px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.18s ease;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(229, 184, 105, 0.28);
  transform: translateX(2px);
}

.sidebar-item.active {
  background: linear-gradient(135deg, rgba(229, 184, 105, 0.18) 0%, rgba(180, 130, 50, 0.08) 100%);
  border: 1.5px solid rgba(243, 207, 122, 0.72);
  box-shadow: 0 4px 16px rgba(229, 184, 105, 0.14);
}

.sidebar-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 5px;
}

.item-date-chip {
  color: #94a3b8;
  font-size: 0.75em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.item-sold-chip {
  font-size: 0.72em;
  font-weight: 700;
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.26);
  padding: 1px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.item-title {
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.9em;
  line-height: 1.38;
  margin-bottom: 7px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.item-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.item-meta-label {
  color: #64748b;
  font-size: 0.76em;
  font-weight: 500;
}

.item-meta-value {
  color: #fde047;
  font-size: 0.94em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.sidebar-item.active .item-title { color: #ffffff; }
.sidebar-item.active .item-date-chip { color: #fde68a; }
.sidebar-item.active .item-meta-label { color: #cbd5e1; }
.sidebar-item.active .item-meta-value { color: #fef08a; }

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0b101b;
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.empty-state-card {
  max-width: 390px;
  text-align: center;
  padding: 32px 28px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.empty-state-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: rgba(229, 184, 105, 0.14);
  border: 1px solid rgba(229, 184, 105, 0.32);
  color: #f3cf7a;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-card h3 {
  margin: 0 0 8px;
  font-size: 1.12rem;
  color: #f8fafc;
}

.empty-state-card p {
  margin: 0 0 18px;
  color: #94a3b8;
  font-size: 0.9em;
  line-height: 1.55;
}

.empty-state-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-open-latest {
  background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
  color: #0b0f17;
  font-weight: 800;
  border-radius: 10px;
  padding: 9px 18px;
}

.btn-open-latest:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.stats-bar-header {
  position: relative;
  padding: 12px 18px 13px;
  background: linear-gradient(180deg, rgba(18, 25, 42, 0.96) 0%, rgba(14, 20, 34, 0.96) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.history-live-title-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.history-live-title-left {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  flex: 1;
}

.history-title-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.history-title-submeta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.history-live-dot {
  color: #f3cf7a;
  font-size: 0.92em;
  margin-top: 3px;
  line-height: 1;
  flex-shrink: 0;
}

.history-live-title-text {
  color: #f8fafc;
  font-size: 1.02em;
  font-weight: 700;
  line-height: 1.32;
  word-break: break-word;
  user-select: text;
  -webkit-user-select: text;
}

.history-live-title-edit {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.history-title-edit-input {
  flex: 1;
  min-width: 140px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #0b101b;
  border: 1px solid #38bdf8;
  color: #ffffff;
  font-size: 0.92em;
  font-weight: 600;
  outline: none;
}

.btn-title-save {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  font-size: 0.82em;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.btn-title-save:hover {
  background: rgba(16, 185, 129, 0.35);
  color: #ffffff;
}

.btn-title-cancel {
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.7);
  color: #cbd5e1;
  font-size: 0.82em;
  cursor: pointer;
}

.history-title-date {
  color: #94a3b8;
  font-size: 0.78em;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.history-title-vid {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.73em;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1px 6px;
  border-radius: 6px;
}

.history-loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  color: #94a3b8;
  font-size: 0.9em;
}

.header-kpi-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.kpi-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  font-size: 0.86em;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
}

.kpi-clickable {
  cursor: pointer;
  transition: all 0.18s ease;
}

.kpi-clickable:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(229, 184, 105, 0.35);
}

.kpi-clickable.kpi-active {
  background: rgba(229, 184, 105, 0.16);
  border-color: rgba(243, 207, 122, 0.7);
}

.kpi-label {
  color: #94a3b8;
  font-size: 0.88em;
  font-weight: 500;
}

.kpi-total {
  color: #64748b;
  font-size: 0.88em;
}

.kpi-vacant-val {
  color: #7dd3fc;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.kpi-stock-size input.edit-input {
  width: 54px;
  text-align: center;
  font-size: 0.95em;
  font-weight: 700;
  background: #0b101b;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #ffffff;
  border-radius: 6px;
  padding: 2px 5px;
  outline: none;
}

.kpi-stock-size input.edit-input:focus {
  border-color: #38bdf8;
}

.btn-title-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(30, 41, 59, 0.85);
  color: #cbd5e1;
  font-size: 0.78em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-title-icon:hover:not(:disabled) {
  border-color: #fbbf24;
  color: #fde047;
  background: rgba(251, 191, 36, 0.14);
}

.btn-title-icon:disabled {
  opacity: 0.6;
  cursor: wait;
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.header-main-row::-webkit-scrollbar { display: none; }
.header-main-row { -ms-overflow-style: none; scrollbar-width: none; }

.stock-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
  white-space: nowrap;
}

.stock-input-group input.edit-input {
  background: #0f172a;
  border: 1px solid #334155;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
}

.stat-sold {
  color: #00e676;
  font-size: 1.3em;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(0, 230, 118, 0.3);
  margin: 0 2px;
  font-variant-numeric: tabular-nums;
}

.stock-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
  font-weight: 600;
  color: #cbd5e1;
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-label {
  color: #888;
  font-size: 0.85em;
  white-space: nowrap;
}

/* Animated Percentage Badge */
.sale-percent-badge {
  font-size: 0.9em;
  font-weight: 800;
  padding: 1px 8px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  transition: color 0.4s ease, background 0.4s ease, box-shadow 0.4s ease;
}

.sale-percent-badge.pct-low {
  color: #9ca3af;
  background: rgba(156, 163, 175, 0.12);
}

.sale-percent-badge.pct-medium {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.2);
}

.sale-percent-badge.pct-high {
  color: #fb923c;
  background: rgba(251, 146, 60, 0.15);
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.3);
}

.sale-percent-badge.pct-complete {
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}

.sale-percent-badge.pulse {
  animation: pulse-badge 0.5s ease-out;
}

@keyframes pulse-badge {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

/* Edge Progress Bar */
.mini-progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 0;
  transition: width 0.6s ease-out, background 0.6s ease-out;
  position: relative;
  overflow: hidden;
}

.mini-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.45) 50%,
    transparent 100%
  );
  transform: translate3d(-100%, 0, 0);
  animation: mini-shimmer-slide 3.2s linear infinite;
  will-change: transform;
}

@keyframes mini-shimmer-slide {
  0% { transform: translate3d(-100%, 0, 0); }
  100% { transform: translate3d(100%, 0, 0); }
}

/* 💰 Total Sales Badge */
.total-sales-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.88em;
  font-weight: 700;
  padding: 1px 9px;
  border-radius: 20px;
  background: rgba(180, 83, 9, 0.35);
  border: 1px solid rgba(251, 191, 36, 0.55);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35), 0 0 8px rgba(251, 191, 36, 0.18);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
  cursor: default;
  user-select: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.total-sales-badge:hover {
  background: rgba(217, 119, 6, 0.45);
  border-color: #fde047;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
  transform: translateY(-1px);
}

.total-sales-badge.pulse {
  animation: pulse-sales 0.5s ease-out;
}

@keyframes pulse-sales {
  0% { transform: scale(1); }
  40% { transform: scale(1.12); box-shadow: 0 0 14px rgba(251, 191, 36, 0.6); }
  100% { transform: scale(1); }
}

.total-sales-badge .sales-label {
  color: #fef08a;
  font-size: 0.82em;
  font-weight: 600;
  opacity: 0.9;
}

.total-sales-badge .sales-amount {
  color: #fde047;
  font-weight: 800;
  text-shadow: 0 0 8px rgba(253, 224, 71, 0.35);
}

.motivational-badge {
  font-size: 0.8em;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.header-actions-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 2px;
}

.btn-hist-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 9px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
  color: #ffffff;
  font-size: 0.84em;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.btn-hist-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.btn-hist-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid rgba(16, 185, 129, 0.38);
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
  font-size: 0.84em;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.btn-hist-secondary:hover {
  background: rgba(16, 185, 129, 0.25);
  color: #ffffff;
}

.btn-hist-ghost-warn,
.btn-hist-ghost-danger {
  width: 33px;
  height: 33px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-hist-ghost-warn:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.5);
  color: #fcd34d;
}

.btn-hist-ghost-danger:hover {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.55);
  color: #fca5a5;
}

.controls-bar {
  padding: 10px 18px;
  background: rgba(13, 18, 30, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  min-width: 210px;
  max-width: 340px;
  flex: 1;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 30px 8px 34px;
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  color: #f8fafc;
  font-family: inherit;
  font-size: 0.88em;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input:focus {
  border-color: rgba(229, 184, 105, 0.6);
  box-shadow: 0 0 0 2px rgba(229, 184, 105, 0.15);
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 0.86em;
  pointer-events: none;
}

.search-clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 5px;
  font-size: 0.85em;
}

.search-clear-btn:hover {
  color: #ffffff;
}

.status-filter-pills {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-pill {
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  font-size: 0.8em;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.16s ease;
}

.status-pill:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.08);
}

.status-pill.active {
  background: rgba(229, 184, 105, 0.18);
  border-color: rgba(243, 207, 122, 0.65);
  color: #fef08a;
}

.status-pill.pill-sold.active {
  background: rgba(185, 28, 28, 0.35);
  border-color: rgba(248, 113, 113, 0.65);
  color: #fecaca;
}

.status-pill.pill-vacant.active {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(125, 211, 252, 0.6);
  color: #bae6fd;
}

.view-toggles {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.segmented-control {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 11px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.09);
  gap: 2px;
}

.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.84em;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.seg-btn:hover {
  color: #f8fafc;
}

.seg-btn.active {
  background: linear-gradient(135deg, rgba(229, 184, 105, 0.26) 0%, rgba(217, 119, 6, 0.22) 100%);
  color: #fef08a;
  box-shadow: inset 0 0 0 1px rgba(243, 207, 122, 0.45);
}

.btn-expand-grid {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-expand-grid:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: rgba(15, 23, 42, 0.96);
  color: #94a3b8;
  padding: 11px 14px;
  text-align: left;
  font-size: 0.84em;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 11px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  vertical-align: middle;
}

.order-row-clickable {
  cursor: pointer;
  transition: background 0.15s ease;
}

.order-row-clickable:hover td {
  background: rgba(30, 41, 59, 0.72);
}

.table-empty-cell {
  text-align: center;
  padding: 48px 16px !important;
  color: #64748b;
  font-size: 0.95em;
}

.list-stock-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 9px;
  border-radius: 7px;
  background: rgba(229, 184, 105, 0.14);
  border: 1px solid rgba(229, 184, 105, 0.3);
  color: #fde68a;
  font-weight: 800;
  font-size: 0.88em;
  font-variant-numeric: tabular-nums;
}

.customer-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.customer-name {
  font-weight: 700;
  color: #f8fafc;
}

.list-backdated-tag {
  font-size: 0.72em;
  font-weight: 600;
  color: #fdba74;
  background: rgba(249, 115, 22, 0.16);
  border: 1px solid rgba(249, 115, 22, 0.35);
  padding: 1px 6px;
  border-radius: 999px;
}

.list-price-cell {
  color: #fde047;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.source-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.76em;
  font-weight: 600;
  white-space: nowrap;
}

.source-pill.src-chat {
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.32);
}

.source-pill.src-manual {
  background: rgba(245, 158, 11, 0.16);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.34);
}

.source-pill.src-queue {
  background: rgba(168, 85, 247, 0.16);
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.34);
}

.source-pill.src-ai {
  background: rgba(16, 185, 129, 0.16);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.34);
}

.font-bold { font-weight: 600; }
.font-mono { font-family: 'Courier New', monospace; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
.text-success { color: #10b981; }
.text-sm { font-size: 0.85em; }

.badge {
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.75em;
  font-weight: 600;
}
.badge-info { background: #3b82f6; color: white; }
.badge-warn { background: #f59e0b; color: white; }

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-warning { background: #f59e0b; color: white; }
.btn-warning:hover { background: #d97706; }
.btn-icon-sm { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
.btn-icon-sm:hover { color: #fff; }
.btn-icon-sm-danger { background: transparent; border: none; color: #f87171; cursor: pointer; transition: color 0.2s; }
.btn-icon-sm-danger:hover { color: #f43f5e; }

/* Action buttons in list view */
.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #475569;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  transition: all 0.2s;
}

.btn-action-edit:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-action-delete:hover {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .history-modal-container {
     flex-direction: column;
     height: 95vh;
  }
  .sidebar { width: 100%; height: 200px; border-right: none; border-bottom: 1px solid #334155; }
  .modal-body { flex-direction: column; }
}

/* Grid View CSS */
.grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #0f172a;
}

.grid-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(134px, 1fr));
    grid-auto-rows: minmax(102px, auto);
    align-items: stretch;
    gap: 10px;
    padding-bottom: 40px;
}

.grid-empty-msg {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 20px;
    color: #94a3b8;
    font-size: 0.95em;
}

.grid-empty-msg i {
    font-size: 1.8em;
    opacity: 0.5;
}

.grid-item {
    min-height: 102px;
    height: auto;
    box-sizing: border-box;
    background: rgba(10, 14, 22, 0.48);
    border: 1.5px dashed rgba(148, 163, 184, 0.24);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    padding: 8px 9px;
    gap: 4px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: none;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.32);
}

.grid-item:hover {
    border-style: solid;
    border-color: rgba(229, 184, 105, 0.6);
    background: rgba(24, 31, 48, 0.88);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.42);
}

.grid-item.empty {
    background: rgba(10, 14, 22, 0.45);
    border: 1.5px dashed rgba(148, 163, 184, 0.24);
    opacity: 0.92;
}

.grid-item.sold {
    background: linear-gradient(155deg, rgba(185, 28, 28, 0.42) 0%, rgba(127, 29, 29, 0.62) 55%, rgba(69, 10, 10, 0.88) 100%);
    border: 1.5px solid rgba(248, 113, 113, 0.65);
    box-shadow: 0 4px 14px rgba(153, 27, 27, 0.25), inset 0 1px 0 rgba(254, 202, 202, 0.16);
}

.grid-item.sold:hover {
    background: linear-gradient(155deg, rgba(220, 38, 38, 0.52) 0%, rgba(153, 27, 27, 0.74) 55%, rgba(92, 16, 16, 0.94) 100%);
    border-color: #fca5a5;
}

.grid-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    width: 100%;
    min-height: 22px;
}

.grid-card-top-right {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    flex-shrink: 0;
}

.item-num {
    font-size: 1.18em;
    font-weight: 800;
    font-family: var(--font-main);
    font-variant-numeric: tabular-nums;
    color: #fef08a;
    background: transparent;
    border: none;
    padding: 0 2px;
    line-height: 1.15;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
    flex-shrink: 0;
}

.grid-item.empty .item-num {
    color: #cbd5e1;
}

.grid-card-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 28px;
}

.item-status {
    font-size: 1.05em;
    font-weight: 700;
    color: #ffffff;
    text-align: center;
    width: 100%;
    padding: 0 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    line-height: 1.25;
    word-break: break-word;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
}

.grid-item.empty .item-status {
    color: #475569;
    font-weight: 500;
    font-size: 0.86em;
    text-shadow: none;
}

.grid-card-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex-wrap: wrap;
    min-height: 18px;
}

.grid-item .owner-count-badge {
    position: static;
    display: inline-flex;
    align-items: center;
    font-size: 0.72em;
    font-variant-numeric: tabular-nums;
    color: #fecaca;
    background: rgba(20, 8, 8, 0.45);
    border: 1px solid rgba(254, 202, 202, 0.38);
    padding: 0.5px 6px;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease;
}

.grid-item .owner-count-badge:hover {
    background: rgba(69, 10, 10, 0.85);
    color: #ffffff;
}

.grid-item .queue-badge {
    position: static;
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
    color: #ffffff;
    border-radius: 6px;
    padding: 1px 6px;
    min-width: 20px;
    font-size: 0.76em;
    font-weight: 800;
    line-height: 1.25;
    border: 1px solid rgba(254, 240, 138, 0.65);
}

.stock-price {
  font-size: 0.96em;
  font-variant-numeric: tabular-nums;
  color: #fbbf24;
  background: transparent;
  border: none;
  padding: 0 2px;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
}

.grid-item.sold .stock-price {
  color: #fde047;
}

.history-size-meta {
  font-size: 0.76em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #7dd3fc;
  background: transparent;
  border: none;
  padding: 0;
  margin-top: 1px;
  line-height: 1.15;
  white-space: nowrap;
}

.grid-item.sold .history-size-meta {
  color: #bae6fd;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.72);
}

.history-list-spec {
  font-size: 0.78em;
  color: #7dd3fc;
  font-weight: 500;
  margin-top: 1px;
}

.details-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.details-inline-label {
  font-size: 0.84em;
  font-weight: 600;
  color: #7dd3fc;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.details-input-field {
  flex: 1;
  min-width: 0;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(125, 211, 252, 0.25);
  border-radius: 8px;
  padding: 6px 10px;
  color: #f1f5f9;
  font-family: "Kanit", sans-serif;
  font-size: 0.88em;
  outline: none;
}

.details-input-field:focus {
  border-color: rgba(125, 211, 252, 0.65);
}

/* Toggle Buttons */
.btn-primary { background: #3b82f6; color: white; border: none; }
.btn-outline { background: transparent; border: 1px solid #475569; color: #94a3b8; }
.btn-outline:hover { background: #334155; color: white; }
.btn-sm { padding: 4px 8px; font-size: 0.9em; }

/* Fullscreen Grid */
.fullscreen-grid {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: #0f172a;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.fullscreen-header {
    padding: 15px 20px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fullscreen-header h2 { margin: 0; color: white; font-size: 1.25em; }

.fullscreen-grid .grid-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.backdated-inline-icon {
  display: inline-block;
  color: #fb923c;
  font-size: 0.8em;
  margin-left: 5px;
  vertical-align: -0.5px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  transition: transform 0.2s ease, color 0.2s ease;
  cursor: help;
}

.backdated-inline-icon:hover {
  color: #fbbf24;
  transform: scale(1.2);
}

.queue-item-time {
  font-size: 0.72em;
  color: #94a3b8;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-left: 4px;
  font-weight: 500;
}

.queue-item-time.backdated {
  color: #fbbf24;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(234, 88, 12, 0.22) 100%);
  border-color: rgba(245, 158, 11, 0.45);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.queue-item-time.backdated .backdated-icon {
  color: #fbbf24;
  font-size: 0.9em;
}

.queue-item-time.backdated .backdated-label {
  background: rgba(245, 158, 11, 0.25);
  color: #fff7ed;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  letter-spacing: 0.2px;
}

.queue-item-time.backdated .backdated-sep {
  opacity: 0.5;
  color: #f59e0b;
}

.queue-item-time.backdated .backdated-val {
  color: #fed7aa;
}

.flex-center {
  display: flex;
  align-items: center;
}
.gap-10 {
  gap: 10px;
}

/* ========================================================
   💬 Historical Chat Replay Styles (Matches Live Hybrid UI)
   ======================================================== */
.btn-chat-mode {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.chat-mode-count {
  background: rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  font-size: 0.78em;
  font-weight: 700;
  padding: 0 6px;
  border-radius: 999px;
  line-height: 1.4;
}

.history-chat-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0b0f17;
  overflow: hidden;
}

.history-chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(13, 18, 28, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-wrap: wrap;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.history-chat-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.history-chat-tabs .chat-tab {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 600;
  color: #94a3b8;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.18s ease;
}

.history-chat-tabs .chat-tab:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.06);
}

.history-chat-tabs .chat-tab.active {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
}

.history-chat-tabs .chat-tab.tab-cf.active {
  background: rgba(16, 185, 129, 0.16);
  border-color: rgba(16, 185, 129, 0.45);
  color: #6ee7b7;
}

.history-chat-tabs .chat-tab.tab-shipping.active {
  background: rgba(168, 85, 247, 0.16);
  border-color: rgba(168, 85, 247, 0.45);
  color: #d8b4fe;
}

.history-chat-tabs .chat-tab.tab-cancel.active {
  background: rgba(244, 63, 94, 0.16);
  border-color: rgba(244, 63, 94, 0.45);
  color: #fda4af;
}

.history-chat-tabs .chat-tab.tab-question.active {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.55);
  color: #38bdf8;
}

.history-chat-tabs .chat-tab.tab-admin.active {
  background: rgba(229, 184, 105, 0.16);
  border-color: rgba(229, 184, 105, 0.45);
  color: #f3cf7a;
}

.hchat-tab-count {
  font-size: 0.8em;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  font-variant-numeric: tabular-nums;
}

.history-chat-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.hchat-author-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fcd34d;
  font-size: 0.8em;
  font-weight: 700;
}

.hchat-chip-clear {
  background: transparent;
  border: none;
  color: #fcd34d;
  cursor: pointer;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
}

#history-chat-viewport {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 24px;
}

#history-chat-viewport::-webkit-scrollbar {
  width: 7px;
}
#history-chat-viewport::-webkit-scrollbar-track {
  background: #0b0f17;
}
#history-chat-viewport::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}

.history-chat-empty {
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #94a3b8;
  font-size: 1rem;
}

.history-chat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 920px;
  margin: 0 auto;
}

.history-chat-list .chat-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  background: rgba(18, 24, 38, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.history-chat-list .chat-row.buy {
  border-color: rgba(52, 211, 153, 0.55);
  border-left: 4.5px solid #10b981;
}

.history-chat-list .chat-row.shipping {
  border-color: rgba(192, 132, 252, 0.55);
  border-left: 4.5px solid #a855f7;
}

.history-chat-list .chat-row.cancel {
  border-color: rgba(251, 113, 133, 0.65);
  border-left: 4.5px solid #f43f5e;
}

.history-chat-list .chat-row.admin {
  background: linear-gradient(135deg, rgba(229, 184, 105, 0.16) 0%, rgba(24, 20, 16, 0.9) 100%);
  border: 1px solid rgba(229, 184, 105, 0.45);
  border-left: 4.5px solid #e5b869;
}

.history-chat-list .chat-row.banned {
  opacity: 0.48;
  border-left: 4px solid #ef4444;
  filter: grayscale(35%);
}

.history-chat-list .avatar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 44px;
  gap: 5px;
  user-select: none;
}

.history-chat-list .avatar-container {
  position: relative;
  width: 38px;
  height: 38px;
}

.history-chat-list .avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.16);
  object-fit: cover;
}

.history-chat-list .avatar-fallback {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0b0f17;
  font-weight: 800;
  font-size: 1.05em;
  text-transform: uppercase;
  pointer-events: none;
}

.history-chat-list .avatar-container img:not([style*="display: none"]) ~ .avatar-fallback {
  display: none;
}

.history-chat-list .status-badge-under {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.68em;
  font-weight: 800;
  white-space: nowrap;
  line-height: 1.2;
}

.history-chat-list .badge-buy {
  background: rgba(16, 185, 129, 0.26);
  color: #6ee7b7;
  border: 1px solid rgba(52, 211, 153, 0.72);
}

.history-chat-list .badge-cancel {
  background: rgba(244, 63, 94, 0.28);
  color: #fecdd3;
  border: 1px solid rgba(251, 113, 133, 0.78);
}

.history-chat-list .badge-shipping {
  background: rgba(168, 85, 247, 0.26);
  color: #e9d5ff;
  border: 1px solid rgba(192, 132, 252, 0.72);
}

.history-chat-list .badge-question {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.45);
}

.history-chat-list .badge-note {
  background: rgba(229, 184, 105, 0.18);
  color: #f3cf7a;
  border: 1px solid rgba(229, 184, 105, 0.45);
}

.history-chat-list .badge-banned {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: #ffffff;
}

.history-chat-list .chat-bubble-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.history-chat-list .chat-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  font-size: 0.92rem;
  min-width: 0;
  user-select: none;
}

.history-chat-list .chat-time {
  color: #94a3b8;
  font-size: 0.82em;
  font-family: monospace;
  font-weight: 600;
  flex-shrink: 0;
}

.history-chat-list .chat-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #f8fafc;
  cursor: pointer;
  padding: 1px 6px 1px 0;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.history-chat-list .chat-name:hover {
  background: rgba(255, 255, 255, 0.08);
  padding-left: 6px;
}

.history-chat-list .chat-name-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.history-chat-list .chat-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-chat-list .cust-meta-cluster {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.history-chat-list .cust-mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  font-size: 0.7em;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.history-chat-list .cust-mini-badge.addr {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.45);
}

.history-chat-list .cust-mini-badge.channel.line,
.history-chat-list .cust-mini-badge.channel.lineoa {
  background: rgba(6, 199, 85, 0.2);
  color: #4ade80;
  border: 1px solid rgba(6, 199, 85, 0.45);
}

.history-chat-list .cust-mini-badge.channel.phone {
  background: rgba(2, 132, 199, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(2, 132, 199, 0.45);
}

.history-chat-list .cust-mini-badge.pay.transfer {
  background: rgba(147, 51, 234, 0.22);
  color: #c084fc;
  border: 1px solid rgba(147, 51, 234, 0.55);
}

.history-chat-list .cust-mini-badge.pay.cod {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.45);
}

.history-chat-list .btn-author-filter {
  margin-left: auto;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 0.74em;
  opacity: 0.45;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-chat-list .chat-row:hover .btn-author-filter,
.history-chat-list .btn-author-filter.is-active {
  opacity: 1;
}

.history-chat-list .btn-author-filter.is-active {
  background: #f59e0b;
  color: #0f172a;
}

.history-chat-list .chat-bubble {
  background: transparent;
  border: none;
  padding: 2px 0 0;
  font-size: 1.14rem;
  line-height: 1.44;
  color: #ffffff;
}

.history-chat-list .chat-text {
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  word-break: break-word;
  user-select: text;
  -webkit-user-select: text;
}

.history-chat-list .emoji-image {
  height: 1.4em;
  width: auto;
  vertical-align: -0.22em;
  display: inline-block;
  margin: 0 2px;
}

.history-chat-list :deep(.chat-highlight-name) {
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  padding: 2px 9px;
  margin: 0 3px;
  border-radius: 999px;
  font-size: 0.96em;
  vertical-align: middle;
  background: linear-gradient(135deg, #bae6fd 0%, #60a5fa 100%);
  border: 1.5px solid #0284c7;
  color: #082f49;
}

.history-chat-list :deep(.chat-highlight-name .name-icon) {
  font-size: 0.82em;
  margin-right: 4px;
}

/* 📱 Friendly Mobile & Tablet Drawer Layout */
@media (max-width: 860px) {
  .history-modal-container {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    border: none;
  }

  .btn-mobile-sidebar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(229, 184, 105, 0.35);
    background: rgba(229, 184, 105, 0.12);
    color: #fef08a;
    font-size: 0.84em;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }

  .btn-mobile-inline-menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-mobile-pick {
    display: inline-flex;
  }

  .mobile-sidebar-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.58);
    z-index: 25;
  }

  .sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    width: min(300px, 84vw);
    transform: translateX(-100%);
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 12px 0 36px rgba(0, 0, 0, 0.65);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .history-live-title-bar {
    flex-direction: column;
    gap: 8px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .btn-hist-primary,
  .btn-hist-secondary {
    flex: 1;
    justify-content: center;
  }

  .controls-bar {
    padding: 10px 12px;
  }

  .search-wrapper {
    max-width: none;
    flex-basis: 100%;
  }

  .view-toggles {
    margin-left: 0;
  }
}
</style>
