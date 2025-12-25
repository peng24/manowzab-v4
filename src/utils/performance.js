/**
 * Performance Monitoring Utility
 * Tracks execution time and API latency.
 */

const metrics = {
    apiCalls: [],
    messageProcessing: [],
};

/**
 * Measures the execution time of an async function.
 * @param {string} label - Name of the operation.
 * @param {Function} asyncFn - The async function to execute.
 * @returns {Promise<any>} The result of the async function.
 */
export async function measurePerformance(label, asyncFn) {
    const start = performance.now();
    try {
        const result = await asyncFn();
        const duration = performance.now() - start;
        
        // Log if significantly slow (> 200ms)
        if (duration > 200) {
            console.debug(`⚡ [Perf] ${label}: ${duration.toFixed(2)}ms`);
        }
        
        // Store metric (keeping last 100)
        metrics.messageProcessing.push({ label, duration, timestamp: Date.now() });
        if (metrics.messageProcessing.length > 100) metrics.messageProcessing.shift();

        return result;
    } catch (error) {
        console.error(`⚡ [Perf] ${label} Failed:`, error);
        throw error;
    }
}

/**
 * Tracks API Call duration and status.
 * @param {string} endpoint - The API endpoint or name.
 * @param {number} startTime - Performance.now() timestamp when call started.
 * @param {boolean} success - Whether the call succeeded.
 */
export function trackAPICall(endpoint, startTime, success = true) {
    const duration = performance.now() - startTime;
    
    metrics.apiCalls.push({ 
        endpoint, 
        duration, 
        success, 
        timestamp: Date.now() 
    });

    if (metrics.apiCalls.length > 100) metrics.apiCalls.shift();

    if (duration > 1000) {
        console.warn(`🐢 [Slow API] ${endpoint}: ${duration.toFixed(2)}ms`);
    }
}

/**
 * Get current metrics summary.
 */
export function getPerformanceMetrics() {
    const avgChat = metrics.messageProcessing.reduce((acc, curr) => acc + curr.duration, 0) / (metrics.messageProcessing.length || 1);
    const avgApi = metrics.apiCalls.reduce((acc, curr) => acc + curr.duration, 0) / (metrics.apiCalls.length || 1);
    
    return {
        avgMessageProcessingTime: avgChat.toFixed(2) + 'ms',
        avgApiLatency: avgApi.toFixed(2) + 'ms',
        totalApiCalls: metrics.apiCalls.length,
        totalMessagesProcessed: metrics.messageProcessing.length
    };
}
