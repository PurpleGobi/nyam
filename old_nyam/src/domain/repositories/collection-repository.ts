/**
 * Collection repository interface
 * Infrastructure layer implements this with Supabase
 */

import type { Favorite, Collection, CollectionItem } from '../entities/collection';

/** Data required to create a collection */
export interface CreateCollectionInput {
  readonly userId: string;
  readonly name: string;
  readonly description?: string;
  readonly isPublic?: boolean;
}

/** Fields allowed for collection update */
export interface UpdateCollectionInput {
  readonly name?: string;
  readonly description?: string;
  readonly isPublic?: boolean;
}

/** Data required to add an item to a collection */
export interface AddCollectionItemInput {
  readonly collectionId: string;
  readonly restaurantId: string;
  readonly note?: string;
}

export interface CollectionRepository {
  /** Toggle a favorite (add if not exists, remove if exists). Returns current state. */
  toggleFavorite(userId: string, restaurantId: string): Promise<boolean>;

  /** List all favorites for a user */
  listFavorites(userId: string): Promise<readonly Favorite[]>;

  /** Create a new collection */
  createCollection(input: CreateCollectionInput): Promise<Collection>;

  /** Find a collection by ID */
  findCollectionById(id: string): Promise<Collection | null>;

  /** List all collections for a user */
  listCollections(userId: string): Promise<readonly Collection[]>;

  /** Update a collection */
  updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection>;

  /** Delete a collection */
  deleteCollection(id: string): Promise<void>;

  /** Add a restaurant to a collection */
  addItem(input: AddCollectionItemInput): Promise<CollectionItem>;

  /** Remove a restaurant from a collection */
  removeItem(collectionId: string, restaurantId: string): Promise<void>;
}
