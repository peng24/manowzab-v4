/**
 * Core Type Definitions for Manowzab Command Center V4
 * 
 * Standardizes data structures across the application.
 */

/**
 * Represents a single item in the stock inventory.
 */
export interface StockItem {
    /** 
     * Current owner's display name.
     * Null if the item is available.
     */
    owner: string | null;

    /** 
     * Unique ID of the current owner (channelId).
     * Null if available.
     */
    uid: string | null;

    /** 
     * Timestamp of the last successful booking.
     */
    time: number;

    /**
     * Source of the booking (e.g., "manual", "chat", "ai").
     */
    source: "manual" | "chat" | "queue" | string;

    /**
     * Override price for this specific item. 
     * If null, uses the default price inferred from context or detection.
     */
    price: number | null;

    /**
     * Optional size label for this specific item.
     */
    size?: string | null;

    /**
     * Waiting list for this item.
     * Contains users who booked after the current owner.
     */
    queue: QueueItem[];
}

/**
 * Represents a user in the waiting queue for an item.
 */
export interface QueueItem {
    owner: string;
    uid: string;
    time: number;
}

/**
 * Represents a processed chat message in the system.
 */
export interface ChatMessage {
    /** Unique ID from YouTube */
    id: string;

    /** Display name of the author */
    displayName: string;

    /** Real name (nickname) if mapped, otherwise same as displayName */
    realName: string;

    /** Determine if message is from admin/moderator */
    isAdmin: boolean;

    /** Timestamp of the message */
    timestamp: number;

    /** The actual text content */
    text: string;

    /** URL to user's avatar */
    avatar: string;

    /** User's unique channel ID */
    uid: string;

    /** Message Type Classification */
    type: "normal" | "buy" | "cancel" | "system" | "shipping";

    /** Color code for the name badge (optional) */
    color?: string;
}

/**
 * Represents the structure of the Firebase Realtime Database.
 */
export interface FirebaseSchema {
    /** 
     * Main Stock Node
     * Key: Item Number (e.g., "1", "50")
     */
    stock: {
        [videoId: string]: {
            [itemNumber: string]: StockItem;
        };
    };

    /**
     * Chat History for Sessions
     */
    chats: {
        [videoId: string]: {
            [messageId: string]: ChatMessage;
        };
    };

    /**
     * Global System State
     */
    system: {
        activeVideo: string;
        isConnected: boolean;
        isSoundOn: boolean;
        viewerCount: number;
        statusApi: "ok" | "warn" | "err";
        statusChat: "active" | "inactive" | "loading";
    };

    /**
     * User Nickname Mappings
     */
    nicknames: {
        [uid: string]: {
            nick: string;
            realName?: string;
            updatedAt: number;
        };
    };

    /**
     * Historical Video Metadata
     */
    history: {
        [videoId: string]: {
            title: string;
            timestamp: number;
        };
    };

    /**
     * Live Overlay Data
     */
    overlay: {
        [videoId: string]: {
            current_item: {
                id: string | number;
                price: number | null;
                size: string | null;
                updatedAt: number;
            };
        };
    };

    /**
     * Shipping/Logistic Status
     */
    shipping: {
        [videoId: string]: {
            [uid: string]: {
                ready: boolean;
                timestamp: number;
            };
        };
    };
}
