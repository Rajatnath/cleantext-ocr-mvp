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
  let geminiError = null;
  if (!forceFallback && process.env.GEMINI_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${process.env.GEMINI_KEY}`;
      const body = {
        contents: [{
          parts: [
            { text: prompt },
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
          return res.status(200).json({ text: text.trim(), source: 'gemini' });
        }
        geminiError = 'empty_text';
      } else {
        const errText = await r.text();
        console.error('Gemini API error:', errText.slice(0, 400));
        geminiError = `http_${r.status}`;
      }
    } catch (err) {
      console.error('Gemini network error:', err?.message || err);
      geminiError = err?.message || String(err);
    }
  } else if (!process.env.GEMINI_KEY) {
    geminiError = 'gemini_key_not_configured';
  }

  // Fallback: PaddleOCR webhook (Colab / HuggingFace Space)
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
