import type { DbPool } from '../db/pool.js';
import type { UserDto, UserStatus } from '../types.js';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: UserStatus;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

export interface NewUserRecord {
  email: string; // normalized (lowercase)
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface UserCredentialsRow {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: UserStatus;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

function mapUser(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    status: row.status,
    role: row.role as 'customer' | 'admin',
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export function createUserRepository(pool: DbPool) {
  async function createUser(record: NewUserRecord): Promise<UserDto> {
    const res = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING id, email, password_hash, first_name, last_name, phone, status, role, created_at, last_login_at`,
      [record.email, record.passwordHash, record.firstName, record.lastName, record.phone]
    );
    const row = res.rows[0];
    if (!row) throw new Error('User insert returned no row');
    return mapUser(row);
  }

  /** Full row including the password hash — auth paths only, never exposed. */
  async function findByEmail(email: string): Promise<UserCredentialsRow | null> {
    const res = await pool.query<UserCredentialsRow>(
      `SELECT id, email, password_hash, first_name, last_name, phone, status, role, created_at, last_login_at
       FROM users WHERE lower(email) = lower($1)`,
      [email]
    );
    return res.rows[0] ?? null;
  }

  async function findById(id: number): Promise<UserDto | null> {
    const res = await pool.query<UserRow>(
      `SELECT id, email, password_hash, first_name, last_name, phone, status, role, created_at, last_login_at
       FROM users WHERE id = $1`,
      [id]
    );
    const row = res.rows[0];
    return row ? mapUser(row) : null;
  }

  async function touchLastLogin(id: number): Promise<void> {
    await pool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
  }

  async function updateProfile(
    id: number,
    fields: { firstName?: string; lastName?: string; phone?: string }
  ): Promise<UserDto | null> {
    const res = await pool.query<UserRow>(
      `UPDATE users
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           phone = COALESCE($4, phone),
           updated_at = now()
       WHERE id = $1
       RETURNING id, email, password_hash, first_name, last_name, phone, status, role, created_at, last_login_at`,
      [id, fields.firstName ?? null, fields.lastName ?? null, fields.phone ?? null]
    );
    const row = res.rows[0];
    return row ? mapUser(row) : null;
  }

  async function updatePassword(id: number, passwordHash: string): Promise<void> {
    await pool.query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [id, passwordHash]);
  }

  return { createUser, findByEmail, findById, touchLastLogin, updateProfile, updatePassword };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
