// Samples event-loop lag to distinguish "Node CPU starved" (throttled/overloaded)
// from "downstream slow" (database/network). Warns only; silent when healthy.
let timer = null;

const startEventLoopMonitor = (intervalMs = 5000) => {
    if (timer) return;
    let last = Date.now();
    timer = setInterval(() => {
        const now = Date.now();
        const lag = now - last - intervalMs;
        last = now;
        if (lag > 1000) {
            console.warn(`[event-loop] lag ${Math.round(lag)}ms over ${intervalMs}ms tick (CPU starved or blocked)`);
        }
    }, intervalMs);
    timer.unref?.();
};

const stopEventLoopMonitor = () => {
    if (timer) clearInterval(timer);
    timer = null;
};

module.exports = { startEventLoopMonitor, stopEventLoopMonitor };
