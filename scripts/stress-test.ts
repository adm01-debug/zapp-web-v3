import { parseArgs } from "util";

/**
 * Advanced Stress Test Script
 * Usage: bun scripts/stress-test.ts --url http://localhost:54321/functions/v1/health-check --concurrency 50 --duration 10
 */

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    url: { type: "string", default: "http://localhost:54321/functions/v1/health-check" },
    concurrency: { type: "string", default: "10" },
    duration: { type: "string", default: "5" }, // seconds
    mock: { type: "boolean", default: false },
  },
  strict: false,
});

const url = values.url!;
const concurrency = parseInt(values.concurrency!);
const duration = parseInt(values.duration!);
const isMock = values.mock;

console.log(`\n🚀 Starting Stress Test`);
console.log(`📍 Target: ${isMock ? 'MOCK MODE' : url}`);
console.log(`👥 Concurrency: ${concurrency}`);
console.log(`⏱️  Duration: ${duration}s\n`);

interface Stats {
  requests: number;
  success: number;
  failure: number;
  latencies: number[];
}

const stats: Stats = {
  requests: 0,
  success: 0,
  failure: 0,
  latencies: [],
};

let active = true;

async function worker() {
  while (active) {
    const start = performance.now();
    try {
      if (isMock) {
        // Simulate local latency
        await new Promise(r => setTimeout(r, Math.random() * 50 + 10));
        stats.success++;
      } else {
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
          }
        });
        if (resp.ok) stats.success++;
        else stats.failure++;
      }
    } catch (e) {
      stats.failure++;
    } finally {
      const end = performance.now();
      stats.latencies.push(end - start);
      stats.requests++;
    }
  }
}

// Start workers
const workers = Array.from({ length: concurrency }).map(() => worker());

// Set timeout to stop
setTimeout(() => {
  active = false;
  console.log(`🏁 Stopping test...\n`);
  report();
}, duration * 1000);

function report() {
  const totalRequests = stats.requests;
  const tps = totalRequests / duration;
  const sortedLatencies = stats.latencies.sort((a, b) => a - b);
  
  const p50 = sortedLatencies[Math.floor(totalRequests * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(totalRequests * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(totalRequests * 0.99)] || 0;

  console.log(`📈 Results:`);
  console.log(`- Total Requests: ${totalRequests}`);
  console.log(`- Success Rate: ${((stats.success / totalRequests) * 100).toFixed(2)}%`);
  console.log(`- Error Rate: ${((stats.failure / totalRequests) * 100).toFixed(2)}%`);
  console.log(`- Throughput: ${tps.toFixed(2)} req/s`);
  console.log(`- Latency:`);
  console.log(`  - P50: ${p50.toFixed(2)}ms`);
  console.log(`  - P95: ${p95.toFixed(2)}ms`);
  console.log(`  - P99: ${p99.toFixed(2)}ms`);
  console.log(`\n✅ Test complete.`);
  process.exit(0);
}
