export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, email, service, details = '' } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 120) return res.status(400).json({ error: 'Please enter a valid name.' });
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (typeof service !== 'string' || service.length > 120 || typeof details !== 'string' || details.length > 4000) return res.status(400).json({ error: 'Please check the project details and try again.' });
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_EMAIL;
  const sender = process.env.RESEND_FROM;
  if (!apiKey || !recipient || !sender) return res.status(503).json({ error: 'Enquiry delivery is not configured yet. Please contact the studio directly.' });
  const safe = s => s.replace(/[<>]/g, '');
  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender, to: [recipient], reply_to: email,
        subject: 'New World Automates project enquiry — ' + safe(name.trim()),
        text: 'Name: ' + safe(name.trim()) + '\nEmail: ' + safe(email.trim()) + '\nService: ' + safe(service) + '\n\nProject details:\n' + safe(details)
      })
    });
    if (!upstream.ok) return res.status(502).json({ error: 'Your enquiry could not be sent. Please try again later.' });
    return res.status(200).json({ ok: true, message: 'Your enquiry has been sent. We will be in touch.' });
  } catch {
    return res.status(500).json({ error: 'Could not send your enquiry. Please try again.' });
  }
}
