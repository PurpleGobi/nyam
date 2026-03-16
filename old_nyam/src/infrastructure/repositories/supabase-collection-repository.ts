/**
 * Supabase implementation of CollectionRepository
 */

import { createClient } from '../supabase/client';
import type { Row } from '../supabase/types';
import type { Favorite, Collection, CollectionItem } from '@/domain/entities/collection';
import type {
  CollectionRepository,
  CreateCollectionInput,
  UpdateCollectionInput,
  AddCollectionItemInput,
} from '@/domain/repositories/collection-repository';

type FavoriteRow = Row<'favorites'>;
type CollectionRow = Row<'collections'>;
type CollectionItemRow = Row<'collection_items'>;

/** Map a Supabase favorite row to the domain entity */
function toFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    createdAt: row.created_at,
  };
}

/** Map a Supabase collection row to the domain entity */
function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map a Supabase collection item row to the domain entity */
function toCollectionItem(row: CollectionItemRow): CollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    restaurantId: row.restaurant_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

export const supabaseCollectionRepository: CollectionRepository = {
  async toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
    const supabase = createClient();

    // Check if favorite already exists
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to remove favorite: ${error.message}`);
      }

      return false;
    }

    // Add favorite
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
      });

    if (error) {
      throw new Error(`Failed to add favorite: ${error.message}`);
    }

    return true;
  },

  async listFavorites(userId: string): Promise<readonly Favorite[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list favorites: ${error.message}`);
    }

    return (data ?? []).map(toFavorite);
  },

  async createCollection(input: CreateCollectionInput): Promise<Collection> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: input.userId,
        name: input.name,
        description: input.description ?? null,
        is_public: input.isPublic ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create collection: ${error.message}`);
    }

    return toCollection(data);
  },

  async findCollectionById(id: string): Promise<Collection | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch collection: ${error.message}`);
    }

    return toCollection(data);
  },

  async listCollections(userId: string): Promise<readonly Collection[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }

    return (data ?? []).map(toCollection);
  },

  async updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update collection: ${error.message}`);
    }

    return toCollection(data);
  },

  async deleteCollection(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete collection: ${error.message}`);
    }
  },

  async addItem(input: AddCollectionItemInput): Promise<CollectionItem> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('collection_items')
      .insert({
        collection_id: input.collectionId,
        restaurant_id: input.restaurantId,
        note: input.note ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add collection item: ${error.message}`);
    }

    return toCollectionItem(data);
  },

  async removeItem(collectionId: string, restaurantId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      throw new Error(`Failed to remove collection item: ${error.message}`);
    }
  },
};
