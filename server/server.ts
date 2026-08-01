import express, { Request, Response } from 'express';
import path from 'path';
import { initDatabase, incomeOps, billOps, adjustmentOps, closeDatabase } from './database';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Income routes
app.get('/api/income', (_req: Request, res: Response) => {
  try {
    res.json(incomeOps.getAll());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/income', (req: Request, res: Response) => {
  try {
    const id = incomeOps.create(req.body);
    res.json(id);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/income/:id', (req: Request, res: Response) => {
  try {
    incomeOps.update(parseInt(req.params['id'] as string), req.body);
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/income/:id', (req: Request, res: Response) => {
  try {
    incomeOps.delete(parseInt(req.params['id'] as string));
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Bills routes
app.get('/api/bills', (_req: Request, res: Response) => {
  try {
    res.json(billOps.getAll());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/bills', (req: Request, res: Response) => {
  try {
    const id = billOps.create(req.body);
    res.json(id);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/bills/:id', (req: Request, res: Response) => {
  try {
    billOps.update(parseInt(req.params['id'] as string), req.body);
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/bills/:id', (req: Request, res: Response) => {
  try {
    billOps.delete(parseInt(req.params['id'] as string));
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Adjustments routes
app.get('/api/adjustments', (_req: Request, res: Response) => {
  try {
    res.json(adjustmentOps.getAll());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/adjustments', (req: Request, res: Response) => {
  try {
    const id = adjustmentOps.create(req.body);
    res.json(id);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/adjustments/:id', (req: Request, res: Response) => {
  try {
    adjustmentOps.delete(parseInt(req.params['id'] as string));
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// SPA fallback
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

initDatabase();

const httpServer = app.listen(PORT, () => {
  console.log(`CashFlow Tracker running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  httpServer.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  httpServer.close(() => {
    closeDatabase();
    process.exit(0);
  });
});
