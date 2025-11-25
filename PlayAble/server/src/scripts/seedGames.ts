import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GameModel, { IGame } from '../models/game';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb';

async function seedGames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const dataPath = path.join(__dirname, '..', '..', 'data', 'games.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const games: Partial<IGame>[] = JSON.parse(raw);

    for (const game of games) {
      if (!game.slug) {
        console.warn('Skipping game without slug:', game);
        continue;
      }

      await GameModel.findOneAndUpdate(
        { slug: game.slug },
        { $set: game },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`Upserted game: ${game.slug}`);
    }

    console.log('Seeding complete');
  } catch (err) {
    console.error('Error seeding games:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedGames();
