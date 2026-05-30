import { v4 as uuidv4 } from 'uuid';
export function contactId() {
    return 'con_' + uuidv4().replace(/-/g, '');
}
export function viewId() {
    return 'view_' + uuidv4().replace(/-/g, '');
}
export function fieldId() {
    return 'fld_' + uuidv4().replace(/-/g, '');
}
