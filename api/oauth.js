export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'OAuth credentials are not configured on the server.' });
    }

    try {
        const githubResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
            }),
        });

        const data = await githubResponse.json();

        if (data.error) {
            return res.status(400).json({ error: data.error_description || data.error });
        }

        return res.status(200).json({ access_token: data.access_token });
    } catch (error) {
        console.error('OAuth token exchange error:', error);
        return res.status(500).json({ error: 'Internal server error during token exchange' });
    }
}
