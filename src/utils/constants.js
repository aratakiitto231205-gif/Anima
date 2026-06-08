// v0.11.0

export const AVAILABLE_TOOLS = [
    'search_web',
    'recall_memory',
    'play_music',
    'set_timer',
    'tell_joke',
    'check_news',
    'surf_tiktok',
    'query_lore_db',
];

export const MOOD_WHITELIST = ['calm', 'excited', 'annoyed', 'sleepy', 'concerned', 'competitive', 'affectionate'];

export const NARRATIVE_BLOCK_TAGS = ['dialogue', 'action', 'environment', 'sfx'];

// Timing constants (milliseconds) — extracted from inline magic numbers
export const TIMING = {
    INIT_DELAY_MS: 1000, // Wait before kicking off observer/ticker after init
    CHAT_CHANGED_DELAY_MS: 500, // Wait for ST chat switch to settle
    DOM_RENDER_DELAY_MS: 100, // Wait before patching message DOM
    OBSERVER_RETRY_DELAY_MS: 1000, // Retry interval when #chat not found
    OBSERVER_MAX_RETRIES: 10, // Give up after 10s of polling
    OBSERVER_REMOUNT_DELAY_MS: 50, // Re-render delay when remounting observer
    TICKER_INTERVAL_MS: 45000, // Background ticker interval
    TICKER_MIN_ELAPSED_MIN: 0.5, // Skip tick if less than this elapsed
};

// UI thresholds
export const THRESHOLDS = {
    MEMORY_MIN_CHARS: 5, // Min chars to store a memory
    JACCARD_FALLBACK: 0.1, // Threshold for Jaccard fallback recall
    HORMONE_NIGHT_START_HOUR: 22, // Hour to start "night" mode (10 PM)
    HORMONE_NIGHT_END_HOUR: 5, // Hour to end "night" mode (5 AM)
    SLEEP_MELATONIN_THRESHOLD: 8.0, // Level at which character is "sleeping"
};

// Admin console rate limiting
export const ADMIN_RATELIMIT_MS = 5000; // Min ms between admin LLM calls

// Event deduping
export const STREAM_BUFFER_MAX_CHARS = 8000; // Cap stream buffer to prevent runaway
