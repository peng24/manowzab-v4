<template>
  <div class="live-overlay-container">
    <transition name="fade-slide">
        <div class="overlay-grid" v-if="currentItem.id">
            
            <!-- Column 1: ITEM NO -->
            <div class="col-item">
                <div class="label">รายการที่</div>
                <div class="value-id">{{ currentItem.id }}</div>
            </div>

            <!-- Column 2: SIZE -->
            <div class="col-item">
                <div class="label">ไซส์</div>
                <div class="value-size">{{ currentItem.size || "-" }}</div>
            </div>

            <!-- Column 3: PRICE -->
            <div class="col-item">
                <div class="label">ราคา</div>
                <div class="value-price">{{ currentItem.price || "-" }}</div>
            </div>

        </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSystemStore } from '../stores/system';
import { useFirebase } from '../composables/useFirebase';
import { ref as dbRef, onValue } from "firebase/database";

const systemStore = useSystemStore();
const { db } = useFirebase();
const currentItem = ref({ id: null, price: null, size: null });

onMounted(() => {
    // Determine Video ID from URL params or use current if available (mostly URL for OBS)
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('vid') || systemStore.currentVideoId;

    if (!videoId) {
        // Fallback: Listen to Active Video from Firebase for global sync
        const activeVidRef = dbRef(db, "system/activeVideo");
        onValue(activeVidRef, (snap) => {
            const vid = snap.val();
            if (vid && vid !== "demo") {
                 listenToOverlay(vid);
            }
        });
    } else {
        listenToOverlay(videoId);
    }
});

function listenToOverlay(videoId) {
    const overlayRef = dbRef(db, `overlay/${videoId}/current_item`);
    onValue(overlayRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            currentItem.value = data;
        }
    });
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;800&display=swap');

.live-overlay-container {
    width: 100vw;
    height: 100vh;
    background: transparent; /* Transparent for OBS */
    display: flex;
    align-items: flex-end; /* Bottom alignment usually */
    justify-content: center; /* Center horizontally */
    padding-bottom: 50px; /* Space from bottom edge */
    font-family: 'Kanit', sans-serif;
    overflow: hidden;
}

.overlay-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr; /* Balanced columns */
    gap: 60px; /* Generous spacing like the image */
    align-items: center;
    text-align: center;
    /* Optional: Subtle drop shadow for legibility over any video background */
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.9));
}

.col-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.label {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.6); /* Dimmed grey/white */
    font-weight: 600;
    letter-spacing: 1px;
}

/* Values */
.value-id {
    font-size: 8rem; /* Huge */
    font-weight: 800;
    color: #ffffff;
    line-height: 1;
}

.value-size {
    font-size: 5rem;
    font-weight: 800;
    color: #facc15; /* Yellow */
    line-height: 1;
    white-space: nowrap;
}

.value-price {
    font-size: 6rem;
    font-weight: 800;
    color: #00e676; /* Green */
    line-height: 1;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  transform: translateY(40px) scale(0.95);
  opacity: 0;
}
</style>
