import { supabaseAdmin } from '../config/supabase.js';
import type { Database } from '../types/database.types.js';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export class ProductService {
  /**
   * Obtiene todos los productos de la tabla.
   */
  static async getAll(): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Obtiene un producto por su ID.
   */
  static async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Inserta un nuevo producto.
   */
  static async create(productData: ProductInsert): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Actualiza un producto existente si pertenece al usuario especificado.
   */
  static async update(
    id: string,
    userId: string,
    productData: Omit<ProductUpdate, 'id' | 'user_id' | 'created_at'>
  ): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Elimina un producto si pertenece al usuario especificado.
   */
  static async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
