import { createClient } from "redis";
import { REDIS_URI } from "../../config.js";

export class CacheService {
    private readonly client: ReturnType<typeof createClient>;

    constructor() {
        this.client = createClient({ url: REDIS_URI });
        this.client.on("error", (error: unknown) => console.log("Redis error", error));
    }

    async connect(): Promise<void> {
        await this.client.connect();
        console.log("Redis connection established successfully");
    }

    async set({ key, value, ttl }: { key: string; value: unknown; ttl?: number }) {
        const stored = typeof value === "string" ? value : JSON.stringify(value);
        return await this.client.set(key, stored, { ...(ttl ? { EX: ttl } : {}) });
    }

    async get({ key }: { key: string }): Promise<string | null> {
        return await this.client.get(key);
    }

    async exist({ key }: { key: string }): Promise<boolean> {
        return (await this.client.exists(key)) === 1;
    }

    async update({ key, value, ttl }: { key: string; value: unknown; ttl?: number }) {
        if (!(await this.exist({ key }))) {
            return 0;
        }
        return await this.set({ key, value, ttl });
    }

    async del({ key }: { key: string | string[] }): Promise<number> {
        if (Array.isArray(key) && key.length === 0) {
            return 0;
        }
        return await this.client.del(key);
    }

    async ttl({ key }: { key: string }): Promise<number> {
        return await this.client.ttl(key);
    }

    async expire({ key, ttl }: { key: string; ttl: number }) {
        return await this.client.expire(key, ttl);
    }

    async incr({ key, value = 1 }: { key: string; value?: number }): Promise<number> {
        return await this.client.incrBy(key, value);
    }

    async keys({ prefix }: { prefix: string }): Promise<string[]> {
        return await this.client.keys(`${prefix}*`);
    }
}

export const cacheService = new CacheService();
