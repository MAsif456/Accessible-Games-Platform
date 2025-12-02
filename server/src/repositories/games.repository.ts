/**
 * Games Repository
 *
 * @module repositories/games.repository
 * @description
 * **Design Pattern: Repository Pattern**
 *
 * Implements the Repository pattern to encapsulate all data access logic for Game entities.
 * This pattern provides:
 * - Separation of business logic from data access
 * - Centralized query logic
 * - Easier testing with mock repositories
 * - Database implementation agnostic interface
 *
 * **Benefits:**
 * - Single Responsibility: Handles only data access
 * - Testability: Easy to create test doubles
 * - Maintainability: Changes to queries isolated to repository
 * - Scalability: Can swap database implementations
 *
 * @example
 * const repo = GamesRepository.getInstance();
 * const game = await repo.findById('507f1f77bcf86cd799439011');
 */

import { FilterQuery, SortOrder, UpdateQuery } from 'mongoose';
import { GameModel, IGame } from '../models';

/**
 * Repository interface for Game entities.
 * Defines the contract for all game data operations.
 *
 * @interface IGamesRepository
 */
export interface IGamesRepository {
  /**
   * Find a single game by MongoDB ObjectId.
   *
   * @param {string} id - MongoDB ObjectId as string
   * @returns {Promise<IGame | null>} Game document or null if not found
   */
  findById(id: string): Promise<IGame | null>;

  /**
   * Find all games matching the filter criteria.
   *
   * @param {FilterQuery<IGame>} filter - MongoDB filter query
   * @param {Record<string, SortOrder>} [sort] - Optional sort criteria
   * @param {number} [skip] - Optional number of documents to skip
   * @param {number} [limit] - Optional maximum number of documents to return
   * @returns {Promise<IGame[]>} Array of game documents
   */
  findAll(
    filter: FilterQuery<IGame>,
    sort?: Record<string, SortOrder>,
    skip?: number,
    limit?: number
  ): Promise<IGame[]>;

  /**
   * Find a single game matching the filter criteria.
   *
   * @param {FilterQuery<IGame>} filter - MongoDB filter query
   * @returns {Promise<IGame | null>} Game document or null if not found
   */
  findOne(filter: FilterQuery<IGame>): Promise<IGame | null>;

  /**
   * Count documents matching the filter criteria.
   *
   * @param {FilterQuery<IGame>} filter - MongoDB filter query
   * @returns {Promise<number>} Number of matching documents
   */
  countDocuments(filter: FilterQuery<IGame>): Promise<number>;

  /**
   * Create a new game in the database.
   *
   * @param {Partial<IGame>} data - Game data
   * @returns {Promise<IGame>} Created game document
   */
  create(data: Partial<IGame>): Promise<IGame>;

  /**
   * Update an existing game by ID.
   *
   * @param {string} id - MongoDB ObjectId as string
   * @param {UpdateQuery<IGame>} data - Update data
   * @returns {Promise<IGame | null>} Updated game document or null if not found
   */
  update(id: string, data: UpdateQuery<IGame>): Promise<IGame | null>;

  /**
   * Delete a game by ID.
   *
   * @param {string} id - MongoDB ObjectId as string
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if a game exists with the given filter.
   *
   * @param {FilterQuery<IGame>} filter - MongoDB filter query
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  exists(filter: FilterQuery<IGame>): Promise<boolean>;
}

/**
 * Concrete implementation of the Games Repository.
 *
 * **Design Pattern: Repository Pattern + Singleton Pattern**
 *
 * This class implements the Repository pattern to encapsulate data access,
 * and uses the Singleton pattern to ensure only one instance exists.
 *
 * @class GamesRepository
 * @implements {IGamesRepository}
 *
 * @example
 * const repo = GamesRepository.getInstance();
 * const games = await repo.findAll({ isPublished: true });
 */
export class GamesRepository implements IGamesRepository {
  private static instance: GamesRepository;

  /**
   * Private constructor to prevent direct instantiation.
   * Use getInstance() instead.
   */
  private constructor() {}

  /**
   * Get the singleton instance of the repository.
   *
   * @returns {GamesRepository} The singleton instance
   */
  public static getInstance(): GamesRepository {
    if (!GamesRepository.instance) {
      GamesRepository.instance = new GamesRepository();
    }
    return GamesRepository.instance;
  }

  /**
   * @inheritdoc
   */
  async findById(id: string): Promise<IGame | null> {
    try {
      return await GameModel.findById(id).exec();
    } catch (error) {
      console.error(`[GamesRepository] Error finding game by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * @inheritdoc
   */
  async findAll(
    filter: FilterQuery<IGame> = {},
    sort?: Record<string, SortOrder>,
    skip?: number,
    limit?: number
  ): Promise<IGame[]> {
    try {
      let query = GameModel.find(filter);

      if (sort) {
        query = query.sort(sort);
      }

      if (skip !== undefined) {
        query = query.skip(skip);
      }

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      return await query.exec();
    } catch (error) {
      console.error('[GamesRepository] Error finding games:', error);
      return [];
    }
  }

  /**
   * @inheritdoc
   */
  async findOne(filter: FilterQuery<IGame>): Promise<IGame | null> {
    try {
      return await GameModel.findOne(filter).exec();
    } catch (error) {
      console.error('[GamesRepository] Error finding game:', error);
      return null;
    }
  }

  /**
   * @inheritdoc
   */
  async countDocuments(filter: FilterQuery<IGame> = {}): Promise<number> {
    try {
      return await GameModel.countDocuments(filter).exec();
    } catch (error) {
      console.error('[GamesRepository] Error counting games:', error);
      return 0;
    }
  }

  /**
   * @inheritdoc
   */
  async create(data: Partial<IGame>): Promise<IGame> {
    try {
      const game = new GameModel(data);
      await game.save();
      return game;
    } catch (error) {
      console.error('[GamesRepository] Error creating game:', error);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async update(id: string, data: UpdateQuery<IGame>): Promise<IGame | null> {
    try {
      return await GameModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      }).exec();
    } catch (error) {
      console.error(`[GamesRepository] Error updating game ${id}:`, error);
      return null;
    }
  }

  /**
   * @inheritdoc
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await GameModel.findByIdAndDelete(id).exec();
      return result !== null;
    } catch (error) {
      console.error(`[GamesRepository] Error deleting game ${id}:`, error);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async exists(filter: FilterQuery<IGame>): Promise<boolean> {
    try {
      const count = await GameModel.countDocuments(filter).limit(1).exec();
      return count > 0;
    } catch (error) {
      console.error('[GamesRepository] Error checking game existence:', error);
      return false;
    }
  }
}

/**
 * Export singleton instance for convenient imports.
 */
export default GamesRepository.getInstance();
