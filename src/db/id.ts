import { v4 as uuidv4 } from 'uuid'

export function contactId(): string {
  return 'con_' + uuidv4().replace(/-/g, '')
}

export function viewId(): string {
  return 'view_' + uuidv4().replace(/-/g, '')
}

export function fieldId(): string {
  return 'fld_' + uuidv4().replace(/-/g, '')
}
