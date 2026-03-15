/**
 * Collection domain entities
 * Aligned with: favorites, collections, collection_items tables
 */

/** Favorite (bookmark) entity */
export interface Favorite {
  readonly id: string;
  readonly userId: string;
  readonly restaurantId: string;
  readonly createdAt: string;
}

/** User-created collection of restaurants */
export interface Collection {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isPublic: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Item within a collection */
export interface CollectionItem {
  readonly id: string;
  readonly collectionId: string;
  readonly restaurantId: string;
  readonly note: string | null;
  readonly createdAt: string;
}
