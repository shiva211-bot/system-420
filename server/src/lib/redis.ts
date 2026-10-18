import { Redis } from "ioredis";
import { config } from "../config";

export function createRedisClient(): Redis {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

export const redis = createRedisClient();
export const redisSub = createRedisClient();
export const redisPub = createRedisClient();

redis.on("error", (err) => {
  console.error("[redis] connection error", err.message);
});
