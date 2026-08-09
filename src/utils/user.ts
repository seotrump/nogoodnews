export function getUserProfileUrl(user: { id?: string, author_id?: string, username?: string | null, accounts?: { username?: string | null } | null } | null | string): string {
  if (!user) return '/';
  
  if (typeof user === 'string') {
    if (user.startsWith('@')) return `/users/${user}`;
    return `/users/${user}`;
  }

  const id = user.id || user.author_id;
  const username = user.username || user.accounts?.username;

  if (username) {
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    return `/users/@${cleanUsername}`;
  }
  
  if (id) {
    return `/users/${id}`;
  }

  return '/';
}

