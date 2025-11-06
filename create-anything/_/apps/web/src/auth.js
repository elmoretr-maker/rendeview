/**
 * WARNING: This file connects this app to Anythings's internal auth system. Do
 * not attempt to edit it. Modifying it will have no effect on your project as it is controlled by our system.
 * Do not import @auth/create or @auth/create anywhere else or it may break. This is an internal package.
 */
import CreateAuth from "@auth/create"
import Credentials from "@auth/core/providers/credentials"
import { Pool } from '@neondatabase/serverless'
import { hash, verify } from 'argon2'

function Adapter(client) {
  return {
    async createVerificationToken(
      verificationToken
    ) {
      const { identifier, expires, token } = verificationToken;
      const sql = `
        INSERT INTO auth_verification_token ( identifier, expires, token )
        VALUES ($1, $2, $3)
        `;
      await client.query(sql, [identifier, expires, token]);
      return verificationToken;
    },
    async useVerificationToken({
      identifier,
      token,
    }) {
      const sql = `delete from auth_verification_token
      where identifier = $1 and token = $2
      RETURNING identifier, expires, token `;
      const result = await client.query(sql, [identifier, token]);
      return result.rowCount !== 0 ? result.rows[0] : null;
    },

    async createUser(user) {
      const { name, email, emailVerified, image } = user;
      const sql = `
        INSERT INTO auth_users (name, email, "emailVerified", image)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, "emailVerified", image`;
      const result = await client.query(sql, [
        name,
        email,
        emailVerified,
        image,
      ]);
      return result.rows[0];
    },
    async getUser(id) {
      const sql = 'select * from auth_users where id = $1';
      try {
        const result = await client.query(sql, [id]);
        return result.rowCount === 0 ? null : result.rows[0];
      } catch {
        return null;
      }
    },
    async getUserByEmail(email) {
      const sql = 'select * from auth_users where email = $1';
      const result = await client.query(sql, [email]);
      if (result.rowCount === 0) {
        return null;
      }
      const userData = result.rows[0];
      const accountsData = await client.query(
        'select * from auth_accounts where "providerAccountId" = $1',
        [userData.id]
      );
      return {
        ...userData,
        accounts: accountsData.rows,
      };
    },
    async getUserByAccount({
      providerAccountId,
      provider,
    }) {
      const sql = `
          select u.* from auth_users u join auth_accounts a on u.id = a."userId"
          where
          a.provider = $1
          and
          a."providerAccountId" = $2`;

      const result = await client.query(sql, [provider, providerAccountId]);
      return result.rowCount !== 0 ? result.rows[0] : null;
    },
    async updateUser(user) {
      const fetchSql = 'select * from auth_users where id = $1';
      const query1 = await client.query(fetchSql, [user.id]);
      const oldUser = query1.rows[0];

      const newUser = {
        ...oldUser,
        ...user,
      };

      const { id, name, email, emailVerified, image } = newUser;
      const updateSql = `
        UPDATE auth_users set
        name = $2, email = $3, "emailVerified" = $4, image = $5
        where id = $1
        RETURNING name, id, email, "emailVerified", image
      `;
      const query2 = await client.query(updateSql, [
        id,
        name,
        email,
        emailVerified,
        image,
      ]);
      return query2.rows[0];
    },
    async linkAccount(account) {
      const sql = `
      insert into auth_accounts
      (
        "userId",
        provider,
        type,
        "providerAccountId",
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type,
        password
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning
        id,
        "userId",
        provider,
        type,
        "providerAccountId",
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type,
        password
      `;

      const params = [
        account.userId,
        account.provider,
        account.type,
        account.providerAccountId,
        account.access_token,
        account.expires_at,
        account.refresh_token,
        account.id_token,
        account.scope,
        account.session_state,
        account.token_type,
        account.extraData?.password,
      ];

      const result = await client.query(sql, params);
      return result.rows[0];
    },
    async createSession({ sessionToken, userId, expires }) {
      if (userId === undefined) {
        throw Error('userId is undef in createSession');
      }
      const sql = `insert into auth_sessions ("userId", expires, "sessionToken")
      values ($1, $2, $3)
      RETURNING id, "sessionToken", "userId", expires`;

      const result = await client.query(sql, [userId, expires, sessionToken]);
      return result.rows[0];
    },

    async getSessionAndUser(sessionToken) {
      if (sessionToken === undefined) {
        return null;
      }
      const result1 = await client.query(
        `select * from auth_sessions where "sessionToken" = $1`,
        [sessionToken]
      );
      if (result1.rowCount === 0) {
        return null;
      }
      const session = result1.rows[0];

      const result2 = await client.query(
        'select * from auth_users where id = $1',
        [session.userId]
      );
      if (result2.rowCount === 0) {
        return null;
      }
      const user = result2.rows[0];
      return {
        session,
        user,
      };
    },
    async updateSession(
      session
    ) {
      const { sessionToken } = session;
      const result1 = await client.query(
        `select * from auth_sessions where "sessionToken" = $1`,
        [sessionToken]
      );
      if (result1.rowCount === 0) {
        return null;
      }
      const originalSession = result1.rows[0];

      const newSession = {
        ...originalSession,
        ...session,
      };
      const sql = `
        UPDATE auth_sessions set
        expires = $2
        where "sessionToken" = $1
        `;
      const result = await client.query(sql, [
        newSession.sessionToken,
        newSession.expires,
      ]);
      return result.rows[0];
    },
    async deleteSession(sessionToken) {
      const sql = `delete from auth_sessions where "sessionToken" = $1`;
      await client.query(sql, [sessionToken]);
    },
    async unlinkAccount(partialAccount) {
      const { provider, providerAccountId } = partialAccount;
      const sql = `delete from auth_accounts where "providerAccountId" = $1 and provider = $2`;
      await client.query(sql, [providerAccountId, provider]);
    },
    async deleteUser(userId) {
      await client.query('delete from auth_users where id = $1', [userId]);
      await client.query('delete from auth_sessions where "userId" = $1', [
        userId,
      ]);
      await client.query('delete from auth_accounts where "userId" = $1', [
        userId,
      ]);
    },
  };
}
const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
const adapter = Adapter(pool);

export const { auth } = CreateAuth({
  adapter: adapter,
  session: {
    strategy: "database",
    maxAge: 12 * 60 * 60, // 12 hours in seconds
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('[AUTH] JWT callback - user:', user?.email, 'has sessionToken:', !!user?._sessionToken);
      if (user?._sessionToken) {
        token.sessionToken = user._sessionToken;
        token.sessionExpires = user._sessionExpires;
        console.log('[AUTH] JWT callback - sessionToken embedded in JWT');
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[AUTH] Session callback - token has sessionToken:', !!token.sessionToken);
      if (token.sessionToken) {
        session.sessionToken = token.sessionToken;
        session.expires = token.sessionExpires;
        console.log('[AUTH] Session callback - sessionToken added to session');
      }
      return session;
    },
  },
  providers: [Credentials({
  id: 'credentials-signin',
  name: 'Credentials Sign in',
  credentials: {
    email: {
      label: 'Email',
      type: 'email',
    },
    password: {
      label: 'Password',
      type: 'password',
    },
  },
  authorize: async (credentials) => {
    throw new Error('🔥 AUTHORIZE FUNCTION CALLED - credentials-signin');
    const { email, password } = credentials;
    if (!email || !password) {
      return null;
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return null;
    }

    // logic to verify if user exists
    const user = await adapter.getUserByEmail(email);
    if (!user) {
      return null;
    }
    const matchingAccount = user.accounts.find(
      (account) => account.provider === 'credentials'
    );
    const accountPassword = matchingAccount?.password;
    if (!accountPassword) {
      return null;
    }

    const isValid = await verify(accountPassword, password);
    if (!isValid) {
      console.log('[AUTH] Invalid password for user:', email);
      return null;
    }

    console.log('[AUTH] Password verified for user:', email, 'userId:', user.id);

    try {
      const sessionToken = crypto.randomUUID();
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
      
      console.log('[AUTH] Creating session - token:', sessionToken, 'userId:', user.id, 'expires:', expires);
      
      const createdSession = await adapter.createSession({
        sessionToken,
        userId: user.id,
        expires,
      });
      
      console.log('[AUTH] Session created successfully:', createdSession);
      
      user._sessionToken = sessionToken;
      user._sessionExpires = expires;
      
      console.log('[AUTH] Session token attached to user object');
    } catch (error) {
      console.error('[AUTH] Session creation error during signin:', error);
      return null;
    }

    console.log('[AUTH] Returning user from authorize');
    // return user object with the their profile data
    return user;
  },
}),
  Credentials({
  id: 'credentials-signup',
  name: 'Credentials Sign up',
  credentials: {
    email: {
      label: 'Email',
      type: 'email',
    },
    password: {
      label: 'Password',
      type: 'password',
    },
    name: { label: 'Name', type: 'text', required: false },
    image: { label: 'Image', type: 'text', required: false },
  },
  authorize: async (credentials) => {
    const { email, password } = credentials;
    if (!email || !password) {
      return null;
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return null;
    }

    // logic to verify if user exists
    const user = await adapter.getUserByEmail(email);
    if (!user) {
      const newUser = await adapter.createUser({
        id: crypto.randomUUID(),
        emailVerified: null,
        email,
        name:
          typeof credentials.name === 'string' &&
          credentials.name.trim().length > 0
            ? credentials.name
            : undefined,
        image:
          typeof credentials.image === 'string'
            ? credentials.image
            : undefined,
      });
      await adapter.linkAccount({
        extraData: {
          password: await hash(password),
        },
        type: 'credentials',
        userId: newUser.id,
        providerAccountId: newUser.id,
        provider: 'credentials',
      });
      
      console.log('[AUTH] Account linked for new user:', email, 'userId:', newUser.id);
      
      try {
        const sessionToken = crypto.randomUUID();
        const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
        
        console.log('[AUTH] Creating session for new user - token:', sessionToken, 'userId:', newUser.id);
        
        const createdSession = await adapter.createSession({
          sessionToken,
          userId: newUser.id,
          expires,
        });
        
        console.log('[AUTH] Session created for new user:', createdSession);
        
        newUser._sessionToken = sessionToken;
        newUser._sessionExpires = expires;
        
        console.log('[AUTH] Session token attached to new user object');
      } catch (error) {
        console.error('[AUTH] Session creation error during signup:', error);
        return null;
      }
      
      console.log('[AUTH] Returning new user from authorize');
      return newUser;
    }
    return null;
  },
})],
  pages: {
    signIn: '/account/signin',
    signOut: '/account/logout',
  },
})