import { ref, onMounted, onUnmounted } from "vue";
import { ref as dbRef, onValue, set } from "firebase/database";
import { db } from "../firebase";
import { useSystemStore } from "../stores/system";
import { useAudio } from "./useAudio";
import { AWAY_START_MESSAGES, AWAY_END_MESSAGES } from "../constants";

export function useAwayMode() {
    const systemStore = useSystemStore();
    const { queueSpeech } = useAudio();

    const awayTimer = ref("00:00");
    let awayInterval = null;
    let awayStartTime = 0;

    function getRandomMessage(messageArray) {
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    }

    function updateAwayTimer() {
        if (!systemStore.isAway || !awayStartTime) {
            awayTimer.value = "00:00";
            return;
        }

        const diff = Math.floor((Date.now() - awayStartTime) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (hours > 0) {
            awayTimer.value = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}`;
        } else {
            awayTimer.value = `${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}`;
        }
    }

    function closeAwayMode() {
        set(dbRef(db, "system/awayMode"), {
            isAway: false,
            startTime: null,
            closedBy: systemStore.myDeviceId,
            closedAt: Date.now(),
        })
            .then(() => {
                console.log("✅ Away mode closed by user");
            })
            .catch((err) => {
                console.error("Error closing away mode:", err);
            });
    }

    function initAwayListener() {
        const awayRef = dbRef(db, "system/awayMode");

        const unsubscribe = onValue(awayRef, (snap) => {
            const val = snap.val();
            const newState = val?.isAway || false;
            const prevState = systemStore.isAway;

            console.log("🌙 Away mode changed:", { newState, prevState, data: val });

            if (newState && !prevState) {
                systemStore.isAway = true;
                awayStartTime = val?.startTime || Date.now();

                if (!awayInterval) {
                    updateAwayTimer();
                    awayInterval = setInterval(updateAwayTimer, 1000);
                }

                const startMessage = getRandomMessage(AWAY_START_MESSAGES);
                queueSpeech(startMessage);
            } else if (!newState && prevState) {
                systemStore.isAway = false;

                if (awayInterval) {
                    clearInterval(awayInterval);
                    awayInterval = null;
                }
                awayTimer.value = "00:00";

                const endMessage = getRandomMessage(AWAY_END_MESSAGES);
                queueSpeech(endMessage);
            }
        });

        return unsubscribe; // Return unsubscribe function if needed
    }

    // Auto cleanup interval when component using this composable is unmounted
    // Note: Since this is likely used in App.vue which is always mounted, this might not be triggered often
    onUnmounted(() => {
        if (awayInterval) {
            clearInterval(awayInterval);
        }
    });

    return {
        awayTimer,
        closeAwayMode,
        initAwayListener
    };
}
