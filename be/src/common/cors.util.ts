const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3002'];

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const configured = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()) : [];
  return [...DEV_ORIGINS, ...configured].includes(origin) || /\.vercel\.app$/.test(origin);
}
