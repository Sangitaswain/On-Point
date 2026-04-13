/**
 * Walk a Tiptap JSON document and collect all mentioned user IDs.
 * Mention nodes look like: { type: "mention", attrs: { id: "<userId>", label: "..." } }
 */
export function extractMentionedUserIds(body: unknown): string[] {
  const ids: string[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as { type?: string; attrs?: { id?: string }; content?: unknown[] }
    if (n.type === 'mention' && n.attrs?.id) ids.push(n.attrs.id)
    if (n.content) n.content.forEach(walk)
  }

  walk(body)
  return [...new Set(ids)]
}
