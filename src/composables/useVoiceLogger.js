import { ref } from 'vue';

const logs = ref([]);

export function useVoiceLogger() {
    
    function logEvent(payload) {
        const timestamp = new Date().toLocaleTimeString('th-TH', { hour12: false });
        
        logs.value.push({
            timestamp,
            ...payload
        });

        // Limit logs to last 500 to prevent memory issues for long sessions
        if (logs.value.length > 500) {
            logs.value.shift();
        }
    }

    function downloadLogs() {
        if (logs.value.length === 0) {
            alert("⚠️ No logs to download yet.");
            return;
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `voice-logs-${dateStr}.json`;
        const dataStr = JSON.stringify(logs.value, null, 2);
        
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearLogs() {
        logs.value = [];
    }

    return {
        logs,
        logEvent,
        downloadLogs,
        clearLogs
    };
}
