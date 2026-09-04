require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');

const store = require('./dataStore');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ADMIN_PASSWORD) {
  console.warn('ATTENTION: ADMIN_PASSWORD n\'est pas défini, l\'accès admin sera bloqué.');
}

app.use(express.json());
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET || 'dev-secret-a-changer',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: 'lax',
  httpOnly: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

store.readData().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
});
