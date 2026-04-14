type Metadata = Record<string, unknown>

export function formatActivityEntry(actionType: string, metadata: Metadata): string {
  switch (actionType) {
    case 'CARD_CREATED':
      return `created card "${metadata.title}"`
    case 'CARD_UPDATED': {
      const fields = (metadata.changedFields as string[]) ?? []
      return `updated card (${fields.join(', ')})`
    }
    case 'CARD_MOVED':
      return `moved "${metadata.title}" from ${metadata.fromColumnTitle} to ${metadata.toColumnTitle}`
    case 'CARD_DELETED':
      return `deleted card "${metadata.title}"`
    case 'COLUMN_CREATED':
      return `created column "${metadata.title}"`
    case 'COLUMN_UPDATED':
      return `renamed column "${metadata.previousTitle}" to "${metadata.newTitle}"`
    case 'COLUMN_DELETED':
      return `deleted column "${metadata.title}" (${metadata.cardCount} cards)`
    case 'COMMENT_ADDED':
      return `commented on "${metadata.cardTitle}"`
    case 'CARD_ASSIGNED':
      return `assigned "${metadata.cardTitle}" to ${metadata.assigneeName}`
    default:
      return actionType.toLowerCase().replace(/_/g, ' ')
  }
}
