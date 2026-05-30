import { v4 as uuidv4 } from 'uuid';
export function contactId() {
    return 'con_' + uuidv4().replace(/-/g, '');
}
