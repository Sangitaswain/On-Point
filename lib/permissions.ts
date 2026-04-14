type Permission = 'edit' | 'comment' | 'view' | null | undefined

export function canEdit(permission: Permission): boolean {
  return permission === 'edit'
}

export function canComment(permission: Permission): boolean {
  return permission === 'edit' || permission === 'comment'
}
