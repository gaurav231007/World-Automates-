export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Chat assistant is not configured yet. Add GEMINI_API_KEY in Vercel environment variables.' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  if (!message || message.length > 2000) return res.status(400).json({ error: 'Please send a message under 2,000 characters.' });
  const contents = [
    { role: 'user', parts: [{ text: 'You are the World Automates website assistant. Help visitors understand website design, branding, apps, AI and business automation. Be concise, friendly and honest. Do not invent prices, client results, delivery timelines or claim a booking is confirmed. For quotes or project commitments, ask them to submit the enquiry form.\n\nVisitor message: ' + message }] },
    ...history.filter(x => ['user','model'].includes(x?.role) && typeof x?.text === 'string').map(x => ({ role: x.role, parts: [{ text: x.text.slice(0, 2000) }] }))
  ];
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: 'You are the World Automates website assistant. Help visitors understand website design, branding, apps, AI and business automation. Be concise, friendly and honest. Do not invent prices, client results, delivery timelines or claim a booking is confirmed. For quotes or project commitments, ask them to submit the enquiry form.' }] }, contents, generationConfig: { temperature: 0.55, maxOutputTokens: 350 } })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again later.' });
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!reply) return res.status(502).json({ error: 'I could not prepare a reply. Please try again.' });
    return res.status(200).json({ reply });
  } catch {
    return res.status(500).json({ error: 'Could not reach the assistant. Please try again.' });
  }
}
