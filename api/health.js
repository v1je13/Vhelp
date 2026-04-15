// Cache bust: 2026-04-16-01-28
import connectToDatabase from './index.js';

export default async function handler(req, res) {
  try {
    await connectToDatabase();
    res.status(200).json({ status: 'ok', message: 'Server is running' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}
