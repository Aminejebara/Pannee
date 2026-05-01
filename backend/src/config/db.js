// src/config/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Création de la pool MySQL
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Fonction pour obtenir une connexion
export const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to the database');
    return connection;
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw error;
  }
};


