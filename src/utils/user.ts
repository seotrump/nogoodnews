export function getUserProfileUrl(user: { id?: string, author_id?: string, accounts?: { username?: string | null } | null } | null | string): string {
  if (!user) return '/';
  
  if (typeof user === 'string') {
    return `/users/${user}`;
  }

  const id = user.id || user.author_id;
  const username = user.accounts?.username;

  if (username) {
    return `/users/@${username}`;
  }
  
  if (id) {
    return `/users/${id}`;
  }

  return '/';
}
