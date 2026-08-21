import type { DbPool } from '../db/pool.js';
import type { AddressDto } from '../types.js';

interface AddressRow {
  id: number;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface AddressRecord {
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function mapAddress(row: AddressRow): AddressDto {
  return {
    id: row.id,
    label: row.label,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export function createAddressRepository(pool: DbPool) {
  async function listForUser(userId: number): Promise<AddressDto[]> {
    const res = await pool.query<AddressRow>(
      `SELECT id, label, first_name, last_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
       FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return res.rows.map(mapAddress);
  }

  async function createForUser(userId: number, record: AddressRecord): Promise<AddressDto> {
    // First address becomes the default; otherwise explicit default wins.
    const count = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM addresses WHERE user_id = $1`,
      [userId]
    );
    // The first saved address becomes the default.
    const isDefault = Number(count.rows[0]?.n ?? 0) === 0;
    const res = await pool.query<AddressRow>(
      `INSERT INTO addresses (user_id, label, first_name, last_name, phone, line1, line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, label, first_name, last_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at`,
      [userId, record.label, record.firstName, record.lastName, record.phone, record.line1, record.line2, record.city, record.state, record.postalCode, record.country, isDefault]
    );
    const row = res.rows[0];
    if (!row) throw new Error('Address insert returned no row');
    return mapAddress(row);
  }

  async function getForUser(userId: number, addressId: number): Promise<AddressDto | null> {
    const res = await pool.query<AddressRow>(
      `SELECT id, label, first_name, last_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
       FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );
    const row = res.rows[0];
    return row ? mapAddress(row) : null;
  }

  async function updateForUser(userId: number, addressId: number, record: Partial<AddressRecord>): Promise<AddressDto | null> {
    const res = await pool.query<AddressRow>(
      `UPDATE addresses
       SET label = COALESCE($3, label),
           first_name = COALESCE($4, first_name),
           last_name = COALESCE($5, last_name),
           phone = COALESCE($6, phone),
           line1 = COALESCE($7, line1),
           line2 = COALESCE($8, line2),
           city = COALESCE($9, city),
           state = COALESCE($10, state),
           postal_code = COALESCE($11, postal_code),
           country = COALESCE($12, country),
           updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, label, first_name, last_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at`,
      [
        addressId,
        userId,
        record.label ?? null,
        record.firstName ?? null,
        record.lastName ?? null,
        record.phone ?? null,
        record.line1 ?? null,
        record.line2 ?? null,
        record.city ?? null,
        record.state ?? null,
        record.postalCode ?? null,
        record.country ?? null,
      ]
    );
    const row = res.rows[0];
    return row ? mapAddress(row) : null;
  }

  async function deleteForUser(userId: number, addressId: number): Promise<boolean> {
    const res = await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [addressId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async function setDefault(userId: number, addressId: number): Promise<void> {
    await pool.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE addresses SET is_default = true, updated_at = now() WHERE id = $1 AND user_id = $2`, [addressId, userId]);
  }

  return { listForUser, createForUser, getForUser, updateForUser, deleteForUser, setDefault };
}

export type AddressRepository = ReturnType<typeof createAddressRepository>;
