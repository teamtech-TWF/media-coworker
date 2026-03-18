type Bucket = {
  tokens: number;
  last: number;
};

const perIp = new Map<string, Bucket>();
const perUser = new Map<string, Bucket>();

const RATE = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? "30");
const REFILL_INTERVAL = 60 * 1000; // ms

function refill(bucket: Bucket) {
  const now = Date.now();
  const elapsed = now - bucket.last;
  const tokensToAdd = Math.floor((elapsed / REFILL_INTERVAL) * RATE);
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(RATE, bucket.tokens + tokensToAdd);
    bucket.last = now;
  }
}

export function allowedByIp(ip: string) {
  const b = perIp.get(ip) ?? { tokens: RATE, last: Date.now() };
  refill(b);
  if (b.tokens <= 0) {
    perIp.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  perIp.set(ip, b);
  return true;
}

export function allowedByUser(userId: string) {
  const b = perUser.get(userId) ?? { tokens: RATE, last: Date.now() };
  refill(b);
  if (b.tokens <= 0) {
    perUser.set(userId, b);
    return false;
  }
  b.tokens -= 1;
  perUser.set(userId, b);
  return true;
}
