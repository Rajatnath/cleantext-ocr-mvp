// filepath: pages/api/gemini-vision.js
// Research: file:///mnt/data/Digital Product Idea Generation Framework.docx

import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '60mb',
    },
  },
};

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window per IP
// WHY: Simple in-memory rate limiting is sufficient for an MVP.
// In a production environment with multiple server instances, this should be replaced by Redis.
const RATE_LIMIT = new Map();

function ipFromReq(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}
function base64Bytes(base64String) {
  return Math.ceil((base64String.length * 3) / 4);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const ip = ipFromReq(req);
  const now = Date.now();
  const history = RATE_LIMIT.get(ip) || [];
  const recent = history.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'rate_limit_exceeded', message: 'Rate limit exceeded. Wait 60s.' });
  }
  RATE_LIMIT.set(ip, [...recent, now]);

  const { imageBase64, prompt = 'Transcribe the text in this image exactly. Preserve line breaks.', forceFallback } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'missing_image', message: 'Request must include imageBase64.' });
  }

  const MAX_BYTES = 50 * 1024 * 1024; // 50MB
  const bytes = base64Bytes(imageBase64);
  if (bytes > MAX_BYTES) {
    return res.status(413).json({ error: 'payload_too_large', message: 'Image exceeds 50MB limit.' });
  }

  // Try primary engine: Gemini Vision (server-side only)
  // WHY: We use Gemini 1.5 Flash (via proxy) as the primary engine because:
  // 1. It has superior multimodal capabilities (text, handwriting, tables, math).
  // 2. It is cost-effective and fast compared to larger models.
  // 3. Server-side call protects the API key.
  let geminiError = null;
  if (!forceFallback && process.env.GEMINI_KEY) {
    try {
      // WHY: Switched to gemini-2.0-flash as it is explicitly available for this API key.
      // gemini-1.5-flash was returning 404.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;
      const body = {
        contents: [{
          parts: [
            // WHY: We use a structured prompt to guide the AI's output format.
            // Explicit instructions for math ($...$) and tables ensure the output
            // renders correctly in our Markdown viewer (react-markdown + katex).
            {
              text: `Transcribe all text from this image exactly as it appears.

For mathematical formulas and equations:
- CRITICAL: Do NOT use LaTeX formatting. Do NOT use dollar signs ($).
- Write formulas in PLAIN TEXT using standard keyboard characters and Unicode symbols.
- Use standard operators: +, -, *, /, =
- Use Unicode symbols for Greek letters and math symbols: ∂, α, Δ, π, ≈, →, etc.
- Represent fractions using forward slash: (a+b)/2
- Represent superscripts/subscripts using ^ and _: T_i^n or just T(i, n) if clearer.
- Example: ∂T/∂t = α * ∂²T/∂x²
- Example: T(i, n+1) = T(i, n) + Δt * ...
- Keep it simple and readable.

For text and formatting:
- Do not transcribe long lines of underscores.
- Maintain the layout and structure of the document.

For tables:
- Detect all tabular data and represent it using standard Markdown tables.
- Preserve column headers and structure.

Return the content as a Markdown document.`
            },
            { inlineData: { mimeType: "image/png", data: imageBase64 } }
          ]
        }]
      };

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (r.ok) {
        const json = await r.json();
        const text = json?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
        if (text.trim().length) {
          // Clean up markdown code blocks if present
          let cleanedText = text.trim();
          // Remove starting ```markdown or ```
          cleanedText = cleanedText.replace(/^```(?:markdown)?\s+/, '');
          // Remove ending ```
          cleanedText = cleanedText.replace(/\s+```$/, '');

          return res.status(200).json({ text: cleanedText.trim(), source: 'gemini' });
        }
        geminiError = 'empty_text';
        console.error('Gemini returned empty text:', JSON.stringify(json));
      } else {
        const errText = await r.text();
        console.error(`Gemini API error (${r.status}):`, errText.slice(0, 400));
        geminiError = `http_${r.status}: ${errText.slice(0, 100)}`;
      }
    } catch (err) {
      console.error('Gemini network error:', err?.message || err);
      geminiError = err?.message || String(err);
    }
  } else if (!process.env.GEMINI_KEY) {
    geminiError = 'gemini_key_not_configured';
  }

  // Fallback: PaddleOCR webhook (Colab / HuggingFace Space)
  // WHY: We implement a fallback to PaddleOCR because:
  // 1. AI models (Gemini) can occasionally hallucinate or fail on specific layouts.
  // 2. Specialized OCR engines (Paddle) are sometimes better at raw text detection in complex scenes.
  // 3. Redundancy ensures high availability for the user.
  if (process.env.PADDLE_HOOK) {
    try {
      const paddleRes = await fetch(process.env.PADDLE_HOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });
      if (paddleRes.ok) {
        const data = await paddleRes.json();
        const text = (data && (data.text || data.result)) || '';
        if (text.trim().length) {
          return res.status(200).json({ text: text.trim(), source: 'paddle_fallback' });
        }
      } else {
        const errTxt = await paddleRes.text();
        console.error('Paddle webhook error:', errTxt.slice(0, 400));
      }
    } catch (err) {
      console.error('Paddle webhook network error:', err?.message || err);
    }
  }

  // Final fallback: failure response with guidance for client fallback to Tesseract
  return res.status(503).json({
    error: 'all_engines_failed',
    message: 'All OCR engines failed or unavailable.',
    details: { gemini: geminiError || 'not_attempted_or_failed', paddle: process.env.PADDLE_HOOK ? 'attempted' : 'not_configured' },
    hint: 'Try Standard OCR (local Tesseract) or reduce image size / retry later.'
  });
}
