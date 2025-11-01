// api/callback.js

export default async function handler(req, res) {
    const { code, state } = req.query;
    const storedState = req.cookies ? req.cookies.spotify_auth_state : null;
    
    // Gerekli ortam değişkenlerini al
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
    const code_verifier = req.cookies.spotify_code_verifier; // Tarayıcıdan gelen code verifier

    if (state === null || state !== storedState) {
        // State uyuşmazlığı (Güvenlik hatası)
        res.status(400).send('State mismatch');
        return;
    }

    // Token alma isteği
    const authOptions = {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code',
            code_verifier: code_verifier // PKCE için verifier
        }).toString(),
    };

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', authOptions);
        const tokenData = await tokenResponse.json();

        if (tokenResponse.ok) {
            // Başarılı: Token'ı tarayıcıya yönlendir
            const accessToken = tokenData.access_token;
            const expires = tokenData.expires_in;

            // Tarayıcıdaki Local Storage'a kaydetme işlemini tetikleyen script
            const successScript = `
                <html>
                    <head>
                        <title>Success</title>
                        <script>
                            // Token'ı Local Storage'a kaydet ve ana sayfaya yönlen
                            localStorage.setItem('at', '${accessToken}');
                            window.location.href = 'https://ritmix.vercel.app/';
                        </script>
                    </head>
                    <body>Yönlendiriliyor...</body>
                </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(successScript);
        } else {
            // Hata: Spotify'dan token alamadı
            res.status(500).send('Error fetching token: ' + tokenData.error_description);
        }
    } catch (error) {
        res.status(500).send('Server Error: ' + error.message);
    }
}