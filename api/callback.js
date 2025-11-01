// api/callback.js

export default async function handler(req, res) {
    // req.cookies'i doğru kullanmak için Vercel'in çerezlerini kullanırız.
    const cookies = req.headers.cookie;
    const cookieMap = {};
    if (cookies) {
        cookies.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            cookieMap[parts[0]] = parts[1];
        });
    }

    const { code, state } = req.query;
    const storedState = cookieMap.spotify_auth_state;
    const code_verifier = cookieMap.spotify_code_verifier; 

    // Gerekli ortam değişkenlerini Vercel'den alıyoruz (dashboard'a girdiklerin)
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI; 
    

    if (state === null || state !== storedState || !code_verifier) {
        // State uyuşmazlığı veya code_verifier yok (Güvenlik hatası)
        res.status(400).send('Authentication Error: State or Code Verifier Mismatch.');
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
            code_verifier: code_verifier 
        }).toString(),
    };

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', authOptions);
        const tokenData = await tokenResponse.json();

        if (tokenResponse.ok) {
            // Başarılı: Token'ı tarayıcıya yönlendir
            const accessToken = tokenData.access_token;

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
            // Kullanılan cookie'leri temizle
            res.setHeader('Set-Cookie', ['spotify_code_verifier=; Max-Age=0', 'spotify_auth_state=; Max-Age=0']);
            res.status(200).send(successScript);

        } else {
            // Hata: Spotify'dan token alamadı
            res.status(500).send('Error fetching token: ' + tokenData.error_description || tokenResponse.statusText);
        }
    } catch (error) {
        res.status(500).send('Server Error: ' + error.message);
    }
}