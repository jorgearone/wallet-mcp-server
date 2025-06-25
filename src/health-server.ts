import { createServer } from 'http';

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'wallet-mcp-server',
      timestamp: new Date().toISOString(),
      noditApiKey: !!process.env.NODIT_API_KEY
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  server.listen(port, () => {
    console.error(`Health server running on port ${port}`);
  });
}

export default server;
