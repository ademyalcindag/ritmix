// api/token.js  (geçici test için sabit secret)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, redirect_uri } = req.body;
  const clientId = 'c9b9ffada77b4d05b758ca33a2fd43f6';
  const clientSecret = '5dc41bd9d1414e44a18d1c58a1946603';   // sabit
  const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri
  });

  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await r.json();
  if (data.error) return res.status(400).json(data);
  res.status(200).json(data);
}