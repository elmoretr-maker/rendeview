import { auth } from '../../../../auth.js';

export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new Response(
        JSON.stringify(null),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
        expires: session.expires,
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[SESSION] Error:', error);
    return new Response(
      JSON.stringify(null),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
