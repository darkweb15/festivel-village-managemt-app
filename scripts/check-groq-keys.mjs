/**
 * Answers one question: do these Groq keys share a rate-limit budget?
 *
 *   $env:GROQ_API_KEYS = "gsk_a,gsk_b,gsk_c"
 *   node scripts/check-groq-keys.mjs
 *
 * Groq enforces limits per ORGANIZATION. Keys from one account therefore share
 * one token budget and rotating between them gains nothing. This script proves
 * which case you are in instead of guessing: it reads each key's remaining
 * tokens, spends a chunk on the FIRST key only, then re-reads every key. Any
 * key whose remaining balance also dropped is on the same account.
 *
 * Keys are never printed — only a "…abcd" fingerprint.
 */

const keys = (process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY ?? "")
  .split(/[,\s]+/)
  .map((k) => k.trim())
  .filter((k) => k.length > 20);

const fp = (k) => `…${k.slice(-4)}`;
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

async function call(key, { spend = false } = {}) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        // A deliberately chunky prompt when spending, so the drop is obvious.
        { role: "user", content: spend ? "Summarise this: " + "festival ".repeat(400) : "hi" },
      ],
      max_tokens: spend ? 300 : 1,
    }),
  });

  return {
    status: res.status,
    remaining: Number(res.headers.get("x-ratelimit-remaining-tokens")) || null,
    limit: Number(res.headers.get("x-ratelimit-limit-tokens")) || null,
    body: res.ok ? null : (await res.text()).slice(0, 200),
  };
}

async function main() {
  if (keys.length === 0) {
    console.error("Set GROQ_API_KEYS to a comma-separated list of keys.");
    return 1;
  }

  console.log(`Checking ${keys.length} key(s) against ${MODEL}\n`);

  // --- 1. validity + starting balance ---------------------------------------
  const before = [];
  for (const key of keys) {
    const r = await call(key);
    before.push({ key, ...r });
    console.log(
      `${fp(key)}  status ${r.status}` +
        (r.remaining != null ? `  remaining ${r.remaining}` : "") +
        (r.limit != null ? ` / ${r.limit}` : "") +
        (r.body ? `  ${r.body}` : ""),
    );
  }

  const valid = before.filter((b) => b.status === 200);
  if (valid.length === 0) {
    console.error("\nNo key returned 200. Nothing further to test.");
    return 1;
  }
  if (valid.length < keys.length) {
    console.log(`\n${keys.length - valid.length} key(s) are not usable (see status above).`);
  }
  if (valid.length === 1) {
    console.log("\nOnly one usable key — nothing to compare.");
    console.log(
      `Rate limit on this account: ${valid[0].limit ?? "unknown"} tokens per minute.`,
    );
    return 0;
  }

  // --- 2. spend on the first key only ---------------------------------------
  console.log(`\nSpending tokens on ${fp(valid[0].key)} only…`);
  for (let i = 0; i < 3; i += 1) await call(valid[0].key, { spend: true });

  // --- 3. re-read every key --------------------------------------------------
  console.log("\nRe-reading balances:\n");
  const shared = [];
  for (const entry of valid) {
    const after = await call(entry.key);
    const drop = (entry.remaining ?? 0) - (after.remaining ?? 0);
    const isFirst = entry.key === valid[0].key;
    // A key untouched by the spend should barely move; a shared budget drops hard.
    const sharesBudget = !isFirst && drop > 500;
    if (sharesBudget) shared.push(fp(entry.key));
    console.log(
      `${fp(entry.key)}  ${entry.remaining} -> ${after.remaining}  (drop ${drop})` +
        (isFirst ? "   <- spent here" : sharesBudget ? "   SHARED budget" : "   independent"),
    );
  }

  console.log("");
  if (shared.length > 0) {
    console.log(
      `VERDICT: ${shared.length + 1} keys share one budget (${[fp(valid[0].key), ...shared].join(", ")}).`,
    );
    console.log("Rotating between them will NOT raise your rate limit.");
    console.log("To get more throughput: upgrade the Groq plan, or reduce tokens per turn.");
  } else {
    console.log("VERDICT: the keys appear to draw on independent budgets.");
    console.log("Rotation will increase throughput — but check Groq's terms on multiple");
    console.log("accounts before relying on this for the festival.");
  }

  return 0;
}

process.exitCode = await main();
