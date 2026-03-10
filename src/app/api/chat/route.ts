import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEY            = process.env.GROQ_API_KEY || '';
const GROQ_URL            = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_URL          = 'https://api.openai.com/v1/chat/completions';
const GROQ_MODEL_DEFAULT  = process.env.CODETHINKER_MODEL || process.env.GODLOCAL_AI_MODEL || 'llama-3.3-70b-versatile';
const DEEPSEEK_KEY        = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL        = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL      = 'deepseek-chat';
const TAVILY_KEY          = process.env.TAVILY_API_KEY || '';
const COINGECKO_URL       = 'https://api.coingecko.com/api/v3';

// ── Real-time tool implementations ───────────────────────────────────────────

async function toolWebSearch(query: string): Promise<string> {
  if (!TAVILY_KEY) return JSON.stringify({ error: 'TAVILY_API_KEY not configured' });
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });
    const data = await res.json() as {
      answer?: string;
      results?: Array<{ title: string; url: string; content: string }>;
    };
    const summary = data.answer ? `Answer: ${data.answer}\n\n` : '';
    const sources = (data.results || []).slice(0, 5).map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.url}\n${r.content?.slice(0, 300)}`
    ).join('\n\n');
    return summary + sources;
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

async function toolCryptoPrice(coins: string): Promise<string> {
  try {
    const ids = coins.toLowerCase().replace(/\s/g, '');
    const res = await fetch(
      `${COINGECKO_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json() as Record<string, {
      usd?: number;
      usd_24h_change?: number;
      usd_market_cap?: number;
    }>;
    if (!data || Object.keys(data).length === 0) {
      return JSON.stringify({ error: `No data for: ${coins}` });
    }
    const result = Object.entries(data).map(([coin, info]) => {
      const change = info.usd_24h_change?.toFixed(2);
      const mcap = info.usd_market_cap
        ? ` | MCap: $${(info.usd_market_cap / 1e9).toFixed(2)}B`
        : '';
      const sign = (info.usd_24h_change || 0) >= 0 ? '+' : '';
      return `${coin.toUpperCase()}: $${info.usd} (${sign}${change}% 24h${mcap})`;
    }).join('\n');
    return `Real-time prices (CoinGecko):\n${result}`;
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

async function toolGetDateTime(): Promise<string> {
  const now = new Date();
  return `Current UTC time: ${now.toISOString()}\nLocal (server): ${now.toString()}`;
}

// ── Tool registry ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for real-time information, news, documentation, tutorials, prices, events, or anything that may have changed recently. Use this whenever the user asks about current events, recent releases, prices, or anything you may not know.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query — be specific and concise' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'crypto_price',
      description: 'Get real-time cryptocurrency prices, 24h change %, and market cap from CoinGecko. Use coin IDs like: bitcoin, ethereum, solana, dogecoin, cardano, ripple, etc.',
      parameters: {
        type: 'object',
        properties: {
          coins: { type: 'string', description: 'Comma-separated CoinGecko coin IDs, e.g. "bitcoin,ethereum,solana"' },
        },
        required: ['coins'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_datetime',
      description: 'Get the current real-time date and time. Use when the user asks what time or date it is.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'web_search':   return toolWebSearch(args.query || '');
    case 'crypto_price': return toolCryptoPrice(args.coins || '');
    case 'get_datetime': return toolGetDateTime();
    default:             return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function getSystemPrompt(mode: string): string {
  const base = `You are CodeThinker — a chain-of-thought AI built for developers by GodLocal.

Your core ability: you THINK through problems step-by-step before writing code.

## Real-Time Tools Available:
You have access to real-time tools. Use them proactively when relevant:
- **web_search** — search the web for current info, docs, news, prices
- **crypto_price** — live crypto prices from CoinGecko
- **get_datetime** — current date/time

IMPORTANT: When a user asks about anything time-sensitive (prices, news, current events, "latest", "today", "now") — ALWAYS use the appropriate tool first, then answer based on real data.

## Behavior Rules:
1. **Always show your reasoning** — before code, briefly explain your thinking chain
2. **Use thinking markers** — wrap key reasoning steps in \u3010step description\u3011 markers
3. **Code quality** — always write clean, production-ready code with types and comments
4. **Language** — respond in the same language the user writes in (Russian \u2192 Russian, English \u2192 English). CRITICAL: always put spaces between words. Never truncate or garble words.
5. **Code blocks** — always use \`\`\`lang for syntax highlighting
6. **Be practical** — give working code, not pseudo-code
7. **Be concise** — don't over-explain obvious things

## Thinking Chain Format:
\u3010Analyzing the problem\u3011
\u3010Choosing approach: X because Y\u3011
\u3010Designing structure\u3011
\u3010Writing implementation\u3011
\u3010Adding error handling\u3011

Always include relevant thinking steps. Users see them as a collapsible chain.`;

  const modePrompts: Record<string, string> = {
    vibe: `\n\n## Mode: Vibe Coding \ud83d\udd28\nYou are in creative, opinionated code generation mode. The user describes an idea \u2014 you build it immediately.\n\n### Output format:\n1. Generate complete, working code \u2014 no pseudo-code, no skipping files\n2. After the code: a 2-4 sentence description of what was built and WHY\n3. Add 1-3 real, verified links if relevant (MDN, official docs, etc.)\n4. One concrete next step: \ud83d\udca1 **Next step**: ...\n\n### Code quality:\n- Meaningful, self-documenting names\n- Single responsibility per function\n- File structure: imports \u2192 types \u2192 constants \u2192 functions \u2192 exports\n- Modern stack: TypeScript, React/Next.js, Tailwind\n- Start with code immediately \u2014 no long introductions`,
    debug: `\n\n## Mode: Debug \ud83d\udc1b\nDebugging expert. Show EXACT fix with before/after. Explain WHY the bug happened. Parse error messages line by line. Suggest prevention.`,
    refactor: `\n\n## Mode: Refactor \ud83d\udd27\nCode optimization expert. Show before \u2192 after diffs. Calculate complexity improvements. Apply SOLID, DRY, KISS. Add TypeScript types.`,
    architect: `\n\n## Mode: Architecture \ud83d\udcd0\nSystem design expert. ASCII diagrams. Describe components, data flow, APIs, DB schema. Tech stack recommendations with reasoning.`,
    explain: `\n\n## Mode: Explain \ud83d\udcdd\nPatient code teacher. Break down section by section. Explain WHAT and WHY. Add inline comments. Simple language.`,
    search: `\n\n## Mode: Open Search \ud83c\udf10\nYou are an AI-powered search assistant. Your PRIMARY job is to search the web and provide accurate, up-to-date answers.\n\n### Rules:\n1. **ALWAYS call web_search first** \u2014 even if you think you know the answer. The user is in Search mode because they want real-time data.\n2. **Multiple searches allowed** \u2014 search 2-3 times if needed to get comprehensive info.\n3. **Cite your sources** \u2014 after every factual claim, include the source URL in markdown: [Source](url)\n4. **Structure your answer**:\n   - \ud83d\udccc **Direct answer** \u2014 one clear sentence at the top\n   - \ud83d\udcca **Details** \u2014 expand with data, numbers, context\n   - \ud83d\udd17 **Sources** \u2014 list all sources at the bottom\n5. **For crypto/prices** \u2014 use crypto_price tool first, then add context from web_search\n6. **Be factual** \u2014 no hallucinations. If search fails, say so clearly.\n7. **Language** \u2014 respond in the same language the user writes in.`,
  };

  return base + (modePrompts[mode] || modePrompts.vibe);
}

// ── Tool-augmented completion (with agentic loop) ─────────────────────────────

interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

interface Message {
  role: string;
  content: string | unknown;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

async function runWithTools(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  controller: ReadableStreamDefaultController,
  sse: (obj: Record<string, unknown>) => Uint8Array
): Promise<void> {
  let currentMessages = [...messages];
  const maxIterations = 5;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: currentMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 8192,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }

    // Collect streamed response
    const reader = res.body!.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let rawBuf = '';
    let assistantContent = '';
    const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();
    let thinkingDone = false;
    let thinkingBuf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      rawBuf += decoder.decode(value, { stream: true });
      const lines = rawBuf.split('\n');
      rawBuf = lines.pop() || '';

      for (const line of lines) {
        const data = line.startsWith('data: ') ? line.slice(6).trim() : '';
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;

          // Accumulate text content
          if (delta.content) {
            assistantContent += delta.content;

            if (!thinkingDone) {
              thinkingBuf += delta.content;
              const stepRe = /\u3010([^\u3011]+)\u3011/g;
              let m: RegExpExecArray | null;
              while ((m = stepRe.exec(thinkingBuf)) !== null) {
                controller.enqueue(sse({ t: 'thinking', v: m[1] }));
              }
              thinkingBuf = thinkingBuf.replace(/\u3010[^\u3011]+\u3011/g, '');
              if (thinkingBuf.replace(/\s+/g, '').length > 10) {
                thinkingDone = true;
                controller.enqueue(sse({ t: 'thinking_done' }));
                if (thinkingBuf.trim()) {
                  controller.enqueue(sse({ t: 'token', v: thinkingBuf }));
                  thinkingBuf = '';
                }
              }
            } else {
              controller.enqueue(sse({ t: 'token', v: delta.content }));
            }
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, { id: tc.id || '', name: '', args: '' });
              }
              const existing = toolCalls.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
            }
          }
        } catch { /* skip malformed */ }
      }
    }

    // Flush remaining decoder bytes
    const remaining = decoder.decode();
    if (remaining) rawBuf += remaining;

    // If no tool calls — we're done, flush remaining thinking if needed
    if (toolCalls.size === 0) {
      if (!thinkingDone) {
        controller.enqueue(sse({ t: 'thinking_done' }));
        if (thinkingBuf.trim()) controller.enqueue(sse({ t: 'token', v: thinkingBuf }));
      }
      return;
    }

    // Execute tools and continue the loop
    const assistantMsg: Message = {
      role: 'assistant',
      content: assistantContent || null,
      tool_calls: Array.from(toolCalls.entries()).map(([, tc]) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args },
      })),
    };
    currentMessages = [...currentMessages, assistantMsg];

    // Notify user tools are running
    for (const [, tc] of toolCalls) {
      let label = '';
      try {
        const args = JSON.parse(tc.args);
        if (tc.name === 'web_search')   label = `\ud83d\udd0d Searching: ${args.query}`;
        if (tc.name === 'crypto_price') label = `\ud83d\udcb0 Getting prices: ${args.coins}`;
        if (tc.name === 'get_datetime') label = `\ud83d\udd52 Getting current time`;
      } catch { label = `Running ${tc.name}`; }
      controller.enqueue(sse({ t: 'thinking', v: label }));
    }

    // Run tools in parallel
    const toolResults = await Promise.all(
      Array.from(toolCalls.entries()).map(async ([, tc]) => {
        try {
          const args = JSON.parse(tc.args);
          const result = await executeTool(tc.name, args);
          return { id: tc.id, name: tc.name, result };
        } catch (e) {
          return { id: tc.id, name: tc.name, result: `Error: ${String(e)}` };
        }
      })
    );

    // Add tool results to messages
    for (const tr of toolResults) {
      currentMessages.push({
        role: 'tool',
        content: tr.result,
        tool_call_id: tr.id,
        name: tr.name,
      });
    }
  }

  controller.enqueue(sse({ t: 'thinking_done' }));
}

// ── Main POST handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      message, history = [], mode = 'vibe',
      image, imageMime = 'image/jpeg',
      provider = 'groq',
      openaiKey = '',
    } = await req.json();

    if (!message?.trim() && !image) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const systemPrompt = getSystemPrompt(mode);

    const userContent: unknown = image
      ? [
          { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}` } },
          { type: 'text', text: message?.trim() || '\u041e\u043f\u0438\u0448\u0438 \u044d\u0442\u043e\u0442 \u043a\u043e\u0434.' },
        ]
      : (message?.trim() || '');

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-20),
      { role: 'user', content: userContent },
    ];

    const encoder = new TextEncoder();
    function sse(obj: Record<string, unknown>) {
      return encoder.encode('data: ' + JSON.stringify(obj) + '\n\n');
    }

    // Vision requests go to Groq (no tool support needed for image analysis)
    if (image) {
      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages,
          temperature: 0.4,
          max_tokens: 8192,
          stream: true,
        }),
      });
      if (!groqRes.ok) return NextResponse.json({ error: 'Vision API error' }, { status: 502 });
      return buildSSEStream(groqRes);
    }

    // Determine API credentials based on provider
    let apiUrl: string;
    let apiKey: string;
    let model: string;

    if (provider === 'openai') {
      apiUrl = OPENAI_URL;
      apiKey = openaiKey || process.env.OPENAI_API_KEY || '';
      model = 'gpt-4o';
      if (!apiKey) return NextResponse.json({ error: 'OpenAI API key required.' }, { status: 401 });
    } else if (provider === 'deepseek') {
      apiUrl = DEEPSEEK_URL;
      apiKey = DEEPSEEK_KEY;
      model = DEEPSEEK_MODEL;
      if (!apiKey) return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 });
    } else {
      // Groq default
      if (!GROQ_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
      apiUrl = GROQ_URL;
      apiKey = GROQ_KEY;
      model = GROQ_MODEL_DEFAULT;
    }

    // Agentic streaming response with tool loop
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(sse({ t: 'thinking_start' }));
        try {
          await runWithTools(apiUrl, apiKey, model, messages, controller, sse);
          controller.enqueue(sse({ t: 'done' }));
        } catch (err: unknown) {
          // Groq rate limit fallback to DeepSeek
          const errMsg = String(err);
          if ((errMsg.includes('429') || errMsg.includes('rate')) && provider === 'groq' && DEEPSEEK_KEY) {
            try {
              controller.enqueue(sse({ t: 'thinking', v: '\u041f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0430\u044e\u0441\u044c \u043d\u0430 DeepSeek...' }));
              await runWithTools(DEEPSEEK_URL, DEEPSEEK_KEY, DEEPSEEK_MODEL, messages, controller, sse);
              controller.enqueue(sse({ t: 'done' }));
            } catch (e2) {
              controller.enqueue(sse({ t: 'error', v: String(e2) }));
            }
          } else {
            controller.enqueue(sse({ t: 'error', v: errMsg }));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('CodeThinker error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Fallback SSE stream builder (for vision / non-tool paths) ─────────────────
function buildSSEStream(upstreamRes: Response): Response {
  const encoder = new TextEncoder();
  const reader  = upstreamRes.body!.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });

  function sse(obj: Record<string, unknown>) {
    return encoder.encode('data: ' + JSON.stringify(obj) + '\n\n');
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ t: 'thinking_start' }));
      let thinkingDone = false;
      let thinkingBuf  = '';
      let rawBuf = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawBuf += decoder.decode(value, { stream: true });
          const lines = rawBuf.split('\n');
          rawBuf = lines.pop() || '';

          for (const line of lines) {
            const data = line.startsWith('data: ') ? line.slice(6).trim() : '';
            if (!data || data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (!delta) continue;

              if (!thinkingDone) {
                thinkingBuf += delta;
                const stepRe = /\u3010([^\u3011]+)\u3011/g;
                let m: RegExpExecArray | null;
                while ((m = stepRe.exec(thinkingBuf)) !== null) {
                  controller.enqueue(sse({ t: 'thinking', v: m[1] }));
                }
                thinkingBuf = thinkingBuf.replace(/\u3010[^\u3011]+\u3011/g, '');
                if (thinkingBuf.replace(/\s+/g, '').length > 10) {
                  thinkingDone = true;
                  controller.enqueue(sse({ t: 'thinking_done' }));
                  if (thinkingBuf.trim()) { controller.enqueue(sse({ t: 'token', v: thinkingBuf })); thinkingBuf = ''; }
                }
              } else {
                controller.enqueue(sse({ t: 'token', v: delta }));
              }
            } catch { /* skip */ }
          }
        }
        const rem = decoder.decode();
        if (rem) {
          for (const line of (rawBuf + rem).split('\n')) {
            const data = line.startsWith('data: ') ? line.slice(6).trim() : '';
            if (!data || data === '[DONE]') continue;
            try {
              const d = JSON.parse(data);
              const delta = d.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(sse({ t: 'token', v: delta }));
            } catch { /* skip */ }
          }
        }
        if (!thinkingDone) {
          controller.enqueue(sse({ t: 'thinking_done' }));
          if (thinkingBuf.trim()) controller.enqueue(sse({ t: 'token', v: thinkingBuf }));
        }
        controller.enqueue(sse({ t: 'done' }));
      } catch (err) {
        controller.enqueue(sse({ t: 'error', v: String(err) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
