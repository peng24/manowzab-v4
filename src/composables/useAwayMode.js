import { ref, onMounted, onUnmounted } from "vue";
import { ref as dbRef, onValue, set } from "firebase/database";
import { db } from "./useFirebase";
import { useSystemStore } from "../stores/system";
import { useAudio } from "./useAudio";
import { AWAY_END_MESSAGES } from "../config/constants";
import { logger } from "../utils/logger";

let activeAwayUnsubscribe = null;
let localIsAwayState = false;
let awayInterval = null;
let awayStartTime = 0;
const awayTimer = ref("00:00"); // ✅ Module scope — shared across all consumers (same as awayInterval)

export function useAwayMode() {
    const systemStore = useSystemStore();
    const { queueAudio, resetVoice } = useAudio();

    function getRandomMessage(messageArray) {
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    }

    function updateAwayTimer() {
        if (!systemStore.isAway || !awayStartTime) {
            awayTimer.value = "00:00";
            return;
        }

        const diff = Math.max(0, Math.floor((Date.now() - awayStartTime) / 1000));
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
                logger.away("Away mode closed by user");
            })
            .catch((err) => {
                logger.error("Error closing away mode:", err);
            });
    }

    function initAwayListener() {
        if (activeAwayUnsubscribe) {
            try {
                activeAwayUnsubscribe();
            } catch (e) {}
            activeAwayUnsubscribe = null;
        }

        const awayRef = dbRef(db, "system/awayMode");

        const unsubscribe = onValue(awayRef, (snap) => {
            const val = snap.val();
            const newState = val?.isAway || false;
            const prevState = localIsAwayState;

            logger.away("Away mode changed:", { newState, prevState, data: val });

            if (newState && !prevState) {
                localIsAwayState = true;
                systemStore.isAway = true;
                awayStartTime = val?.startTime || Date.now();

                if (!awayInterval) {
                    updateAwayTimer();
                    awayInterval = setInterval(updateAwayTimer, 1000);
                }

                queueAudio("sleep", "", "");
            } else if (!newState && prevState) {
                localIsAwayState = false;
                resetVoice(); // Clean up current speech and audio queue

                systemStore.isAway = false;

                if (awayInterval) {
                    clearInterval(awayInterval);
                    awayInterval = null;
                }
                awayTimer.value = "00:00";

                const endMessage = getRandomMessage(AWAY_END_MESSAGES);
                queueAudio(null, "", endMessage);
            }
        });

        const cleanup = () => {
            try {
                unsubscribe();
            } catch (e) {}
            if (activeAwayUnsubscribe === cleanup) {
                activeAwayUnsubscribe = null;
            }
            if (awayInterval) {
                clearInterval(awayInterval);
                awayInterval = null;
            }
            localIsAwayState = false;
            systemStore.isAway = false;
            awayStartTime = 0;
            awayTimer.value = "00:00";
        };

        activeAwayUnsubscribe = cleanup;
        return cleanup; // Return full cleanup function
    }

    // Do NOT tear down global singleton Away listener when a non-owner consumer unmounts;
    // the caller of initAwayListener() (App.vue) owns and invokes the returned cleanup function.
    let ownedCleanup = null;
    const initOwnedAwayListener = () => {
        ownedCleanup = initAwayListener();
        return ownedCleanup;
    };

    onUnmounted(() => {
        if (ownedCleanup) {
            try {
                ownedCleanup();
            } catch (e) {}
            ownedCleanup = null;
        }
    });

    return {
        awayTimer,
        closeAwayMode,
        initAwayListener: initOwnedAwayListener
    };
}
